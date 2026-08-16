import { authenticatedApiClient } from '../../../services/api/client';
import type { ChangePasswordInput, DeviceSession } from '../../settings/types/settings';

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

function unwrap<T>(response: { data: ApiResponse<T> | T }) {
  return ((response.data as ApiResponse<T>).data ?? response.data) as T;
}

export async function changePassword(input: ChangePasswordInput) {
  return unwrap<{ message: string }>(
    await authenticatedApiClient.post('/auth/change-password', input),
  );
}

export async function getDeviceSessions() {
  return unwrap<DeviceSession[]>(await authenticatedApiClient.get('/settings/devices'));
}

export async function revokeDeviceSession(sessionId: string) {
  return unwrap<DeviceSession>(
    await authenticatedApiClient.delete(`/settings/devices/${sessionId}`),
  );
}

export async function revokeOtherDeviceSessions() {
  return unwrap<{ revokedCount: number }>(
    await authenticatedApiClient.delete('/settings/devices'),
  );
}

export async function resendVerificationEmail() {
  return unwrap<{ message: string }>(
    await authenticatedApiClient.post('/auth/resend-verification', {}),
  );
}
