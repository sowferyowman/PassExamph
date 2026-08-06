import { useEffect, useState } from "react";
import { FaLock, FaSignOutAlt } from "react-icons/fa";
import { changePassword, logoutAll, sessions as getSessions } from "../api/authApi";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeSessions, setActiveSessions] = useState([]);

  async function loadSessions() {
    try { setActiveSessions((await getSessions()).sessions || []); }
    catch { setActiveSessions([]); }
  }

  useEffect(() => { loadSessions(); }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage(""); setError("");
    try {
      await changePassword(form);
      setForm({ currentPassword: "", newPassword: "" });
      setMessage("Password updated successfully. Please sign in again.");
    } catch (reason) {
      setError(reason.response?.data?.error || "Could not change password.");
    }
  }

  async function revokeSessions() {
    try { await logoutAll(); await loadSessions(); setMessage("All other sessions have been logged out. This device remains signed in."); }
    catch (reason) { setError(reason.response?.data?.error || "Could not log out other sessions."); }
  }

  return (
    <main className="admin-shell">
      <AdminSidebar active="settings" />
      <div className="admin-content">
        <div className="admin-page max-w-3xl">
          <p className="workspace-eyebrow">Admin Account</p>
          <h1 className="workspace-title">Settings</h1>
          <p className="workspace-description">Manage your administrator password and active sessions.</p>

          <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><FaLock /></span>
              <div><h2 className="text-lg font-black text-slate-950">Change Password</h2><p className="text-xs font-semibold text-slate-500">Use at least 8 characters.</p></div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Current password" value={form.currentPassword} onChange={(value) => setForm({ ...form, currentPassword: value })} />
              <Field label="New password" value={form.newPassword} onChange={(value) => setForm({ ...form, newPassword: value })} />
            </div>
            <button className="button-primary mt-3">Update Password</button>
            {message && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p>}
            {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
          </form>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <h2 className="text-lg font-black text-slate-950">Sessions</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Sign out other browsers and devices.</p>
            <button type="button" onClick={revokeSessions} className="button-danger mt-3"><FaSignOutAlt /> Log Out All Other Sessions</button>
            <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {activeSessions.length ? activeSessions.filter((session) => !session.revoked).map((session, index) => <div key={session.id} className="flex items-center justify-between gap-4 px-3 py-2 text-xs"><div className="min-w-0"><p className="font-black text-slate-800">{index === 0 ? "Most recent session" : "Active session"}</p><p className="mt-0.5 truncate text-slate-500">{session.userAgent || "Unknown device"}</p></div><p className="shrink-0 font-semibold text-slate-400">{session.createdAt ? new Date(session.createdAt).toLocaleString() : "—"}</p></div>) : <p className="px-3 py-2 text-xs font-semibold text-slate-500">No active sessions found.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><input required minLength={8} type="password" value={value} onChange={(event) => onChange(event.target.value)} className="form-control mt-1" /></label>;
}
