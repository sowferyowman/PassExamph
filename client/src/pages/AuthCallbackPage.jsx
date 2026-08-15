import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { requireSupabase } from "../lib/supabase";
import { hydrateAllFromServer, migrateLocalStorageToServer } from "../services/storage";

function destinationFor(user) {
  if (user.role === "admin") return "/admin/dashboard";
  return user.profileCompleted ? "/dashboard" : "/settings";
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithSupabaseGoogle } = useAuthContext();
  const started = useRef(false);
  const [message, setMessage] = useState("Completing Google sign-in…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function complete() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error")) throw new Error(params.get("error_description") || "Google sign-in was cancelled or denied.");
      const { data, error } = await requireSupabase().auth.getSession();
      if (error) throw error;
      if (!data.session?.access_token) throw new Error("Google sign-in session is missing or expired. Please try again.");
      const user = await loginWithSupabaseGoogle(data.session.access_token);
      const restoredDashboard = await hydrateAllFromServer().catch(() => false);
      if (!restoredDashboard) await migrateLocalStorageToServer().catch(() => {});
      navigate(destinationFor(user), {
        replace: true,
        state: user.profileCompleted ? undefined : { profileSetupRequired: true }
      });
    }

    complete().catch((error) => setMessage(error.response?.data?.error || error.message || "Google sign-in failed."));
  }, [loginWithSupabaseGoogle, navigate]);

  return (
    <main className="min-h-screen bg-[#001529] flex items-center justify-center p-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <h1 className="font-serif text-2xl font-bold">Google Sign-In</h1>
        <p className="mt-3 text-sm text-white/70">{message}</p>
        {message !== "Completing Google sign-in…" && <button type="button" onClick={() => navigate("/login", { replace: true })} className="mt-6 rounded-full bg-white/10 px-5 py-2 text-sm font-bold hover:bg-white/20">Back to sign in</button>}
      </section>
    </main>
  );
}
