import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiLogin } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return Alert.alert('Validation', 'Email and password are required.');

    setLoading(true);
    const res = await apiLogin(email.trim().toLowerCase(), password);
    setLoading(false);

    if (res.ok) {
      const { token, username, userId } = res.data.data;
      await login(token, { username, userId });
    } else if (res.status === 403) {
      // Email not verified
      Alert.alert(
        'Email Not Verified',
        'Please verify your email before logging in.',
        [
          { text: 'Resend Email', onPress: () => navigation.navigate('VerifyEmail', { email: email.trim() }) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert('Login Failed', res.data?.message || 'Invalid email or password.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Ionicons name="wallet" size={36} color="#6200ee" />
          </View>
          <Text style={s.title}>Finance Tracker</Text>
          <Text style={s.subtitle}>Sign in to your account</Text>
        </View>

        {/* Email */}
        <Text style={s.label}>EMAIL</Text>
        <View style={s.inputRow}>
          <Ionicons name="mail-outline" size={17} color="#ccc" style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#ccc"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password */}
        <Text style={s.label}>PASSWORD</Text>
        <View style={s.inputRow}>
          <Ionicons name="lock-closed-outline" size={17} color="#ccc" style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#ccc"
            secureTextEntry={!showPw}
          />
          <TouchableOpacity onPress={() => setShowPw(p => !p)} style={{ padding: 4 }}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        {/* Sign up link */}
        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={s.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: '#f3e8ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#9e9e9e' },
  label: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16,
    marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#222', paddingVertical: 16 },
  btn: {
    backgroundColor: '#6200ee', borderRadius: 16, padding: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#6200ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: '#9e9e9e', fontSize: 14 },
  link: { color: '#6200ee', fontWeight: '700', fontSize: 14 },
});
