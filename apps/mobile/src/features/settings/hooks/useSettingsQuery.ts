import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import {
  getLearningSettings,
  getNotificationSettings,
  getPrivacySettings,
  getSettings,
  updateNotificationSettings,
  updateSettings,
} from '../api/settings-api';
import { settingsKeys } from '../query-keys';
import type { NotificationSettings, UserSettings } from '../types/settings';

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.root(),
    queryFn: getSettings,
  });
}

export function useLearningSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.learning(),
    queryFn: getLearningSettings,
  });
}

export function useNotificationSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: getNotificationSettings,
  });
}

export function usePrivacySettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.privacy(),
    queryFn: getPrivacySettings,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UserSettings>) => updateSettings(input),
    retry: false,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.root(), settings);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.home() });
    },
  });
}

export function useUpdateNotificationSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<NotificationSettings>) => updateNotificationSettings(input),
    retry: false,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.root(), settings);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.notifications() });
    },
  });
}
