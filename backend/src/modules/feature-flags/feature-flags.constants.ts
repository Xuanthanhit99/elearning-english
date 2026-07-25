// The bounded, typed set of runtime-toggleable features this pass
// supports — deliberately not an open-ended key/value store (Part 11:
// "typed keys", "avoid overengineering"). Adding a new flag means adding a
// line here, not a schema change — FeatureFlag.key is a plain string
// column, this array is just what's considered "known" and gets seeded +
// exposed.
export const KNOWN_FEATURE_FLAGS = [
  { key: 'AI_COACH', description: 'AI Learning Coach recommendations' },
  { key: 'AI_CONVERSATION', description: 'AI Conversation Partner' },
  { key: 'STUDY_TOGETHER', description: 'Study Together / Study Rooms' },
  {
    key: 'COMMUNITY_POSTING',
    description: 'Community post and comment creation',
  },
  { key: 'MEDIA_UPLOADS', description: 'Community media uploads' },
  { key: 'SEASONAL_EVENT', description: 'Seasonal community events' },
  { key: 'PLACEMENT_RETAKE', description: 'Placement test retake' },
] as const;

export type FeatureFlagKey = (typeof KNOWN_FEATURE_FLAGS)[number]['key'];

export const FEATURE_FLAG_KEYS: FeatureFlagKey[] = KNOWN_FEATURE_FLAGS.map(
  (f) => f.key,
);
