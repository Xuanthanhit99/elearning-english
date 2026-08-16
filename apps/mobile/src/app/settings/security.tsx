import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Screen } from '../../components/layout/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { signOutCurrentDevice } from '../../features/auth/utils/sign-out';
import {
  useChangePasswordMutation,
  useResendVerificationMutation,
} from '../../features/security/hooks/useSecurityQuery';
import { useProfileQuery } from '../../features/profile/hooks/useProfileQuery';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must have at least 6 characters.').max(128),
    confirmPassword: z.string().min(1, 'Confirm the new password.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Password confirmation does not match.',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const profileQuery = useProfileQuery();
  const changePassword = useChangePasswordMutation();
  const resendVerification = useResendVerificationMutation();
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const submitPassword = async (values: PasswordForm) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    } catch (error) {
      Alert.alert('Password', normalizeApiError(error).message);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await signOutCurrentDevice();
    } finally {
      setLoggingOut(false);
    }
  };

  const resend = async () => {
    try {
      const result = await resendVerification.mutateAsync();
      Alert.alert('Email verification', result.message);
    } catch (error) {
      Alert.alert('Email verification', normalizeApiError(error).message);
    }
  };

  return (
    <Screen>
      <Header title="Security" onBack={() => router.back()} />

      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <AppText variant="heading">Account</AppText>
            <AppText color={colors.textMuted}>{profileQuery.data?.email ?? 'Email'}</AppText>
          </View>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
        </View>
        <AppButton disabled={resendVerification.isPending} onPress={() => void resend()}>
          Resend verification email
        </AppButton>
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="heading">Change password</AppText>
        <AppText color={colors.textMuted}>
          The server revokes all sessions after a successful password change.
        </AppText>
        <PasswordInput
          control={control}
          name="currentPassword"
          label="Current password"
          error={errors.currentPassword?.message}
          autoComplete="current-password"
        />
        <PasswordInput
          control={control}
          name="newPassword"
          label="New password"
          error={errors.newPassword?.message}
          autoComplete="new-password"
        />
        <PasswordInput
          control={control}
          name="confirmPassword"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
        />
        <AppButton disabled={changePassword.isPending} onPress={handleSubmit(submitPassword)}>
          {changePassword.isPending ? 'Changing...' : 'Change password'}
        </AppButton>
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="heading">Logout</AppText>
        <AppText color={colors.textMuted}>
          This signs out this device and clears local secure storage.
        </AppText>
        <AppButton disabled={loggingOut} onPress={() => void logout()}>
          {loggingOut ? 'Logging out...' : 'Logout this device'}
        </AppButton>
      </AppCard>
    </Screen>
  );
}

function PasswordInput({
  control,
  name,
  label,
  error,
  autoComplete,
}: {
  control: ReturnType<typeof useForm<PasswordForm>>['control'];
  name: keyof PasswordForm;
  label: string;
  error?: string;
  autoComplete?: 'current-password' | 'new-password';
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <AppTextInput
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error}
          secureTextEntry
          autoComplete={autoComplete}
        />
      )}
    />
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </Pressable>
      <View>
        <AppText variant="caption" color={colors.primary}>
          Settings
        </AppText>
        <AppText variant="title">{title}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
