from rest_framework import serializers
from .models import (
    Payment, Wallet, WalletTransaction, Coupon,
    DynamicPricingRule, Invoice, Refund, SecurityDeposit,
)


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ['id', 'type', 'amount', 'balance_after', 'description', 'reference', 'created_at']


class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)
    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'currency', 'is_active', 'transactions']


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'


class DynamicPricingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicPricingRule
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'reference', 'booking', 'amount', 'currency', 'method',
            'status', 'base_amount', 'discount_amount', 'security_deposit',
            'tax_amount', 'created_at', 'completed_at',
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = '__all__'