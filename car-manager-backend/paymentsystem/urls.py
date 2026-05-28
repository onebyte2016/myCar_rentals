from django.urls import path
from .views import (
     GetPricingView,
    CouponValidateView,
    CurrencyListView,
    InitiatePaymentView,
    VerifyPaymentView,
    StripeWebhookView,
    FlutterwaveWebhookView,
    WalletView,
    WalletTopUpView,
    WalletTransactionsView,
    RequestRefundView,
    ProcessRefundView,
    InvoiceDetailView,
    UserInvoicesView,
    UserPaymentsView,
    PaymentDetailView,
    AdminPaymentListView,
    AdminPaymentSummaryView,
    AdminRefundListView,
    AdminCouponView,
    AdminCouponDetailView,
    AdminDynamicPricingView,
    AdminMarkVendorPaidView,
)

urlpatterns = [
    # Currency
    path('pricing/', GetPricingView.as_view()),
    path('currencies/', CurrencyListView.as_view()),

    # Pricing & Coupons
    path('coupons/validate/', CouponValidateView.as_view()),

    # Payment initiation & verification (unified — handles Stripe, Thawani, Flutterwave)
        # ── Gateway specific URLs (what the frontend calls) ──
    path('thawani/create-session/', InitiatePaymentView.as_view()),
    path('thawani/verify/', VerifyPaymentView.as_view()),
    path('stripe/create-intent/', InitiatePaymentView.as_view()),
    path('stripe/confirm/', VerifyPaymentView.as_view()),
    path('flutterwave/initiate/', InitiatePaymentView.as_view()),
    path('flutterwave/verify/', VerifyPaymentView.as_view()),

    # path('initiate/', InitiatePaymentView.as_view()),
    # path('verify/', VerifyPaymentView.as_view()),

    # Webhooks
    path('stripe/webhook/', StripeWebhookView.as_view()),
    path('flutterwave/webhook/', FlutterwaveWebhookView.as_view()),

    # Wallet
    path('wallet/', WalletView.as_view()),
    path('wallet/topup/', WalletTopUpView.as_view()),
    path('wallet/topup/confirm/', WalletTopUpView.as_view()),
    path('wallet/pay/', WalletView.as_view()),
    path('wallet/transactions/', WalletTransactionsView.as_view()),


    # Refunds
    path('refunds/', RequestRefundView.as_view()),
    path('refunds/<int:pk>/process/', ProcessRefundView.as_view()),

    # Invoices & payments
    path('invoices/', UserInvoicesView.as_view()),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view()),
    path('my-payments/', UserPaymentsView.as_view()),
    path('my-payments/<int:pk>/', PaymentDetailView.as_view()),

    # Admin
    path('admin/payments/', AdminPaymentListView.as_view()),
    path('admin/payments/summary/', AdminPaymentSummaryView.as_view()),
    path('admin/refunds/', AdminRefundListView.as_view()),
    path('admin/coupons/', AdminCouponView.as_view()),
    path('admin/coupons/<int:pk>/', AdminCouponDetailView.as_view()),
    path('admin/pricing-rules/', AdminDynamicPricingView.as_view()),
    path('pricing/', GetPricingView.as_view()),
    path('admin/vendor-paid/<int:pk>/', AdminMarkVendorPaidView.as_view()),

]