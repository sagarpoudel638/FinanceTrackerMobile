import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Switch, Modal, FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllTransactions,
  exportTransactions,
  replaceAllTransactions,
  mergeTransactions,
} from '../database/db';

const getExportFile = (name) => new File(Paths.document, name);

// Convert rows to CSV string
const toCSV = (rows) => {
  const header = 'title,type,amount,date,remarks,created_at';
  const lines  = rows.map(t => {
    const type   = t.income > 0 ? 'income' : 'expense';
    const amount = t.income > 0 ? t.income : t.expenses;
    // Wrap fields in quotes to handle commas in remarks/title
    const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
    return [escape(t.title), type, amount, t.date || '', escape(t.remarks || ''), t.created_at || ''].join(',');
  });
  return [header, ...lines].join('\n');
};

// Parse CSV back to rows
const fromCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    // Simple CSV parse (handles quoted fields)
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);
    const [title, type, amount, date, remarks, created_at] = cols;
    return {
      title:      title || '',
      income:     type === 'income'  ? parseFloat(amount) || 0 : 0,
      expenses:   type === 'expense' ? parseFloat(amount) || 0 : 0,
      date:       date || '',
      remarks:    remarks || '',
      created_at: created_at || new Date().toISOString(),
    };
  }).filter(t => t.title);
};

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [txCount, setTxCount]       = useState(0);
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState('');
  const [currencyModal, setCurrencyModal] = useState(false);

  useFocusEffect(useCallback(() => { loadCount(); }, []));

  const loadCount = async () => {
    const rows = await getAllTransactions();
    setTxCount(rows.length);
  };

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 4000);
  };

  // ── Export JSON ────────────────────────────────────────────────────────────
  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const rows = await exportTransactions();
      const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), transactions: rows }, null, 2);
      const file = getExportFile('finance_tracker_backup.json');
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Finance Tracker backup' });
      showStatus(`✓ Exported ${rows.length} transactions`);
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const rows = await exportTransactions();
      const csv  = toCSV(rows);
      const file = getExportFile('finance_tracker_backup.csv');
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Save your Finance Tracker CSV' });
      showStatus(`✓ Exported ${rows.length} transactions as CSV`);
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    try {
      // Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file     = result.assets[0];
      const response = await fetch(file.uri);
      const content  = await response.text();
      const fileName = file.name?.toLowerCase() || '';

      // Parse
      let importedRows = [];
      if (fileName.endsWith('.csv')) {
        importedRows = fromCSV(content);
      } else {
        const parsed = JSON.parse(content);
        importedRows = parsed.transactions || parsed; // support both wrapped and raw arrays
      }

      if (!importedRows.length) {
        return Alert.alert('Import Failed', 'No valid transactions found in this file.');
      }

      // Ask user: replace or merge?
      Alert.alert(
        `Import ${importedRows.length} Transactions`,
        'What would you like to do with your existing data?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge (keep existing)',
            onPress: async () => {
              setLoading(true);
              await mergeTransactions(importedRows);
              await loadCount();
              setLoading(false);
              showStatus(`✓ Merged ${importedRows.length} transactions`);
            },
          },
          {
            text: 'Replace (wipe & import)',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Are you sure?',
                'This will permanently delete all your current transactions and replace them with the imported data.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Yes, Replace',
                    style: 'destructive',
                    onPress: async () => {
                      setLoading(true);
                      await replaceAllTransactions(importedRows);
                      await loadCount();
                      setLoading(false);
                      showStatus(`✓ Replaced with ${importedRows.length} transactions`);
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Import Failed', 'Could not read the file. Make sure it is a valid Finance Tracker JSON or CSV backup.');
    }
  };

  return (
    <ScrollView style={[s.screen, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 24 }}>

      {/* Dark mode toggle */}
      <View style={[s.statCard, { backgroundColor: theme.card }]}>
        <Ionicons name={isDark ? 'moon' : 'sunny'} size={26} color={isDark ? '#a78bfa' : '#f59e0b'} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={[s.statLabel, { color: theme.subtext }]}>Dark Mode</Text>
          <Text style={[s.statValue, { fontSize: 14, fontWeight: '500', color: theme.text }]}>
            {isDark ? 'On' : 'Off'}
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#e5e7eb', true: '#7c3aed' }}
          thumbColor={isDark ? '#a78bfa' : '#fff'}
        />
      </View>

      {/* Currency picker */}
      <TouchableOpacity
        style={[s.statCard, { backgroundColor: theme.card }]}
        onPress={() => setCurrencyModal(true)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 26, width: 34, textAlign: 'center' }}>💱</Text>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={[s.statLabel, { color: theme.subtext }]}>Currency</Text>
          <Text style={[s.statValue, { fontSize: 18, fontWeight: '700', color: theme.text }]}>
            {currency}{'  '}<Text style={{ fontSize: 13, color: theme.subtext, fontWeight: '500' }}>
              {CURRENCIES.find(c => c.symbol === currency)?.label ?? ''}
            </Text>
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      </TouchableOpacity>

      {/* Currency modal */}
      <Modal visible={currencyModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: theme.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyModal(false)}>
                <Ionicons name="close-circle" size={26} color="#bbb" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = currency === item.symbol;
                return (
                  <TouchableOpacity
                    style={[s.currencyRow, selected && s.currencyRowSelected, { borderBottomColor: theme.border }]}
                    onPress={() => { setCurrency(item.symbol); setCurrencyModal(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.currencyFlag}>{item.flag}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.currencyLabel, { color: theme.text }]}>{item.label}</Text>
                    </View>
                    <Text style={[s.currencySymbol, { color: selected ? '#6200ee' : theme.subtext }]}>
                      {item.symbol}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#6200ee" style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Stats */}
      <View style={[s.statCard, { backgroundColor: theme.card }]}>
        <Ionicons name="wallet-outline" size={28} color="#6200ee" />
        <View style={{ marginLeft: 14 }}>
          <Text style={[s.statLabel, { color: theme.subtext }]}>Transactions on this device</Text>
          <Text style={[s.statValue,  { color: theme.text    }]}>{txCount}</Text>
        </View>
      </View>

      {/* Status message */}
      {!!status && (
        <View style={s.statusBanner}>
          <Text style={s.statusText}>{status}</Text>
        </View>
      )}

      {/* Export section */}
      <Text style={[s.sectionTitle, { color: theme.subtext }]}>EXPORT</Text>
      <Text style={[s.sectionSubtitle, { color: theme.muted }]}>
        Save your data to a file. Use this before switching phones or to keep a backup.
      </Text>

      <ActionButton theme={theme} icon="download-outline" label="Export as JSON" sublabel="Best for restoring to Finance Tracker"       color="#6200ee" onPress={handleExportJSON} loading={loading} />
      <ActionButton theme={theme} icon="grid-outline"     label="Export as CSV"  sublabel="Opens in Excel, Numbers or Google Sheets" color="#2196f3" onPress={handleExportCSV} loading={loading} />

      {/* Import section */}
      <Text style={[s.sectionTitle, { marginTop: 28, color: theme.subtext }]}>IMPORT</Text>
      <Text style={[s.sectionSubtitle, { color: theme.muted }]}>
        Restore from a previous backup. You can choose to merge with or replace your current data.
      </Text>

      <ActionButton theme={theme} icon="cloud-upload-outline" label="Import from File" sublabel="Supports .json and .csv backup files" color="#4caf50" onPress={handleImport} loading={loading} />

      {/* Instructions */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>Switching phones?</Text>
        <Text style={s.infoText}>
          1. On your old phone — tap Export as JSON{'\n'}
          2. Save the file to iCloud Drive, AirDrop it, or email it to yourself{'\n'}
          3. On your new phone — open Finance Tracker, tap Import{'\n'}
          4. Pick the file and choose Replace
        </Text>
      </View>

    </ScrollView>
  );
}

function ActionButton({ theme, icon, label, sublabel, color, onPress, loading }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { backgroundColor: theme.card }]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      <View style={[s.actionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.actionLabel,    { color: theme.text    }]}>{label}</Text>
        <Text style={[s.actionSublabel, { color: theme.subtext }]}>{sublabel}</Text>
      </View>
      {loading
        ? <ActivityIndicator size="small" color={theme.muted} />
        : <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa' },

  statCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statLabel: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginTop: 2 },

  statusBanner: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#4caf50',
  },
  statusText: { color: '#15803d', fontWeight: '600', fontSize: 14 },

  sectionTitle:    { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: '#bbb', marginBottom: 14, lineHeight: 18 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18,
    padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionLabel:    { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  actionSublabel: { fontSize: 12, color: '#aaa' },

  infoCard: {
    backgroundColor: '#f3e8ff', borderRadius: 18, padding: 18, marginTop: 28,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#6200ee', marginBottom: 10 },
  infoText:  { fontSize: 13, color: '#7c3aed', lineHeight: 22 },

  // Currency modal
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '75%' },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:    { fontSize: 18, fontWeight: '800' },
  currencyRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  currencyRowSelected: { backgroundColor: '#f3e8ff', borderRadius: 12, paddingHorizontal: 8 },
  currencyFlag:  { fontSize: 22, width: 32, textAlign: 'center' },
  currencyLabel: { fontSize: 14, fontWeight: '500' },
  currencySymbol:{ fontSize: 16, fontWeight: '700', minWidth: 36, textAlign: 'right' },
});
