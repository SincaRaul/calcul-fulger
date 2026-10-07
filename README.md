# Calcul Fulger — aplicația de telefon

Jocul „Calcul Fulger” ca aplicație de pus pe ecranul telefonului. Merge și fără internet după
prima deschidere. Progresul stă doar pe telefonul copilului.

## Instalare pe telefon

**Android (Chrome):** deschide linkul → meniul cu trei puncte → „Adaugă pe ecranul de pornire”
(sau „Instalează aplicația”).

**iPhone (Safari):** deschide linkul în Safari → butonul Partajează (pătratul cu săgeată) →
„Adaugă pe ecranul principal”.

Joacă apoi numai din iconița de pe ecran. Pe iPhone, aplicația are progresul ei, separat de Safari.

## Pentru profesor: o versiune nouă a jocului

Jocul se schimbă doar în `sursa/calcul_fulger.html` și se verifică cu `node sursa/test_calcul_fulger.js`
(trebuie să scrie „TOTUL CORECT”). Apoi:

```bash
cd /mnt/g/ZERO_Academy/calcul-fulger-app && python3 construieste.py && git commit -am "Versiune noua" && git push
```

Telefonul ia versiunea nouă la următoarea deschidere cu internet. Progresul rămâne.
Iconițele se refac cu `iconite.ps1` (PowerShell), doar dacă se schimbă desenul.
