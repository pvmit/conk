# Conquest

Aplikacja do gry terenowej na **trzech punktach** (A, B, C) i dwóch drużynach: Czerwonych i Niebieskich.

Każdy operator punktu ma telefon z czasem kontroli **tego punktu**. Panel administratora pokazuje wszystkie trzy punkty naraz oraz **łączny czas kontroli** — sumę z A + B + C.

Działa na laptopie, tablecie i telefonie. Panel admina jest czytelny z większej odległości.

Nie wymaga `npm install`. Statyczne pliki + mały serwer Node (wbudowany w system, bez paczek).

## Co jest źródłem prawdy

Czas **nie** jest sumowany z tego, co widać na ekranie.

Każdy punkt trzyma w bazie:

- `status` (czerwoni / niebiescy / sporny / wolny)
- `red_total_time` i `blue_total_time` (milisekundy już naliczone)
- `last_change_timestamp`

Jeśli Czerwoni właśnie kontrolują punkt A, ich czas na A to:

```text
zapisany czas Czerwonych na A + (teraz − last_change_timestamp)
```

Gdy punkt jest sporny albo wolny, czas stoi. Panel admina dodaje **żywe** czasy z A, B i C:

```text
łączny czas Czerwonych = A.red + B.red + C.red
łączny czas Niebieskich = A.blue + B.blue + C.blue
```

Paski „łącznej kontroli” to tylko wizualizacja tych sum, nie osobna punktacja.

## Szybki start (podgląd na jednym komputerze)

Potrzebujesz Node.js.

```bash
node server.js
```

Otwórz [http://localhost:5173](http://localhost:5173). Bez konfiguracji bazy aplikacja działa w **trybie demo** (dane tylko na tym urządzeniu / w kartach tej samej przeglądarki).

Do prawdziwej gry na osobnych telefonach potrzebny jest Supabase.

## Gra na kilku telefonach (Supabase)

1. Załóż darmowy projekt na [supabase.com](https://supabase.com).
2. W SQL Editor wklej i uruchom [`supabase/schema.sql`](supabase/schema.sql).
3. W Database → Replication włącz tabelę `points` (Realtime).
4. Skopiuj **Project URL** i **anon public** key (Settings → API).
5. W aplikacji wejdź w **Ustawienia** i wklej te same dane na **każdym** telefonie (punkty + admin).

Od tego momentu zmiana statusu na punkcie A od razu widać na panelu administratora — bez odświeżania strony.

## Obsługa

### Ekran punktu

Duże przyciski:

- tap w **Czerwonych** → punkt pod kontrolą Czerwonych, ich czas rośnie
- tap w **Niebieskich** → analogicznie
- **SPORNY** → nikt nie nalicza czasu
- **RESET PUNKTU** → `00:00:00 / 00:00:00` na tym punkcie; do sumy wchodzą zera

### Panel administratora

- łączny czas obu drużyn
- paski proporcjonalne do tych czasów
- karty A / B / C: czasy, status, podgląd na żywo
- **RESET GRY** → A, B, C i suma wracają do zera

## Publikacja na GitHub Pages

Repozytorium jest gotowe do wrzucenia na GitHub. W ustawieniach repo:

**Settings → Pages → Deploy from a branch → `main` / `/ (root)`**

Potem każdy telefon otwiera ten sam adres. Na każdym urządzeniu raz wklejasz dane Supabase (zostają w przeglądarce).

Na hostingu publicznym **nie wklejaj service role key**. Anon key jest kluczem przeglądarkowym — kto zna URL aplikacji i klucz, może zmieniać stan gry. Do gry harcerskiej to zwykle wystarcza.

## Reset a suma

| Akcja | Skutek |
| --- | --- |
| Reset punktu A | A = 00:00:00 / 00:00:00, B i C bez zmian, suma = B + C |
| Reset gry | A, B, C i suma = 00:00:00 |
