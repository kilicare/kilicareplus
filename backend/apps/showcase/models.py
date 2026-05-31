from django.db import models
from django.conf import settings


class VirtualShowcase(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='showcase',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    banner_image = models.ImageField(
        upload_to='showcase_banners/', null=True, blank=True
    )
    theme_color = models.CharField(max_length=7, default='#F5A623')
    is_active = models.BooleanField(default=True)
    total_views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.owner.username} — {self.title}'


class ShowcaseItem(models.Model):
    CATEGORY_CHOICES = [
        ('Art', 'Art'),
        ('Food', 'Food & Spices'),
        ('Craft', 'Handcraft'),
        ('Fashion', 'Fashion'),
        ('Jewelry', 'Jewelry'),
        ('Souvenirs', 'Souvenirs'),
        ('Other', 'Other'),
    ]

    showcase = models.ForeignKey(
        VirtualShowcase,
        on_delete=models.CASCADE,
        related_name='items',
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=5, default='TZS')
    is_negotiable = models.BooleanField(default=False)
    stock_count = models.IntegerField(null=True, blank=True)
    category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default='Other'
    )
    is_available = models.BooleanField(default=True)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.showcase.owner.username}: {self.title}'


class ShowcaseMedia(models.Model):
    item = models.ForeignKey(
        ShowcaseItem,
        on_delete=models.CASCADE,
        related_name='media',
    )
    file = models.ImageField(upload_to='showcase_items/')
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']


class ShowcaseOrder(models.Model):
    STATUS = [
        ('PENDING', 'Pending'),
        ('ESCROW', 'In Escrow'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('COMPLETED', 'Completed'),
        ('DISPUTED', 'Disputed'),
        ('CANCELLED', 'Cancelled'),
        ('REFUNDED', 'Refunded'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='showcase_orders',
    )
    item = models.ForeignKey(
        ShowcaseItem, on_delete=models.PROTECT, related_name='orders'
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    seller_payout = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    status = models.CharField(
        max_length=15, choices=STATUS, default='PENDING'
    )
    escrow_held = models.BooleanField(default=False)
    escrow_released_at = models.DateTimeField(null=True, blank=True)
    delivery_notes = models.TextField(null=True, blank=True)
    mpesa_transaction_code = models.CharField(
        max_length=50, null=True, blank=True
    )
    dispute_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.id} — {self.buyer.username}'

    def calculate_fees(self):
        """Platform takes 7%, seller gets 93%"""
        self.platform_fee = self.total_amount * 7 / 100
        self.seller_payout = self.total_amount - self.platform_fee