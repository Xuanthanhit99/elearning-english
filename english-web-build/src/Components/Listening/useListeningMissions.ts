"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import type {
  ApiEnvelope,
  MissionsDashboard,
} from "./listening.types";
import { unwrap } from "./listening.helpers";

export function useListeningMissions() {
  const [dashboard, setDashboard] =
    useState<MissionsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get<
        MissionsDashboard | ApiEnvelope<MissionsDashboard>
      >("/missions-v2/me");

      setDashboard(unwrap(response.data));
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const missions = useMemo(() => {
    return (dashboard?.missions ?? []).filter(
      (mission) =>
        mission.skill === "LISTENING" ||
        mission.action === "LISTEN_AUDIO" ||
        (mission.action === "STUDY_MINUTES" &&
          (!mission.skill || mission.skill === "LISTENING")),
    );
  }, [dashboard]);

  return {
    missions,
    dailyMission:
      missions.find(
        (mission) =>
          mission.type === "DAILY" &&
          !["EXPIRED", "CANCELLED"].includes(mission.status),
      ) ?? null,
    weeklyMission:
      missions.find(
        (mission) =>
          mission.type === "WEEKLY" &&
          !["EXPIRED", "CANCELLED"].includes(mission.status),
      ) ?? null,
    loading,
    reload,
  };
}
