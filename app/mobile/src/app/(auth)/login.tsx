import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { sessionManager } from '@/lib/auth/sessionManager';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import Screen from '@/components/ui/Screen';

export default function LoginScreen() {
  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const setAuthenticated =
    useAuthStore(
      (state) =>
        state.setAuthenticated,
    );

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng nhập email và mật khẩu.',
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await sessionManager.login(
          email.trim(),
          password,
        );

      if (!response.success) {
        if (
          response.twoFactorRequired
        ) {
          router.push({
            pathname: '/two-factor',
            params: {
              email: email.trim(),
              password,
            },
          });

          return;
        }

        return;
      }

      setAuthenticated(
        response.user,
      );

      router.replace('/');
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Đăng nhập thất bại',
        'Email hoặc mật khẩu không đúng, hoặc không thể kết nối máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      scroll
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>
          BeaconVie
        </Text>

        <Text style={styles.title}>
          Chào mừng trở lại 👋
        </Text>

        <Text style={styles.subtitle}>
          Tiếp tục hành trình tiếng Anh
          của bạn.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
          style={styles.input}
        />

        <Button
          title="Đăng nhập"
          loading={loading}
          onPress={handleLogin}
        />
      </View>
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    container: {
      padding: 24,
      justifyContent: 'center',
    },

    header: {
      marginBottom: 32,
    },

    brand: {
      fontSize: 22,
      fontWeight: '800',
      color: '#5B6CFF',
      marginBottom: 16,
    },

    title: {
      fontSize: 30,
      fontWeight: '800',
    },

    subtitle: {
      marginTop: 8,
      fontSize: 15,
      color: '#73778C',
    },

    form: {
      gap: 16,
    },

    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: '#E7E9F0',
      borderRadius: 16,
      paddingHorizontal: 16,
      backgroundColor: '#FFFFFF',
    },
  });