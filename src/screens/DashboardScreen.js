import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { useFocusEffect, TabActions } from '@react-navigation/native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { getAllTransactions } from '../database/db';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES, getCategoryByKey } from '../utils/categories';

const W = Dimensions.get('window').width;
const TREND_PERIODS = ['Daily', 'Weekly'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
};

const BAR_COLOR         = '#7c3aed';
const BAR_COLOR_FADED   = '#ddd6fe';
const BAR_COLOR_SELECTED= '#6200ee';

const buildDailyTrend = (transactions, selectedIdx) => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key    = d.toISOString().substring(0, 10);
    const label  = d.toLocaleDateString('en-AU', { weekday: 'short' }); // Mon Tue Wed…
    const dayTx  = transactions.filter(t => (t.date || '').substring(0, 10) === key);
    const value  = dayTx.reduce((s, t) => s + (t.expenses || 0), 0);
    const idx    = 6 - i;
    data.push({
      value,
      label,
      frontColor:  selectedIdx === idx ? BAR_COLOR_SELECTED : (value > 0 ? BAR_COLOR : BAR_COLOR_FADED),
      topLabelComponent: selectedIdx === idx
        ? () => <Text style={{ fontSize: 9, color: BAR_COLOR_SELECTED, fontWeight: '700', marginBottom: 2 }}>${value.toFixed(0)}</Text>
        : undefined,
    });
  }
  return data;
};

