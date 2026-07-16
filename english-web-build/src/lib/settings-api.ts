import { api } from './axios';
import { DeviceSession, Settings } from './settings-types';

export const settingsApi = {
  get: () => api<Settings>('/settings'),

  update: (payload: Partial<Settings>) =>
    api<Settings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  resetSection: (section: string) =>
    api<Settings>('/settings/reset-section', {
      method: 'POST',
      body: JSON.stringify({ section }),
    }),

  getDevices: () =>
    api<DeviceSession[]>('/settings/devices'),

  revokeDevice: (id: string) =>
    api(`/settings/devices/${id}`, {
      method: 'DELETE',
    }),

  revokeOtherDevices: () =>
    api('/settings/devices', {
      method: 'DELETE',
    }),

  getLearningDna: () =>
    api<{
      enabled: boolean;
      snapshot: null | {
        strongestSkill?: string;
        weakestSkill?: string;
        bestStudyHour?: number;
        retentionScore?: number;
        consistencyScore?: number;
        recommendedFocus: string[];
      };
    }>('/settings/learning-dna'),

  exportUrl: `${process.env.NEXT_PUBLIC_API_URL}/settings/export`,
};
