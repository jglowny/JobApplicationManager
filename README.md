# Offer App

Prosta aplikacja do zapisywania własnych ofert pracy. Pozwala zapisać URL oferty, dodać screen, przypisać CV i ustawić status aplikacji. Dane przechowywane są lokalnie w IndexedDB.

## Funkcje

- Dodawanie ofert z URL i notatkami
- Upload screena oferty i CV
- Statusy aplikacji i szybka zmiana z poziomu listy
- Lokalna baza danych bez backendu

## Uruchomienie

1. Zainstaluj zależności: `npm install`
2. Start backend API: `npm run server`
3. Start dev server: `npm run dev`
4. Build produkcyjny: `npm run build`

## Backend (pobieranie treści z URL)

Backend działa lokalnie i udostępnia endpoint `/api/offer?url=...`. Aplikacja frontendowa korzysta z niego przez proxy Vite.

## Screenshot jako usługa

Backend udostępnia endpoint `/api/screenshot?url=...`, który robi screenshot strony i zwraca obraz PNG. Do działania wymagane jest pobranie przeglądarki Playwright (raz): `npx playwright install chromium`.

## PDF ogłoszenia

Endpoint `/api/pdf?url=...` generuje PDF z widoku ogłoszenia. Wymaga Playwright (jak wyżej).
