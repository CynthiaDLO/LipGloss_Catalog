"""Repair UI preference model defaults without replacing other catalog models."""
import ast
from pathlib import Path

project_root = Path(__file__).resolve().parent
models_path = project_root / "backend" / "catalog" / "models.py"
if not models_path.is_file():
    raise SystemExit("No se encontró backend/catalog/models.py. Pon este script en la raíz de LipGloss_Catalog.")

source = models_path.read_text(encoding="utf-8")
tree = ast.parse(source)
model = next((n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "UserPreference"), None)
if model is None:
    raise SystemExit("No se encontró la clase UserPreference. No se modificó el archivo.")

field_definitions = {
    "language": '    language = models.CharField(max_length=2, choices=[("es", "Español"), ("en", "English")], default="es")',
    "font_scale": '    font_scale = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("1.00"))',
}
lines = source.splitlines(keepends=True)
changes = []
found = set()
for node in model.body:
    if not isinstance(node, ast.Assign):
        continue
    names = [target.id for target in node.targets if isinstance(target, ast.Name)]
    for name in names:
        if name not in field_definitions:
            continue
        if not isinstance(node.value, ast.Call):
            raise SystemExit(f"{name} no es un campo de Django. No se modificó el archivo.")
        found.add(name)
        original = "".join(lines[node.lineno - 1:node.end_lineno])
        # Only change a field lacking the intended default; preserve other existing options.
        has_default = any(keyword.arg == "default" for keyword in node.value.keywords)
        if has_default:
            value = next(keyword.value for keyword in node.value.keywords if keyword.arg == "default")
            existing = ast.unparse(value)
            expected = '"es"' if name == 'language' else 'Decimal("1.00")'
            if name == 'language' and isinstance(value, ast.Constant) and value.value == 'es':
                continue
            if name == 'font_scale' and ('1.00' in existing or existing in ('1', '1.0')):
                continue
        changes.append((node.lineno - 1, node.end_lineno, field_definitions[name] + "\n"))

# If the user never installed the Phase 8 model fields, add them before the first method.
missing = set(field_definitions) - found
if missing:
    insertion = next((n.lineno - 1 for n in model.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))), model.end_lineno)
    changes.append((insertion, insertion, "".join(field_definitions[k] + "\n" for k in ('language', 'font_scale') if k in missing) + "\n"))

for start, end, replacement in sorted(changes, reverse=True):
    lines[start:end] = [replacement]
result = "".join(lines)
if "from decimal import Decimal" not in result:
    result = "from decimal import Decimal\n" + result
if result == source:
    print("Los valores predeterminados ya están configurados.")
else:
    backup = models_path.with_suffix(".py.phase8_backup")
    if not backup.exists():
        backup.write_text(source, encoding="utf-8")
    ast.parse(result)
    models_path.write_text(result, encoding="utf-8")
    print("UserPreference corregido. Respaldo: backend/catalog/models.py.phase8_backup")
