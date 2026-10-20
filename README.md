# Lustro — badanie ankiet

Analiza samooceny, wiedzy o dezinformacji i otwartych odpowiedzi o podatności. Import ankiet XLSX/CSV i testów PRZED/PO; jawny klucz siedmiu pytań; porównanie grupowe; edycja kategorii; eksport CSV i drukowanie/PDF.

Dane są przetwarzane i zapisywane wyłącznie lokalnie (localStorage). Przycisk „Usuń wszystkie dane” czyści zapisaną analizę. Repozytorium zawiera wyłącznie fikcyjny przykład, bez rzeczywistych odpowiedzi ankietowanych.

## Wersja internetowa

https://kds2026.github.io/analiza-ankiet/

## Aplikacja na Maca

Samodzielna aplikacja WebKit dla macOS 12+ na Apple Silicon. Nie uruchamia serwera; pliki interfejsu są w pakiecie aplikacji. Obsługuje wybór plików, zapis eksportów i drukowanie/PDF.

Budowanie (wymaga narzędzi Apple Command Line Tools):

```bash
bash macos/build.sh "$HOME/Applications/Badanie ankiet.app"
```

## Publikacja

GitHub Pages publikuje katalog `docs` z gałęzi `main`.

Wynik testu mierzy wiedzę o siedmiu mechanizmach. Samoocena rozpoznawania dezinformacji jest innym pomiarem. Bez wspólnych identyfikatorów uczestników aplikacja nie oblicza indywidualnej korelacji ani nie paruje osób między pomiarami.
