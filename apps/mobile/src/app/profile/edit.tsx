import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { Screen } from '../../components/layout/Screen';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { AppTextInput } from '../../components/ui/AppTextInput';
import {
  useProfileQuery,
  useUpdateProfileMutation,
} from '../../features/profile/hooks/useProfileQuery';
import type { UpdateProfileInput } from '../../features/profile/types/profile';
import {
  cleanProfileInput,
  profileToForm,
} from '../../features/profile/utils/profile-utils';
import { normalizeApiError } from '../../services/api/errors';
import { colors, spacing } from '../../theme';

const profileSchema = z.object({
  fullname: z.string().trim().min(2, 'Full name must have at least 2 characters.').max(50),
  username: z
    .string()
    .trim()
    .refine((value) => !value || (value.length >= 4 && value.length <= 30), 'Username must be 4-30 characters.')
    .refine((value) => !value || /^[a-zA-Z0-9_]+$/.test(value), 'Username can use letters, numbers, and underscore.'),
  bio: z.string().max(160, 'Bio must be 160 characters or fewer.'),
  goal: z.string().max(120, 'Goal must be 120 characters or fewer.'),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || /^(\+84|0)[0-9]{9,10}$/.test(value), 'Use a valid Vietnam phone number.'),
  englishLevel: z.string(),
  learningGoal: z.string().max(120),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileEditScreen() {
  const router = useRouter();
  const profileQuery = useProfileQuery();
  const updateMutation = useUpdateProfileMutation();
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullname: '',
      username: '',
      bio: '',
      goal: '',
      phone: '',
      englishLevel: '',
      learningGoal: '',
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset(profileToForm(profileQuery.data));
    }
  }, [profileQuery.data, reset]);

  const save = async (values: ProfileForm) => {
    const payload = cleanProfileInput(values as UpdateProfileInput);
    try {
      await updateMutation.mutateAsync(payload);
      router.back();
    } catch (error) {
      Alert.alert('Profile', normalizeApiError(error).message);
    }
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <AppText variant="caption" color={colors.primary}>
            Profile
          </AppText>
          <AppText variant="title">Edit profile</AppText>
        </View>
      </View>

      <AppCard style={styles.formCard}>
        <ControlledInput name="fullname" label="Full name" control={control} error={errors.fullname?.message} autoCapitalize="words" maxLength={50} />
        <ControlledInput name="username" label="Username" control={control} error={errors.username?.message} maxLength={30} placeholder="minh_anh99" />
        <ControlledInput name="phone" label="Phone" control={control} error={errors.phone?.message} keyboardType="phone-pad" placeholder="0912345678" />
        <ControlledInput name="englishLevel" label="English level" control={control} error={errors.englishLevel?.message} placeholder="B1" maxLength={20} />
        <ControlledInput name="learningGoal" label="Learning goal" control={control} error={errors.learningGoal?.message} maxLength={120} />
        <ControlledInput name="bio" label="Bio" control={control} error={errors.bio?.message} multiline maxLength={160} style={styles.multiline} />
        <ControlledInput name="goal" label="Goal" control={control} error={errors.goal?.message} multiline maxLength={120} style={styles.multiline} />

        <AppButton disabled={updateMutation.isPending} onPress={handleSubmit(save)}>
          {updateMutation.isPending ? 'Saving...' : 'Save changes'}
        </AppButton>
      </AppCard>
    </Screen>
  );
}

type ControlledInputProps = ComponentProps<typeof AppTextInput> & {
  name: keyof ProfileForm;
  control: ReturnType<typeof useForm<ProfileForm>>['control'];
};

function ControlledInput({ name, control, ...props }: ControlledInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <AppTextInput
          {...props}
          value={value}
          onBlur={onBlur}
          onChangeText={onChange}
        />
      )}
    />
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
  pressed: {
    opacity: 0.72,
  },
  titleBlock: {
    flex: 1,
  },
  formCard: {
    gap: spacing.lg,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
});
