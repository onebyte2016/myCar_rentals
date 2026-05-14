from django.contrib import admin
from .models import User, Profile, Role

# Register your models here.
class UserAdmin(admin.ModelAdmin):
    list_display=['full_name', 'email']
    
class ProfileAdmin(admin.ModelAdmin):
    list_display=['user', 'full_name', 'date', 'image']

class RoleAdmin(admin.ModelAdmin):
    list_display=['name', 'description']

# class PermissionAdmin(admin.ModelAdmin):
#     list_display=['name','description']



admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Role, RoleAdmin)
# admin.site.register(Permission, PermissionAdmin)
