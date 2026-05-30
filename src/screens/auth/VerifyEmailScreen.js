import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiResendVerification } from '../../utils/api';

export default function VerifyEmailScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const email      = route.params?.email || '';

  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleResend = async () => {
    setLoading(true);
    const res = await apiResendVerification(email);
    setLoading(false);

    if (res.ok) {
      setSent(true);
      Alert.alert('Email Sent', 'A new verification email has been sent.');
    } else {
      Alert.alert('Error', res.data?.message || 'Could not resend email.');
    }
  };

  return (
    <View style={s.screen}>
      <View style={s.card}>
        {/* Icon */}
        <View style={s.iconBox}>
          <Ionicons name="mail" size={44} color="#6200ee" />
        </View>

        <Text style={s.title}>Check Your Email</Text>
        <Text style={s.body}>
          We sent a verification link to{'\n'}
          <Text style={s.email}>{email}</Text>
        </Text>
        <Text style={s.body2}>
          Click the link in the email to verify your account, then come back here to sign in.
        </Text>

        {/* Resend */}
        <TouchableOpacity
          style={[s.resendBtn, (loading || sent) && { opacity: 0.6 }]}
          onPress={handleResend}
          disabled={loading || sent}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#6200ee" />
            : <Text style={s.resendText}>{sent ? 'Email Sent ✓' : 'Resend Email'}</Text>
          }
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Text style={s.loginText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6fa', justifyContent: 'center', padding: 28 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  iconBox: {
    width: 88, height: 88, borderRadius: 24, backgroundColor: '#f3e8ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, color: '#9e9e9e', textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  email: { color: '#6200ee', fontWeight: '700' },
  body2: { fontSize: 13, color: '#bbb', textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 28 },
  resendBtn: {
    borderWidth: 1.5, borderColor: '#6200ee', borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 32, marginBottom: 12, width: '100%', alignItems: 'center',
  },
  resendText: { color: '#6200ee', fontWeight: '700', fontSize: 15 },
  loginBtn: {
    backgroundColor: '#6200ee', borderRadius: 14,
    paddingVertical: 14, width: '100%', alignItems: 'center',
    shadowColor: '#6200ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  loginText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
