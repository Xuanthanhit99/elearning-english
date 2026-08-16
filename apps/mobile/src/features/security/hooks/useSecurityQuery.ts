import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearLocalAuthState } from '../../auth/utils/sign-out';
import {
  changePassword,
  getDeviceSessions,
  resendVerificationEmail,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
} from '../api/security-api';
import { securityKeys } from '../query-keys';
import type { ChangePasswordInput } from '../../settings/types/settings';

export function useDeviceSessionsQuery() {
  return useQuery({
    queryKey: securityKeys.sessions(),
    queryFn: getDeviceSessions,
  });
}

export function useRevokeDeviceSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeDeviceSession,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
    },
  });
}

export function useRevokeOtherDeviceSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeOtherDeviceSessions,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
    retry: false,
    onSuccess: () => {
      void clearLocalAuthState();
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: resendVerificationEmail,
    retry: false,
  });
}
