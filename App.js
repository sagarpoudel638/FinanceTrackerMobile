import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen    from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AddEditScreen      from './src/screens/AddEditScreen';

const Tab = createBottomTabNavigator();

const AddButton = ({ children, onPress }) => (
  <TouchableOpacity style={s.addButton} onPress={onPress} activeOpacity={0.85}>
    <View style={s.addButtonInner}>{children}</View>
  </TouchableOpacity>
);

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size, focused }) => {
            const map = {
              Dashboard:    focused ? 'grid'  : 'grid-outline',
              Transactions: focused ? 'list'  : 'list-outline',
            };
            return <Ionicons name={map[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor:   '#6200ee',
          tabBarInactiveTintColor: '#9e9e9e',
          tabBarStyle:             s.tabBar,
          tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
          headerStyle:             { backgroundColor: '#6200ee' },
          headerTintColor:         '#fff',
          headerTitleStyle:        { fontWeight: 'bold', fontSize: 18 },
        })}
      >
        <Tab.Screen name="Dashboard"    component={DashboardScreen} />
        <Tab.Screen
          name="Add/Edit"
          component={AddEditScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon:  () => <Ionicons name="add" size={32} color="#fff" />,
            tabBarButton: (props) => <AddButton {...props} />,
            headerTitle: 'Add / Edit Transaction',
          }}
        />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  tabBar: {
    height: 64, borderTopWidth: 0, backgroundColor: '#fff',
    elevation: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  addButton:      { top: -22, justifyContent: 'center', alignItems: 'center' },
  addButtonInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#6200ee',
    justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
