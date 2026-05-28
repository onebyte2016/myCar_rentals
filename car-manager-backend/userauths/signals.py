# signals.py in your users app
from django.db.models.signals import post_save
from django.contrib.auth.models import User
from paymentsystem.models import Wallet

@receiver(post_save, sender=User)
def create_wallet(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.get_or_create(user=instance)