# Finance Tracker — Mobile App

A privacy-first personal finance tracker built with React Native (Expo). All transaction data stays on your device — no accounts, no cloud, no way for anyone else to access your data.

## Features

- Track income and expenses with title, amount, date and optional remarks
- Dashboard with summary cards (Income / Expenses / Net) in AUD
- Pie chart showing income vs expenses breakdown
- Line chart with Weekly / Monthly / Yearly toggle to track trends over time
- AI-powered financial suggestions via Google Gemini (rate-limited to protect free quota)
- Income/Expense type toggle — one transaction is either income or expense, not both
- Edit and delete transactions
- 100% local storage using SQLite — data never leaves your device

## Tech Stack

- React Native + Expo SDK 54
- expo-sqlite — local database
- @react-navigation/bottom-tabs + native-stack — navigation
- react-native-chart-kit — charts
- @google/generative-ai — Gemini 2.5 Flash
- @expo/vector-icons (Ionicons) — icons
- EAS Build — production builds for App Store and Play Store

## Getting Started

```bash
git clone https://github.com/sagarpoudel/FinanceTrackerMobile.git
cd FinanceTrackerMobile
npm install
```

Create a `.env` file in the root:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free API key from [aistudio.google.com](https://aistudio.google.com).

Then start the app:
```bash
npx expo start
```

Scan the QR code with Expo Go on your phone (iOS or Android).

## Privacy

Transaction data is stored locally in SQLite on the device only. No backend, no user accounts, no analytics. Deleting the app permanently deletes all data.

The only external network call is to the Google Gemini API for AI suggestions, which sends anonymised transaction totals and titles. This call is optional and rate-limited.

## Building for Production

Requires an [Expo](https://expo.dev) account and EAS CLI:

```bash
npm install -g eas-cli
eas login
eas build --platform android   # Android APK/AAB
eas build --platform ios       # iOS IPA (requires Apple Developer account)
```

## Project Structure

```
src/
├── database/
│   └── db.js              # SQLite setup and all queries
├── utils/
│   └── gemini.js          # Gemini AI integration + rate limiting
└── screens/
    ├── DashboardScreen.js
    ├── TransactionsScreen.js
    └── AddEditScreen.js
```

## Roadmap

- [ ] Data export (CSV)
- [ ] Budget limits with alerts
- [ ] Categories / tags
- [ ] Pro version with user-supplied API key for unlimited AI suggestions
- [ ] App Store / Play Store release
