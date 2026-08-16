import { authenticatedApiClient } from '../../../services/api/client';
import type { NotificationSettings, UserSettings } from '../types/settings';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(response: { data: ApiResponse<T> | T }) {
  return ((response.data as ApiResponse<T>).data ?? response.data) as T;
}

export async function getSettings() {
  return unwrap<UserSettings>(await authenticatedApiClient.get('/settings'));
}

export async function updateSettings(input: Partial<UserSettings>) {
  return unwrap<UserSettings>(await authenticatedApiClient.patch('/settings', input));
}

export async function getNotificationSettings() {
  return unwrap<NotificationSettings>(
    await authenticatedApiClient.get('/settings/notifications'),
  );
}

export async function updateNotificationSettings(input: Partial<NotificationSettings>) {
  return unwrap<UserSettings>(
    await authenticatedApiClient.patch('/settings/notifications', input),
  );
}

export async function getLearningSettings() {
  return unwrap<Partial<UserSettings>>(await authenticatedApiClient.get('/settings/learning'));
}

export async function getPrivacySettings() {
  return unwrap<Partial<UserSettings>>(await authenticatedApiClient.get('/settings/privacy'));
}
