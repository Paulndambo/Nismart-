from rest_framework import serializers
from .models import Account, Transaction, TransferRequest, Withdrawal
from users.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'created_at']


class AccountSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Account
        fields = ['id', 'user', 'user_id', 'balance', 'currency', 'created_at']


class UserWithAccountSerializer(serializers.ModelSerializer):
    account = AccountSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'created_at', 'account']


class TransactionSerializer(serializers.ModelSerializer):
    source_account_email = serializers.EmailField(source='source_account.user.email', read_only=True)
    destination_account_email = serializers.EmailField(source='destination_account.user.email', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_type', 'amount', 'source_account', 'destination_account',
            'source_account_email', 'destination_account_email', 'status',
            'idempotency_key', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class CreateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create(**validated_data)
        # Create account for the user
        Account.objects.create(user=user)
        return user


class DepositSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01)
    idempotency_key = serializers.CharField(max_length=255)


class TransferSerializer(serializers.Serializer):
    source_account_id = serializers.IntegerField()
    destination_account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01)
    idempotency_key = serializers.CharField(max_length=255)

    def validate(self, data):
        if data['source_account_id'] == data['destination_account_id']:
            raise serializers.ValidationError("Source and destination accounts cannot be the same.")
        return data


class WithdrawalSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01)
    idempotency_key = serializers.CharField(max_length=255)


class BalanceSerializer(serializers.Serializer):
    account_id = serializers.IntegerField()
    balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField()
    user = UserSerializer()
    user_id = serializers.IntegerField()


class AdminStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_wallets_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_transfers = serializers.IntegerField()
    total_withdrawals = serializers.IntegerField()
    total_deposits = serializers.IntegerField()
    total_transactions = serializers.IntegerField()

