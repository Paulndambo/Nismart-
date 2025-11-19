from django.db import models

from django.contrib.auth.models import AbstractUser
from core.models import AbstractBaseModel
# Create your models here.
class User(AbstractBaseModel, AbstractUser):
    phone_number = models.CharField(max_length=255, null=True)
    role = models.CharField(max_length=255, default="Customer")

    def __str__(self):
        return self.username
