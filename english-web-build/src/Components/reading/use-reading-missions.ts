"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/axios";
import {
  ApiEnvelope,
  MissionItem,
  MissionsDashboard,
} from "./reading-v2.types";

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  if (
    typeof value === "object" &&
    value !== null &&
    "data" in value
  ) {
    return (value as ApiEnvelope<T>).data;
  }

  return value as T;
}

export function useReadingMissions() {
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
      /*
       * Reading vẫn hoạt động khi Missions tạm lỗi.
       */
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
        mission.skill === "READING" ||
        mission.action === "READ_ARTICLE" ||
        mission.action === "STUDY_MINUTES" ||
        (mission.action === "COMPLETE_LESSON" &&
          mission.skill === "READING"),
    );
  }, [dashboard]);

  const dailyMission =
    missions.find(
      (mission) =>
        mission.type === "DAILY" &&
        mission.status !== "EXPIRED" &&
        mission.status !== "CANCELLED",
    ) ?? null;

  const weeklyMission =
    missions.find(
      (mission) =>
        mission.type === "WEEKLY" &&
        mission.status !== "EXPIRED" &&
        mission.status !== "CANCELLED",
    ) ?? null;

  function missionForArticle(articleId: string) {
    return (
      missions.find(
        (mission) =>
          mission.lessonId === articleId ||
          mission.action === "READ_ARTICLE",
      ) ?? null
    );
  }

  return {
    dashboard,
    missions,
    dailyMission,
    weeklyMission,
    missionForArticle,
    loading,
    reload,
  };
}

export function missionStatusText(mission: MissionItem) {
  if (mission.status === "COMPLETED") return "Có thể nhận thưởng";
  if (mission.status === "CLAIMED") return "Đã nhận thưởng";
  if (mission.status === "EXPIRED") return "Đã hết hạn";
  if (mission.status === "CANCELLED") return "Đã hủy";
  return `${mission.progress}/${mission.target}`;
}
