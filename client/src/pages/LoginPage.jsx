import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { FaArrowLeft, FaArrowRight, FaEnvelope, FaGoogle, FaLock, FaUser, FaUserPlus } from "react-icons/fa";
import { hydrateDashboardStoreFromServer, migrateLocalStorageToServer } from "../services/storage";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuthContext();
  const [mode, setMode] = useState("signin");
  const [message, setMessage] = useState("");
  const [signInForm, setSignInForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", username: "", password: "" });

  function routeAfterAuth(user) {
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    navigate(user.profileCompleted ? "/dashboard" : "/student-profiling", { replace: true });
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setMessage("");
    try {
      const user = await login(signInForm.email.trim(), signInForm.password);
      const restoredDashboard = await hydrateDashboardStoreFromServer().catch(() => false);
      if (!restoredDashboard) await migrateLocalStorageToServer().catch(() => {});
      routeAfterAuth(user);
    }
    catch (error) { setMessage(error.response?.data?.error || "Invalid email or password."); }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setMessage("");
    try { const user = await register({ email: createForm.email.trim(), username: createForm.username.trim(), password: createForm.password, name: createForm.name.trim() }); await migrateLocalStorageToServer().catch(() => {}); routeAfterAuth(user); }
    catch (error) { setMessage(error.response?.data?.error || "Could not create account."); }
  }

  function handleGoogleSignIn() {
    setMessage("Google sign-in is not available yet.");
  }

  return (
    <>
      <style>{`
        /* Ateneo Blue Studio Spotlight Backdrop — matches landing page */
        .studio-background {
          background-color: #001529;
          background-image:
            radial-gradient(ellipse 800px 500px at 50% 0%, rgba(59, 130, 246, 0.16), transparent 70%),
            linear-gradient(to bottom, #001529 0%, #002147 50%, #000d1a 100%);
        }

        .glass-card {
          background-color: rgba(0, 40, 78, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all .4s cubic-bezier(.23,1,.32,1);
        }

        .tooltip-container {
          --background: #ffffff;
          --color: #ffffff;
          position: relative;
          cursor: pointer;
          transition: all .4s cubic-bezier(.23,1,.32,1);
          font-size: 14px;
          font-weight: 700;
          color: var(--color);
          height: 48px;
          padding: 0 28px;
          display: inline-grid;
          place-items: center;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(6px);
          width: 100%;
        }

        .tooltip-container .text {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .4s cubic-bezier(.23,1,.32,1);
          z-index: 2;
          width: 100%;
        }

        .tooltip-container .hover-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--background);
          color: #001529;
          border-radius: 9999px;
          transform: scale(0);
          transform-origin: left;
          transition: all .4s cubic-bezier(.23,1,.32,1);
          z-index: 1;
        }

        .tooltip-container:hover {
          border-color: transparent;
          transform: translateY(-2px);
        }

        .tooltip-container:hover .text {
          opacity: 0;
          transform: scale(.5);
        }

        .tooltip-container:hover .hover-text {
          transform: scale(1);
        }

        /* Custom Input styling to match dark glass aesthetic */
        .blue-input {
          background-color: rgba(0, 12, 29, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          transition: all 0.3s ease !important;
        }

        .blue-input:focus {
          border-color: #7dd3fc !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(125, 211, 252, 0.2) !important;
        }

        .blue-input::placeholder {
          color: #71717a !important;
        }
      `}</style>

      <main className="studio-background relative min-h-screen w-full overflow-hidden text-white flex items-center justify-center p-4">
        {/* Main Sign-In Card Container */}
        <div className="login-card relative w-full max-w-lg rounded-2xl glass-card p-8 shadow-2xl md:p-10">

          {/* ← Back Button */}
          <div className="absolute top-8 left-8 md:top-10 md:left-10">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-white/50 transition-colors duration-200 hover:text-sky-300"
            >
              <FaArrowLeft className="text-xs" />
              <span>Back</span>
            </Link>
          </div>

          {/* Brand mark */}
          <div className="flex flex-col items-center mt-8 text-center">
            <p className="font-serif text-lg font-black leading-tight text-white">PassExams.ph</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-sky-300/80 mb-4">
              Philippine Exam Prep Platform
            </p>
            <span className="inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-300/90 mb-4">
              {mode === "signin" ? <FaLock className="inline mr-2 -mt-0.5" /> : <FaUserPlus className="inline mr-2 -mt-0.5" />}
              ACET Portal
            </span>
            <h1 className="font-serif text-3xl font-black tracking-tight text-white">
              {mode === "signin" ? "Welcome back" : "Create student account"}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {mode === "signin" ? "Sign in with your username." : "Create your student account."}
            </p>
          </div>

          {/* Render Active Forms */}
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4 mt-8">
              <TextInput
                label="Username"
                value={signInForm.email}
                onChange={(email) => setSignInForm((current) => ({ ...current, email }))}
                placeholder="Enter your username"
                icon={<FaUser />}
              />
              <TextInput
                label="Password"
                type="password"
                value={signInForm.password}
                onChange={(password) => setSignInForm((current) => ({ ...current, password }))}
                placeholder="Your password"
                icon={<FaLock />}
              />
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-white/60"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded accent-sky-400" /> Remember Me</label>
                <RecoveryLink onClick={() => navigate("/forgot-password-sms")} />
              </div>
              <button type="submit" className="tooltip-container mt-2">
                <span className="text">Sign In <FaArrowRight className="text-xs" /></span>
                <span className="hover-text">
                  <span className="flex items-center gap-2 text-sm font-bold">Let's Go <FaArrowRight /></span>
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4 mt-8">
              <TextInput
                label="Full Name"
                value={createForm.name}
                onChange={(name) => setCreateForm((current) => ({ ...current, name: name.toUpperCase() }))}
                placeholder="Enter your full name"
                icon={<FaUser />}
              />
              <TextInput
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(email) => setCreateForm((current) => ({ ...current, email }))}
                placeholder="student@example.com"
                icon={<FaEnvelope />}
              />
              <TextInput
                label="Username"
                value={createForm.username}
                onChange={(username) => setCreateForm((current) => ({ ...current, username }))}
                placeholder="Choose a username"
                icon={<FaUser />}
              />
              <TextInput
                label="Password"
                type="password"
                value={createForm.password}
                onChange={(password) => setCreateForm((current) => ({ ...current, password }))}
                placeholder="Create a secure password"
                icon={<FaLock />}
              />
              <button type="submit" className="tooltip-container mt-2">
                <span className="text">Create Account <FaArrowRight className="text-xs" /></span>
                <span className="hover-text">
                  <span className="flex items-center gap-2 text-sm font-bold">Let's Go <FaArrowRight /></span>
                </span>
              </button>
            </form>
          )}

          <div className="mt-6 space-y-5">
            <div className="relative flex items-center">
              <div className="w-full border-t border-white/10" />
              <span className="absolute left-1/2 -translate-x-1/2 bg-[#00204a] px-4 text-sm text-white/50">or {mode === "signin" ? "sign in" : "join"} with</span>
            </div>
            <button
              type="button"
              onClick={mode === "signin" ? handleGoogleSignIn : undefined}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-white/10"
            >
              <FaGoogle className="text-lg text-sky-300" />
              <span>{mode === "signin" ? "Sign in with Google" : "Join with Google"}</span>
            </button>
            <p className="text-center text-sm text-white/60">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => setMode(mode === "signin" ? "create" : "signin")} className="font-bold text-sky-300 hover:underline">
                {mode === "signin" ? "Create Account" : "Sign In"}
              </button>
            </p>
          </div>

          {/* Messaging Alert Box */}
          {message && (
            <p className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-300">
              {message}
            </p>
          )}

          <p className="mt-8 text-center text-xs text-white/40">
            Sign in with the account credentials provided by your administrator.
          </p>

        </div>
      </main>
    </>
  );
}

function TextInput({ label, value, onChange, placeholder, type = "text", icon = null, compact = false }) {
  return (
    <label className={`block ${compact ? "mt-3" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-white/50">{label}</span>
      <div className="relative mt-2">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`blue-input w-full rounded-xl px-4 py-3 text-sm font-semibold ${icon ? "pl-10" : ""}`}
          placeholder={placeholder}
          required
        />
      </div>
    </label>
  );
}

function RecoveryLink({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-xs text-sky-300 hover:underline transition-colors">
      Forgot Password?
    </button>
  );
}