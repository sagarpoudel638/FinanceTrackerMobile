import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiSignup } from '../../utils/api';

export default function SignupScreen() {
  const navigation = useNavigation();

  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPw]   = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [loading, setLoading]             = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      return Alert.alert('Validation', 'All fields are required.');
    }
    if (password !== confirmPassword) {
      return Alert.alert('Validation', 'Passwords do not match.');
    }
    if (password.length < 6) {
      return Alert.alert('Validation', 'Password must be at least 6 characters.');
    }

    setLoading(true);
    const res = await apiSignup(name.trim(), email.trim().toLowerCase(), password, confirmPassword);
    setLoading(false);

    if (res.ok) {
      navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
    } else {
      Alert.alert('Sign Up Failed', res.data?.message || 'Something went wrong.');
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Ionicons name="person-add" size={32} color="#6200ee" />
          </View>
          <Text style={s.title}>Create Account</Text>
          <Text style={s.subtitle}>Start tracking your finances</Text>
        </View>

        {/* Name */}
        <Text style={s.label}>FULL NAME</Text>
        <View style={s.inputRow}>
          <Ionicons name="person-outline" size={17} color="#ccc" style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor="#ccc"
            autoCapitalize="words"
          />
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
            placeholder="Min. 6 characters"
            placeholderTextColor="#ccc"
            secureTextEntry={!showPw}
          />
          <TouchableOpacity onPress={() => setShowPw(p => !p)} style={{ padding: 4 }}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Confirm password */}
        <Text style={s.label}>CONFIRM PASSWORD</Text>
        <View style={s.inputRow}>
          <Ionicons name="lock-closed-outline" size={17} color="#ccc" style={s.inputIcon} />
          <TextInput
            style={s.input}
            value={confirmPassword}
            onChangeText={setConfirmPw}
            placeholder="Re-enter password"
            placeholderTextColor="#ccc"
            secureTextEntry={!showPw}
          />
        </View>

        {/* Sign up button */}
        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.7 }]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        {/* Login link */}
        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.link}>Sign In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa' },
  container: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 36 },
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
    marginBottom: 16,
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
