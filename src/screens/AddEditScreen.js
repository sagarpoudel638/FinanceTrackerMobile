import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute, useNavigation, TabActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addTransaction, updateTransaction } from '../database/db';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { CATEGORIES } from '../utils/categories';

const toDateString = (date) => date.toISOString().substring(0, 10); // 'YYYY-MM-DD'
const formatDisplay = (str) => {
  // 'YYYY-MM-DD' → 'DD MMM YYYY'
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AddEditScreen() {
  const route      = useRoute();
  const navigation = useNavigation();

  const { theme } = useTheme();
  const { currency } = useCurrency();
  const editing     = route.params?.transaction;
  const defaultType = route.params?.defaultType || 'income';
  const isEditing   = !!editing;

  const [title, setTitle]             = useState('');
  const [type, setType]               = useState(defaultType);
  const [amount, setAmount]           = useState('');
  const [date, setDate]               = useState(toDateString(new Date()));
  const [remarks, setRemarks]         = useState('');
  const [category, setCategory]       = useState('other');
  const [showPicker, setShowPicker]   = useState(false);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setRemarks(editing.remarks || '');
      setDate(editing.date || toDateString(new Date()));
      setCategory(editing.category || 'other');
      if ((editing.income || 0) > 0) {
        setType('income');
        setAmount(String(editing.income));
      } else {
        setType('expenses');
        setAmount(String(editing.expenses));
      }
    } else {
      setType(defaultType);
    }
  }, [editing, defaultType]);

  const resetForm = () => {
    setTitle(''); setType(defaultType); setAmount('');
    setDate(toDateString(new Date())); setRemarks(''); setCategory('other');
    navigation.setParams({ transaction: null });
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Title is required.');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Validation', 'Enter a valid amount greater than 0.');

    const income   = type === 'income'   ? parseFloat(amount) : 0;
    const expenses = type === 'expenses' ? parseFloat(amount) : 0;

    setLoading(true);
    try {
      if (isEditing) {
        await updateTransaction(editing.id, title.trim(), income, expenses, date, remarks.trim(), category);
        Alert.alert('Updated!', 'Transaction has been updated.');
      } else {
        await addTransaction(title.trim(), income, expenses, date, remarks.trim(), category);
        Alert.alert('Added!', 'Transaction has been saved.');
      }
      resetForm();
      // AddEdit is a Stack modal — go back to dismiss it, then jump to Transactions tab
      navigation.goBack();
      navigation.getParent()?.dispatch(TabActions.jumpTo('Transactions'));
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[s.screen, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>

        {/* Mode badge */}
        <View style={[s.badge, isEditing ? s.badgeEdit : s.badgeNew]}>
          <Ionicons name={isEditing ? 'pencil' : 'add-circle'} size={13} color={isEditing ? '#f97316' : '#6200ee'} />
          <Text style={[s.badgeText, isEditing ? s.badgeTextEdit : s.badgeTextNew]}>
            {'  '}{isEditing ? 'Edit mode' : 'New transaction'}
          </Text>
        </View>

        {/* Title */}
        <Text style={[s.label, { color: theme.subtext }]}>TITLE *</Text>
        <View style={[s.inputRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <Ionicons name="text-outline" size={17} color={theme.placeholder} style={{ marginRight: 10 }} />
          <TextInput
            style={[s.input, { color: theme.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Salary, Groceries, Rent"
            placeholderTextColor={theme.placeholder}
            maxLength={100}
          />
        </View>

        {/* Type toggle */}
        <Text style={[s.label, { color: theme.subtext }]}>TYPE *</Text>
        <View style={s.typeRow}>
          <TouchableOpacity
            style={[s.typeBtn, type === 'income' && s.typeBtnActiveIncome]}
            onPress={() => setType('income')} activeOpacity={0.8}
          >
            <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? '#fff' : '#4caf50'} />
            <Text style={[s.typeBtnText, type === 'income' && s.typeBtnTextActive]}>  Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.typeBtn, type === 'expenses' && s.typeBtnActiveExpense]}
            onPress={() => setType('expenses')} activeOpacity={0.8}
          >
            <Ionicons name="arrow-up-circle" size={18} color={type === 'expenses' ? '#fff' : '#ef5350'} />
            <Text style={[s.typeBtnText, type === 'expenses' && s.typeBtnTextActive]}>  Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Text style={[s.label, { color: theme.subtext }]}>AMOUNT ({currency}) *</Text>
        <View style={[s.inputRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <Ionicons
            name={type === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
            size={17} color={type === 'income' ? '#4caf50' : '#ef5350'}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={[s.input, { color: theme.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Date picker */}
        <Text style={[s.label, { color: theme.subtext }]}>DATE *</Text>
        <TouchableOpacity style={[s.inputRow, { backgroundColor: theme.input, borderColor: theme.border }]} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={17} color="#6200ee" style={{ marginRight: 10 }} />
          <Text style={[s.input, { paddingTop: 16, paddingBottom: 16, color: theme.text }]}>
            {formatDisplay(date)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.placeholder} />
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={new Date(date + 'T00:00:00')}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            onChange={(event, selected) => {
              setShowPicker(Platform.OS === 'ios'); // keep open on iOS
              if (selected) setDate(toDateString(selected));
              if (Platform.OS === 'android') setShowPicker(false);
            }}
          />
        )}

        {/* Remarks (optional) */}
        <Text style={[s.label, { color: theme.subtext }]}>REMARKS <Text style={s.optional}>(optional)</Text></Text>
        <View style={[s.inputRow, { alignItems: 'flex-start', paddingTop: 12, backgroundColor: theme.input, borderColor: theme.border }]}>
          <Ionicons name="chatbubble-outline" size={17} color={theme.placeholder} style={{ marginRight: 10, marginTop: 2 }} />
          <TextInput
            style={[s.input, { minHeight: 72, textAlignVertical: 'top', color: theme.text }]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add a note… e.g. Monthly Netflix subscription"
            placeholderTextColor={theme.placeholder}
            multiline
            maxLength={300}
          />
        </View>
        <Text style={[s.charCount, { color: theme.muted }]}>{remarks.length}/300</Text>

        {/* Category — only shown for expenses */}
        {type === 'expenses' && (
          <>
            <Text style={[s.label, { color: theme.subtext }]}>CATEGORY</Text>
            <View style={s.catGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    s.catChip,
                    { backgroundColor: theme.input, borderColor: theme.border },
                    category === cat.key && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={cat.icon} size={14} color={category === cat.key ? '#fff' : cat.color} />
                  <Text style={[s.catChipText, { color: category === cat.key ? '#fff' : theme.text }]}>
                    {' '}{cat.shortLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit} disabled={loading} activeOpacity={0.85}
        >
          <Ionicons name={isEditing ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
          <Text style={s.submitText}>
            {'  '}{loading ? 'Saving…' : isEditing ? 'Update Transaction' : 'Add Transaction'}
          </Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={s.cancelBtn} onPress={resetForm} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={17} color="#6200ee" />
            <Text style={s.cancelText}>{'  '}Cancel — Add New Instead</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginBottom: 28 },
  badgeNew: { backgroundColor: '#f3e8ff' },
  badgeEdit: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextNew: { color: '#6200ee' },
  badgeTextEdit: { color: '#f97316' },
  label: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 8 },
  optional: { fontSize: 10, fontWeight: '400', color: '#ccc', letterSpacing: 0 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  input: { flex: 1, fontSize: 15, color: '#222', paddingVertical: 16 },
  charCount: { fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: -14, marginBottom: 20, marginRight: 4 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  typeBtnActiveIncome:  { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  typeBtnActiveExpense: { backgroundColor: '#ef5350', borderColor: '#ef5350' },
  typeBtnText:       { fontSize: 14, fontWeight: '700', color: '#888' },
  typeBtnTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#6200ee', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6200ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6, marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  catGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  catChipText: { fontSize: 12, fontWeight: '600' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, padding: 14, marginTop: 10,
    borderWidth: 1.5, borderColor: '#e9d5ff',
  },
  cancelText: { color: '#6200ee', fontWeight: '600', fontSize: 14 },
});
