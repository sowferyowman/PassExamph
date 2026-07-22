import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaBookOpen, FaBullseye, FaClipboardList, FaCog, FaGraduationCap, FaSignOutAlt, FaTachometerAlt } from "react-icons/fa";
import { getCurrentUser, logoutUser } from "../services/storage";

const SIDEBAR_PREFERENCE_KEY = "acetAdminSidebarCollapsed";

export default function AdminSidebar({ active = "exam", onModeChange }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const displayName = user?.name || "Admin Workspace";
  const initials = getInitials(displayName);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true");

  function toggleSidebar() {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(newState));
  }

  function goToBuilder(mode) {
    onModeChange?.(mode);
    navigate(`/admin/exams?mode=${mode}`);
  }

  function logout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <style>{`
        /* Consistent Premium Ateneo Blue Sidebar Studio Gradient */
        .sidebar-gradient {
          background-color: #00122c !important;
          background-image: linear-gradient(180deg, #001c44 0%, #000c1d 100%) !important;
        }

        /* Profile Banner matching background tint */
        .profile-container {
          background-color: rgba(0, 12, 29, 0.6) !important;
        }

        /* Global scrollbar tuning for clean dark layout context */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Malupit na Logo Transition Effects */
        .logo-container-collapsed {
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
        }

        .logo-hat-collapsed {
          position: absolute;
          opacity: 1;
          transition: all 300ms ease-in-out;
          color: #60a5fa;
        }

        .logo-text-collapsed {
          position: absolute;
          opacity: 0;
          transform: scale(0.8);
          transition: all 300ms ease-in-out;
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.05em;
          line-height: 1.1;
          text-align: center;
          color: #38bdf8;
          width: 100%;
        }

        /* Trigger swap on hover kapag naka-collapse */
        .logo-container-collapsed:hover .logo-hat-collapsed {
          opacity: 0;
          transform: scale(0.6) rotate(-15deg);
        }

        .logo-container-collapsed:hover .logo-text-collapsed {
          opacity: 1;
          transform: scale(1);
        }
      `}</style>

      <aside className={`sidebar-gradient hidden h-screen shrink-0 flex-col text-white shadow-xl border-r border-white/5 transition-[width] duration-200 md:flex ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        
        {/* Logo / Header & Toggle Block */}
        <div className={`flex ${sidebarCollapsed ? "flex-col items-center gap-4 p-4" : "items-center justify-between p-6"}`}>
          
          {/* COLLAPSED BRAND LOGO HOVER EFFECT LAYER */}
          {sidebarCollapsed ? (
            <div className="logo-container-collapsed select-none">
              <div className="logo-hat-collapsed">
                <FaGraduationCap className="h-7 w-7" />
              </div>
              <div className="logo-text-collapsed">
                ACET<br/>ADMIN
              </div>
            </div>
          ) : (
            /* STATIC EXPANDED LOGO VIEW */
            <div className="flex items-center gap-3 select-none pointer-events-none">
              <div className="rounded-xl bg-white/10 border border-white/10 p-2 text-white shadow-lg backdrop-blur-sm">
                <FaGraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-white leading-none">ACET</h1>
                <p className="text-[9px] font-black tracking-[0.25em] text-blue-400 mt-1">ADMIN PANEL</p>
              </div>
            </div>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <FaAngleDoubleRight className="text-xs" /> : <FaAngleDoubleLeft className="text-xs" />}
          </button>
        </div>

        {/* Navigation Items - Same as Student Sidebar */}
        <nav className={`flex-1 space-y-1.5 overflow-y-auto ${sidebarCollapsed ? "px-3" : "px-4"}`} aria-label="Admin navigation">
          <button type="button" onClick={() => navigate("/admin/dashboard")} title={sidebarCollapsed ? "Dashboard" : undefined} className={`flex w-full items-center rounded-xl py-3 text-sm font-bold transition-all ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"} ${active === "dashboard" ? "bg-white/10 text-white border border-white/10 shadow-inner" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
            <FaTachometerAlt className="shrink-0 text-base" />{!sidebarCollapsed && <span>Dashboard</span>}{sidebarCollapsed && <span className="sr-only">Dashboard</span>}
          </button>
          <button
            type="button"
            onClick={() => goToBuilder("exam")}
            title={sidebarCollapsed ? "Create Exam" : undefined}
            className={`flex w-full items-center rounded-xl py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
              sidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
            } ${
              active === "exam"
                ? "bg-white/10 text-white border border-white/10 shadow-inner"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FaClipboardList className="shrink-0 text-base" /> 
            {!sidebarCollapsed && <span>Create Exam</span>}
            {sidebarCollapsed && <span className="sr-only">Create Exam</span>}
          </button>

          <button
            type="button"
            onClick={() => goToBuilder("reviewer")}
            title={sidebarCollapsed ? "Create Reviewer" : undefined}
            className={`flex w-full items-center rounded-xl py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
              sidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
            } ${
              active === "reviewer"
                ? "bg-white/10 text-white border border-white/10 shadow-inner"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FaBookOpen className="shrink-0 text-base" /> 
            {!sidebarCollapsed && <span>Create Reviewer</span>}
            {sidebarCollapsed && <span className="sr-only">Create Reviewer</span>}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/drills")}
            title={sidebarCollapsed ? "Create Drill" : undefined}
            className={`flex w-full items-center rounded-xl py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
              sidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"
            } ${
              active === "drill"
                ? "bg-white/10 text-white border border-white/10 shadow-inner"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FaBullseye className="shrink-0 text-base" /> 
            {!sidebarCollapsed && <span>Create Drill</span>}
            {sidebarCollapsed && <span className="sr-only">Create Drill</span>}
          </button>
          <button type="button" onClick={() => navigate("/admin/settings")} title={sidebarCollapsed ? "Settings" : undefined} className={`flex w-full items-center rounded-xl py-3 text-sm font-bold transition-all ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-4"} ${active === "settings" ? "bg-white/10 text-white border border-white/10 shadow-inner" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
            <FaCog className="shrink-0 text-base" />{!sidebarCollapsed && <span>Settings</span>}{sidebarCollapsed && <span className="sr-only">Settings</span>}
          </button>
        </nav>

        {/* Profile Footer block */}
        <div className={`profile-container border-t border-white/5 ${sidebarCollapsed ? "p-3" : "p-4"}`}>
          <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-3" : "gap-3"}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-inner">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white leading-tight">{displayName}</p>
                <p className="text-[11px] font-bold text-blue-400 mt-0.5">Admin Account</p>
              </div>
            )}
            <button 
              onClick={logout} 
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20" 
              aria-label="Log out" 
              title={sidebarCollapsed ? "Log out" : undefined}
            >
              <FaSignOutAlt />
            </button>
          </div>  
        </div>
      </aside>
    </>
  );
}

function getInitials(value) {
  return String(value || "Admin Workspace")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
