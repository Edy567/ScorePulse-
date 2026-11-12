# ⚽ KickOff AI - Fotbal & Predicții Scor (Express.js + EJS)

Aplicație web construită cu **Express.js**, **EJS** și **Tailwind CSS** care afișează meciurile de fotbal din ziua curentă (sau orice dată selectată) pentru cele mai mari ligi europene și pregătește un **UI complet dedicat predicțiilor AI** (câștigător, scor estimat, grad de încredere, distribuție 1X2 și metrice xG).

---

## 🏆 Competiții Suportate
1. 🇬🇧 **Premier League** (Anglia)
2. 🇪🇸 **La Liga** (Spania)
3. 🇮🇹 **Serie A** (Italia)
4. 🇩🇪 **Bundesliga** (Germania)
5. ⭐ **UEFA Champions League** (Europa)
6. 🟠 **UEFA Europa League** (Europa)

---

## 🌐 Există API-uri Gratuite pentru Fotbal?

Da! Există două opțiuni principale foarte bune:

### 1. **football-data.org (Recomandat și deja integrat)**
- **Cost**: 100% Gratuit.
- **Limită**: 10 cereri / minut (generos pentru un dashboard cu cache).
- **Ligi incluse gratuit**: Premier League, La Liga, Serie A, Bundesliga, Champions League, etc.
- **Cum obții cheia**:
  1. Intră pe [football-data.org/client/register](https://www.football-data.org/client/register).
  2. Introdu numele și adresa de email (nu cere card).
  3. Primești cheia API instant pe email.
  4. Deschide fișierul `.env` din proiect și lipește cheia:
     ```env
     FOOTBALL_DATA_API_KEY=cheia_ta_aici
     ```

### 2. **API-Football (api-sports.io / RapidAPI)**
- Oferă 100 cereri gratuite pe zi pentru toate ligile, inclusiv Europa League și cupe interne.

> **Important**: Aplicația are integrat un **sistem automat Mock / Demo**. Dacă nu pui nicio cheie API în `.env`, aplicația va porni instant cu meciuri simulate ultra-realiste, astfel încât să poți dezvolta și testa UI-ul fără nicio barieră!

---

## 🚀 Instalare și Rulare

1. Intră în directorul proiectului:
   ```bash
   cd "C:\Users\User\.gemini\antigravity\scratch\football-prediction-app"
   ```

2. Instalează dependențele (dacă nu sunt deja instalate):
   ```bash
   npm install
   ```

3. Pornește serverul:
   ```bash
   npm start
   ```
   *Sau pentru dezvoltare cu restart automat:*
   ```bash
   npm run dev
   ```

4. Deschide în browser:
   👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🤖 Cum este Pregătit UI-ul pentru Modelul Tău AI?

Fiecare meci afișează un card dedicat **Predicție AI** ce conține:
- **Câștigător Estimat** (cu evidențiere echipă sau egalitate)
- **Scor Estimat** (ex: `2 - 1`)
- **Procent de Încredere (Confidence Score)** cu bară progres colorată
- **Distribuție Probabilități 1 - X - 2** (ex: `54% - 26% - 20%`)
- **Metrici xG (Expected Goals)** și argumente/factori cheie (ex: avantaje gazde, formă recentă)
- Buton interactiv **"Simulează din nou"** care face apel AJAX în timp real.

### Unde conectezi modelul AI în viitor?
Contractul de date este definit în `services/predictionMock.js`. Când ai modelul tău antrenat (ex: un script Python Scikit-learn / XGBoost, un microserviciu FastAPI sau un prompt LLM):
1. **Endpoint dedicat**: `POST /api/predict/:matchId` în `server.js`.
2. Formatul returnat de modelul tău trebuie doar să respecte JSON-ul:
   ```json
   {
     "predictedWinner": "Arsenal FC",
     "predictedScore": { "home": 2, "away": 1, "display": "2 - 1" },
     "confidence": 78,
     "probabilities": { "home": 58, "draw": 22, "away": 20 },
     "metrics": { "homeXG": "2.10", "awayXG": "0.95", "bothTeamsToScoreProb": "65%" },
     "keyInsights": ["Formă excelentă acasă", "Diferență substanțială xG"]
   }
   ```

---

## 📁 Structura Fișierelor
```
football-prediction-app/
├── server.js                     # Serverul Express & rutele aplicatiei
├── services/
│   ├── footballApi.js            # Integrare API fotbal + sistem fallback cu cache
│   └── predictionMock.js         # Schema & generatorul de predicții AI
├── views/
│   ├── index.ejs                 # Pagina principala
│   └── partials/
│       ├── header.ejs            # Antet cu DatePicker & status
│       ├── footer.ejs            # Subsol cu info arhitectura
│       ├── filter-bar.ejs        # Filtre pe ligi, bara de cautare si statistici
│       └── match-card.ejs        # Card meci cu afisaj complet scor si sectiune AI
├── public/
│   ├── css/style.css             # Stiluri custom, efecte glassmorphism si glow
│   └── js/main.js                # Cautare instantanee, filtrare, simulare predictii
├── .env.example
├── .env
└── package.json
```
