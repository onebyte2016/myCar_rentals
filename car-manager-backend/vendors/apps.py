from django.apps import AppConfig

class VendorsConfig(AppConfig):
    name = 'vendors'

    def ready(self):
        import vendors.signals  # noqa