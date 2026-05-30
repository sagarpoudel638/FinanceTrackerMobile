export default {
  expo: {
    name: 'Finance Tracker',
    slug: 'finance-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#6200ee',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.sagarpoudel.financetracker',
    },
    android: {
      package: 'com.sagarpoudel.financetracker',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#6200ee',
      },
    },
    plugins: [
      'expo-sqlite',
      'expo-asset',
      '@react-native-community/datetimepicker',
    ],
    extra: {
      // In local dev: reads from .env file
      // In EAS Build: reads from EAS Secret
      geminiApiKey: process.env.GEMINI_API_KEY,
      eas: {
        projectId: '5dc7a663-171f-411b-8cd1-ef0ae17e18c8',
      },
    },
  },
};
