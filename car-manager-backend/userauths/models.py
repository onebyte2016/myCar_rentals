from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db.models.signals import post_save
# from django.contrib.auth.models import Permission
from django.apps import apps
# from django.contrib.auth.models import Group

def get_company_instance():
    Company = apps.get_model('core', 'Company')


# Create your models here.

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()

    permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True
    )

# class Role(models.Model):
#     name = models.CharField(max_length=100, unique=True)  # Ensure role names are unique
#     description = models.TextField()  # Description of the role
#     permissions = models.ManyToManyField(Permission, blank=True)  # No 'on_delete' needed for ManyToManyField

#     def __str__(self):
#         return self.name

#     class Meta:
#         verbose_name = "Role"
#         verbose_name_plural = "Roles"


class User(AbstractUser):
    username = models.CharField(unique=True, max_length=100,null=True, blank=True)
    email = models.EmailField(unique=True, max_length=100, null=True, blank=True)
    full_name = models.CharField(unique=True, max_length=100, null=True, blank=True)
    phone = models.CharField(unique=True, max_length=100, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    otp = models.CharField(max_length=100, null=True, blank=True)
    refresh = models.CharField(max_length=100, null=True, blank=True)
    # company = models.ForeignKey('core.Company', on_delete=models.CASCADE, null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self) -> str:
        return self.email
    objects = UserManager()
    def save(self, *args, **kwargs):
        email_username, full_name = self.email.split('@')
        if self.full_name == "" or self.full_name==None:
            self.full_name=email_username
        if self.username== "" or self.username==None:
            self.username=email_username
        super(User, self).save(*args,**kwargs)
        
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.FileField(upload_to="user-folder", default="default-user.jpg", null=True, blank=True)
    full_name = models.CharField(max_length=100)
    country = models.CharField(max_length=100, null=True,blank=True)
    about = models.TextField(null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.full_name:
            return str(self.full_name)
        else:
            return str(self.user.full_clean)
        
    def save(self, *args, **kwargs):
        if self.full_name == "" or self.full_name==None:
            self.full_name = self.user.username
            super(Profile, self).save(*args, **kwargs)

    def create_user_profile(sender, instance, created, **kwargs):
        if created:
            Profile.objects.create(user=instance)

    def save_user_profile(sender, instance, **kwargs):
        instance.profile.save()
    post_save.connect(create_user_profile, sender=User)
    post_save.connect(save_user_profile, sender=User)


# class Permission(models.Model):
#     name = models.CharField(max_length=200, unique=True)  # Ensure permission names are unique
#     description = models.TextField()  # Description of the permission

#     def __str__(self):
#         return self.name

#     class Meta:
#         verbose_name = "Permission"
#         verbose_name_plural = "Permissions"




# class CustomGroup(Group):
#     description = models.TextField(null=True, blank=True)

#     class Meta:
#         verbose_name = 'Group'
#         verbose_name_plural = 'Groups'
