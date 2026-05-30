export const CATEGORIES = [
  { key: 'housing',   label: 'Housing & Utilities',       shortLabel: 'Housing',    icon: 'home',               color: '#5c6bc0' },
  { key: 'food',      label: 'Food & Groceries',          shortLabel: 'Food',       icon: 'fast-food',          color: '#ef6c00' },
  { key: 'transport', label: 'Transportation',            shortLabel: 'Transport',  icon: 'car',                color: '#0288d1' },
  { key: 'health',    label: 'Healthcare & Personal Care',shortLabel: 'Health',     icon: 'heart',              color: '#d81b60' },
  { key: 'insurance', label: 'Insurance & Debt',          shortLabel: 'Insurance',  icon: 'shield-checkmark',   color: '#43a047' },
  { key: 'other',     label: 'Other',                     shortLabel: 'Other',      icon: 'ellipsis-horizontal',color: '#757575' },
];

export const getCategoryByKey = (key) =>
  CATEGORIES.find(c => c.key === key) || CATEGORIES[5]; // fallback to Other
