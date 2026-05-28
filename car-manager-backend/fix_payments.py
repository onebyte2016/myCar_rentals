from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        DROP TABLE IF EXISTS 
            paymentsystem_splitpayment,
            paymentsystem_invoice,
            paymentsystem_refund,
            paymentsystem_securitydeposit,
            paymentsystem_couponusage,
            paymentsystem_payment,
            paymentsystem_dynamicpricingrule,
            paymentsystem_coupon,
            paymentsystem_wallettransaction,
            paymentsystem_wallet
        CASCADE;
    """)
    cursor.execute("DELETE FROM django_migrations WHERE app = 'paymentsystem';")
    print('Tables dropped and migration records cleared')