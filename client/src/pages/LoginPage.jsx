import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { FaArrowLeft, FaEnvelope, FaGoogle, FaLock, FaUser, FaUserPlus } from "react-icons/fa";
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
        /* Ateneo Blue Studio Spotlight Backdrop */
        .studio-background {
          background-color: #00122c;
          background-image: radial-gradient(
            circle at 50% 50%, 
            #003b88 0%, 
            #00204a 50%, 
            #000c1d 90%
          );
          background-attachment: fixed;
        }

          .studio-background { background: #f1f5f9; }
          .login-card .blue-input { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; }
          .login-card .blue-input::placeholder { color: #94a3b8 !important; }
          .login-card label > span { color: #334155 !important; }
          .login-card .text-zinc-300 { color: #475569 !important; }
          .login-card .text-zinc-400 { color: #64748b !important; }

          /* Custom Input styling */
        .blue-input {
          background-color: rgba(0, 12, 29, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          transition: all 0.3s ease !important;
        }

        .blue-input:focus {
          border-color: #3b82f6 !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }
        
        .blue-input::placeholder {
          color: #71717a !important;
        }
      `}</style>

      <main className="studio-background relative min-h-screen w-full overflow-hidden text-white flex items-center justify-center p-4">
        {/* Main Sign-In Card Container */}
        <div className="login-card relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl md:p-10">
          
          {/* ← Back Button repositioned inside the upper-left of the card */}
          <div className="absolute top-8 left-8 md:top-10 md:left-10">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-sm text-slate-500 transition-colors duration-200 hover:text-slate-900"
            >
              <FaArrowLeft className="text-xs" />
              <span>Back</span>
            </Link>
          </div>

          {/* Form Header */}
          <div className="flex flex-col items-center mt-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              {mode === "signin" ? <FaLock className="text-white text-lg" /> : <FaUserPlus className="text-white text-lg" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {mode === "signin" ? "Welcome back" : "Create student account"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signin" ? "Sign in with your username." : "Create your student account."}
            </p>
          </div>

          {/* Render Active Forms */}
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <TextInput 
                label="Username" 
                value={signInForm.email} 
                onChange={(email) => setSignInForm((current) => ({ ...current, email }))} 
                placeholder="Enter your username" 
              />
              <TextInput 
                label="Password" 
                type="password" 
                value={signInForm.password} 
                onChange={(password) => setSignInForm((current) => ({ ...current, password }))} 
                placeholder="Your password" 
              />
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded accent-blue-600" /> Remember Me</label>
                <RecoveryLink onClick={() => navigate("/forgot-password-sms")} />
              </div>
              <button className="w-full py-3 bg-white text-[#00204a] font-bold rounded-xl hover:bg-zinc-100 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg mt-2">
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
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
              <button className="w-full py-3 bg-white text-[#00204a] font-bold rounded-xl hover:bg-zinc-100 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg mt-2">
                Create Account
              </button>
            </form>
          )}

          <div className="mt-6 space-y-5">
            <div className="relative flex items-center"><div className="w-full border-t border-slate-200" /><span className="absolute left-1/2 -translate-x-1/2 bg-white px-4 text-sm text-slate-500">or {mode === "signin" ? "sign in" : "join"} with</span></div>
            <button type="button" onClick={mode === "signin" ? handleGoogleSignIn : undefined} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"><FaGoogle className="text-lg" /><span>{mode === "signin" ? "Sign in with Google" : "Join with Google"}</span></button>
            <p className="text-center text-sm text-slate-600">{mode === "signin" ? "Don't have an account?" : "Already have an account?"} <button type="button" onClick={() => setMode(mode === "signin" ? "create" : "signin")} className="font-bold text-blue-700 hover:underline">{mode === "signin" ? "Create Account" : "Sign In"}</button></p>
          </div>

          {/* Password Recovery Flow */}
          {/* Messaging Alert Box */}
          {message && (
            <p className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-400">
              {message}
            </p>
          )}

          <p className="mt-8 text-center text-xs text-zinc-500">
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
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      <div className="relative mt-2">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>}
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
    <button type="button" onClick={onClick} className="text-xs text-blue-400 hover:underline transition-colors">
      Forgot Password?
    </button>
  );
}
