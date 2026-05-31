from rest_framework import status
from rest_framework.decorators import (
    api_view, permission_classes, parser_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Experience, ExperienceMedia
from .serializers import ExperienceSerializer
from core.permissions import IsLocalGuideOrAdmin, IsOwnerOrAdmin


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def experiences_list_view(request):
    category = request.query_params.get('category')
    guide_id = request.query_params.get('guide')
    qs = Experience.objects.filter(
        is_active=True
    ).select_related('local', 'local__profile', 'local__passport')

    if category:
        qs = qs.filter(category=category)
    if guide_id:
        qs = qs.filter(local_id=guide_id)

    return Response(
        ExperienceSerializer(
            qs.order_by('-created_at'),
            many=True,
            context={'request': request},
        ).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_experiences_view(request):
    exps = Experience.objects.filter(
        is_active=True, today_moment_active=True
    ).select_related('local', 'local__profile', 'local__passport')
    return Response(
        ExperienceSerializer(
            exps, many=True, context={'request': request}
        ).data
    )


@api_view(['POST'])
@permission_classes([IsLocalGuideOrAdmin])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_experience_view(request):
    serializer = ExperienceSerializer(
        data=request.data, context={'request': request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    exp = serializer.save(local=request.user)

    # Handle media uploads
    files = request.FILES.getlist('media')
    for i, f in enumerate(files):
        ExperienceMedia.objects.create(
            experience=exp,
            file=f,
            is_primary=(i == 0),
            order=i,
        )

    # Points
    try:
        request.user.passport.award_points('CREATE_EXPERIENCE')
    except Exception:
        pass

    return Response(
        ExperienceSerializer(exp, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def experience_detail_view(request, pk):
    try:
        exp = Experience.objects.select_related(
            'local', 'local__profile', 'local__passport'
        ).get(pk=pk)
    except Experience.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)

    if request.method == 'GET':
        exp.views += 1
        exp.save(update_fields=['views'])
        return Response(
            ExperienceSerializer(exp, context={'request': request}).data
        )

    # PUT/DELETE — only owner or admin
    if exp.local != request.user and request.user.role != 'ADMIN':
        return Response({'message': 'Ruhusa haitoshi.'}, status=403)

    if request.method == 'DELETE':
        exp.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ExperienceSerializer(
        exp, data=request.data, partial=True, context={'request': request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsLocalGuideOrAdmin])
def toggle_today_view(request, pk):
    try:
        exp = Experience.objects.get(pk=pk, local=request.user)
    except Experience.DoesNotExist:
        return Response({'message': 'Haipatikani.'}, status=404)
    exp.today_moment_active = not exp.today_moment_active
    exp.save(update_fields=['today_moment_active'])
    return Response({'today_moment_active': exp.today_moment_active})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_experiences_view(request):
    exps = Experience.objects.filter(
        local=request.user
    ).order_by('-created_at')
    return Response(
        ExperienceSerializer(
            exps, many=True, context={'request': request}
        ).data
    )