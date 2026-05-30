import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, StyleSheet, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { getAllTransactions } from '../database/db';
import { getSuggestions, getRemainingAIRequests } from '../utils/gemini';
import { useTheme } from '../context/ThemeContext';
import { CATEGORIES, getCategoryByKey } from '../utils/categories';

const W = Dimensions.get('window').width;
const PERIODS = ['Weekly', 'Monthly', 'Yearly'];

const buildData = (transactions, period) => {
  const incomeArr = [], expenseArr = [], balanceArr = [];

  if (period === 'Weekly') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key   = d.toISOString().substring(0, 10);
      const label = d.toLocaleDateString('en-AU', { weekday: 'short' });
      const tx = transactions.filter(t => (t.date || '').substring(0, 10) === key);
      const inc = tx.reduce((s, t) => s + (t.income   || 0), 0);
      const exp = tx.reduce((s, t) => s + (t.expenses || 0), 0);
      incomeArr.push({ value: inc,       label, labelTextStyle: { fontSize: 9 } });
      expenseArr.push({ value: exp,      labelTextStyle: { fontSize: 9 } });
      balanceArr.push({ value: inc - exp,labelTextStyle: { fontSize: 9 } });
    }
  } else if (period === 'Monthly') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const tx = transactions.filter(t => (t.date || '').substring(0, 7) === key);
      const inc = tx.reduce((s, t) => s + (t.income   || 0), 0);
      const exp = tx.reduce((s, t) => s + (t.expenses || 0), 0);
      incomeArr.push({ value: inc,       label, labelTextStyle: { fontSize: 9 } });
      expenseArr.push({ value: exp,      labelTextStyle: { fontSize: 9 } });
      balanceArr.push({ value: inc - exp,labelTextStyle: { fontSize: 9 } });
    }
  } else {
    const yr = new Date().getFullYear();
    for (let y = yr - 2; y <= yr; y++) {
      const tx = transactions.filter(t => (t.date || '').startsWith(String(y)));
      const inc = tx.reduce((s, t) => s + (t.income   || 0), 0);
      const exp = tx.reduce((s, t) => s + (t.expenses || 0), 0);
      incomeArr.push({ value: inc,       label: String(y), labelTextStyle: { fontSize: 9 } });
      expenseArr.push({ value: exp,      labelTextStyle: { fontSize: 9 } });
      balanceArr.push({ value: inc - exp,labelTextStyle: { fontSize: 9 } });
    }
  }

  return { incomeArr, expenseArr, balanceArr };
};

