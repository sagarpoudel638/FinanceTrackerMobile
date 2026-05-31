import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@finance_tracker_currency';

export const CURRENCIES = [
  { symbol: '$',   label: 'USD – US Dollar',          flag: '🇺🇸' },
  { symbol: 'A$',  label: 'AUD – Australian Dollar',  flag: '🇦🇺' },
  { symbol: 'C$',  label: 'CAD – Canadian Dollar',    flag: '🇨🇦' },
  { symbol: 'NZ$', label: 'NZD – New Zealand Dollar', flag: '🇳🇿' },
  { symbol: '£',   label: 'GBP – British Pound',      flag: '🇬🇧' },
  { symbol: '€',   label: 'EUR – Euro',               flag: '🇪🇺' },
  { symbol: 'CHF', label: 'CHF – Swiss Franc',        flag: '🇨🇭' },
  { symbol: '₹',   label: 'INR – Indian Rupee',       flag: '🇮🇳' },
  { symbol: 'रू',  label: 'NPR – Nepalese Rupee',     flag: '🇳🇵' },
  { symbol: '৳',   label: 'BDT – Bangladeshi Taka',   flag: '🇧🇩' },
  { symbol: '¥',   label: 'JPY – Japanese Yen',       flag: '🇯🇵' },
  { symbol: 'CN¥', label: 'CNY – Chinese Yuan',       flag: '🇨🇳' },
  { symbol: '₩',   label: 'KRW – South Korean Won',   flag: '🇰🇷' },
  { symbol: '฿',   label: 'THB – Thai Baht',          flag: '🇹🇭' },
  { symbol: 'RM',  label: 'MYR – Malaysian Ringgit',  flag: '🇲🇾' },
  { symbol: '₱',   label: 'PHP – Philippine Peso',    flag: '🇵🇭' },
  { symbol: '₫',   label: 'VND – Vietnamese Dong',    flag: '🇻🇳' },
  { symbol: 'Rp',  label: 'IDR – Indonesian Rupiah',  flag: '🇮🇩' },
  { symbol: 'R',   label: 'ZAR – South African Rand', flag: '🇿🇦' },
  { symbol: '₦',   label: 'NGN – Nigerian Naira',     flag: '🇳🇬' },
  { symbol: 'Ksh', label: 'KES – Kenyan Shilling',    flag: '🇰🇪' },
  { symbol: 'AED', label: 'AED – UAE Dirham',         flag: '🇦🇪' },
  { symbol: '﷼',   label: 'SAR – Saudi Riyal',        flag: '🇸🇦' },
  { symbol: 'kr',  label: 'SEK – Swedish Krona',      flag: '🇸🇪' },
  { symbol: 'kr',  label: 'NOK – Norwegian Krone',    flag: '🇳🇴' },
];

const CurrencyContext = createContext({ currency: '$', setCurrency: () => {} });

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('$');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setCurrencyState(val);
      setLoaded(true);
    });
  }, []);

  const setCurrency = async (symbol) => {
    setCurrencyState(symbol);
    await AsyncStorage.setItem(STORAGE_KEY, symbol);
  };

  if (!loaded) return null;
  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
