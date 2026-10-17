from django.core.management.base import BaseCommand
from django.db import transaction

from apps.restaurants.models import Table
from apps.restaurants.services.table_lifecycle import table_is_busy


class Command(BaseCommand):
    help = (
        "Free tables left busy after their bill was settled. Uses the same "
        "rule the dashboards use, so it only changes tables with no active "
        "guests and no open order."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report only, change nothing.")

    def handle(self, *args, dry_run=False, **options):
        freed = 0
        for table in Table.objects.select_related("restaurant").order_by("restaurant_id", "table_number"):
            before = table.get_table_state_display()
            with transaction.atomic():
                sid = transaction.savepoint()
                busy = table_is_busy(table)
                table.refresh_from_db()
                after = table.get_table_state_display()
                if dry_run:
                    transaction.savepoint_rollback(sid)
            if before != after:
                freed += 1
            self.stdout.write(
                f"{table.restaurant.name} / Table {table.table_number}: {before} -> {after}"
                f"{' (in use)' if busy else ''}"
            )
        verb = "would be freed" if dry_run else "freed"
        self.stdout.write(self.style.SUCCESS(f"{freed} table(s) {verb}."))
