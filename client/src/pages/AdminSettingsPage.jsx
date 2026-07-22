import { useState } from "react";
import { FaLock, FaSignOutAlt } from "react-icons/fa";
import { changePassword, logoutAll } from "../api/authApi";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    try { await logoutAll(); setMessage("All other sessions have been logged out."); }
    catch (reason) { setError(reason.response?.data?.error || "Could not log out other sessions."); }
  }

  return (
    <main className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar active="settings" />
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Admin Account</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Settings</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Manage your administrator password and active sessions.</p>

          <form onSubmit={submit} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><FaLock /></span>
              <div><h2 className="text-xl font-black text-slate-950">Change Password</h2><p className="text-sm font-semibold text-slate-500">Use at least 8 characters.</p></div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Current password" value={form.currentPassword} onChange={(value) => setForm({ ...form, currentPassword: value })} />
              <Field label="New password" value={form.newPassword} onChange={(value) => setForm({ ...form, newPassword: value })} />
            </div>
            <button className="mt-6 rounded-lg bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">Update Password</button>
            {message && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p>}
            {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          </form>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-black text-slate-950">Sessions</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Sign out other browsers and devices.</p>
            <button type="button" onClick={revokeSessions} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 hover:bg-rose-100"><FaSignOutAlt /> Log Out All Other Sessions</button>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><input required minLength={8} type="password" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>;
}
