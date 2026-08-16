from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("restaurants", "0011_table_capacity"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymentdetails",
            name="cash_received_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="paymentdetails",
            name="cash_received_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cash_received_payments",
                to="userprofile.userprofile",
            ),
        ),
        migrations.AddField(
            model_name="paymentdetails",
            name="cash_settled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="paymentdetails",
            name="cash_settled_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cash_settled_payments",
                to="userprofile.userprofile",
            ),
        ),
    ]
