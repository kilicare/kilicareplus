from django.db import models
from django.conf import settings


class Payment(models.Model):
    """
    General payment model for all transactions (bookings, experiences, showcase orders, etc.)
    This is separate from SubscriptionPayment which is specifically for subscriptions.
    """
    
    PAYMENT_METHOD_CHOICES = [
        ('MPESA', 'M-Pesa'),
        ('CARD', 'Credit/Debit Card'),
        ('PAYPAL', 'PayPal'),
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    CURRENCY_CHOICES = [
        ('TZS', 'Tanzanian Shilling'),
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
    ]
    
    # User who made the payment
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    
    # Payment details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='TZS')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    
    # Transaction IDs
    transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    external_reference = models.CharField(max_length=200, null=True, blank=True, help_text="External payment gateway reference")
    
    # Related entity (what is this payment for?)
    related_entity_type = models.CharField(max_length=50, null=True, blank=True, help_text="e.g., booking, experience, showcase_order")
    related_entity_id = models.PositiveIntegerField(null=True, blank=True, help_text="ID of the related entity")
    
    # Payment gateway response
    gateway_response = models.JSONField(null=True, blank=True, help_text="Raw response from payment gateway")
    
    # Metadata
    description = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['related_entity_type', 'related_entity_id']),
        ]
    
    def __str__(self):
        return f'{self.user.email} - {self.currency} {self.amount} ({self.status})'
    
    def mark_completed(self):
        """Mark payment as completed and set completed_at timestamp."""
        self.status = 'COMPLETED'
        self.completed_at = models.timezone.now()
        self.save(update_fields=['status', 'completed_at'])
    
    def mark_failed(self):
        """Mark payment as failed."""
        self.status = 'FAILED'
        self.save(update_fields=['status'])


class Invoice(models.Model):
    """
    Invoice model for generating invoices for payments.
    """
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name='invoice',
        null=True,
        blank=True
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Invoice details
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='TZS')
    
    # Invoice metadata
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f'Invoice {self.invoice_number} - {self.user.email}'
    
    def save(self, *args, **kwargs):
        # Auto-generate invoice number if not set
        if not self.invoice_number:
            from django.utils import timezone
            year = timezone.now().year
            month = timezone.now().month
            last_invoice = Invoice.objects.filter(
                created_at__year=year,
                created_at__month=month
            ).order_by('-id').first()
            
            if last_invoice:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.invoice_number = f'INV-{year}{month:02d}-{new_num:04d}'
        
        super().save(*args, **kwargs)


class Refund(models.Model):
    """
    Refund model for handling payment refunds.
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    
    refund_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Gateway response
    gateway_response = models.JSONField(null=True, blank=True)
    
    # Processed by
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_refunds'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Refund"
        verbose_name_plural = "Refunds"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['refund_id']),
        ]
    
    def __str__(self):
        return f'Refund {self.refund_id or "Pending"} - {self.amount}'

