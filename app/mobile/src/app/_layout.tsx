import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";

import { sessionManager } from "@/lib/auth/sessionManager";
import { useAuthStore } from "@/stores/authStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const status = useAuthStore((state) => state.status);
  const setAuthenticated = useAuthStore(
    (state) => state.setAuthenticated
  );
  const setUnauthenticated = useAuthStore(
    (state) => state.setUnauthenticated
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    const user = await sessionManager.restore();

    if (user) {
      setAuthenticated(user);
    } else {
      setUnauthenticated();
    }
  }

  useEffect(() => {
    if (status === "bootstrapping") {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && inAuthGroup) {
      router.replace("/");
    }
  }, [status, segments, router]);

  if (status === "bootstrapping") {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}