const buildWeeklyTrend = (transactions, selectedIdx) => {
  const data = [];
  for (let i = 7; i >= 0; i--) {
    const end   = new Date(); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const label = start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); // 1 May
    const weekTx = transactions.filter(t => {
      const d = new Date((t.date || '') + 'T00:00:00');
      return d >= start && d <= end;
    });
    const value = weekTx.reduce((s, t) => s + (t.expenses || 0), 0);
    const idx   = 7 - i;
    data.push({
      value,
      label,
      frontColor: selectedIdx === idx ? BAR_COLOR_SELECTED : (value > 0 ? BAR_COLOR : BAR_COLOR_FADED),
      topLabelComponent: selectedIdx === idx
        ? () => <Text style={{ fontSize: 9, color: BAR_COLOR_SELECTED, fontWeight: '700', marginBottom: 2 }}>${value.toFixed(0)}</Text>
        : undefined,
    });
  }
  return data;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const { theme } = useTheme();

  const [transactions, setTransactions] = useState([]);
  const [trendPeriod, setTrendPeriod]     = useState('Daily');
  const [hidden, setHidden]               = useState(false);
  const [selectedBar, setSelectedBar]     = useState(null);

  useFocusEffect(useCallback(() => {
    getAllTransactions().then(setTransactions);
  }, []));

  const totalIncome   = transactions.reduce((s, t) => s + (t.income   || 0), 0);
  const totalExpenses = transactions.reduce((s, t) => s + (t.expenses || 0), 0);
  const balance       = totalIncome - totalExpenses;

  // Category spending
  const categorySpend = CATEGORIES.map(cat => ({
    ...cat,
    spent: transactions
      .filter(t => (t.category || 'other') === cat.key && (t.expenses || 0) > 0)
      .reduce((s, t) => s + (t.expenses || 0), 0),
  }));

  // Latest 5 transactions
  const latestTx = transactions.slice(0, 5);

  // Trend data
  const trendData = trendPeriod === 'Daily'
    ? buildDailyTrend(transactions, selectedBar)
    : buildWeeklyTrend(transactions, selectedBar);

  const maxTrend = Math.max(...trendData.map(d => d.value), 10);

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Your Balance ──────────────────────────────────────────────────── */}
      <View style={[s.balanceCard, { backgroundColor: '#6200ee' }]}>
        <View style={s.balanceTop}>
          <Text style={s.balanceLabel}>Your Balance</Text>
          <TouchableOpacity onPress={() => setHidden(h => !h)}>
            <Ionicons name={hidden ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
        <Text style={s.balanceAmount}>
          {hidden ? '••••••' : `${balance < 0 ? '-' : ''}$${Math.abs(balance).toFixed(2)}`}
        </Text>
        <View style={s.balanceRow}>
          <View style={s.balanceSub}>
            <Ionicons name="arrow-down-circle" size={14} color="#a5f3a5" />
            <Text style={s.balanceSubLabel}>  Income  </Text>
            <Text style={s.balanceSubValue}>{hidden ? '••••' : `$${totalIncome.toFixed(2)}`}</Text>
          </View>
          <View style={s.balanceDivider} />
          <View style={s.balanceSub}>
            <Ionicons name="arrow-up-circle" size={14} color="#fca5a5" />
            <Text style={s.balanceSubLabel}>  Expenses  </Text>
            <Text style={s.balanceSubValue}>{hidden ? '••••' : `$${totalExpenses.toFixed(2)}`}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        {/* ── Add buttons ───────────────────────────────────────────────────── */}
        <View style={s.addRow}>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: '#e8f5e9' }]}
            onPress={() => navigation.navigate('AddEdit', { defaultType: 'income' })}
            activeOpacity={0.8}
          >
            <View style={[s.addBtnIcon, { backgroundColor: '#4caf50' }]}>
              <Ionicons name="arrow-down" size={18} color="#fff" />
            </View>
            <Text style={[s.addBtnText, { color: '#2e7d32' }]}>Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: '#ffebee' }]}
            onPress={() => navigation.navigate('AddEdit', { defaultType: 'expenses' })}
            activeOpacity={0.8}
          >
            <View style={[s.addBtnIcon, { backgroundColor: '#ef5350' }]}>
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </View>
            <Text style={[s.addBtnText, { color: '#b71c1c' }]}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* ── Expense Trend ─────────────────────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: theme.card }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Expense Trend</Text>
            <View style={[s.toggleGroup, { backgroundColor: theme.background }]}>
              {TREND_PERIODS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[s.toggleBtn, trendPeriod === p && s.toggleBtnActive]}
                  onPress={() => { setTrendPeriod(p); setSelectedBar(null); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.toggleText, { color: theme.subtext }, trendPeriod === p && s.toggleTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected bar summary */}
          {selectedBar !== null && trendData[selectedBar] ? (
            <View style={[s.tooltipBanner, { backgroundColor: theme.background }]}>
              <Text style={[s.tooltipText, { color: theme.text }]}>
                {trendData[selectedBar].label}{'  '}
                <Text style={{ color: BAR_COLOR_SELECTED, fontWeight: '800' }}>
                  ${trendData[selectedBar].value.toFixed(2)}
                </Text>
              </Text>
            </View>
          ) : (
            <Text style={[s.tooltipHint, { color: theme.muted }]}>Tap a bar to see details</Text>
          )}

          <BarChart
            data={trendData}
            barWidth={trendPeriod === 'Daily' ? 32 : 24}
            spacing={trendPeriod === 'Daily' ? 12 : 10}
            roundedTop
            barBorderRadius={6}
            noOfSections={4}
            maxValue={maxTrend * 1.25}
            height={160}
            width={W - 64}
            xAxisColor={theme.border}
            yAxisColor="transparent"
            yAxisTextStyle={{ color: theme.subtext, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.subtext, fontSize: 10, marginTop: 4 }}
            hideRules={false}
            rulesColor={theme.border}
            rulesType="dashed"
            backgroundColor={theme.card}
            disableScroll={trendPeriod === 'Daily'}
            onPress={(item, index) => setSelectedBar(prev => prev === index ? null : index)}
            showGradient
            gradientColor={BAR_COLOR_FADED}
            isAnimated
          />
        </View>

        {/* ── Expense Categories ────────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { color: theme.text }]}>Expense Categories</Text>
        <View style={s.catGrid}>
          {categorySpend.map(cat => (
            <View key={cat.key} style={[s.catCard, { backgroundColor: theme.card }]}>
              <View style={[s.catIcon, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={[s.catLabel, { color: theme.subtext }]} numberOfLines={1}>{cat.shortLabel}</Text>
              <Text style={[s.catAmount, { color: cat.spent > 0 ? cat.color : theme.muted }]}>
                {cat.spent > 0 ? `$${cat.spent.toFixed(2)}` : '$0.00'}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Latest Transactions ───────────────────────────────────────────── */}
        <View style={s.txHeader}>
          <Text style={[s.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Latest Transactions</Text>
          <TouchableOpacity onPress={() => navigation.dispatch(TabActions.jumpTo('Transactions'))}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {latestTx.length === 0 ? (
          <View style={[s.card, s.emptyTx, { backgroundColor: theme.card }]}>
            <Ionicons name="receipt-outline" size={36} color={theme.muted} />
            <Text style={[s.emptyTxText, { color: theme.subtext }]}>No transactions yet</Text>
          </View>
        ) : (
          latestTx.map(item => {
            const isIncome = (item.income || 0) > 0;
            const cat = getCategoryByKey(item.category || 'other');
            return (
              <View key={item.id} style={[s.txRow, { backgroundColor: theme.card }]}>
                <View style={[s.txIcon, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
                <View style={s.txCenter}>
                  <Text style={[s.txTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[s.txDate,  { color: theme.muted }]}>{formatDate(item.date)}</Text>
                </View>
                <Text style={[s.txAmount, { color: isIncome ? '#4caf50' : '#ef5350' }]}>
                  {isIncome ? '+' : '-'}${(isIncome ? item.income : item.expenses).toFixed(2)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  section: { padding: 16 },

  // Balance card
  balanceCard: { margin: 16, borderRadius: 24, padding: 24 },
  balanceTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  balanceAmount: { color: '#fff', fontSize: 38, fontWeight: '800', marginBottom: 20 },
  balanceRow:    { flexDirection: 'row', alignItems: 'center' },
  balanceSub:    { flex: 1, flexDirection: 'row', alignItems: 'center' },
  balanceDivider:{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  balanceSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  balanceSubValue: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Add buttons
  addRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 10 },
  addBtnIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 14, fontWeight: '700' },

  // Cards
  card: {
    borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:  { fontSize: 15, fontWeight: '700' },

  // Trend toggle
  toggleGroup:      { flexDirection: 'row', borderRadius: 10, padding: 3 },
  toggleBtn:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  toggleBtnActive:  { backgroundColor: '#6200ee' },
  toggleText:       { fontSize: 12, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },

  // Tooltip
  tooltipBanner: { borderRadius: 10, padding: 8, marginBottom: 10, alignItems: 'center' },
  tooltipText:   { fontSize: 13, fontWeight: '600' },
  tooltipHint:   { fontSize: 12, textAlign: 'center', marginBottom: 10 },

  // Section titles
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  catCard: {
    width: (W - 52) / 3,
    borderRadius: 16, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  catIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catLabel:  { fontSize: 11, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  catAmount: { fontSize: 13, fontWeight: '800' },

  // Transaction header
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll:   { color: '#6200ee', fontWeight: '700', fontSize: 13 },

  // Transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  txIcon:   { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txCenter: { flex: 1 },
  txTitle:  { fontSize: 14, fontWeight: '600' },
  txDate:   { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },

  emptyTx:     { alignItems: 'center', paddingVertical: 24 },
  emptyTxText: { marginTop: 8, fontSize: 14, fontWeight: '500' },
});
