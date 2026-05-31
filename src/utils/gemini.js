import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { getAIUsageToday, incrementAIUsage, AI_DAILY_LIMIT } from '../database/db';

// Local dev: reads from .env → app.config.js extra.geminiApiKey
// EAS Build: reads from EAS Secret injected at build time
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

export const getRemainingAIRequests = async () => {
  const used = await getAIUsageToday();
  return Math.max(0, AI_DAILY_LIMIT - used);
};

export const getSuggestions = async (transactions) => {
  if (!transactions || transactions.length === 0) {
    return 'Add some transactions first to get AI suggestions.';
  }

  // Check daily limit before calling the API
  const used = await getAIUsageToday();
  if (used >= AI_DAILY_LIMIT) {
    return `Daily limit reached (${AI_DAILY_LIMIT} AI requests per day). Come back tomorrow!`;
  }

  const totalIncome   = transactions.reduce((s, t) => s + (t.income   || 0), 0);
  const totalExpenses = transactions.reduce((s, t) => s + (t.expenses || 0), 0);
  const net = totalIncome - totalExpenses;

  const cleaned = transactions.slice(0, 20).map(t => ({
    title:    t.title,
    income:   t.income,
    expenses: t.expenses,
    date:     t.created_at,
  }));

  const prompt = `
You are a personal finance advisor. Analyse the transaction data below and give exactly 3 short, actionable suggestions.

SUMMARY:
- Total Income:   $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Balance:    $${net.toFixed(2)}
- Transactions:   ${transactions.length}

TRANSACTIONS:
${JSON.stringify(cleaned, null, 2)}

INSTRUCTIONS:
- Write exactly 3 suggestions, numbered 1 to 3
- Each suggestion must be one sentence only
- Be specific — reference actual amounts or titles from the data
- No markdown, no bold, no asterisks, no bullet symbols
- Plain text only
`.trim();

  try {
    const result = await model.generateContent(prompt);
    await incrementAIUsage(); // only count successful calls
    return result.response.text();
  } catch (error) {
    if (error.status === 429) return 'AI quota exceeded. Try again later.';
    return 'Failed to get suggestions. Check your API key and internet connection.';
  }
};
