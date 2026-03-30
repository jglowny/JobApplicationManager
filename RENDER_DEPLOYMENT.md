# Deployment Backend na Render.com

## Krok 1: Utwórz Render account
- Wejdź na https://render.com
- Zaloguj się GitHub
- Kliknij "New +"

## Krok 2: New Web Service
1. Wybierz repo `JobApplicationManager`
2. Ustawienia:
   - **Name**: `jam-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Plan**: Free (lub Starter)

## Krok 3: Environment Variables
W Render Settings → Environment:
- Nic nie trzeba, backend nie ma zależności

## Krok 4: Ustaw URL w Netlify
1. Po deploymencie, skopiuj URL z Render (np. `https://jam-backend.render.com`)
2. Wejdź do Netlify Settings → Build & deploy → Environment
3. Dodaj: `BACKEND_URL = https://jam-backend.render.com`
4. Redeploy site

## Krok 5: Weryfikuj
- Frontend na Netlify będzie wywoływać `/api/screenshot` itd.
- Netlify Functions będą proxy do backendu na Render
- Playwright na Render będzie robić screenshoty

**Bonus**: Twój backend będzie działać na `https://jam-backend.render.com/api/screenshot?url=...`
