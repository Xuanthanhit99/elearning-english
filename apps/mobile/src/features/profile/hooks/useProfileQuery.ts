import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '../../dashboard/query-keys';
import { useAuthStore } from '../../../stores/auth-store';
import { getAchievementOverview, getProfile, updateProfile } from '../api/profile-api';
import { profileKeys } from '../query-keys';
import type { ProfileUser, UpdateProfileInput } from '../types/profile';

export function useProfileQuery() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: getProfile,
  });
}

export function useAchievementOverviewQuery() {
  return useQuery({
    queryKey: profileKeys.achievements(),
    queryFn: getAchievementOverview,
    retry: false,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    retry: false,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me(), profile);
      useAuthStore.getState().setAuthenticated(toAuthUser(profile));
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.home() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.leaderboardMe() });
    },
  });
}

function toAuthUser(profile: ProfileUser) {
  return {
    id: profile.id,
    fullname: profile.fullname,
    email: profile.email,
    avatar: profile.avatar,
    username: profile.username,
    bio: profile.bio,
    goal: profile.goal,
    interests: profile.interests,
    phone: profile.phone,
    level: profile.level,
    xp: profile.xp,
    isPro: profile.isPro,
    role: profile.role,
    englishLevel: profile.englishLevel,
    learningGoal: profile.learningGoal,
    createAt: profile.createAt,
  };
}
