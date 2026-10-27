import secrets
import uuid
from io import BytesIO
from urllib.parse import urlencode

import qrcode
from PIL import Image, ImageDraw, ImageFont
from django.conf import settings
from django.core.files import File
from django.db import models

from apps.restaurants.constants import TableState
from coresite.mixin import AbstractTimeStampModel

DEFAULT_FRONTEND_DOMAIN = "http://localhost:3000"


def generate_qr_key():
    """Random secret printed into a table's QR code.

    Restaurant ids and table numbers are small counters anyone can guess,
    so they cannot prove a guest is at the table. The key can: it only
    exists on the printed QR.
    """
    return secrets.token_urlsafe(16)


def labelled_qr_image(data, title, subtitle):
    """A QR code with two centred caption lines under it, ready to print."""
    qr = qrcode.make(data, box_size=12, border=3).get_image().convert("RGB")
    title_font = ImageFont.load_default(size=34)
    subtitle_font = ImageFont.load_default(size=48)
    caption_height = 130
    canvas = Image.new("RGB", (qr.width, qr.height + caption_height), "white")
    canvas.paste(qr, (0, 0))
    draw = ImageDraw.Draw(canvas)
    centre = qr.width // 2
    draw.text((centre, qr.height + 10), title[:32], font=title_font, fill="black", anchor="mt")
    draw.text((centre, qr.height + 55), subtitle, font=subtitle_font, fill="black", anchor="mt")
    return canvas


class Table(AbstractTimeStampModel):
    """
    A physical table inside a restaurant with an assigned waiter and QR code.
    """
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name="tables"
    )
    table_number = models.PositiveIntegerField()
    table_state = models.PositiveSmallIntegerField(
        choices=TableState.model_choices(),
        default=TableState.EMPTY.value
    )
    capacity = models.PositiveIntegerField(default=5)
    customer_count = models.PositiveIntegerField(default=0)
    assigned_waiter = models.ForeignKey(
        "userprofile.UserProfile",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_tables"
    )
    qr_key = models.CharField(max_length=32, unique=True, default=generate_qr_key, editable=False)
    qr_code = models.ImageField(upload_to="qr_codes/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("restaurant", "table_number")

    def __str__(self):
        return f"{self.table_name} - {self.restaurant}"

    @property
    def table_name(self):
        return f"Table #{self.table_number}"

    @property
    def qr_url(self):
        """The customer-facing link encoded in this table's QR code.

        REACT_DOMAIN should point at the frontend; localhost is the
        development fallback.
        """
        frontend_domain = (getattr(settings, "REACT_DOMAIN", "") or "").rstrip("/")
        query = urlencode({"mode": "dine-in", "table": self.table_number, "key": self.qr_key})
        return f"{frontend_domain or DEFAULT_FRONTEND_DOMAIN}/restaurant/{self.restaurant_id}?{query}"

    def render_qr_code(self):
        """Draw a fresh QR image for the current qr_url (not saved yet),
        captioned with the restaurant name and table number for printing.

        The file name is random because media files are public: a name
        built from the restaurant id and table number would let anyone
        download the QR, and with it the key.
        """
        buffer = BytesIO()
        labelled_qr_image(self.qr_url, self.restaurant.name, self.table_name).save(buffer, format="PNG")
        self.qr_code.save(f"table_{uuid.uuid4().hex}.png", File(buffer), save=False)

    def rotate_qr_key(self):
        """Invalidate the printed QR (for example after it was photographed) and draw a new one."""
        self.qr_key = generate_qr_key()
        self.render_qr_code()
        self.save(update_fields=["qr_key", "qr_code", "updated_at"])

    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.render_qr_code()
        super().save(*args, **kwargs)
