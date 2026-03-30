# Deployment na Netlify

## Krok 1: Przygotuj GitHub repo

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TWOJA_NAZWA/JobApplicationManager.git
git push -u origin main
```

## Krok 2: Deploy na Netlify

1. Wejdź na https://app.netlify.com
2. Kliknij "Add new site" → "Import an existing project"
3. Wybierz GitHub i zaloguj się
4. Wybierz repo `JobApplicationManager`
5. Ustawienia deploymentu:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - Kliknij "Deploy site"

## Krok 3: Konfiguracja gotowa!

- ✅ Frontend wdrażany automatycznie z każdym push do `main`
- ✅ Firestore pracuje z publicznym Firebase config (bezpieczne dla read-only)
- ✅ Aplikacja będzie dostępna na: `https://twoja-aplikacja.netlify.app`

## Ograniczenia na produkcji

**Funkcjonalności niedostępne na Netlify** (działają lokalnie):
- Pobieranie treści z URL (`/api/offer`)
- Robienie screenshotów (`/api/screenshot`)
- Generowanie PDF (`/api/pdf`)

Powody: Playwright (do screenshotów) wymaga pełnego Node.js, a Netlify ma ograniczenia zasobów.

**Rozwiązania:**
1. **Bez nich** - aplikacja pracuje bez tych funkcji (user wklejam URL ręcznie)
2. **Netlify Functions** - ale Playwright byłby zbyt ciężki
3. **Backend na Render/Railway** - dodatkowy serwer Node.js, proxy z Netlify

## Zmienne środowiskowe (opcjonalnie)

Jeśli będziesz używać zmiennych `.env`:

1. W Netlify: Settings → Build & deploy → Environment
2. Dodaj zmienne (Firebase config jest już w kodzie, ale możesz je tam umieścić)

## Firestore Security Rules

Upewnij się, że Firestore Rules pozwalają na odczyt/zapis dla zalogowanych użytkowników.

W Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /offers/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Publikuj rules!
