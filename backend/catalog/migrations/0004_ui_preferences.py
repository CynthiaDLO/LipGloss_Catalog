from django.db import migrations, models
import decimal

class Migration(migrations.Migration):
    dependencies = [("catalog", "0003_optional_stock")]
    operations = [
        migrations.AddField(model_name="userpreference", name="language", field=models.CharField(max_length=2, choices=[("es", "Español"), ("en", "English")], default="es")),
        migrations.AddField(model_name="userpreference", name="font_scale", field=models.DecimalField(max_digits=3, decimal_places=2, default=decimal.Decimal("1.00"))),
    ]
