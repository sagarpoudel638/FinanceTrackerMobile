import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { getAIUsageToday, incrementAIUsage, AI_DAILY_LIMIT } from '../database/db';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

// Fail gracefully early if the key is missing
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
// Use the recommended model for fast, lightweight text tasks
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }) : null;

export const getRemainingAIRequests = async () => {
  try {
    const used = await getAIUsageToday();
    return Math.max(0, AI_DAILY_LIMIT - used);
  } catch {
    return 0; // Default to 0 if DB fails
  }
};

export const getSuggestions = async (transactions) => {
  if (!GEMINI_API_KEY || !model) {
    return 'AI features are currently unavailable. Missing configuration.';
  }

  if (!transactions || transactions.length === 0) {
    return 'Add some transactions first to get AI suggestions.';
  }

  try {
    // 1. Check daily limit inside the try block to catch DB errors
    const used = await getAIUsageToday();
    if (used >= AI_DAILY_LIMIT) {
      return `Daily limit reached (${AI_DAILY_LIMIT} AI requests per day). Come back tomorrow!`;
    }

    // 2. Math & Prompt preparation
    const totalIncome   = transactions.reduce((s, t) => s + (t.income   || 0), 0);
    const totalExpenses = transactions.reduce((s, t) => s + (t.expenses || 0), 0);
    const net = totalIncome - totalExpenses;

    // Take the 20 most recent items safely
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

    // 3. API Call
    const result = await model.generateContent(prompt);
    
    // Safely extract text (handles potential empty responses or safety blocks)
    const responseText = result.response?.text?.();
    if (!responseText) {
      return 'Could not generate suggestions. Please try again.';
    }

    // 4. Track usage only after confirming success
    await incrementAIUsage(); 
    return responseText;

  } catch (error) {
    console.error('AI Suggestion Error:', error); // Good for debugging local builds
    
    // Handle specific HTTP status codes if they exist on the error object
    if (error?.status === 429) {
      return 'AI quota exceeded. Try again later.';
    }
    return 'Failed to get suggestions. Check your internet connection and try again.';
  }
};