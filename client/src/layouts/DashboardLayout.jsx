import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FaAngleDoubleLeft, FaAngleDoubleRight, FaBookOpen, FaBrain, FaBars, FaChartLine, FaClipboardCheck, FaClipboardList, FaCog, FaComments, FaGraduationCap, FaSignOutAlt, FaTimes, FaTrophy } from "react-icons/fa";
import { getCurrentUser, logoutUser } from "../services/storage";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: FaChartLine },
  { to: "/exam-log", label: "Exam Records", icon: FaClipboardCheck },
  { to: "/reviewers", label: "Study Plan", icon: FaBookOpen },
  { to: "/weakness-drills", label: "Weakness Drills", icon: FaBrain },
  { to: "/community", label: "Community Forum", icon: FaComments },
  { to: "/rewards", label: "Rewards & Badges", icon: FaTrophy },
  { to: "/settings", label: "Settings", icon: FaCog }
];

const SIDEBAR_PREFERENCE_KEY = "acetStudentSidebarCollapsed";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const displayName = user?.nickname || user?.name || user?.email || "Student";
  const initials = getInitials(displayName);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    function refreshUser(event) {
      const nextUser = event.detail || getCurrentUser();
      setUser(nextUser);
    }

    window.addEventListener("currentActiveUserUpdated", refreshUser);
    window.addEventListener("storage", refreshUser);
    return () => {
      window.removeEventListener("currentActiveUserUpdated", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  function confirmLogout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <style>{`
        /* Ateneo Blue Sidebar Studio Gradient */
        .sidebar-gradient {
          background-color: #00122c !important;
          background-image: linear-gradient(180deg, #001c44 0%, #000c1d 100%) !important;
        }

        /* Profile Banner background */
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

        /* Continue Application Button - From Uiverse.io by Nawsome */
        .continue-application {
          --color: #fff;
          --background: #404660;
          --background-hover: #3A4059;
          --background-left: #2B3044;
          --folder: #F3E9CB;
          --folder-inner: #BEB393;
          --paper: #FFFFFF;
          --paper-lines: #BBC1E1;
          --paper-behind: #E1E6F9;
          --pencil-cap: #fff;
          --pencil-top: #275EFE;
          --pencil-middle: #fff;
          --pencil-bottom: #5C86FF;
          --shadow: rgba(13, 15, 25, .2);
          border: none;
          outline: none;
          cursor: pointer;
          position: relative;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 500;
          line-height: 19px;
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
          padding: 17px 29px 17px 69px;
          transition: background 0.3s;
          color: var(--color);
          background: var(--bg, var(--background));
          width: 100%;
          text-align: left;
        }

        .continue-application > div {
          top: 0;
          left: 0;
          bottom: 0;
          width: 53px;
          position: absolute;
          overflow: hidden;
          border-radius: 5px 0 0 5px;
          background: var(--background-left);
        }

        .continue-application > div .folder {
          width: 23px;
          height: 27px;
          position: absolute;
          left: 15px;
          top: 13px;
        }

        .continue-application > div .folder .top {
          left: 0;
          top: 0;
          z-index: 2;
          position: absolute;
          transform: translateX(var(--fx, 0));
          transition: transform 0.4s ease var(--fd, 0.3s);
        }

        .continue-application > div .folder .top svg {
          width: 24px;
          height: 27px;
          display: block;
          fill: var(--folder);
          transform-origin: 0 50%;
          transition: transform 0.3s ease var(--fds, 0.45s);
          transform: perspective(120px) rotateY(var(--fr, 0deg));
        }

        .continue-application > div .folder:before, .continue-application > div .folder:after,
        .continue-application > div .folder .paper {
          content: "";
          position: absolute;
          left: var(--l, 0);
          top: var(--t, 0);
          width: var(--w, 100%);
          height: var(--h, 100%);
          border-radius: 1px;
          background: var(--b, var(--folder-inner));
        }

        .continue-application > div .folder:before {
          box-shadow: 0 1.5px 3px var(--shadow), 0 2.5px 5px var(--shadow), 0 3.5px 7px var(--shadow);
          transform: translateX(var(--fx, 0));
          transition: transform 0.4s ease var(--fd, 0.3s);
        }

        .continue-application > div .folder:after,
        .continue-application > div .folder .paper {
          --l: 1px;
          --t: 1px;
          --w: 21px;
          --h: 25px;
          --b: var(--paper-behind);
        }

        .continue-application > div .folder:after {
          transform: translate(var(--pbx, 0), var(--pby, 0));
          transition: transform 0.4s ease var(--pbd, 0s);
        }

        .continue-application > div .folder .paper {
          z-index: 1;
          --b: var(--paper);
        }

        .continue-application > div .folder .paper:before, .continue-application > div .folder .paper:after {
          content: "";
          width: var(--wp, 14px);
          height: 2px;
          border-radius: 1px;
          transform: scaleY(0.5);
          left: 3px;
          top: var(--tp, 3px);
          position: absolute;
          background: var(--paper-lines);
          box-shadow: 0 12px 0 0 var(--paper-lines), 0 24px 0 0 var(--paper-lines);
        }

        .continue-application > div .folder .paper:after {
          --tp: 6px;
          --wp: 10px;
        }

        .continue-application > div .pencil {
          height: 2px;
          width: 3px;
          border-radius: 1px 1px 0 0;
          top: 8px;
          left: 105%;
          position: absolute;
          z-index: 3;
          transform-origin: 50% 19px;
          background: var(--pencil-cap);
          transform: translateX(var(--pex, 0)) rotate(35deg);
          transition: transform 0.4s ease var(--pbd, 0s);
        }

        .continue-application > div .pencil:before, .continue-application > div .pencil:after {
          content: "";
          position: absolute;
          display: block;
          background: var(--b, linear-gradient(var(--pencil-top) 55%, var(--pencil-middle) 55.1%, var(--pencil-middle) 60%, var(--pencil-bottom) 60.1%));
          width: var(--w, 5px);
          height: var(--h, 20px);
          border-radius: var(--br, 2px 2px 0 0);
          top: var(--t, 2px);
          left: var(--l, -1px);
        }

        .continue-application > div .pencil:before {
          -webkit-clip-path: polygon(0 5%, 5px 5%, 5px 17px, 50% 20px, 0 17px);
          clip-path: polygon(0 5%, 5px 5%, 5px 17px, 50% 20px, 0 17px);
        }

        .continue-application > div .pencil:after {
          --b: none;
          --w: 3px;
          --h: 6px;
          --br: 0 2px 1px 0;
          --t: 3px;
          --l: 3px;
          border-top: 1px solid var(--pencil-top);
          border-right: 1px solid var(--pencil-top);
        }

        .continue-application:before, .continue-application:after {
          content: "";
          position: absolute;
          width: 10px;
          height: 2px;
          border-radius: 1px;
          background: var(--color);
          transform-origin: 9px 1px;
          transform: translateX(var(--cx, 0)) scale(0.5) rotate(var(--r, -45deg));
          top: 26px;
          right: 16px;
          transition: transform 0.3s;
        }

        .continue-application:after {
          --r: 45deg;
        }

        .continue-application:hover {
          --cx: 2px;
          --bg: var(--background-hover);
          --fx: -40px;
          --fr: -60deg;
          --fd: .15s;
          --fds: 0s;
          --pbx: 3px;
          --pby: -3px;
          --pbd: .15s;
          --pex: -24px;
        }

        /* Collapsed sidebar button adjustment */
        .continue-application-collapsed {
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.4) !important;
          transition: all 0.2s !important;
        }

        .continue-application-collapsed:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #ffffff !important;
          border-radius: 0.75rem !important;
        }

        .continue-application-collapsed > div {
          display: none !important;
        }

        .continue-application-collapsed:before,
        .continue-application-collapsed:after {
          display: none !important;
        }

        /* Malupit na Logo Transition Effects (Inspired by Uiverse structure) */
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
          color: #60a5fa; /* Original text-blue-400 */
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
          color: #38bdf8; /* Cyan-400 accent color para sa text */
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

      <div className="flex h-screen overflow-hidden bg-slate-50">
        
        {/* DESKTOP SIDEBAR */}
        <aside className={`sidebar-gradient hidden shrink-0 flex-col text-white shadow-xl border-r border-white/5 transition-[width] duration-200 md:flex ${sidebarCollapsed ? "w-20" : "w-64"}`}>
          
          {/* Logo / Header & Toggle Block */}
          <div className={`flex ${sidebarCollapsed ? "flex-col items-center gap-4 p-4" : "items-center justify-between p-6"}`}>
            
            {/* COLLAPSED BRAND LOGO HOVER EFFECT LAYER */}
            {sidebarCollapsed ? (
              <div className="logo-container-collapsed select-none">
                <div className="logo-hat-collapsed">
                  <FaGraduationCap className="h-7 w-7" />
                </div>
                <div className="logo-text-collapsed">
                  ACET<br/>PREP
                </div>
              </div>
            ) : (
              /* STATIC EXPANDED LOGO VIEW */
              <div className="flex items-center gap-3 select-none pointer-events-none">
                <div className="p-1 text-blue-400">
                  <FaGraduationCap className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-white leading-none">ACET</h1>
                  <p className="text-[9px] font-black tracking-[0.25em] text-blue-400 mt-1">STUDENT PREP</p>
                </div>
              </div>
            )}

            {/* Collapse/Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <FaAngleDoubleRight className="text-xs" /> : <FaAngleDoubleLeft className="text-xs" />}
            </button>
          </div>

          {/* Quick Start Main Button */}
          <div className={`pb-5 ${sidebarCollapsed ? "px-3" : "px-4"}`}>
            <button
              onClick={() => navigate("/exam")}
              className={`continue-application ${
                sidebarCollapsed 
                  ? "continue-application-collapsed flex items-center justify-center h-11 w-11 mx-auto" 
                  : ""
              }`}
              aria-label="Start ACET mock exam"
              title={sidebarCollapsed ? "Start ACET mock exam" : undefined}
            >
              {!sidebarCollapsed && (
                <>
                  <div>
                    <div className="folder">
                      <div className="top">
                        <svg viewBox="0 0 24 27">
                          <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8 L0,8 L0,1 C0,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
                        </svg>
                      </div>
                      <div className="paper"></div>
                    </div>
                    <div className="pencil"></div>
                  </div>
                  <span>Start Exam</span>
                </>
              )}

              {sidebarCollapsed && <FaClipboardList className="shrink-0 text-base" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`flex-1 space-y-1.5 overflow-y-auto ${sidebarCollapsed ? "px-3" : "px-4"}`} aria-label="Student navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  to={item.to}
                  key={item.to}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25 ${
                      sidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-4"
                    } ${
                      isActive 
                        ? "bg-white/10 text-white border border-white/10 shadow-inner" 
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon className="shrink-0 text-base" /> 
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {sidebarCollapsed && <span className="sr-only">{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile Block */}
          <div className={`profile-container border-t border-white/5 ${sidebarCollapsed ? "p-3" : "p-4"}`}>
            <div className={`flex items-center ${sidebarCollapsed ? "flex-col gap-3" : "gap-3"}`}>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-black text-white shadow-inner">
                {initials}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white leading-tight">{displayName}</p>
                  <p className="text-[11px] font-bold text-blue-400 mt-0.5">Student Account</p>
                </div>
              )}
              <button 
                onClick={() => setShowLogoutConfirm(true)} 
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20" 
                aria-label="Log out" 
                title={sidebarCollapsed ? "Log out" : undefined}
              >
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE OVERLAY SIDEBAR */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu" />
            <aside id="student-mobile-navigation" className="sidebar-gradient relative flex h-full w-[min(20rem,88vw)] flex-col text-white shadow-2xl" aria-label="Student navigation">
              
              <div className="flex items-center justify-between border-b border-white/5 p-5">
                <div className="flex items-center gap-3 select-none pointer-events-none">
                  <div className="text-blue-400"><FaGraduationCap className="h-7 w-7" /></div>
                  <div>
                    <p className="text-lg font-black tracking-tight leading-none">ACET</p>
                    <p className="text-[9px] font-black tracking-[0.25em] text-blue-400 mt-1">STUDENT PREP</p>
                  </div>
                </div>
                <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu">
                  <FaTimes />
                </button>
              </div>

              {/* Mobile Start Exam Button */}
              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/exam");
                  }}
                  className="continue-application"
                >
                  <div>
                    <div className="folder">
                      <div className="top">
                        <svg viewBox="0 0 24 27">
                          <path d="M1,0 L23,0 C23.5522847,-1.01453063e-16 24,0.44771525 24,1 L24,8 L0,8 L0,1 C0,0.44771525 0.44771525,1.01453063e-16 1,0 Z" />
                        </svg>
                      </div>
                      <div className="paper"></div>
                    </div>
                    <div className="pencil"></div>
                  </div>
                  <span>Start Exam</span>
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink 
                      key={item.to} 
                      to={item.to} 
                      onClick={() => setMobileMenuOpen(false)} 
                      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${isActive ? "bg-white/10 text-white border border-white/10" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                    >
                      <Icon className="text-base" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="profile-container border-t border-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 border border-white/20 text-sm font-black text-white">{initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{displayName}</p>
                    <p className="truncate text-[11px] font-semibold text-blue-400 mt-0.5">{user?.email}</p>
                  </div>
                  <button onClick={() => setShowLogoutConfirm(true)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Log out">
                    <FaSignOutAlt />
                  </button>
                </div>
              </div>

            </aside>
          </div>
        )}

        {/* MAIN BODY LAYOUT */}
        <main className="flex-1 overflow-y-auto bg-transparent">
          <header className="border-b border-slate-200/50 bg-transparent px-5 py-4 md:px-8">
            <div className="flex items-center justify-between">
              <button 
                type="button" 
                onClick={() => setMobileMenuOpen(true)} 
                className="p-2.5 rounded-lg border border-slate-200 text-slate-600 md:hidden hover:bg-slate-50" 
                aria-label="Open navigation menu" 
                aria-expanded={mobileMenuOpen} 
                aria-controls="student-mobile-navigation"
              >
                <FaBars />
              </button>
              <div className="flex-1" />
            </div>
          </header>

          <div className="p-5 md:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="logout-confirm-title" className="text-xl font-black text-slate-950">Sign out of your account?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Are you sure you want to sign out? You will need to log in again to continue.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50">No, stay signed in</button>
              <button type="button" onClick={confirmLogout} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700">Yes, sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getInitials(value) {
  return String(value || "Student")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
