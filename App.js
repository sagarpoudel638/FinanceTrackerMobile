import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import DashboardScreen    from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import InsightsScreen     from './src/screens/InsightsScreen';
import SettingsScreen     from './src/screens/SettingsScreen';
import AddEditScreen      from './src/screens/AddEditScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const map = {
            Dashboard:    focused ? 'grid'         : 'grid-outline',
            Transactions: focused ? 'list'         : 'list-outline',
            Insights:     focused ? 'bar-chart'    : 'bar-chart-outline',
            Settings:     focused ? 'settings'     : 'settings-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor:   '#6200ee',
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          height: 64, borderTopWidth: 0, backgroundColor: theme.tabBar,
          elevation: 12, shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8,
        },
        tabBarLabelStyle:  { fontSize: 11, fontWeight: '600' },
        headerStyle:       { backgroundColor: theme.headerBg },
        headerTintColor:   '#fff',
        headerTitleStyle:  { fontWeight: 'bold', fontSize: 18 },
      })}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}    options={{ headerTitle: 'Finance Tracker' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Insights"     component={InsightsScreen} />
      <Tab.Screen name="Settings"     component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEdit"
        component={AddEditScreen}
        options={{
          presentation:    'modal',
          title:           'Add Transaction',
          headerStyle:     { backgroundColor: theme.headerBg },
          headerTintColor: '#fff',
          headerTitleStyle:{ fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </ThemeProvider>
  );
}
