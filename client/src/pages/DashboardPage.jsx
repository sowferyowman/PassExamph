import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaArrowRight, FaChartLine, FaExclamationTriangle } from "react-icons/fa";
import { useDashboardData } from "../hooks/useDashboardData";
import DashboardOverview from "../features/dashboard/DashboardOverview";
import { getCurrentUser, getNotificationsForUser, markNotificationsRead } from "../services/storage";

export default function DashboardPage() {
  const { data, loading, error, retry } = useDashboardData();
  const user = getCurrentUser();
  const displayName = user?.nickname || user?.name || "Student";
  
  // Notification state
  const [notifications, setNotifications] = useState(() => getNotificationsForUser(user?.id));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getNotificationsForUser(user?.id));
    }

    window.addEventListener("notificationsUpdated", refreshNotifications);
    window.addEventListener("storage", refreshNotifications);
    return () => {
      window.removeEventListener("notificationsUpdated", refreshNotifications);
      window.removeEventListener("storage", refreshNotifications);
    };
  }, [user?.id]);

  function toggleNotifications() {
    setNotificationsOpen((open) => {
      const nextOpen = !open;
      if (nextOpen && user?.id) {
        setNotifications(markNotificationsRead(user.id));
      }
      return nextOpen;
    });
  }

  function openNotification(notificationId) {
    if (!user?.id) return;
    setNotifications(markNotificationsRead(user.id, notificationId));
    setNotificationsOpen(false);
  }

  function formatNotificationTime(timestamp) {
    const diffMs = Date.now() - Number(timestamp || 0);
    const minutes = Math.max(1, Math.round(diffMs / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  if (loading) {
    return (
      <div className="page-shell" aria-live="polite" aria-busy="true">
        <div className="state-panel border-l-4 border-blue-600">
          <p className="page-eyebrow">Loading dashboard</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Checking your student records...</h2>
          <p className="mt-2 text-sm text-slate-600">Your performance summary will appear in a moment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="state-panel border-l-4 border-rose-500" role="alert">
          <FaExclamationTriangle className="text-xl text-rose-600" />
          <p className="text-sm font-bold uppercase tracking-wider text-rose-600">Dashboard unavailable</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">We couldn't load your dashboard.</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={retry} className="button-primary mt-6">Try Again</button>
        </div>
      </div>
    );
  }

  if (!data || !data.hasDashboardData) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-title">Welcome back, {displayName}</h1>
          <p className="page-description">Your ACET preparation progress lives here.</p>
        </header>
        <div className="state-panel border-l-4 border-blue-600">
          <div className="inline-flex rounded-xl bg-blue-50 p-3 text-xl text-primary"><FaChartLine /></div>
          <p className="mt-5 text-sm font-bold uppercase tracking-wider text-slate-500">No exam analytics yet</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Complete a scored mock exam to unlock your performance dashboard.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Scores, subject mastery, and attempt history will appear here after your first completed mock.</p>
          <Link to="/exam" className="button-primary mt-6">View Mock Exams <FaArrowRight /></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .notification-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 360px;
          max-height: 400px;
          overflow-y: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 12px 48px rgba(15, 23, 42, 0.16);
          border: 1px solid rgba(226, 232, 240, 0.9);
          z-index: 50;
        }
      `}</style>

      <div className="page-shell">
        <DashboardOverview 
          data={data} 
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          unreadCount={unreadCount}
          toggleNotifications={toggleNotifications}
          openNotification={openNotification}
          formatNotificationTime={formatNotificationTime}
        />
      </div>
    </>
  );
}