export default function InsightsScreen() {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod]             = useState('Monthly');
  const [suggestions, setSuggestions]   = useState('');
  const [loadingAI, setLoadingAI]       = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [remainingAI, setRemainingAI]   = useState(null);

  useFocusEffect(useCallback(() => {
    getAllTransactions().then(setTransactions);
    getRemainingAIRequests().then(setRemainingAI);
  }, []));

  const totalIncome   = transactions.reduce((s, t) => s + (t.income   || 0), 0);
  const totalExpenses = transactions.reduce((s, t) => s + (t.expenses || 0), 0);

  // Income vs expenses pie
  const incExpPie = [
    { value: totalIncome   || 0.001, color: '#4caf50' },
    { value: totalExpenses || 0.001, color: '#ef5350' },
  ];

  // Category pie (expenses only)
  const catPie = CATEGORIES.map(cat => ({
    value: transactions
      .filter(t => (t.category || 'other') === cat.key && (t.expenses || 0) > 0)
      .reduce((s, t) => s + (t.expenses || 0), 0) || 0.001,
    color: cat.color,
    label: cat.shortLabel,
  })).filter(c => c.value > 0.001);

  // Line chart data
  const { incomeArr, expenseArr, balanceArr } = buildData(transactions, period);
  const allVals = [...incomeArr, ...expenseArr, ...balanceArr].map(d => d.value);
  const maxVal  = Math.max(...allVals, 1) * 1.3;

  const handleAI = async () => {
    setLoadingAI(true);
    setModalVisible(true);
    setSuggestions('');
    const result = await getSuggestions(transactions);
    setSuggestions(result);
    setLoadingAI(false);
    getRemainingAIRequests().then(setRemainingAI);
  };

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Income vs Expenses Donut ──────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <Text style={[s.cardTitle, { color: theme.text }]}>Income vs Expenses</Text>
        <View style={s.pieRow}>
          <PieChart
            data={incExpPie}
            donut
            radius={80}
            innerRadius={52}
            innerCircleColor={theme.card}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: theme.subtext, fontWeight: '600' }}>Ratio</Text>
                <Text style={{ fontSize: 14, color: totalIncome >= totalExpenses ? '#4caf50' : '#ef5350', fontWeight: '800' }}>
                  {totalIncome + totalExpenses > 0
                    ? `${Math.round(totalIncome / (totalIncome + totalExpenses) * 100)}%`
                    : '–'}
                </Text>
              </View>
            )}
          />
          <View style={s.pieLegend}>
            <LegendItem color="#4caf50" label="Income"   value={`$${totalIncome.toFixed(2)}`}   theme={theme} />
            <LegendItem color="#ef5350" label="Expenses" value={`$${totalExpenses.toFixed(2)}`} theme={theme} />
          </View>
        </View>
      </View>

      {/* ── Category Breakdown Donut ──────────────────────────────────────── */}
      {catPie.length > 1 && (
        <View style={[s.card, { backgroundColor: theme.card }]}>
          <Text style={[s.cardTitle, { color: theme.text }]}>Expenses by Category</Text>
          <View style={s.pieRow}>
            <PieChart
              data={catPie}
              donut
              radius={80}
              innerRadius={52}
              innerCircleColor={theme.card}
              centerLabelComponent={() => (
                <Text style={{ fontSize: 11, color: theme.subtext, fontWeight: '600' }}>Categories</Text>
              )}
            />
            <View style={s.pieLegend}>
              {CATEGORIES.filter(cat => {
                const spent = transactions
                  .filter(t => (t.category || 'other') === cat.key && (t.expenses || 0) > 0)
                  .reduce((s, t) => s + (t.expenses || 0), 0);
                return spent > 0;
              }).map(cat => {
                const spent = transactions
                  .filter(t => (t.category || 'other') === cat.key && (t.expenses || 0) > 0)
                  .reduce((s, t) => s + (t.expenses || 0), 0);
                return (
                  <LegendItem
                    key={cat.key}
                    color={cat.color}
                    label={cat.shortLabel}
                    value={`$${spent.toFixed(2)}`}
                    theme={theme}
                  />
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── Detailed Line Chart ────────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <View style={s.cardHeader}>
          <Text style={[s.cardTitle, { color: theme.text }]}>Income, Expenses & Balance</Text>
          <View style={[s.toggleGroup, { backgroundColor: theme.background }]}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.toggleBtn, period === p && s.toggleBtnActive]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[s.toggleText, { color: theme.subtext }, period === p && s.toggleTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={incomeArr}
            data2={expenseArr}
            data3={balanceArr}
            color1="#4caf50"
            color2="#ef5350"
            color3="#6200ee"
            thickness={2}
            curved
            areaChart
            startFillColor1="#4caf5033"
            startFillColor2="#ef535033"
            startFillColor3="#6200ee33"
            endFillColor1="transparent"
            endFillColor2="transparent"
            endFillColor3="transparent"
            dataPointsColor1="#4caf50"
            dataPointsColor2="#ef5350"
            dataPointsColor3="#6200ee"
            dataPointsRadius={4}
            height={200}
            width={Math.max(W - 80, incomeArr.length * 60)}
            xAxisColor={theme.border}
            yAxisColor={theme.border}
            yAxisTextStyle={{ color: theme.subtext, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.subtext, fontSize: 9 }}
            noOfSections={4}
            maxValue={maxVal}
            rulesColor={theme.border}
            rulesType="dashed"
            backgroundColor={theme.card}
          />
        </ScrollView>

        <View style={s.legendRow}>
          <LegendDot color="#4caf50" label="Income"   theme={theme} />
          <LegendDot color="#ef5350" label="Expenses" theme={theme} />
          <LegendDot color="#6200ee" label="Balance"  theme={theme} />
        </View>
      </View>

      {/* ── AI Suggestions ────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[s.aiBtn, remainingAI === 0 && { backgroundColor: '#9e9e9e' }]}
        onPress={handleAI}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={s.aiBtnText}>  Get AI Suggestions</Text>
        {remainingAI !== null && (
          <View style={s.aiBadge}>
            <Text style={s.aiBadgeText}>{remainingAI} left today</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* AI Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>AI Suggestions</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#bbb" />
              </TouchableOpacity>
            </View>
            {loadingAI ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={[s.loadingText, { color: theme.subtext }]}>Analysing your finances…</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[s.suggestText, { color: theme.text }]}>{suggestions}</Text>
              </ScrollView>
            )}
            <TouchableOpacity style={s.refreshBtn} onPress={handleAI}>
              <Ionicons name="refresh" size={16} color="#6200ee" />
              <Text style={s.refreshText}>  Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const LegendItem = ({ color, label, value, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
    <View>
      <Text style={{ fontSize: 11, color: theme.subtext, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 14, color, fontWeight: '800' }}>{value}</Text>
    </View>
  </View>
);

const LegendDot = ({ color, label, theme }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    <Text style={{ fontSize: 11, color: theme.subtext, fontWeight: '500' }}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  screen: { flex: 1 },
  card: {
    borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:   { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  pieRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  pieLegend:   { flex: 1, paddingLeft: 16 },
  legendRow:   { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 },
  toggleGroup:      { flexDirection: 'row', borderRadius: 10, padding: 3 },
  toggleBtn:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toggleBtnActive:  { backgroundColor: '#6200ee' },
  toggleText:       { fontSize: 11, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  aiBtn: {
    backgroundColor: '#6200ee', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6200ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  aiBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  aiBadge:     { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '72%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '800' },
  loadingBox:  { alignItems: 'center', paddingVertical: 32 },
  loadingText: { marginTop: 12, fontSize: 14 },
  suggestText: { fontSize: 14, lineHeight: 24 },
  refreshBtn:  { marginTop: 16, backgroundColor: '#f3e8ff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#6200ee', fontWeight: '700' },
});
