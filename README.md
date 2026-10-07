# Calcul Fulger — aplicația de telefon

Jocul „Calcul Fulger” ca aplicație de pus pe ecranul telefonului. Merge și fără internet după
prima deschidere. Progresul stă doar pe telefonul copilului.

## Instalare pe telefon

**Android (Chrome):** deschide linkul → meniul cu trei puncte → „Adaugă pe ecranul de pornire”
(sau „Instalează aplicația”).

**iPhone (Safari):** deschide linkul în Safari → butonul Partajează (pătratul cu săgeată) →
„Adaugă pe ecranul principal”.

Joacă apoi numai din iconița de pe ecran. Pe iPhone, aplicația are progresul ei, separat de Safari.

## Pentru profesor: verifică un raport primit

Raportul din „Trimite raportul” se termină cu `Cod de control: XXXX-XXXX`, calculat din tot textul
de deasupra lui. Dacă elevul schimbă ceva (o cifră, un nume), codul nu se mai potrivește.

```bash
cd /mnt/g/ZERO_Academy/calcul-fulger-app && python3 verifica_raport.py
```

Lipești raportul întreg din WhatsApp și apeși Enter. Programul scrie „COD BUN” sau „COD GREȘIT”.
Spațiile în plus și prefixul de la WhatsApp Web (`[08.10, 14:22] Nume:`) nu contează.
Limita: jocul e public, deci cine citește codul lui poate face un cod nou. Prinde schimbările făcute
de mână, nu pe cineva care știe programare.

## Pentru profesor: o versiune nouă a jocului

Jocul se schimbă doar în `sursa/calcul_fulger.html` și se verifică cu `node sursa/test_calcul_fulger.js`
(trebuie să scrie „TOTUL CORECT”). Apoi:

```bash
cd /mnt/g/ZERO_Academy/calcul-fulger-app && python3 construieste.py && git commit -am "Versiune noua" && git push
```

Telefonul ia versiunea nouă la următoarea deschidere cu internet. Progresul rămâne.
Iconițele se refac cu `iconite.ps1` (PowerShell), doar dacă se schimbă desenul.
