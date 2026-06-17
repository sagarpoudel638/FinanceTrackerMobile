import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import {
  getAllReminders, addReminder, updateReminder, deleteReminder,
} from '../database/db';

const ACCENT_PAYABLE    = '#f87171'; // red-ish
const ACCENT_RECEIVABLE = '#34d399'; // green-ish

// ─── Date helpers ─────────────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const isOverdue = (iso) => {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso + 'T00:00:00') < today;
};

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ theme }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="clipboard-outline" size={56} color={theme.muted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No reminders yet</Text>
      <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
        Tap + to add something you need to pay or collect.
      </Text>
    </View>
  );
}

// ─── Reminder card ────────────────────────────────────────────────────────────

function ReminderCard({ item, currency, theme, onEdit, onDelete }) {
  const payable  = item.type === 'payable';
  const accent   = payable ? ACCENT_PAYABLE : ACCENT_RECEIVABLE;
  const overdue  = isOverdue(item.due_date);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: accent }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.notes ? (
            <Text style={[styles.cardNotes, { color: theme.subtext }]} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
          {item.due_date ? (
            <View style={styles.dueDateRow}>
              <Ionicons
                name={overdue ? 'alert-circle' : 'calendar-outline'}
                size={13}
                color={overdue ? ACCENT_PAYABLE : theme.subtext}
              />
              <Text style={[styles.dueText, { color: overdue ? ACCENT_PAYABLE : theme.subtext }]}>
                {overdue ? 'Overdue · ' : ''}{formatDate(item.due_date)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: accent }]}>
            {payable ? '-' : '+'}{currency}{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: accent + '22' }]}>
            <Text style={[styles.typeBadgeText, { color: accent }]}>
              {payable ? 'Payable' : 'Receivable'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil-outline" size={16} color={theme.subtext} />
          <Text style={[styles.actionText, { color: theme.subtext }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={16} color={ACCENT_PAYABLE} />
          <Text style={[styles.actionText, { color: ACCENT_PAYABLE }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

const BLANK = { title: '', amount: '', type: 'payable', due_date: '', notes: '' };

// Convert YYYY-MM-DD string ↔ Date object safely
const strToDate  = (s) => s ? new Date(s + 'T00:00:00') : new Date();
const dateToStr  = (d) => d.toISOString().substring(0, 10);

function AddEditModal({ visible, initial, theme, currency, onSave, onClose }) {
  const [form, setForm]           = useState(BLANK);
  // Android: show the system picker dialog
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  // iOS: show an inline picker inside a small modal
  const [showIOSPicker, setShowIOSPicker]         = useState(false);
  // Temp date while iOS picker is open (confirm on Done)
  const [tempDate, setTempDate]   = useState(new Date());

  React.useEffect(() => {
    if (visible) {
      setForm(initial || BLANK);
      setShowAndroidPicker(false);
      setShowIOSPicker(false);
    }
  }, [visible]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for this reminder.');
      return;
    }
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    onSave(form);
  };

  // Open date picker
  const openDatePicker = () => {
    setTempDate(form.due_date ? strToDate(form.due_date) : new Date());
    if (Platform.OS === 'android') {
      setShowAndroidPicker(true);
    } else {
      setShowIOSPicker(true);
    }
  };

  // Android: fires on selection or dismiss
  const onAndroidChange = (event, selectedDate) => {
    setShowAndroidPicker(false);
    if (event.type === 'set' && selectedDate) {
      set('due_date', dateToStr(selectedDate));
    }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }];
  const labelStyle = [styles.label, { color: theme.subtext }];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKAV}
        >
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {initial ? 'Edit Reminder' : 'New Reminder'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={labelStyle}>Title *</Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Pay friend for dinner"
                placeholderTextColor={theme.muted}
                value={form.title}
                onChangeText={v => set('title', v)}
              />

              {/* Amount */}
              <Text style={labelStyle}>Amount ({currency}) *</Text>
              <TextInput
                style={inputStyle}
                placeholder="0.00"
                placeholderTextColor={theme.muted}
                value={form.amount}
                onChangeText={v => set('amount', v)}
                keyboardType="decimal-pad"
              />

              {/* Type toggle */}
              <Text style={labelStyle}>Type</Text>
              <View style={styles.typeRow}>
                {['payable', 'receivable'].map(t => {
                  const active = form.type === t;
                  const accent = t === 'payable' ? ACCENT_PAYABLE : ACCENT_RECEIVABLE;
                  const label  = t === 'payable' ? 'I owe money' : 'I am owed money';
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeBtn,
                        { borderColor: active ? accent : theme.border, backgroundColor: active ? accent + '18' : theme.background },
                      ]}
                      onPress={() => set('type', t)}
                    >
                      <Ionicons
                        name={t === 'payable' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                        size={18}
                        color={active ? accent : theme.subtext}
                      />
                      <Text style={[styles.typeBtnLabel, { color: active ? accent : theme.subtext }]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                      <Text style={[styles.typeBtnSub, { color: active ? accent : theme.muted }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Due date — calendar picker */}
              <Text style={labelStyle}>Due Date (optional)</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, { borderColor: theme.border, backgroundColor: theme.background, flex: 1 }]}
                  onPress={openDatePicker}
                >
                  <Ionicons name="calendar-outline" size={18} color={form.due_date ? '#6200ee' : theme.muted} />
                  <Text style={[styles.dateBtnText, { color: form.due_date ? theme.text : theme.muted }]}>
                    {form.due_date ? formatDate(form.due_date) : 'Select a date…'}
                  </Text>
                </TouchableOpacity>
                {form.due_date ? (
                  <TouchableOpacity
                    style={[styles.dateClearBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
                    onPress={() => set('due_date', '')}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={theme.subtext} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Android system picker — rendered when showAndroidPicker is true */}
              {showAndroidPicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  onChange={onAndroidChange}
                />
              )}

              {/* Notes */}
              <Text style={labelStyle}>Notes (optional)</Text>
              <TextInput
                style={[inputStyle, styles.notesInput]}
                placeholder="Any extra context…"
                placeholderTextColor={theme.muted}
                value={form.notes}
                onChangeText={v => set('notes', v)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Save button */}
            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showIOSPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIOSPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowIOSPicker(false)} />
          <View style={[styles.iosPickerSheet, { backgroundColor: theme.card }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowIOSPicker(false)}>
                <Text style={[styles.iosPickerBtn, { color: theme.subtext }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.iosPickerTitle, { color: theme.text }]}>Select Date</Text>
              <TouchableOpacity onPress={() => {
                set('due_date', dateToStr(tempDate));
                setShowIOSPicker(false);
              }}>
                <Text style={[styles.iosPickerBtn, { color: '#6200ee', fontWeight: '700' }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={(_, d) => d && setTempDate(d)}
              style={{ height: 200 }}
              textColor={theme.text}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const [reminders, setReminders]   = useState([]);
  const [modalVisible, setModal]    = useState(false);
  const [editing, setEditing]       = useState(null); // null = add, object = edit

  const load = async () => {
    const rows = await getAllReminders();
    setReminders(rows);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const openAdd  = () => { setEditing(null); setModal(true); };
  const openEdit = (item) => {
    setEditing({
      ...item,
      amount:   String(item.amount),
      due_date: item.due_date || '',
      notes:    item.notes   || '',
    });
    setModal(true);
  };

  const handleSave = async (form) => {
    if (editing) {
      await updateReminder(editing.id, form.title.trim(), form.amount, form.type, form.due_date || null, form.notes.trim());
    } else {
      await addReminder(form.title.trim(), form.amount, form.type, form.due_date || null, form.notes.trim());
    }
    setModal(false);
    load();
  };

  const handleDelete = (item) => {
    Alert.alert('Delete reminder', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteReminder(item.id); load(); },
      },
    ]);
  };

  // Summary totals
  const totalPayable    = reminders.filter(r => r.type === 'payable').reduce((s, r) => s + r.amount, 0);
  const totalReceivable = reminders.filter(r => r.type === 'receivable').reduce((s, r) => s + r.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Summary bar */}
      {reminders.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.subtext }]}>You owe</Text>
            <Text style={[styles.summaryAmount, { color: ACCENT_PAYABLE }]}>
              {currency}{totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.summarySep, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.subtext }]}>Owed to you</Text>
            <Text style={[styles.summaryAmount, { color: ACCENT_RECEIVABLE }]}>
              {currency}{totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={reminders}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[
          styles.list,
          reminders.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={<EmptyState theme={theme} />}
        renderItem={({ item }) => (
          <ReminderCard
            item={item}
            currency={currency}
            theme={theme}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddEditModal
        visible={modalVisible}
        initial={editing}
        theme={theme}
        currency={currency}
        onSave={handleSave}
        onClose={() => setModal(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1 },

  // Summary
  summaryBar:   { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1 },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summarySep:   { width: 1, marginVertical: 4 },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  summaryAmount:{ fontSize: 18, fontWeight: '700' },

  // List
  list:       { padding: 16, gap: 12 },
  listEmpty:  { flex: 1 },

  // Card
  card:         { borderRadius: 14, borderLeftWidth: 4, overflow: 'hidden' },
  cardTop:      { flexDirection: 'row', padding: 14, gap: 12 },
  cardLeft:     { flex: 1, gap: 4 },
  cardRight:    { alignItems: 'flex-end', gap: 6 },
  cardTitle:    { fontSize: 15, fontWeight: '600' },
  cardNotes:    { fontSize: 13 },
  cardAmount:   { fontSize: 18, fontWeight: '700' },
  dueDateRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText:      { fontSize: 12 },
  typeBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:{ fontSize: 11, fontWeight: '600' },
  cardActions:  { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  actionText:   { fontSize: 13, fontWeight: '500' },

  // Empty
  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#6200ee',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },

  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalKAV:     { flex: 1, justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle:   { fontSize: 17, fontWeight: '700' },
  modalBody:    { paddingHorizontal: 18, paddingTop: 14 },
  modalFooter:  { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },

  // Form
  label:      { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  notesInput: { minHeight: 80 },
  typeRow:    { flexDirection: 'row', gap: 10 },
  typeBtn:    { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 12, gap: 4, alignItems: 'center' },
  typeBtnLabel: { fontSize: 14, fontWeight: '600' },
  typeBtnSub:   { fontSize: 11, textAlign: 'center' },

  // Save button
  saveBtn:     { backgroundColor: '#6200ee', borderRadius: 12, padding: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Date picker
  dateRow:         { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  dateBtnText:     { fontSize: 15 },
  dateClearBtn:    { borderWidth: 1, borderRadius: 10, padding: 11 },

  // iOS picker sheet
  iosPickerSheet:  { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iosPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  iosPickerTitle:  { fontSize: 16, fontWeight: '600' },
  iosPickerBtn:    { fontSize: 16 },
});
