from django.core.management import BaseCommand, call_command

class Command(BaseCommand):
    help = "Flush PostgreSQL database and load SQLite data"

    def handle(self, *args, **kwargs):
        self.stdout.write("Flushing PostgreSQL database...")
        call_command("flush", interactive=False)

        self.stdout.write("Running migrations...")
        call_command("migrate")

        self.stdout.write("Loading SQLite data into PostgreSQL...")
        call_command("loaddata", "sqlite_data.json")

        self.stdout.write(self.style.SUCCESS("Data migration completed successfully!"))
