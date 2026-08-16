import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/layout/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { register } from '../../features/auth/api/auth-api';
import { registerSchema, type RegisterFormValues } from '../../features/auth/validation';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await register(values);
      setSuccessMessage(response.message ?? 'Đăng ký thành công. Vui lòng đăng nhập.');
      setTimeout(() => router.replace('/(auth)/login'), 900);
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
          <AppText variant="title">Đăng ký</AppText>
          <AppText color={colors.textMuted}>Tạo tài khoản để bắt đầu học mỗi ngày.</AppText>
        </View>

        <AppCard style={styles.formCard}>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                label="Họ tên"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                textContentType="name"
                autoComplete="name"
                autoCapitalize="words"
                error={errors.fullName?.message}
              />
            )}
          />

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
                  textContentType="newPassword"
                  autoComplete="new-password"
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

          {successMessage ? (
            <AppText variant="small" color={colors.success}>
              {successMessage}
            </AppText>
          ) : null}

          <AppButton disabled={isSubmitting} onPress={handleSubmit(onSubmit)}>
            {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
          </AppButton>
        </AppCard>

        <View style={styles.switchRow}>
          <AppText color={colors.textMuted}>Đã có tài khoản?</AppText>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <AppText variant="small" color={colors.primary}>
                Đăng nhập
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
