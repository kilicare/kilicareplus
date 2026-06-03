from django.db import models
from django.conf import settings

class Affiliate(models.Model):
    """Affiliate links - tourism partners, services, etc"""
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('PENDING', 'Pending'),
    ]
    
    # Basic info
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    logo = models.URLField(blank=True)
    
    # Affiliate link
    affiliate_url = models.URLField(help_text="Full affiliate URL with tracking params")
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    click_count = models.IntegerField(default=0, db_index=True)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-click_count']
    
    def __str__(self):
        return self.name


class AffiliateClick(models.Model):
    """Track clicks on affiliate links"""
    
    affiliate = models.ForeignKey(Affiliate, on_delete=models.CASCADE, related_name='clicks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    clicked_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Optional tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-clicked_at']
        indexes = [
            models.Index(fields=['affiliate', 'clicked_at']),
            models.Index(fields=['user', 'clicked_at']),
        ]
    
    def __str__(self):
        return f"{self.affiliate.name} - {self.clicked_at}"
