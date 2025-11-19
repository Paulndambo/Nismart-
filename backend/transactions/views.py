import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q
from django.core.cache import cache
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django_ratelimit.decorators import ratelimit
from .models import Account, Transaction, TransferRequest, Withdrawal
from .serializers import (
    AccountSerializer, TransactionSerializer, DepositSerializer, TransferSerializer,
    WithdrawalSerializer, BalanceSerializer, AdminStatsSerializer
)
from core.utils import cache_result
from core.permissions import IsAccountOwner

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='100/h', method='GET')
def balance(request, user_id):
    """Get balance for a user"""
    try:
        # Users can only view their own balance unless they're admin
        if not request.user.is_staff and request.user.id != user_id:
            return Response(
                {'error': 'You do not have permission to view this balance'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user if not request.user.is_staff else request.user.__class__.objects.get(id=user_id)
        account = Account.objects.get(user=user)
        
        # Try cache first
        cache_key = f'balance_{account.id}'
        cached_balance = cache.get(cache_key)
        if cached_balance:
            return Response(cached_balance)
        
        serializer = BalanceSerializer({
            'account_id': account.id,
            'balance': account.balance,
            'currency': account.currency,
            'user': user,
            'user_id': user.id
        })
        
        # Cache for 30 seconds
        cache.set(cache_key, serializer.data, 30)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching balance: {str(e)}")
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='200/h', method='GET')
def transaction_history(request, user_id):
    """Get transaction history for a user"""
    try:
        # Users can only view their own transactions unless they're admin
        if not request.user.is_staff and request.user.id != user_id:
            return Response(
                {'error': 'You do not have permission to view this history'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = request.user if not request.user.is_staff else request.user.__class__.objects.get(id=user_id)
        account = Account.objects.get(user=user)
        
        # Try cache first
        cache_key = f'transactions_{account.id}_{request.query_params.get("page", 1)}'
        cached_transactions = cache.get(cache_key)
        if cached_transactions:
            return Response(cached_transactions)
        
        # Get all transactions where user's account is involved
        transactions = Transaction.objects.filter(
            Q(source_account=account) | Q(destination_account=account)
        ).order_by('-created_at')
        
        serializer = TransactionSerializer(transactions, many=True)
        response_data = serializer.data
        
        # Cache for 60 seconds
        cache.set(cache_key, response_data, 60)
        return Response(response_data)
    except Exception as e:
        logger.error(f"Error fetching transaction history: {str(e)}")
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='50/h', method='POST')
def deposit(request):
    """Simulate a deposit"""
    serializer = DepositSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    account_id = serializer.validated_data['account_id']
    amount = serializer.validated_data['amount']
    idempotency_key = serializer.validated_data['idempotency_key']

    try:
        # Get account and verify ownership
        account = Account.objects.get(id=account_id)
        if not request.user.is_staff and account.user != request.user:
            return Response(
                {'error': 'You do not have permission to deposit to this account'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check for existing transaction with same idempotency key
        existing_transaction = Transaction.objects.filter(idempotency_key=idempotency_key).first()
        if existing_transaction:
            logger.info(f"Idempotent request detected for key: {idempotency_key}")
            return Response(TransactionSerializer(existing_transaction).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            account = Account.objects.select_for_update().get(id=account_id)
            
            # Create transaction record
            trans = Transaction.objects.create(
                transaction_type='DEPOSIT',
                amount=amount,
                destination_account=account,
                status='COMPLETED',
                idempotency_key=idempotency_key,
                metadata={'simulated': True, 'user_id': request.user.id}
            )

            # Update account balance
            account.balance += amount
            account.save()

            # Invalidate balance cache
            cache.delete(f'balance_{account.id}')
            # Invalidate transaction history cache (will be regenerated on next request)
            from core.utils import invalidate_cache_pattern
            invalidate_cache_pattern(f'transactions_{account.id}_*')

            logger.info(f"Deposit completed: {amount} to account {account_id} by user {request.user.id}")
            return Response(TransactionSerializer(trans).data, status=status.HTTP_201_CREATED)

    except Account.DoesNotExist:
        logger.error(f"Account not found: {account_id}")
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Deposit failed: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='30/h', method='POST')
def transfer(request):
    """Internal transfer between accounts"""
    serializer = TransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    source_account_id = serializer.validated_data['source_account_id']
    destination_account_id = serializer.validated_data['destination_account_id']
    amount = serializer.validated_data['amount']
    idempotency_key = serializer.validated_data['idempotency_key']

    try:
        # Get source account and verify ownership
        source_account = Account.objects.get(id=source_account_id)
        if not request.user.is_staff and source_account.user != request.user:
            return Response(
                {'error': 'You do not have permission to transfer from this account'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check for existing transaction with same idempotency key
        existing_transaction = Transaction.objects.filter(idempotency_key=idempotency_key).first()
        if existing_transaction:
            logger.info(f"Idempotent request detected for key: {idempotency_key}")
            return Response(TransactionSerializer(existing_transaction).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            # Lock both accounts
            source_account = Account.objects.select_for_update().get(id=source_account_id)
            destination_account = Account.objects.select_for_update().get(id=destination_account_id)

            # Check sufficient balance
            if source_account.balance < amount:
                logger.warning(f"Insufficient balance for transfer: account {source_account_id}")
                return Response(
                    {'error': 'Insufficient balance'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create transaction record
            trans = Transaction.objects.create(
                transaction_type='TRANSFER',
                amount=amount,
                source_account=source_account,
                destination_account=destination_account,
                status='COMPLETED',
                idempotency_key=idempotency_key,
                metadata={'simulated': True, 'user_id': request.user.id}
            )

            # Update balances atomically
            source_account.balance -= amount
            destination_account.balance += amount
            source_account.save()
            destination_account.save()

            # Create transfer request record
            TransferRequest.objects.create(
                source_account=source_account,
                destination_account=destination_account,
                amount=amount,
                status='COMPLETED',
                transaction=trans
            )

            # Invalidate cache for both accounts
            cache.delete(f'balance_{source_account.id}')
            cache.delete(f'balance_{destination_account.id}')
            from core.utils import invalidate_cache_pattern
            invalidate_cache_pattern(f'transactions_{source_account.id}_*')
            invalidate_cache_pattern(f'transactions_{destination_account.id}_*')

            logger.info(f"Transfer completed: {amount} from {source_account_id} to {destination_account_id} by user {request.user.id}")
            return Response(TransactionSerializer(trans).data, status=status.HTTP_201_CREATED)

    except Account.DoesNotExist:
        logger.error(f"Account not found")
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Transfer failed: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='20/h', method='POST')
def withdraw(request):
    """Simulate a withdrawal"""
    serializer = WithdrawalSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    account_id = serializer.validated_data['account_id']
    amount = serializer.validated_data['amount']
    idempotency_key = serializer.validated_data['idempotency_key']

    try:
        # Get account and verify ownership
        account = Account.objects.get(id=account_id)
        if not request.user.is_staff and account.user != request.user:
            return Response(
                {'error': 'You do not have permission to withdraw from this account'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check for existing transaction with same idempotency key
        existing_transaction = Transaction.objects.filter(idempotency_key=idempotency_key).first()
        if existing_transaction:
            logger.info(f"Idempotent request detected for key: {idempotency_key}")
            return Response(TransactionSerializer(existing_transaction).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            account = Account.objects.select_for_update().get(id=account_id)

            # Check sufficient balance
            if account.balance < amount:
                logger.warning(f"Insufficient balance for withdrawal: account {account_id}")
                return Response(
                    {'error': 'Insufficient balance'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Simulate external system processing (90% success rate)
            import random
            external_success = random.random() > 0.1  # 90% success

            if external_success:
                # Create transaction record
                trans = Transaction.objects.create(
                    transaction_type='WITHDRAWAL',
                    amount=amount,
                    source_account=account,
                    status='COMPLETED',
                    idempotency_key=idempotency_key,
                    metadata={'simulated': True, 'external_success': True, 'user_id': request.user.id}
                )

                # Update account balance
                account.balance -= amount
                account.save()

                # Create withdrawal record
                withdrawal = Withdrawal.objects.create(
                    account=account,
                    amount=amount,
                    status='COMPLETED',
                    transaction=trans,
                    external_reference=f"EXT-{idempotency_key[:8]}"
                )

                # Invalidate cache
                cache.delete(f'balance_{account.id}')
                from core.utils import invalidate_cache_pattern
                invalidate_cache_pattern(f'transactions_{account.id}_*')

                logger.info(f"Withdrawal completed: {amount} from account {account_id} by user {request.user.id}")
                return Response(TransactionSerializer(trans).data, status=status.HTTP_201_CREATED)
            else:
                # Simulate external system failure
                trans = Transaction.objects.create(
                    transaction_type='WITHDRAWAL',
                    amount=amount,
                    source_account=account,
                    status='FAILED',
                    idempotency_key=idempotency_key,
                    metadata={'simulated': True, 'external_success': False, 'reason': 'External system failure', 'user_id': request.user.id}
                )

                withdrawal = Withdrawal.objects.create(
                    account=account,
                    amount=amount,
                    status='FAILED',
                    transaction=trans,
                    external_reference=None
                )

                logger.warning(f"Withdrawal failed: external system error for account {account_id}")
                return Response(
                    {'error': 'Withdrawal failed: external system error', 'transaction': TransactionSerializer(trans).data},
                    status=status.HTTP_400_BAD_REQUEST
                )

    except Account.DoesNotExist:
        logger.error(f"Account not found: {account_id}")
        return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Withdrawal failed: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
@ratelimit(key='user', rate='200/h', method='GET')
def admin_stats(request):
    """Get admin dashboard statistics"""
    try:
        # Try cache first
        cache_key = 'admin_stats'
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return Response(cached_stats)
        
        from users.models import User
        total_users = User.objects.count()
        total_wallets_value = Account.objects.aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0.00')
        
        total_transfers = Transaction.objects.filter(transaction_type='TRANSFER').count()
        total_withdrawals = Transaction.objects.filter(transaction_type='WITHDRAWAL').count()
        total_deposits = Transaction.objects.filter(transaction_type='DEPOSIT').count()
        total_transactions = Transaction.objects.count()

        serializer = AdminStatsSerializer({
            'total_users': total_users,
            'total_wallets_value': total_wallets_value,
            'total_transfers': total_transfers,
            'total_withdrawals': total_withdrawals,
            'total_deposits': total_deposits,
            'total_transactions': total_transactions,
        })
        
        # Cache for 5 minutes
        cache.set(cache_key, serializer.data, 300)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching admin stats: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
@ratelimit(key='user', rate='200/h', method='GET')
def admin_transactions(request):
    """Get all transactions for admin dashboard"""
    try:
        transactions = Transaction.objects.all().order_by('-created_at')
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        
        # Filtering
        transaction_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        user_id = request.query_params.get('user_id')
        
        if transaction_type:
            transactions = transactions.filter(transaction_type=transaction_type)
        if status_filter:
            transactions = transactions.filter(status=status_filter)
        if user_id:
            try:
                account = Account.objects.get(user_id=user_id)
                transactions = transactions.filter(
                    Q(source_account=account) | Q(destination_account=account)
                )
            except Account.DoesNotExist:
                pass
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_transactions = transactions[start:end]
        
        serializer = TransactionSerializer(paginated_transactions, many=True)
        return Response({
            'count': transactions.count(),
            'page': page,
            'page_size': page_size,
            'results': serializer.data
        })
    except Exception as e:
        logger.error(f"Error fetching admin transactions: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
