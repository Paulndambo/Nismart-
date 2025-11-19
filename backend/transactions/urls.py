from django.urls import path
from . import views

urlpatterns = [
    path('deposit/', views.deposit, name='deposit'),
    path('transfer/', views.transfer, name='transfer'),
    path('withdraw/', views.withdraw, name='withdraw'),
    path('balance/<int:user_id>/', views.balance, name='balance'),
    path('transactions/<int:user_id>/', views.transaction_history, name='transaction_history'),
    path('admin/stats/', views.admin_stats, name='admin_stats'),
    path('admin/transactions/', views.admin_transactions, name='admin_transactions'),
]

