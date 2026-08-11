from django.core.management import BaseCommand, call_command

class Command(BaseCommand):
    help = "Dump data from the local SQLite database"

    def handle(self, *args, **kwargs):
        self.stdout.write("Dumping data from SQLite...")

        call_command(
            'dumpdata',
            '--exclude=auth.permission',
            '--exclude=contenttypes',
            output='sqlite_data.json'
        )

        self.stdout.write(self.style.SUCCESS("sqlite_data.json created successfully!"))
