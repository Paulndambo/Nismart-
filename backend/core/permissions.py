"""
Custom permissions for the application.
"""
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'account') and hasattr(obj.account, 'user'):
            return obj.account.user == request.user
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission that allows admins to do anything, but others can only read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsAccountOwner(permissions.BasePermission):
    """
    Permission to check if user owns the account.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'account') and hasattr(obj.account, 'user'):
            return obj.account.user == request.user
        return False

