#!/usr/bin/env python3
# Verifica codul de control de la finalul unui raport din „Calcul Fulger” („Trimite raportul”).
# Acelasi calcul ca repCode() din sursa/calcul_fulger.html. Daca il schimbi acolo, il schimbi si aici.
#
#   python3 verifica_raport.py              -> lipesti raportul; se opreste singur la „Cod de control”
#   python3 verifica_raport.py raport.txt   -> verifica un raport salvat intr-un fisier
#
# Limita: jocul e public, deci cine citeste codul lui poate calcula un cod nou pentru un text schimbat.
# Codul prinde schimbarile facute de mana (o nota, un numar de zile), nu pe cineva care stie programare.
import re, sys, unicodedata

SALT = "calcul-fulger/raport/v1"
COD = re.compile(r"Cod\s+de\s+control:\s*([0-9A-Fa-f]{4})-?([0-9A-Fa-f]{4})")


def normalizeaza(text):
    text = unicodedata.normalize("NFC", text).replace("\r\n", "\n").replace("\r", "\n")
    randuri = (re.sub(r"\s+", " ", r).strip() for r in text.split("\n"))
    return "\n".join(r for r in randuri if r)


def cod(corp):
    h = 0x811C9DC5                                     # FNV-1a pe 32 de biti
    for b in (SALT + "\n" + normalizeaza(corp)).encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    x = f"{h:08X}"
    return x[:4] + "-" + x[4:]


def verifica(text):
    m = COD.search(text)
    if not m:
        return None, None
    corp = text[:m.start()]
    # Copiat din WhatsApp Web, primul rand poate incepe cu „[08.10, 14:22] Nume: ”. Raportul incepe la ⚡.
    if "⚡" in corp:
        corp = corp[corp.index("⚡"):]
    return (m.group(1) + "-" + m.group(2)).upper(), cod(corp)


def main():
    if len(sys.argv) > 1:
        text = open(sys.argv[1], encoding="utf-8").read()
    else:
        print("Lipește raportul (cu tot cu rândul „Cod de control”), apoi apasă Enter:")
        randuri = []
        for rand in sys.stdin:
            randuri.append(rand)
            if COD.search(rand):
                break
        text = "".join(randuri)
    scris, calculat = verifica(text)
    if scris is None:
        print("\nNu găsesc rândul „Cod de control” în text. Lipește raportul întreg.")
        return 2
    if scris == calculat:
        print(f"\nCOD BUN ({scris}). Raportul este exact cum l-a scris jocul.")
        return 0
    print(f"\nCOD GREȘIT. În raport scrie {scris}, dar textul dă {calculat}.")
    print("Textul a fost schimbat după ce l-a scris jocul (sau nu e lipit întreg).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
