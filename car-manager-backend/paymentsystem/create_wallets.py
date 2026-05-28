from django.contrib.auth import get_user_model

User = get_user_model()  # ← call it as a function with ()

from paymentsystem.models import Wallet

for user in User.objects.all():
    Wallet.objects.get_or_create(user=user)

print('Wallets created for all users')

