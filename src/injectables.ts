export const changePasswordPythonCommand: string = `from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
	help = 'Changes the password for a given user'
	
	def add_arguments(self, parser):
		parser.add_argument('--username', type=str, required=True)
		parser.add_argument('--password', type=str, required=True)
	
	def handle(self, *args, **options):
		username, password = options['username'], options['password']
		try:
			user = User.objects.get(username=username)
			user.set_password(password)
			user.save()
			self.stdout.write(self.style.SUCCESS('Password changed successfully!'))
		except User.DoesNotExist:
			self.stdout.write(self.style.ERROR(f'User {username} does not exist.'))`;

export const djangoManCreateSuperUserCommand: string = `from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
					
class Command(BaseCommand):
	help = 'Create a new superuser non-interactively for django-man VS extension'
					
	def add_arguments(self, parser):
		parser.add_argument('--username', type=str, required=True)
		parser.add_argument('--password', type=str, required=True)
					
	def handle(self, *args, **options):
		User.objects.create_superuser(username=options['username'], password=options['password'], email=f"{options['username']}@example.com")`;

