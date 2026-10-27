import secrets
import uuid
from io import BytesIO
from urllib.parse import urlencode

import qrcode
from django.conf import settings
from django.core.files import File
from django.db import migrations, models

import apps.restaurants.models.tables


def add_keys_and_redraw_qr_codes(apps, schema_editor):
    """Give every existing table a key and redraw its QR so the printed
    code carries it. The old QR images (without a key) stop working."""
    Table = apps.get_model("restaurants", "Table")
    frontend_domain = (getattr(settings, "REACT_DOMAIN", "") or "").rstrip("/") or "http://localhost:3000"

    for table in Table.objects.all():
        table.qr_key = secrets.token_urlsafe(16)
        query = urlencode({"mode": "dine-in", "table": table.table_number, "key": table.qr_key})
        buffer = BytesIO()
        qrcode.make(f"{frontend_domain}/restaurant/{table.restaurant_id}?{query}").save(buffer, format="PNG")
        table.qr_code.save(f"table_{uuid.uuid4().hex}.png", File(buffer), save=False)
        table.save(update_fields=["qr_key", "qr_code"])


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0026_order_cancel_and_service_requests"),
    ]

    operations = [
        migrations.AddField(
            model_name="table",
            name="qr_key",
            field=models.CharField(editable=False, max_length=32, null=True),
        ),
        migrations.RunPython(add_keys_and_redraw_qr_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="table",
            name="qr_key",
            field=models.CharField(
                default=apps.restaurants.models.tables.generate_qr_key,
                editable=False,
                max_length=32,
                unique=True,
            ),
        ),
    ]
