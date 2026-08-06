import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, getFreshLeaderboard, getStudentDashboard, hydrateDashboardStoreFromServer } from "../services/storage";

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => setRequestVersion((version) => version + 1), []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const user = getCurrentUser();
        // Always pull the current student's saved record before rendering it.
        // This makes admin essay approvals visible without a logout/login cycle.
        await hydrateDashboardStoreFromServer().catch(() => false);
        const dashboard = getStudentDashboard(user?.email);
        // The dashboard's placement is global, so do not derive it from the
        // incomplete local copies of other students' dashboards.
        const leaderboard = await getFreshLeaderboard(user?.email).catch(() => null);
        const currentRow = leaderboard?.find((row) => row.isCurrent);
        if (currentRow) {
          dashboard.stats = (dashboard.stats || []).map((stat) => stat.label === "Leaderboard Placement" ? {
            ...stat,
            value: `#${currentRow.rank}`,
            detail: `Rank #${currentRow.rank} on the leaderboard`
          } : stat);
        }
        if (mounted) {
          setData(dashboard);
        }
      } catch (err) {
        console.error("Dashboard storage error:", err);
        if (mounted) {
          setError("Dashboard data could not be loaded from localStorage.");
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [requestVersion]);

  return { data, loading, error, retry };
}
