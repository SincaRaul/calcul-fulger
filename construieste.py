# Face aplicatia din joc: ia sursa/calcul_fulger.html (sursa unica a jocului) si
# pune in fata ce ii trebuie unei aplicatii de telefon. Jocul se editeaza doar in sursa/.
#   python3 construieste.py   -> index.html si sw.js cu versiunea noua
import hashlib, pathlib
AICI = pathlib.Path(__file__).resolve().parent
SURSA = AICI / "sursa/calcul_fulger.html"

joc = SURSA.read_text(encoding="utf-8")
cap = """<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#2851D8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Calcul Fulger">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>
// Aplicatia merge si fara internet; telefonul e rugat sa nu stearga progresul.
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
</script>
"""
# Jocul incepe cu <title>, apoi <link>/<style> si corpul: e valid si fara <head>/<body> explicite.
pagina = cap + joc.lstrip() + "\n"
(AICI / "index.html").write_text(pagina, encoding="utf-8")
v = hashlib.sha256(pagina.encode()).hexdigest()[:10]
sw = (AICI / "sw.js").read_text(encoding="utf-8")
import re
sw = re.sub(r"const VERSIUNE = 'cf-[^']*';", f"const VERSIUNE = 'cf-{v}';", sw)
(AICI / "sw.js").write_text(sw, encoding="utf-8")
print("index.html gata, versiunea", v)
