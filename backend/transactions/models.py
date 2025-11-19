from django.db import models
from django.core.validators import MinValueValidator
from django.db.models import CheckConstraint, Q
import uuid

from core.models import AbstractBaseModel


class Account(AbstractBaseModel):
    user = models.OneToOneField("users.User", on_delete=models.CASCADE, related_name='account')
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='KES')


    def __str__(self):
        return f"Account for {self.user.email} - {self.currency} {self.balance}"

    class Meta:
        db_table = 'accounts'
        constraints = [
            CheckConstraint(check=Q(balance__gte=0), name='non_negative_balance')
        ]


class Transaction(AbstractBaseModel):
    TRANSACTION_TYPES = [
        ('DEPOSIT', 'Deposit'),
        ('TRANSFER', 'Transfer'),
        ('WITHDRAWAL', 'Withdrawal'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0.01)])
    source_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='source_transactions', null=True, blank=True)
    destination_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='destination_transactions', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.status}"

    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['source_account', 'created_at']),
            models.Index(fields=['destination_account', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]


class TransferRequest(AbstractBaseModel):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    source_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='transfer_requests_sent')
    destination_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='transfer_requests_received')
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0.01)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='transfer_request', null=True, blank=True)
 

    def __str__(self):
        return f"Transfer {self.amount} from {self.source_account.user.email} to {self.destination_account.user.email}"

    class Meta:
        db_table = 'transfer_requests'
        ordering = ['-created_at']


class Withdrawal(AbstractBaseModel):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='withdrawals')
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(0.01)])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='withdrawal', null=True, blank=True)
    external_reference = models.CharField(max_length=255, blank=True, null=True)
 

    def __str__(self):
        return f"Withdrawal {self.amount} from {self.account.user.email} - {self.status}"

    class Meta:
        db_table = 'withdrawals'
        ordering = ['-created_at']

