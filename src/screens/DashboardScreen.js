import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Dimensions, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { getAllTransactions } from '../database/db';
import { getSuggestions, getRemainingAIRequests } from '../utils/gemini';

const W = Dimensions.get('window').width;

const CHART_CONFIG = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
  labelColor: () => '#888',
  propsForDots: { r: '4', strokeWidth: '2' },
};

const PERIODS = ['Weekly', 'Monthly', 'Yearly'];

// ─── Chart data builders ──────────────────────────────────────────────────────

const buildWeekly = (transactions) => {
  const labels = [], incomeData = [], expenseData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    const label = d.toLocaleDateString('en-AU', { weekday: 'short' });
    const dayTx = transactions.filter(t => (t.date || '').substring(0, 10) === key);
    labels.push(label);
    incomeData.push(dayTx.reduce((s, t) => s + (t.income || 0), 0));
    expenseData.push(dayTx.reduce((s, t) => s + (t.expenses || 0), 0));
  }
  return { labels, incomeData, expenseData };
};

const buildMonthly = (transactions) => {
  const labels = [], incomeData = [], expenseData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    const mTx   = transactions.filter(t => (t.date || '').substring(0, 7) === key);
    labels.push(label);
    incomeData.push(mTx.reduce((s, t) => s + (t.income || 0), 0));
    expenseData.push(mTx.reduce((s, t) => s + (t.expenses || 0), 0));
  }
  return { labels, incomeData, expenseData };
};

const buildYearly = (transactions) => {
  const labels = [], incomeData = [], expenseData = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear; y++) {
    const yTx = transactions.filter(t => (t.date || '').startsWith(String(y)));
    labels.push(String(y));
    incomeData.push(yTx.reduce((s, t) => s + (t.income || 0), 0));
    expenseData.push(yTx.reduce((s, t) => s + (t.expenses || 0), 0));
  }
  return { labels, incomeData, expenseData };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState([]);
  const [suggestions, setSuggestions]   = useState('');
  const [loadingAI, setLoadingAI]       = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [remainingAI, setRemainingAI]   = useState(null);
  const [period, setPeriod]             = useState('Monthly');

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const data      = await getAllTransactions();
    const remaining = await getRemainingAIRequests();
    setTransactions(data);
    setRemainingAI(remaining);
  };

  const totalIncome   = transactions.reduce((s, t) => s + (t.income   || 0), 0);
  const totalExpenses = transactions.reduce((s, t) => s + (t.expenses || 0), 0);
  const net = totalIncome - totalExpenses;

  // Build chart data based on selected period
  const { labels, incomeData, expenseData } = (() => {
    if (period === 'Weekly')  return buildWeekly(transactions);
    if (period === 'Yearly')  return buildYearly(transactions);
    return buildMonthly(transactions);
  })();

  const lineData = {
    labels,
    datasets: [
      { data: incomeData,  color: (o = 1) => `rgba(76, 175, 80, ${o})`,  strokeWidth: 2 },
      { data: expenseData, color: (o = 1) => `rgba(239, 83, 80, ${o})`,  strokeWidth: 2 },
    ],
    legend: ['Income', 'Expenses'],
  };

  const pieData = [
    { name: 'Income',   amount: totalIncome   || 0.001, color: '#4caf50', legendFontColor: '#555', legendFontSize: 13 },
    { name: 'Expenses', amount: totalExpenses || 0.001, color: '#ef5350', legendFontColor: '#555', legendFontSize: 13 },
  ];

  const handleAI = async () => {
    setLoadingAI(true);
    setModalVisible(true);
    setSuggestions('');
    const result = await getSuggestions(transactions);
    setSuggestions(result);
    setLoadingAI(false);
    const remaining = await getRemainingAIRequests();
    setRemainingAI(remaining);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

      {/* Summary cards */}
      <View style={s.cardRow}>
        <SummaryCard label="Income"   value={totalIncome}   color="#4caf50" />
        <SummaryCard label="Expenses" value={totalExpenses} color="#ef5350" />
        <SummaryCard label="Net"      value={net}           color={net >= 0 ? '#2196f3' : '#ff9800'} />
      </View>

      {transactions.length > 0 ? (
        <>
          {/* Pie chart */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Income vs Expenses — Overall</Text>
            <PieChart
              data={pieData}
              width={W - 64}
              height={180}
              chartConfig={CHART_CONFIG}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="16"
              absolute={false}
            />
          </View>

          {/* Period line chart */}
          <View style={s.card}>
            {/* Period toggle */}
            <View style={s.toggleRow}>
              <Text style={s.cardTitle}>Trends</Text>
              <View style={s.toggleGroup}>
                {PERIODS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.toggleBtn, period === p && s.toggleBtnActive]}
                    onPress={() => setPeriod(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.toggleText, period === p && s.toggleTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <LineChart
              data={lineData}
              width={W - 64}
              height={200}
              chartConfig={CHART_CONFIG}
              bezier
              style={{ borderRadius: 8 }}
              fromZero
            />

            {/* Legend */}
            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#4caf50' }]} />
                <Text style={s.legendText}>Income</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#ef5350' }]} />
                <Text style={s.legendText}>Expenses</Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={[s.card, s.emptyCard]}>
          <Ionicons name="wallet-outline" size={52} color="#d1d5db" />
          <Text style={s.emptyTitle}>No transactions yet</Text>
          <Text style={s.emptySubtitle}>Tap + to add your first one</Text>
        </View>
      )}

      {/* AI button */}
      <TouchableOpacity
        style={[s.aiBtn, remainingAI === 0 && { backgroundColor: '#9e9e9e' }]}
        onPress={handleAI} activeOpacity={0.85}
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
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>AI Suggestions</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#bbb" />
              </TouchableOpacity>
            </View>
            {loadingAI ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={s.loadingText}>Analysing your finances…</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.suggestText}>{suggestions}</Text>
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

function SummaryCard({ label, value, color }) {
  const display = value < 0
    ? `-$${Math.abs(value).toFixed(2)}`
    : `$${value.toFixed(2)}`;
  return (
    <View style={[s.summaryCard, { backgroundColor: color }]}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{display}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa' },
  cardRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
  summaryLabel: { color: '#fff', fontSize: 11, fontWeight: '600', marginBottom: 4, opacity: 0.9 },
  summaryValue: { color: '#fff', fontSize: 17, fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 10 },
  emptyCard:    { alignItems: 'center', paddingVertical: 40 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: '#aaa', marginTop: 14 },
  emptySubtitle:{ fontSize: 13, color: '#ccc', marginTop: 4 },

  // Period toggle
  toggleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleGroup: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3 },
  toggleBtn:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#6200ee' },
  toggleText:       { fontSize: 12, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#fff' },

  // Legend
  legendRow:  { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#888', fontWeight: '500' },

  aiBtn: {
    backgroundColor: '#6200ee', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6200ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  aiBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  aiBadge:    { marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText:{ color: '#fff', fontSize: 11, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '72%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#222' },
  loadingBox:  { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: '#aaa', marginTop: 12, fontSize: 14 },
  suggestText: { fontSize: 14, lineHeight: 24, color: '#444' },
  refreshBtn: {
    marginTop: 16, backgroundColor: '#f3e8ff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  refreshText: { color: '#6200ee', fontWeight: '700' },
});
