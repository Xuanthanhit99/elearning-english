import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { login } from '../../features/auth/api/auth-api';
import { loginSchema, type LoginFormValues } from '../../features/auth/validation';
import { markAuthSessionChanged } from '../../services/api/client';
import { normalizeApiError } from '../../services/api/errors';
import { setTokens } from '../../services/auth/token-storage';
import { useAuthStore } from '../../stores/auth-store';
import { colors, spacing } from '../../theme';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setApiError(null);

    try {
      const response = await login(values);
      await setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      markAuthSessionChanged();
      setAuthenticated(response.user);
    } catch (error) {
      setApiError(normalizeApiError(error).message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <Screen>
        <View style={styles.header}>
          <AppText variant="caption" color={colors.primary}>
            BeaconVie
          </AppText>
          <AppText variant="title">Đăng nhập</AppText>
          <AppText color={colors.textMuted}>Tiếp tục hành trình học tiếng Anh của bạn.</AppText>
        </View>

        <AppCard style={styles.formCard}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                label="Email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <AppTextInput
                  label="Mật khẩu"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  error={errors.password?.message}
                  style={styles.passwordInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.visibilityButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            )}
          />

          {apiError ? (
            <AppText variant="small" color={colors.danger}>
              {apiError}
            </AppText>
          ) : null}

          <AppButton disabled={isSubmitting} onPress={handleSubmit(onSubmit)}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </AppButton>
        </AppCard>

        <View style={styles.switchRow}>
          <AppText color={colors.textMuted}>Chưa có tài khoản?</AppText>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <AppText variant="small" color={colors.primary}>
                Đăng ký
              </AppText>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  header: {
    gap: spacing.sm,
  },
  formCard: {
    gap: spacing.lg,
  },
  passwordInput: {
    paddingRight: 52,
  },
  visibilityButton: {
    position: 'absolute',
    right: spacing.md,
    top: 34,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
