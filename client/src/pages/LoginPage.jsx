import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { FaArrowLeft, FaArrowRight, FaEnvelope, FaGoogle, FaLock, FaUser, FaUserPlus } from "react-icons/fa";
import { hydrateAllFromServer, migrateLocalStorageToServer } from "../services/storage";
import { requireSupabase } from "../lib/supabase";

const SUBMIT_BUTTON_CLASSES =
  "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 h-12 text-sm font-bold text-white hover:bg-white/20 transition-colors";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuthContext();
  const [mode, setMode] = useState("signin");
  const [message, setMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInForm, setSignInForm] = useState({ identifier: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", username: "", password: "" });

  function routeAfterAuth(user) {
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    navigate(user.profileCompleted ? "/dashboard" : "/settings", { replace: true, state: user.profileCompleted ? undefined : { profileSetupRequired: true } });
  }

  async function handleSignIn(event) {
    event.preventDefault();
    if (isSigningIn) return;
    setMessage("");
    setIsSigningIn(true);
    try {
      const user = await login(signInForm.identifier.trim(), signInForm.password, rememberMe);
      const restoredDashboard = await hydrateAllFromServer().catch(() => false);
      if (!restoredDashboard) await migrateLocalStorageToServer().catch(() => {});
      routeAfterAuth(user);
    }
    catch (error) { setMessage(error.response?.data?.error || "Invalid username, email, or password."); }
    finally { setIsSigningIn(false); }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setMessage("");
    try { const user = await register({ email: createForm.email.trim(), username: createForm.username.trim(), password: createForm.password, name: createForm.name.trim() }); await migrateLocalStorageToServer().catch(() => {}); routeAfterAuth(user); }
    catch (error) { setMessage(error.response?.data?.error || "Could not create account."); }
  }

  async function handleGoogleSignIn() {
    setMessage("");
    try {
      const { error } = await requireSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error.message || "Could not start Google sign-in.");
    }
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

        /* From Uiverse.io by gustavofusco */
        .pencil { display: block; width: 9em; height: 9em; color: #e0f2fe; }
        .pencil__body1, .pencil__body2, .pencil__body3, .pencil__eraser, .pencil__eraser-skew, .pencil__point, .pencil__rotate, .pencil__stroke { animation-duration: 3s; animation-timing-function: linear; animation-iteration-count: infinite; }
        .pencil__body1, .pencil__body2, .pencil__body3 { transform: rotate(-90deg); }
        .pencil__body1 { animation-name: pencilBody1; }
        .pencil__body2 { animation-name: pencilBody2; }
        .pencil__body3 { animation-name: pencilBody3; }
        .pencil__eraser { animation-name: pencilEraser; transform: rotate(-90deg) translate(49px,0); }
        .pencil__eraser-skew { animation-name: pencilEraserSkew; animation-timing-function: ease-in-out; }
        .pencil__point { animation-name: pencilPoint; transform: rotate(-90deg) translate(49px,-30px); }
        .pencil__rotate { animation-name: pencilRotate; }
        .pencil__stroke { animation-name: pencilStroke; transform: translate(100px,100px) rotate(-113deg); }
        @keyframes pencilBody1 { from, to { stroke-dashoffset: 351.86; transform: rotate(-90deg); } 50% { stroke-dashoffset: 150.8; transform: rotate(-225deg); } }
        @keyframes pencilBody2 { from, to { stroke-dashoffset: 406.84; transform: rotate(-90deg); } 50% { stroke-dashoffset: 174.36; transform: rotate(-225deg); } }
        @keyframes pencilBody3 { from, to { stroke-dashoffset: 296.88; transform: rotate(-90deg); } 50% { stroke-dashoffset: 127.23; transform: rotate(-225deg); } }
        @keyframes pencilEraser { from, to { transform: rotate(-45deg) translate(49px,0); } 50% { transform: rotate(0deg) translate(49px,0); } }
        @keyframes pencilEraserSkew { from, 32.5%, 67.5%, to { transform: skewX(0); } 35%, 65% { transform: skewX(-4deg); } 37.5%, 62.5% { transform: skewX(8deg); } 40%, 45%, 50%, 55%, 60% { transform: skewX(-15deg); } 42.5%, 47.5%, 52.5%, 57.5% { transform: skewX(15deg); } }
        @keyframes pencilPoint { from, to { transform: rotate(-90deg) translate(49px,-30px); } 50% { transform: rotate(-225deg) translate(49px,-30px); } }
        @keyframes pencilRotate { from { transform: translate(100px,100px) rotate(0); } to { transform: translate(100px,100px) rotate(720deg); } }
        @keyframes pencilStroke { from { stroke-dashoffset: 439.82; transform: translate(100px,100px) rotate(-113deg); } 50% { stroke-dashoffset: 164.93; transform: translate(100px,100px) rotate(-113deg); } 75%, to { stroke-dashoffset: 439.82; transform: translate(100px,100px) rotate(112deg); } }
      `}</style>

      <main className="studio-background relative min-h-screen w-full overflow-hidden text-white flex items-center justify-center p-4">
        {/* Main Sign-In Card Container */}
        <div className="login-card relative w-full max-w-lg rounded-2xl glass-card p-8 shadow-2xl md:p-10">
          {isSigningIn && <SignInLoader />}

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
              {mode === "signin" ? "Sign in with your username or email." : "Create your student account."}
            </p>
          </div>

          {/* Render Active Forms */}
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4 mt-8" aria-busy={isSigningIn}>
              <TextInput
                label="Username or Email"
                value={signInForm.identifier}
                onChange={(identifier) => setSignInForm((current) => ({ ...current, identifier }))}
                placeholder="Enter your username or email"
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
              <button type="submit" disabled={isSigningIn} className={`${SUBMIT_BUTTON_CLASSES} disabled:cursor-wait disabled:opacity-70`}>
                {isSigningIn ? "Signing in..." : "Sign In"}
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
              <button type="submit" className={SUBMIT_BUTTON_CLASSES}>
                Create Account 
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
              onClick={handleGoogleSignIn}
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

function SignInLoader() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#001529]/90 backdrop-blur-sm" role="status" aria-live="polite">
      <svg className="pencil" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <clipPath id="login-pencil-eraser"><rect rx="5" ry="5" width="30" height="30" /></clipPath>
        </defs>
        <circle className="pencil__stroke" r="70" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="439.82 439.82" strokeDashoffset="439.82" strokeLinecap="round" transform="rotate(-113,100,100)" />
        <g className="pencil__rotate" transform="translate(100,100)">
          <g fill="none">
            <circle className="pencil__body1" r="64" stroke="hsl(223,90%,50%)" strokeWidth="30" strokeDasharray="402.12 402.12" strokeDashoffset="402" transform="rotate(-90)" />
            <circle className="pencil__body2" r="74" stroke="hsl(223,90%,60%)" strokeWidth="10" strokeDasharray="464.96 464.96" strokeDashoffset="465" transform="rotate(-90)" />
            <circle className="pencil__body3" r="54" stroke="hsl(223,90%,40%)" strokeWidth="10" strokeDasharray="339.29 339.29" strokeDashoffset="339" transform="rotate(-90)" />
          </g>
          <g className="pencil__eraser" transform="rotate(-90) translate(49,0)">
            <g className="pencil__eraser-skew">
              <rect fill="hsl(223,90%,70%)" rx="5" ry="5" width="30" height="30" />
              <rect fill="hsl(223,90%,60%)" width="5" height="30" clipPath="url(#login-pencil-eraser)" />
              <rect fill="hsl(223,10%,90%)" width="30" height="20" />
              <rect fill="hsl(223,10%,70%)" width="15" height="20" />
              <rect fill="hsl(223,10%,80%)" width="5" height="20" />
              <rect fill="hsla(223,10%,10%,0.2)" y="6" width="30" height="2" />
              <rect fill="hsla(223,10%,10%,0.2)" y="13" width="30" height="2" />
            </g>
          </g>
          <g className="pencil__point" transform="rotate(-90) translate(49,-30)">
            <polygon fill="hsl(33,90%,70%)" points="15 0,30 30,0 30" />
            <polygon fill="hsl(33,90%,50%)" points="15 0,6 30,0 30" />
            <polygon fill="hsl(223,10%,10%)" points="15 0,20 10,10 10" />
          </g>
        </g>
      </svg>
      <p className="mt-3 text-sm font-bold text-sky-200">Signing you in…</p>
    </div>
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
