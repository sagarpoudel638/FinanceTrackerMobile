/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx}',
    './index.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6200ee',
        'primary-light': '#f0e6ff',
        income: '#4caf50',
        expense: '#f44336',
        net: '#2196f3',
        warning: '#ff9800',
      },
    },
  },
  plugins: [],
};
