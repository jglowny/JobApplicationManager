# JobApplicationManager

JobApplicationManager to aplikacja do zarządzania procesem aplikowania na oferty pracy.

Pozwala trzymać wszystkie ogłoszenia w jednym miejscu, monitorować statusy i zachowywać materiały (screenshot, PDF ogłoszenia, CV) przypisane do konkretnej oferty.

## Funkcje

- zapisywanie ofert z URL, opisem i notatkami
- statusy procesu rekrutacyjnego (od szkicu do oferty/odrzucenia)
- automatyczne pobieranie danych z ogłoszenia
- generowanie screenshotów i PDF ogłoszeń przez backend
- przypinanie i pobieranie CV
- eksport/import danych

## Uruchomienie

1. Zainstaluj zależności: `npm install`
2. Zainstaluj Chromium dla Playwright (jednorazowo): `npx playwright install chromium`
3. Start backend API: `npm run server`
4. Start serwer ofert jobs API (opcjonalnie): `npm run jobs-server`
5. Start dev server: `npm run dev`
6. Build produkcyjny: `npm run build`

## Architektura (skrót)

- Frontend: React + TypeScript + Vite
- Lokalna baza: Dexie (IndexedDB)
- Backend: Express (pobieranie treści ofert, screenshoty, PDF, zapis plików)
- Cloud (opcjonalnie): Firestore
- Deploy frontend: Netlify
- Deploy backend: Render/Railway

## Endpointy API

- `GET /api/offer?url=...` - pobranie danych ogłoszenia
- `GET /api/screenshot?url=...` - screenshot ogłoszenia
- `GET /api/pdf?url=...` - PDF ogłoszenia
- `POST /api/files` - zapis plików w projekcie
- `POST /api/offers?url=...&category=web|it&status=...` - utworzenie oferty po stronie serwera

## Ograniczenia

- funkcje screenshot/PDF wymagają działającego backendu Node.js
- sama aplikacja frontendowa na Netlify nie wykona Playwright lokalnie
- endpoint serwerowy zapisuje oferty do Firestore (nie do lokalnego IndexedDB użytkownika)

## Uwagi

- folder `uploads/` jest lokalnym storage dla wygenerowanych plików
- przed produkcją warto ograniczyć CORS i dodać prostą autoryzację endpointów zapisu
3. Start dev server: `npm run dev`
4. Build produkcyjny: `npm run build`

## Backend (pobieranie treści z URL)

Backend działa lokalnie i udostępnia endpoint `/api/offer?url=...`. Aplikacja frontendowa korzysta z niego przez proxy Vite.

## Screenshot jako usługa

Backend udostępnia endpoint `/api/screenshot?url=...`, który robi screenshot strony i zwraca obraz PNG. Do działania wymagane jest pobranie przeglądarki Playwright (raz): `npx playwright install chromium`.

## PDF ogłoszenia

Endpoint `/api/pdf?url=...` generuje PDF z widoku ogłoszenia. Wymaga Playwright (jak wyżej).
