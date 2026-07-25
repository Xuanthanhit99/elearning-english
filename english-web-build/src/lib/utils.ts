export const getAvatarTheme = (level: number) => {
  if (level >= 50)
    return {
      bg: "from-pink-500 via-violet-500 to-cyan-500",
      badge: "ðŸŒŒ Legendary",
    };

  if (level >= 40)
    return {
      bg: "from-yellow-400 via-orange-500 to-red-500",
      badge: "ðŸ‘‘ Master",
    };

  if (level >= 30)
    return {
      bg: "from-cyan-400 to-blue-600",
      badge: "ðŸ† Explorer",
    };

  if (level >= 20)
    return {
      bg: "from-purple-500 to-indigo-600",
      badge: "âš¡ Consistent",
    };

  if (level >= 10)
    return {
      bg: "from-[#ffb347] to-[#ff6b00]",
      badge: "ðŸ”¥ Streak",
    };

  return {
    bg: "from-slate-400 to-slate-600",
    badge: "ðŸŒ± Beginner",
  };
};