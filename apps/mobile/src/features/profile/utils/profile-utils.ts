import type { ProfileUser, UpdateProfileInput } from '../types/profile';

const CLEARABLE_FIELDS: Array<keyof UpdateProfileInput> = [
  'bio',
  'goal',
  'englishLevel',
  'learningGoal',
];

export function initials(name?: string | null) {
  return (name || 'BeaconVie')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function cleanProfileInput(input: UpdateProfileInput) {
  const payload: UpdateProfileInput = {};
  (Object.keys(input) as Array<keyof UpdateProfileInput>).forEach((key) => {
    const value = input[key];
    if (typeof value !== 'string') return;
    const normalized = value.trim();
    if (normalized || CLEARABLE_FIELDS.includes(key)) {
      payload[key] = normalized;
    }
  });
  return payload;
}

export function validateProfileInput(input: UpdateProfileInput) {
  const errors: Partial<Record<keyof UpdateProfileInput, string>> = {};

  if (!input.fullname || input.fullname.trim().length < 2) {
    errors.fullname = 'Full name must have at least 2 characters.';
  } else if (input.fullname.trim().length > 50) {
    errors.fullname = 'Full name must be 50 characters or fewer.';
  }

  if (input.username) {
    if (input.username.length < 4 || input.username.length > 30) {
      errors.username = 'Username must be 4-30 characters.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(input.username)) {
      errors.username = 'Username can use letters, numbers, and underscore.';
    }
  }

  if (input.bio && input.bio.length > 160) {
    errors.bio = 'Bio must be 160 characters or fewer.';
  }

  if (input.goal && input.goal.length > 120) {
    errors.goal = 'Goal must be 120 characters or fewer.';
  }

  if (input.phone && !/^(\+84|0)[0-9]{9,10}$/.test(input.phone)) {
    errors.phone = 'Use a valid Vietnam phone number.';
  }

  return errors;
}

export function profileToForm(profile: ProfileUser): Required<UpdateProfileInput> {
  return {
    fullname: profile.fullname ?? '',
    username: profile.username ?? '',
    bio: profile.bio ?? '',
    goal: profile.goal ?? '',
    phone: profile.phone ?? '',
    englishLevel: profile.englishLevel ?? '',
    learningGoal: profile.learningGoal ?? '',
  };
}
