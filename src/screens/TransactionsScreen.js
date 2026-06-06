import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, TextInput, Modal, ScrollView, Dimensions, Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTransactions, deleteTransaction } from '../database/db';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { CATEGORIES, getCategoryByKey } from '../utils/categories';

const W = Dimensions.get('window').width;

// ─── Date helpers ─────────────────────────────────────────────────────────────

const formatDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toDateKey = (str) => (str || '').substring(0, 10);

const todayKey     = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

const groupLabel = (dateStr) => {
  const key = toDateKey(dateStr);
  if (key === todayKey())     return 'Today';
  if (key === yesterdayKey()) return 'Yesterday';
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Filter defaults ───────────────────────────────────────────────────────────

const DEFAULT_FILTERS = {
  dateRange: 'all',     // all | today | week | month | last_month | year | custom
  customFrom: '',
  customTo: '',
  categories: [],       // [] = all
  minAmount: '',
  maxAmount: '',
  sortBy: 'newest',     // newest | oldest | highest | lowest
};

const DATE_RANGES = [
  { key: 'all',        label: 'All Time'   },
  { key: 'today',      label: 'Today'      },
  { key: 'week',       label: 'This Week'  },
  { key: 'month',      label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'year',       label: 'This Year'  },
];

const SORT_OPTIONS = [
  { key: 'newest',  label: 'Newest First'  },
  { key: 'oldest',  label: 'Oldest First'  },
  { key: 'highest', label: 'Highest Amount'},
  { key: 'lowest',  label: 'Lowest Amount' },
];

// ─── Filter logic ──────────────────────────────────────────────────────────────

const applyFilters = (transactions, search, typeTab, filters) => {
  const q = search.trim().toLowerCase();
  const tk = todayKey();

  // Date range bounds
  let fromDate = null, toDate = null;
  const now = new Date();
  if (filters.dateRange === 'today') {
    fromDate = toDate = tk;
  } else if (filters.dateRange === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    fromDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    toDate = tk;
  } else if (filters.dateRange === 'month') {
    fromDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    toDate = tk;
  } else if (filters.dateRange === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    fromDate = `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-01`;
    toDate   = `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
  } else if (filters.dateRange === 'year') {
    fromDate = `${now.getFullYear()}-01-01`;
    toDate = tk;
  } else if (filters.dateRange === 'custom') {
    fromDate = filters.customFrom || null;
    toDate   = filters.customTo   || null;
  }

  let result = transactions.filter(t => {
    // Search
    if (q && !`${t.title} ${t.remarks || ''}`.toLowerCase().includes(q)) return false;

    // Type tab
    if (typeTab === 'income'   && !((t.income   || 0) > 0)) return false;
    if (typeTab === 'expenses' && !((t.expenses || 0) > 0)) return false;

    // Date range
    const dk = toDateKey(t.date);
    if (fromDate && dk < fromDate) return false;
    if (toDate   && dk > toDate)   return false;

    // Category (only for expenses)
    if (filters.categories.length > 0 && (t.expenses || 0) > 0) {
      if (!filters.categories.includes(t.category || 'other')) return false;
    }

    // Amount
    const amount = Math.max(t.income || 0, t.expenses || 0);
    if (filters.minAmount !== '' && amount < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount !== '' && amount > parseFloat(filters.maxAmount)) return false;

    return true;
  });

  // Sort
  result = [...result].sort((a, b) => {
    if (filters.sortBy === 'newest')  return toDateKey(b.date).localeCompare(toDateKey(a.date));
    if (filters.sortBy === 'oldest')  return toDateKey(a.date).localeCompare(toDateKey(b.date));
    const amtA = Math.max(a.income || 0, a.expenses || 0);
    const amtB = Math.max(b.income || 0, b.expenses || 0);
    if (filters.sortBy === 'highest') return amtB - amtA;
    if (filters.sortBy === 'lowest')  return amtA - amtB;
    return 0;
  });

  return result;
};

const groupByDate = (transactions) => {
  const groups = [];
  const seen = {};
  transactions.forEach(t => {
    const label = groupLabel(t.date);
    if (!seen[label]) { seen[label] = true; groups.push({ label, data: [] }); }
    groups[groups.length - 1].data.push(t);
  });
  // Flatten for FlatList: insert header items
  const flat = [];
  groups.forEach(g => {
    flat.push({ type: 'header', label: g.label });
    g.data.forEach(t => flat.push({ type: 'row', ...t }));
  });
  return flat;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState([]);
  const [search, setSearch]             = useState('');
  const [typeTab, setTypeTab]           = useState('all');   // all | income | expenses
  const [filters, setFilters]           = useState(DEFAULT_FILTERS);
  const [filterModal, setFilterModal]   = useState(false);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [viewingReceipt, setViewingReceipt] = useState(null); // uri string or null

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const data = await getAllTransactions();
    setTransactions(data);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(id); load(); } },
    ]);
  };

  const openFilters = () => { setDraftFilters(filters); setFilterModal(true); };
  const applyDraft  = () => { setFilters(draftFilters); setFilterModal(false); };
  const resetDraft  = () => setDraftFilters(DEFAULT_FILTERS);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.dateRange !== 'all')    n++;
    if (filters.categories.length > 0) n++;
    if (filters.minAmount !== '')       n++;
    if (filters.maxAmount !== '')       n++;
    if (filters.sortBy !== 'newest')    n++;
    return n;
  }, [filters]);

  const filtered = useMemo(
    () => applyFilters(transactions, search, typeTab, filters),
    [transactions, search, typeTab, filters],
  );

  const flatData = useMemo(() => groupByDate(filtered), [filtered]);

  // ── Row renderer ────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={s.dateHeader}>
          <Text style={[s.dateHeaderText, { color: theme.subtext }]}>{item.label}</Text>
          <View style={[s.dateHeaderLine, { backgroundColor: theme.border }]} />
        </View>
      );
    }

    const isIncome = (item.income || 0) > 0;
    const cat = isIncome ? null : getCategoryByKey(item.category || 'other');

    return (
      <View style={[s.row, { backgroundColor: theme.card }]}>
        <View style={[s.iconBox, { backgroundColor: isIncome ? '#e8f5e9' : (cat.color + '22') }]}>
          <Ionicons name={isIncome ? 'arrow-down-circle' : cat.icon} size={22} color={isIncome ? '#4caf50' : cat.color} />
        </View>
        <View style={s.rowCenter}>
          <Text style={[s.rowTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[s.rowDate,  { color: theme.muted }]}>{formatDate(item.date)}</Text>
          {!!item.remarks && (
            <Text style={[s.rowRemarks, { color: theme.subtext }]} numberOfLines={1}>{item.remarks}</Text>
          )}
        </View>
        <View style={s.rowAmount}>
          {isIncome
            ? <Text style={s.incomeText}>+{currency}{item.income.toFixed(2)}</Text>
            : <Text style={s.expenseText}>-{currency}{item.expenses.toFixed(2)}</Text>
          }
          {!!item.receipt_image && (
            <TouchableOpacity onPress={() => setViewingReceipt(item.receipt_image)} style={s.receiptBadge}>
              <Ionicons name="receipt" size={10} color="#6200ee" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AddEdit', { transaction: item })} style={s.actionBtn}>
          <Ionicons name="pencil-outline" size={17} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.actionBtn}>
          <Ionicons name="trash-outline" size={17} color="#ef5350" />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: theme.background }]}>

      {/* Search bar */}
      <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={16} color={theme.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={[s.searchInput, { color: theme.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={theme.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type tabs + filter button */}
      <View style={s.tabRow}>
        {['all', 'income', 'expenses'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, typeTab === tab && s.tabActive]}
            onPress={() => setTypeTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, { color: typeTab === tab ? '#fff' : theme.subtext }]}>
              {tab === 'all' ? 'All' : tab === 'income' ? 'Income' : 'Expenses'}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[s.filterBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={openFilters} activeOpacity={0.8}>
          <Ionicons name="options" size={16} color={activeFilterCount > 0 ? '#6200ee' : theme.subtext} />
          {activeFilterCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results count */}
      {(search || typeTab !== 'all' || activeFilterCount > 0) && (
        <Text style={[s.resultCount, { color: theme.muted }]}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </Text>
      )}

      {/* List */}
      {flatData.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="search-outline" size={48} color={theme.muted} />
          <Text style={[s.emptyTitle, { color: theme.subtext }]}>No transactions found</Text>
          <Text style={[s.emptySub, { color: theme.muted }]}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, idx) => item.type === 'header' ? `h-${item.label}` : `r-${item.id ?? idx}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Receipt Viewer ───────────────────────────────────────────────── */}
      <Modal visible={!!viewingReceipt} animationType="fade" transparent>
        <View style={s.receiptViewerOverlay}>
          <TouchableOpacity style={s.receiptViewerClose} onPress={() => setViewingReceipt(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </TouchableOpacity>
          {viewingReceipt && (
            <Image source={{ uri: viewingReceipt }} style={s.receiptViewerImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ── Advanced Filter Modal ─────────────────────────────────────────── */}
      <Modal visible={filterModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: theme.card }]}>

            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Filters</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity onPress={resetDraft}>
                  <Text style={{ color: '#ef5350', fontWeight: '600', fontSize: 13 }}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilterModal(false)}>
                  <Ionicons name="close-circle" size={26} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Date Range */}
              <Text style={[s.filterSection, { color: theme.subtext }]}>DATE RANGE</Text>
              <View style={s.chipRow}>
                {DATE_RANGES.map(dr => {
                  const active = draftFilters.dateRange === dr.key;
                  return (
                    <TouchableOpacity
                      key={dr.key}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setDraftFilters(f => ({ ...f, dateRange: dr.key }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{dr.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                {/* Custom */}
                <TouchableOpacity
                  style={[s.chip, draftFilters.dateRange === 'custom' && s.chipActive]}
                  onPress={() => setDraftFilters(f => ({ ...f, dateRange: 'custom' }))}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, draftFilters.dateRange === 'custom' && s.chipTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>

              {draftFilters.dateRange === 'custom' && (
                <View style={s.customDateRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: theme.subtext }]}>From (YYYY-MM-DD)</Text>
                    <TextInput
                      style={[s.filterInput, { color: theme.text, borderColor: theme.border }]}
                      placeholder="2025-01-01"
                      placeholderTextColor={theme.muted}
                      value={draftFilters.customFrom}
                      onChangeText={v => setDraftFilters(f => ({ ...f, customFrom: v }))}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[s.inputLabel, { color: theme.subtext }]}>To (YYYY-MM-DD)</Text>
                    <TextInput
                      style={[s.filterInput, { color: theme.text, borderColor: theme.border }]}
                      placeholder="2025-12-31"
                      placeholderTextColor={theme.muted}
                      value={draftFilters.customTo}
                      onChangeText={v => setDraftFilters(f => ({ ...f, customTo: v }))}
                    />
                  </View>
                </View>
              )}

              {/* Categories */}
              <Text style={[s.filterSection, { color: theme.subtext }]}>EXPENSE CATEGORIES</Text>
              <View style={s.chipRow}>
                {CATEGORIES.map(cat => {
                  const active = draftFilters.categories.includes(cat.key);
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[s.chip, active && { backgroundColor: cat.color + '22', borderColor: cat.color }]}
                      onPress={() => setDraftFilters(f => ({
                        ...f,
                        categories: active
                          ? f.categories.filter(k => k !== cat.key)
                          : [...f.categories, cat.key],
                      }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={cat.icon} size={12} color={active ? cat.color : '#999'} style={{ marginRight: 4 }} />
                      <Text style={[s.chipText, active && { color: cat.color, fontWeight: '700' }]}>{cat.shortLabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount range */}
              <Text style={[s.filterSection, { color: theme.subtext }]}>AMOUNT RANGE</Text>
              <View style={s.customDateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: theme.subtext }]}>Min ({currency})</Text>
                  <TextInput
                    style={[s.filterInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="0"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={draftFilters.minAmount}
                    onChangeText={v => setDraftFilters(f => ({ ...f, minAmount: v }))}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.inputLabel, { color: theme.subtext }]}>Max ({currency})</Text>
                  <TextInput
                    style={[s.filterInput, { color: theme.text, borderColor: theme.border }]}
                    placeholder="Any"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    value={draftFilters.maxAmount}
                    onChangeText={v => setDraftFilters(f => ({ ...f, maxAmount: v }))}
                  />
                </View>
              </View>

              {/* Sort */}
              <Text style={[s.filterSection, { color: theme.subtext }]}>SORT BY</Text>
              <View style={s.chipRow}>
                {SORT_OPTIONS.map(opt => {
                  const active = draftFilters.sortBy === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setDraftFilters(f => ({ ...f, sortBy: opt.key }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Apply button */}
            <TouchableOpacity style={s.applyBtn} onPress={applyDraft} activeOpacity={0.85}>
              <Text style={s.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginBottom: 10,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 6, alignItems: 'center' },
  tab: {
    flex: 1, paddingVertical: 7, borderRadius: 10,
    alignItems: 'center', backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: '#6200ee' },
  tabText:   { fontSize: 12, fontWeight: '600' },

  filterBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  filterBadge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: '#6200ee', borderRadius: 8, width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  resultCount: { fontSize: 11, fontWeight: '600', paddingHorizontal: 16, marginBottom: 4 },

  // Date group header
  dateHeader:     { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  dateHeaderText: { fontSize: 12, fontWeight: '700', marginRight: 10, letterSpacing: 0.3 },
  dateHeaderLine: { flex: 1, height: StyleSheet.hairlineWidth },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, paddingVertical: 11, paddingHorizontal: 13, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconBox:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  rowCenter:   { flex: 1 },
  rowTitle:    { fontSize: 14, fontWeight: '600' },
  rowDate:     { fontSize: 11, marginTop: 2 },
  rowRemarks:  { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  rowAmount:   { alignItems: 'flex-end', marginRight: 6 },
  incomeText:  { fontSize: 13, fontWeight: '700', color: '#4caf50' },
  expenseText: { fontSize: 13, fontWeight: '700', color: '#ef5350' },
  receiptBadge: {
    marginTop: 4, alignSelf: 'flex-end',
    backgroundColor: '#f3e8ff', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  actionBtn:   { padding: 6 },

  // Receipt viewer
  receiptViewerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  receiptViewerClose:  { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  receiptViewerImage:  { width: '100%', height: '80%' },

  // Empty
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 14 },
  emptySub:   { fontSize: 13, marginTop: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: '800' },

  filterSection: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActive:     { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  chipText:       { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#fff' },

  customDateRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  inputLabel:    { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  filterInput: {
    borderWidth: 1, borderRadius: 10, padding: 10,
    fontSize: 13, fontWeight: '500',
  },

  applyBtn: {
    backgroundColor: '#6200ee', borderRadius: 16, padding: 16,
    alignItems: 'center', marginTop: 16,
    shadowColor: '#6200ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
