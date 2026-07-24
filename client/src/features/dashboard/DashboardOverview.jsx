import ProgressChart from "./ProgressChart";
import StatCard from "./StatCard";
import OverallScoreGauge from "./OverallScoreGauge";
import { Link } from "react-router-dom";
import { FaArrowRight, FaBookOpen, FaChartLine, FaDownload } from "react-icons/fa";

export default function DashboardOverview({ 
  data, 
  notifications, 
  notificationsOpen, 
  unreadCount, 
  toggleNotifications, 
  openNotification, 
  formatNotificationTime 
}) {
  const examCount = data.exams.length;
  const completedScores = data.progression
    .map((point) => Number(point.score))
    .filter((score) => Number.isFinite(score));
  const overallAverage = completedScores.length
    ? Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length)
    : 0;

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
        
        <div className="flex items-center gap-3">
          <button type="button" onClick={exportDashboardData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            <FaDownload /> Export data
          </button>
        {/* Notification Button - Aligned with the header */}
        <div className="relative flex-shrink-0">
          <button 
            type="button"
            onClick={toggleNotifications}
            className="group relative cursor-pointer focus-visible:outline-none"
            aria-label={notificationsOpen ? "Close notifications" : "Open notifications"}
            aria-expanded={notificationsOpen}
          >
            {unreadCount > 0 && (
              <div className="absolute -right-1 -top-1 z-10">
                <div className="flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </div>
              </div>
            )}

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-bl from-slate-900 via-slate-950 to-black p-[1px] shadow-lg shadow-blue-500/10">
              <div className="relative flex items-center gap-3 rounded-xl bg-slate-950 px-4 py-2 transition-all duration-300 group-hover:bg-slate-950/50">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 transition-transform duration-300 group-hover:scale-110">
                  <svg stroke="currentColor" viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                    <path
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    ></path>
                  </svg>
                  <div className="absolute inset-0 rounded-lg bg-blue-500/40 blur-xs transition-all duration-300 group-hover:blur-sm"></div>
                </div>

                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold text-white">Updates</span>
                  <span className="text-[9px] font-medium text-blue-400/80">Check updates</span>
                </div>

                <div className="ml-auto flex items-center gap-0.5">
                  <div className="h-1 w-1 rounded-full bg-blue-500 transition-transform duration-300 group-hover:scale-150"></div>
                  <div className="h-1 w-1 rounded-full bg-blue-500/50 transition-transform duration-300 group-hover:scale-150 group-hover:delay-100"></div>
                  <div className="h-1 w-1 rounded-full bg-blue-500/30 transition-transform duration-300 group-hover:scale-150 group-hover:delay-200"></div>
                </div>
              </div>

              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 opacity-10 transition-opacity duration-300 group-hover:opacity-30"></div>
            </div>
          </button>

          {/* Notifications Dropdown Card */}
          {notificationsOpen && (
            <div className="notification-dropdown">
              <div className="border-b border-slate-100 p-4 bg-slate-50/80">
                <p className="text-sm font-black text-slate-950">Notifications</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Latest student updates & forum activity</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.slice(0, 8).map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => openNotification(notification.id)}
                    className="block w-full border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-slate-200" : "bg-blue-600"}`} />
                      <div className="min-w-0">
                        <p className="break-words text-xs font-bold text-slate-800 leading-snug">{notification.message}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{formatNotificationTime(notification.timestamp)}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">Exam Progression Trajectory</h3>
            {data.progression.length ? (
              <div className="mt-4 h-72 min-w-0 overflow-visible">
                <ProgressChart points={data.progression} />
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
        <OverallScoreGauge score={overallAverage} examCount={completedScores.length} />
      </div>

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">Your next move</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Ready for your next challenge?</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">Build momentum with another mock, or turn your weakest area into a strength first.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/weakness-drills" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-800 transition hover:border-blue-300 hover:bg-blue-50">
              <FaBookOpen /> Review weak areas
            </Link>
            <Link to="/exam" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800">
              <FaChartLine /> Take a mock <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
