import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTransactions, deleteTransaction } from '../database/db';

const formatDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const navigation = useNavigation();

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    const data = await getAllTransactions();
    setTransactions(data);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteTransaction(id); load(); },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isIncome = (item.income || 0) > 0;
    return (
      <View style={s.row}>
        {/* Colour icon */}
        <View style={[s.iconBox, { backgroundColor: isIncome ? '#e8f5e9' : '#ffebee' }]}>
          <Ionicons
            name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={22} color={isIncome ? '#4caf50' : '#ef5350'}
          />
        </View>

        {/* Title + date + remarks */}
        <View style={s.rowCenter}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.rowDate}>{formatDate(item.date)}</Text>
          {!!item.remarks && (
            <Text style={s.rowRemarks} numberOfLines={1}>{item.remarks}</Text>
          )}
        </View>

        {/* Amount */}
        <View style={s.rowAmount}>
          {(item.income   || 0) > 0 && <Text style={s.incomeText}>+${item.income.toFixed(2)}</Text>}
          {(item.expenses || 0) > 0 && <Text style={s.expenseText}>-${item.expenses.toFixed(2)}</Text>}
        </View>

        {/* Actions */}
        <TouchableOpacity onPress={() => navigation.navigate('Add/Edit', { transaction: item })} style={s.actionBtn}>
          <Ionicons name="pencil-outline" size={17} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.actionBtn}>
          <Ionicons name="trash-outline" size={17} color="#ef5350" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      {transactions.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={56} color="#d1d5db" />
          <Text style={s.emptyTitle}>No transactions yet</Text>
          <Text style={s.emptySub}>Tap + to add your first one</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  iconBox:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowCenter:   { flex: 1 },
  rowTitle:    { fontSize: 14, fontWeight: '600', color: '#222' },
  rowDate:     { fontSize: 11, color: '#bbb', marginTop: 2 },
  rowRemarks:  { fontSize: 11, color: '#aaa', marginTop: 2, fontStyle: 'italic' },
  rowAmount:   { alignItems: 'flex-end', marginRight: 8 },
  incomeText:  { fontSize: 13, fontWeight: '700', color: '#4caf50' },
  expenseText: { fontSize: 13, fontWeight: '700', color: '#ef5350' },
  actionBtn:   { padding: 6 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 17, fontWeight: '600', color: '#bbb', marginTop: 16 },
  emptySub:    { fontSize: 13, color: '#d1d5db', marginTop: 6 },
});
