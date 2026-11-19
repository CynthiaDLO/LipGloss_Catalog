from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0002_commerce")]
    operations = [migrations.AddField(
        model_name="lipgloss", name="stock",
        field=models.PositiveIntegerField(blank=True, default=None, null=True),
    )]
