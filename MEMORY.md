# FinanceTrackerMobile — Session Memory
_Last updated: 2026-05-30_

---

## Who

- **User:** Sagar Poudel — `mailtosagarpoudel@gmail.com`
- Full-stack developer. Built a web app (React + Node/Express + MongoDB) and is now building the mobile companion.
- Prefers concise, direct responses. Wants honest critique, not agreement.

---

## Project Overview

**FinanceTracker** — monorepo at `/Dented_Code/FinanceTracker/`

```
FinanceTracker/
├── FinanceTrackerBackEnd/    Node.js + Express + MongoDB Atlas (deployed on Render.com)
├── FinanceTrackerFrontEnd/   React 18 + Vite (deployed on Render.com)
└── FinanceTrackerMobile/     Expo SDK 54 + React Native 0.81 (this project)
```

---

## Mobile App — Key Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Architecture | Local-first (SQLite only) | Privacy — no server can read user data |
| Auth | None | No accounts, no cross-device sync |
| AI Suggestions | Gemini 2.5 Flash direct from app | No backend needed |
| API key storage | EAS Secret + local `.env` | Never in GitHub |
| Rate limiting | 5 AI requests/device/day | Protect free quota (250 req/day shared) |
| Navigation | Bottom tabs (4) + Stack modal for AddEdit | Clean separation |
| Charts | react-native-gifted-charts | 3D bars, donut pie, interactive |
| Styling | StyleSheet (no NativeWind) | NativeWind v4 had cascading dependency issues with Expo SDK 54 |

---

## Current App Structure

### Navigation
```
RootStack (NativeStack)
├── Main → MainTabs (BottomTabs)
│   ├── Dashboard
│   ├── Transactions
│   ├── Insights
│   └── Settings
└── AddEdit (modal)
```

### Screens

**DashboardScreen**
- "Your Balance" card (full-width purple, eye toggle to hide amounts)
- Add Income / Add Expense buttons → navigate to AddEdit modal
- Expense Trend bar chart (Daily = last 7 days Mon–Sun, Weekly = last 8 weeks with dates)
- 6 Expense Category cards (Housing, Food, Transport, Health, Insurance, Other)
- Latest 5 transactions with "See All" → `navigation.dispatch(TabActions.jumpTo('Transactions'))`

**TransactionsScreen** — FlatList, category icon per row, edit/delete

**InsightsScreen**
- Income vs Expenses donut
- Expenses by category donut
- 3-line chart (income + expenses + balance) with Weekly/Monthly/Yearly toggle
- Get AI Suggestions button

**AddEditScreen** — Stack modal, accepts `defaultType` param ('income'|'expenses'), category picker for expenses

**SettingsScreen** — Dark mode toggle, transaction count, Export JSON, Export CSV, Import

### Database (`expo-sqlite`)
```sql
transactions (id, title, income, expenses, date, remarks, category, created_at)
ai_usage (date, count)  -- tracks daily AI requests per device
```

### Key Files
| File | Purpose |
|---|---|
| `src/database/db.js` | All SQLite queries + AI usage tracking |
| `src/utils/gemini.js` | Gemini 2.5 Flash + daily rate limiter |
| `src/utils/categories.js` | 6 expense categories with icons/colors |
| `src/utils/api.js` | (legacy, not actively used — was for backend proxy) |
| `src/context/ThemeContext.js` | Light/dark theme, persisted via AsyncStorage |
| `app.config.js` | Dynamic Expo config (replaces app.json) |

---

## Tech Stack

```
Expo SDK 54 / React Native 0.81
@react-navigation/bottom-tabs + native-stack
expo-sqlite
react-native-gifted-charts  (charts)
@expo/vector-icons (Ionicons)
@react-native-async-storage/async-storage  (theme persistence)
expo-file-system (legacy import) + expo-sharing + expo-document-picker  (export/import)
@react-native-community/datetimepicker
@google/generative-ai
expo-constants  (reads GEMINI_API_KEY from app.config.js extra)
expo-linear-gradient
```

---

## EAS / Deployment

- EAS project ID: `5dc7a663-171f-411b-8cd1-ef0ae17e18c8`
- Bundle ID (iOS): `com.sagarpoudel.financetracker`
- Package (Android): `com.sagarpoudel.financetracker`
- `GEMINI_API_KEY` stored as EAS Secret (not in repo)
- Local dev: `.env` file (gitignored) with `GEMINI_API_KEY=...`
- Git branches: `main` (stable) + `dev` (work in progress)

### To build
```bash
eas build --platform android --profile preview   # APK for testing
eas build --platform ios                          # needs $99 Apple Developer account
```

---

## Known Issues Fixed This Session

| Bug | Fix |
|---|---|
| NativeWind v4 cascading deps | Dropped it, use StyleSheet |
| `expo-file-system` deprecated API | Use `expo-file-system/legacy` import → switched to `new File()` API → read via `fetch(uri)` |
| Import file read failing | `fetch(file.uri)` instead of File API |
| `navigate('Transactions')` from AddEdit | `navigation.goBack()` + `navigation.getParent()?.dispatch(TabActions.jumpTo('Transactions'))` |
| `navigate('Transactions')` from Dashboard | `navigation.dispatch(TabActions.jumpTo('Transactions'))` with nav prop (not useNavigation hook) |
| Daily bar chart showing no bars | `toISOString()` returns UTC, shifts date in AU timezone. Fixed with `localDateKey()` using `getFullYear/Month/Date` |
| Bar chart overflow | `width={W - 112}` + `overflow: 'hidden'` wrapper |
| Net card showing wrong sign | `Math.abs()` was stripping negative. Fixed with conditional display |

---

## Sagar's Preferences & Style

- **Privacy-first** — chose local SQLite over cloud sync specifically so he and his friends know no developer can read their data
- **AUD currency** — cents matter, use `.toFixed(2)` everywhere
- **Honest feedback** — don't agree just to agree, push back when needed
- **Concise** — no unnecessary explanation
- Wants app on iPhone daily → needs $99 Apple Developer account (acknowledged, will pay when ready to launch)
- Plans a **pro version** with user-supplied API key for unlimited AI suggestions
- Using **Expo Go** for now (requires Mac + terminal running)

---

## Backend (Web App — for reference)

- Deployed: `https://financetrackerbackend-jxbb.onrender.com`
- Routes: `/api/v1/auth/*` and `/api/v1/transactions/*`
- Mobile-specific route added: `POST /api/v1/transactions/mobile/suggestions` (protected by `x-app-secret` header, no JWT needed)
- `APP_SECRET=ft-mobile-2026-xy78` set in Render dashboard
- Email via Resend from `noreply@itsmesagar.com`
- Free tier spins down after 15min idle (first request ~30s)
