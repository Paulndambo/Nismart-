from django.contrib import admin
from .models import Account, Transaction, TransferRequest, Withdrawal


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'balance', 'currency', 'created_at']
    search_fields = ['user__email']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'transaction_type', 'amount', 'source_account', 'destination_account', 'status', 'created_at']
    list_filter = ['transaction_type', 'status', 'created_at']
    search_fields = ['id', 'idempotency_key']


@admin.register(TransferRequest)
class TransferRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'source_account', 'destination_account', 'amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']


@admin.register(Withdrawal)
class WithdrawalAdmin(admin.ModelAdmin):
    list_display = ['id', 'account', 'amount', 'status', 'external_reference', 'created_at']
    list_filter = ['status', 'created_at']

