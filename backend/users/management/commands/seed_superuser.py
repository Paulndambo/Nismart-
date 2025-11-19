"""
Django management command to create a superuser with an account.

Usage:
    python manage.py seed_superuser
    python manage.py seed_superuser --username admin --email admin@example.com --password admin123
    python manage.py seed_superuser --username admin --email admin@example.com --password admin123 --first-name Admin --last-name User
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from transactions.models import Account

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a superuser with an account'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin')
        parser.add_argument('--email', type=str, default='admin@nissmart.com')
        parser.add_argument('--password', type=str, default='admin123')
        parser.add_argument('--first-name', type=str, default='Admin')
        parser.add_argument('--last-name', type=str, default='User')
        parser.add_argument('--role', type=str, default='Admin')
        parser.add_argument('--phone-number', type=str, default='0712345678')
        parser.add_argument(
            '--skip-if-exists',
            action='store_true',
            help='Skip creation if user already exists'
        )

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        password = options.get('password')
        first_name = options.get('first_name')
        last_name = options.get('last_name')
        phone_number = options.get('phone_number')
        role = options.get('role')
        skip_if_exists = options.get('skip_if_exists')

        # If user exists already
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)

            if skip_if_exists:
                self.stdout.write(
                    self.style.WARNING(f'User "{username}" already exists. Skipping creation.')
                )
                account, created = Account.objects.get_or_create(user=user)
                msg = "Created account" if created else "Account already exists"
                self.stdout.write(self.style.SUCCESS(f'{msg} for user "{username}"'))
                return

            self.stdout.write(
                self.style.ERROR(f'User "{username}" already exists. Use --skip-if-exists to skip.')
            )
            return

        # Check email uniqueness
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'Email "{email}" is already in use.'))
            return

        try:
            with transaction.atomic():

                # Create superuser using recommended built-in method
                user = User.objects.create(
                    username=username,
                    email=email,
                    password=password,
                    first_name = first_name,
                    last_name = last_name,
                    phone_number = phone_number,
                    role = role
                )

                # Set profile details
                user.set_password(password)
                user.is_staff=True
                user.is_superuser=True
                user.save()

                # Create financial account
                account = Account.objects.create(
                    user=user,
                    balance=0.00,
                    currency='KES'
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created superuser "{username}" with account!\n'
                        f'  Username: {username}\n'
                        f'  Email: {email}\n'
                        f'  Account ID: {account.id}\n'
                        f'  Balance: {account.currency} {account.balance}\n'
                        f'  Role: {role}'
                    )
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating superuser: {str(e)}'))
            raise
