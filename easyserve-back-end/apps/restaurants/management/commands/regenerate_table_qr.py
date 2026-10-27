from django.core.management.base import BaseCommand

from apps.restaurants.models import Table


class Command(BaseCommand):
    help = (
        "Redraw table QR codes, e.g. after REACT_DOMAIN changes. "
        "With --rotate the tables also get a new key, so the old printed QR codes stop working."
    )

    def add_arguments(self, parser):
        parser.add_argument("--restaurant", type=int, help="Only this restaurant's tables.")
        parser.add_argument("--rotate", action="store_true", help="Issue new keys (old QR prints stop working).")

    def handle(self, *args, **options):
        tables = Table.objects.select_related("restaurant")
        if options["restaurant"]:
            tables = tables.filter(restaurant_id=options["restaurant"])

        for table in tables:
            if options["rotate"]:
                table.rotate_qr_key()
            else:
                table.render_qr_code()
                table.save(update_fields=["qr_code", "updated_at"])
            self.stdout.write(f"{table.restaurant.name} {table.table_name}: {table.qr_url}")

        self.stdout.write(self.style.SUCCESS(f"Redrew {tables.count()} QR code(s)."))
