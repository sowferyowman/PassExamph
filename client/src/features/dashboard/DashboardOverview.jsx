import { useState } from "react";
import ProgressChart from "./ProgressChart";
import StatCard from "./StatCard";
import OverallScoreGauge from "./OverallScoreGauge";
import { Link } from "react-router-dom";
import { FaArrowRight, FaBookOpen, FaChartLine, FaDownload, FaBell } from "react-icons/fa";

function getWeekStart(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

function aggregateByWeek(points) {
  const weeks = new Map();
  points.forEach((point) => {
    const weekStart = getWeekStart(point.takenAt);
    const key = weekStart ? weekStart.toISOString().slice(0, 10) : `unknown-${weeks.size}`;
    const existing = weeks.get(key) || { scores: [], takenAt: key, weekStart };
    existing.scores.push(Number(point.score));
    weeks.set(key, existing);
  });

  return [...weeks.values()].map((week) => ({
    label: week.weekStart
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(week.weekStart)
      : "Earlier attempts",
    examTitle: week.weekStart ? `Week of ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(week.weekStart)}` : "Earlier attempts",
    takenAt: week.takenAt,
    score: Math.round(week.scores.reduce((sum, score) => sum + score, 0) / week.scores.length),
    isAggregate: true,
    attemptCount: week.scores.length
  }));
}

export default function DashboardOverview({ 
  data, 
  notifications, 
  notificationsOpen, 
  unreadCount, 
  toggleNotifications, 
  openNotification, 
  formatNotificationTime 
}) {
  const [range, setRange] = useState("10_recent");
  const examCount = data.exams.length;
  const completedPoints = data.progression.filter((point) => (
    point?.status !== "Pending Review" &&
    !point?.hasPendingEssays &&
    Number.isFinite(Number(point?.score)) &&
    point.score !== null &&
    point.score !== ""
  ));
  const selectedPoints = range === "10_recent" ? completedPoints.slice(-10) : completedPoints;
  const chartPoints = range === "all" && selectedPoints.length > 20 ? aggregateByWeek(selectedPoints) : selectedPoints;
  const overallAverage = selectedPoints.length
    ? Math.round(selectedPoints.reduce((sum, point) => sum + Number(point.score), 0) / selectedPoints.length)
    : 0;
  const rangeSubtitle = range === "10_recent"
    ? `Across last ${selectedPoints.length} completed mock exam${selectedPoints.length === 1 ? "" : "s"}`
    : `Across ${selectedPoints.length} all-time completed mock exam${selectedPoints.length === 1 ? "" : "s"}`;

  function exportDashboardData() {
    const exportData = { exportedAt: new Date().toISOString(), stats: data.stats, progression: data.progression };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "acet-dashboard-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="dashboard" className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">ACET Performance Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Metrics based on {examCount} completed mock examination{examCount === 1 ? "" : "s"}.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button 
            type="button" 
            onClick={exportDashboardData} 
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <FaDownload className="text-sm" /> Export
          </button>
          
          {/* Notification Button - Small, same size as Export */}
          <div className="relative">
            <button 
              type="button"
              onClick={toggleNotifications}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              aria-label={notificationsOpen ? "Close notifications" : "Open notifications"}
              aria-expanded={notificationsOpen}
            >
              <FaBell className="text-sm" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Card */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                <div className="border-b border-slate-100 p-3 bg-slate-50/80">
                  <p className="text-xs font-black text-slate-950">Notifications</p>
                  <p className="text-[10px] font-semibold text-slate-500">Latest student updates & forum activity</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.slice(0, 8).map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => openNotification(notification.id)}
                      className="block w-full border-b border-slate-100 px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${notification.isRead ? "bg-slate-200" : "bg-blue-600"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 leading-snug">{notification.message}</p>
                          <p className="mt-0.5 text-[9px] font-bold text-slate-400">{formatNotificationTime(notification.timestamp)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {!notifications.length && (
                    <div className="p-6 text-center text-xs font-semibold text-slate-500">
                      No notifications yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        {data.stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-800">Performance analytics</p>
          <p className="text-xs font-semibold text-slate-500">Choose the score window for both analytics cards.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
          <button type="button" onClick={() => setRange("10_recent")} className={`rounded-md px-2.5 py-1.5 transition ${range === "10_recent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Last 10 Exams</button>
          <button type="button" onClick={() => setRange("all")} className={`rounded-md px-2.5 py-1.5 transition ${range === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All Time</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Exam Progression Trajectory</h3>
            {chartPoints.length ? (
              <div className="mt-4 h-72 min-w-0 overflow-visible">
                <ProgressChart points={chartPoints} />
              </div>
            ) : (
              <div className="mt-4 grid h-72 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div>
                  <p className="text-sm font-black text-slate-700">No exam trajectory yet</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Complete a mock exam to generate score movement.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <OverallScoreGauge score={overallAverage} subtitle={rangeSubtitle} />
      </div>

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">Your next move</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Ready for your next challenge?</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">Build momentum with another mock, or turn your weakest area into a strength first.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/weakness-drills" className="button-secondary">
              <FaBookOpen /> Review weak areas
            </Link>
            <Link to="/exam" className="button-primary">
              <FaChartLine /> Take a mock <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
