from rest_framework import status
from rest_framework.decorators import (
    api_view, permission_classes, parser_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import models

from .models import VirtualShowcase, ShowcaseItem, ShowcaseMedia, ShowcaseOrder
from .serializers import (
    VirtualShowcaseSerializer, ShowcaseItemSerializer,
    ShowcaseOrderSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def showcases_list_view(request):
    # SETTINGS GUARD: Check if Showcase is enabled for this user
    from apps.settings.guards import require_feature_enabled
    require_feature_enabled(request.user, 'showcase')
    
    category = request.query_params.get('category')
    showcases = VirtualShowcase.objects.filter(
        is_active=True
    ).select_related(
        'owner', 'owner__profile', 'owner__passport'
    ).annotate(
        item_count=models.Count('items', filter=models.Q(items__is_available=True))
    ).filter(item_count__gt=0).order_by('-total_views')

    return Response(
        VirtualShowcaseSerializer(
            showcases[:20], many=True, context={'request': request}
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def showcase_detail_view(request, username):
    # SETTINGS GUARD: Check if Showcase is enabled for this user
    from apps.settings.guards import require_feature_enabled
    require_feature_enabled(request.user, 'showcase')
    
    try:
        showcase = VirtualShowcase.objects.select_related(
            'owner', 'owner__profile', 'owner__passport'
        ).get(owner__username=username, is_active=True)
    except VirtualShowcase.DoesNotExist:
        return Response({'message': 'Showcase haipatikani.'}, status=404)

    showcase.total_views += 1
    showcase.save(update_fields=['total_views'])

    return Response(
        VirtualShowcaseSerializer(
            showcase, context={'request': request}
        ).data
    )


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def my_showcase_view(request):
    if request.method == 'GET':
        try:
            showcase = request.user.showcase
            return Response(
                VirtualShowcaseSerializer(
                    showcase, context={'request': request}
                ).data
            )
        except VirtualShowcase.DoesNotExist:
            return Response({'message': 'Huna showcase.'}, status=404)

    if request.method == 'POST':
        if hasattr(request.user, 'showcase'):
            return Response(
                {'message': 'Una showcase tayari.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = VirtualShowcaseSerializer(
            data=request.data, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        showcase = serializer.save(owner=request.user)
        return Response(
            VirtualShowcaseSerializer(
                showcase, context={'request': request}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    # PUT — update
    try:
        showcase = request.user.showcase
    except VirtualShowcase.DoesNotExist:
        return Response({'message': 'Huna showcase.'}, status=404)
    serializer = VirtualShowcaseSerializer(
        showcase, data=request.data,
        partial=True, context={'request': request}
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def add_item_view(request):
    try:
        showcase = request.user.showcase
    except VirtualShowcase.DoesNotExist:
        return Response({'message': 'Unda showcase kwanza.'}, status=404)

    # Check subscription limit
    current_count = showcase.items.count()
    try:
        from apps.subscriptions.services import get_user_active_subscription
        sub = get_user_active_subscription(request.user)
        max_items = sub.plan.max_showcase_items if sub else 0
        if max_items == 0:
            return Response(
                {'message': 'Subscription yako haikuruhusu showcase. Panda kiwango.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if current_count >= max_items and max_items < 9999:
            return Response(
                {'message': f'Umefika kikomo cha bidhaa {max_items}. Panda kiwango.'},
                status=status.HTTP_403_FORBIDDEN,
            )
    except Exception:
        pass

    serializer = ShowcaseItemSerializer(
        data=request.data, context={'request': request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    item = serializer.save(showcase=showcase)

    # Handle media
    files = request.FILES.getlist('media')
    for i, f in enumerate(files):
        ShowcaseMedia.objects.create(
            item=item, file=f, is_primary=(i == 0), order=i
        )

    # Points
    try:
        request.user.passport.award_points('SHOWCASE_SALE')
    except Exception:
        pass

    return Response(
        ShowcaseItemSerializer(item, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def item_detail_view(request, item_id):
    try:
        item = ShowcaseItem.objects.get(
            id=item_id, showcase__owner=request.user
        )
    except ShowcaseItem.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    if request.method == 'DELETE':
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ShowcaseItemSerializer(
        item, data=request.data, partial=True, context={'request': request}
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_view(request):
    item_id = request.data.get('item_id')
    quantity = int(request.data.get('quantity', 1))

    try:
        item = ShowcaseItem.objects.get(id=item_id, is_available=True)
    except ShowcaseItem.DoesNotExist:
        return Response({'message': 'Bidhaa haipatikani.'}, status=404)

    if item.showcase.owner == request.user:
        return Response(
            {'message': 'Huwezi kununua bidhaa yako mwenyewe.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    total = item.price * quantity
    order = ShowcaseOrder(
        buyer=request.user,
        item=item,
        quantity=quantity,
        unit_price=item.price,
        total_amount=total,
        status='PENDING',
    )
    order.calculate_fees()
    order.save()

    return Response(
        ShowcaseOrderSerializer(order).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def order_action_view(request, order_id, action):
    """Actions: confirm, delivered, complete, dispute, cancel"""
    try:
        if action in ('delivered', 'cancel'):
            order = ShowcaseOrder.objects.get(
                id=order_id, item__showcase__owner=request.user
            )
        else:
            order = ShowcaseOrder.objects.get(
                id=order_id, buyer=request.user
            )
    except ShowcaseOrder.DoesNotExist:
        return Response({'message': 'Order haipatikani.'}, status=404)

    if action == 'delivered':
        if order.status != 'ESCROW':
            return Response({'message': 'Order si katika escrow.'}, status=400)
        order.status = 'DELIVERED'

    elif action == 'complete':
        if order.status != 'DELIVERED':
            return Response({'message': 'Order haijathibitishwa.'}, status=400)
        order.status = 'COMPLETED'
        order.escrow_released_at = timezone.now()
        # Award points
        try:
            order.item.showcase.owner.passport.award_points('SHOWCASE_SALE')
        except Exception:
            pass

    elif action == 'dispute':
        order.status = 'DISPUTED'
        order.dispute_reason = request.data.get('reason', '')

    elif action == 'cancel':
        if order.status not in ('PENDING', 'ESCROW'):
            return Response({'message': 'Haiwezekani kufuta sasa.'}, status=400)
        order.status = 'CANCELLED'

    order.save()
    return Response(ShowcaseOrderSerializer(order).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders_view(request):
    orders = ShowcaseOrder.objects.filter(
        buyer=request.user
    ).select_related('item', 'item__showcase__owner').order_by('-created_at')
    return Response(
        ShowcaseOrderSerializer(orders, many=True).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_sales_view(request):
    try:
        showcase = request.user.showcase
    except VirtualShowcase.DoesNotExist:
        return Response([])
    orders = ShowcaseOrder.objects.filter(
        item__showcase=showcase
    ).select_related('buyer').order_by('-created_at')
    return Response(
        ShowcaseOrderSerializer(orders, many=True).data
    )