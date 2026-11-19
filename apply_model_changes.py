"""Safely add Phase 8 preference fields without overwriting other models."""
from pathlib import Path

path = Path("backend/catalog/models.py")
if not path.exists():
    raise SystemExit("Ejecuta este script desde la raíz LipGloss_Catalog (donde están backend/ y frontend/).")
text = path.read_text(encoding="utf-8")
if "class UserPreference(models.Model):" not in text:
    raise SystemExit("No se encontró UserPreference; no se modificó el archivo.")
if "font_scale = models.DecimalField" in text and "language = models.CharField" in text:
    print("Los nuevos campos ya existen; no se modificó el archivo.")
    raise SystemExit(0)
start = text.index("class UserPreference(models.Model):")
end = text.find("\nclass ", start + 1)
if end < 0: end = len(text)
section = text[start:end]
if "language =" in section or "font_scale =" in section:
    raise SystemExit("Se encontraron campos parciales. Revisa UserPreference manualmente.")
marker = "    def __str__(self):"
if marker not in section:
    raise SystemExit("No se encontró la posición segura de inserción.")
fields = (
    '    language = models.CharField(max_length=2, default="es", choices=[("es", "Español"), ("en", "English")])\n'
    '    font_scale = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("1.00"))\n\n'
)
if 'from decimal import Decimal' not in text:
    text = 'from decimal import Decimal\n' + text
    start = text.index("class UserPreference(models.Model):")
    end = text.find("\nclass ", start + 1)
    if end < 0: end = len(text)
    section = text[start:end]
text = text[:start] + section.replace(marker, fields + marker,1) + text[end:]
path.write_text(text,encoding="utf-8")
print("UserPreference actualizado. Ejecuta makemigrations --check --dry-run antes de migrar.")
