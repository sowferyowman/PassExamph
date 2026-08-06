import { useState } from "react";
import { useLocation } from "react-router-dom";
import { changePassword, updateProfile } from "../api/authApi";
import { FaCheckCircle, FaMobileAlt, FaSave, FaUserCircle } from "react-icons/fa";
import { useAuthContext } from "../context/AuthContext";
import { getCurrentUser, isStudentProfileComplete } from "../services/storage";

export default function SettingsPage() {
  const location = useLocation();
  const { refreshUser } = useAuthContext();
  const currentUser = getCurrentUser();
  const [form, setForm] = useState({
    name: currentUser?.name || "",
    nickname: currentUser?.nickname || "",
    school: currentUser?.school || "",
    smsNumber: currentUser?.smsNumber || "",
    recoveryEmail: currentUser?.recoveryEmail || currentUser?.email || ""
  });
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const normalizedSms = form.smsNumber.replace(/[\s()-]/g, "");
  const smsIsValid = !normalizedSms || /^\+?\d{10,15}$/.test(normalizedSms);

  async function saveSettings(event) {
    event.preventDefault();
    const profile = { name: form.name.trim(), nickname: form.nickname.trim(), school: form.school.trim(), smsNumber: form.smsNumber.trim(), recoveryEmail: form.recoveryEmail.trim() };
    if (!isStudentProfileComplete(profile)) {
      setMessage("Complete your name, display name, school, mobile number, and recovery email before continuing.");
      return;
    }
    if (!smsIsValid) {
      setMessage("Enter a valid mobile number before saving.");
      return;
    }
    try { await updateProfile({ ...profile, phoneNumber: profile.smsNumber }); await refreshUser(); } catch (error) { setMessage(error.response?.data?.error || "Could not save your settings."); return; }
    setMessage("Settings saved. Your profile is complete and assessments are unlocked.");
  }

  const displayName = form.nickname || form.name || currentUser?.email || "Student";
  const initials = getInitials(displayName);

  return (
    <div className="page-shell">
      <header className="page-header">
        <p className="page-eyebrow">Account</p>
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Manage the profile and recovery information.</p>
      </header>

      {location.state?.profileSetupRequired && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">Complete and save your profile below before starting an exam, reviewer module, or drill.</p>}

      <form onSubmit={saveSettings} className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-4">
          <div className="card-section">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-lg font-black text-primary">
                {initials || <FaUserCircle />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Profile</p>
                <h2 className="mt-0.5 text-lg font-black text-slate-950">{displayName}</h2>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Full name" autoComplete="name" />
              <Field label="Display name or nickname" value={form.nickname} onChange={(nickname) => setForm((current) => ({ ...current, nickname }))} placeholder="Name shown in the app" />
              <Field label="School / Institution" value={form.school} onChange={(school) => setForm((current) => ({ ...current, school }))} placeholder="Ateneo de Manila University" autoComplete="organization" />
            </div>
          </div>

          <div className="card-section">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Security</p>
            <h2 className="mt-0.5 text-lg font-black text-slate-950">Change Password</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Current password" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })} placeholder="Current password" /><Field label="New password" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })} placeholder="At least 8 characters" /></div>
            <button type="button" onClick={async () => { try { await changePassword(passwordForm); setPasswordForm({ currentPassword: "", newPassword: "" }); setMessage("Password changed. Please sign in again on your next session."); } catch (error) { setMessage(error.response?.data?.error || "Could not change password."); } }} className="button-secondary mt-3">Update Password</button>
          </div>

          <div className="card-section">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-primary">
                <FaMobileAlt />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Recovery Services</h2>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Mobile number" value={form.smsNumber} onChange={(smsNumber) => setForm((current) => ({ ...current, smsNumber }))} placeholder="+63**********" type="tel" autoComplete="tel" invalid={!smsIsValid} />
              <Field label="Gmail address" value={form.recoveryEmail} onChange={(recoveryEmail) => setForm((current) => ({ ...current, recoveryEmail }))} placeholder="@gmail.com" type="email" autoComplete="email" />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card-section">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Profile setup</p>
            <h2 className="mt-0.5 text-base font-black text-slate-950">Setup checklist</h2>
            <div className="mt-3 space-y-2">
              <ChecklistItem complete={Boolean(form.name.trim())} label="Name added" />
              <ChecklistItem complete={Boolean(form.nickname.trim())} label="Display name or nickname added" />
              <ChecklistItem complete={Boolean(form.school.trim())} label="School or institution added" />
              <ChecklistItem complete={Boolean(form.smsNumber.trim()) && smsIsValid} label="Recovery number added" />
              <ChecklistItem complete={Boolean(form.recoveryEmail.trim())} label="Recovery email added" />
            </div>
          </div>

          <button className="button-primary w-full" disabled={!smsIsValid}>
            <FaSave /> Save Settings
          </button>
          {message && <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800">{message}</p>}
        </aside>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = "", helper, invalid = false, type = "text", autoComplete }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className={`form-control mt-1 ${invalid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
        placeholder={placeholder}
      />
      {helper && <span className={`mt-1 block text-xs leading-5 ${invalid ? "font-semibold text-rose-600" : "text-slate-500"}`}>{invalid ? "Enter 10–15 digits, optionally starting with +." : helper}</span>}
    </label>
  );
}

function ChecklistItem({ complete, label }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
        {complete ? <FaCheckCircle /> : <span aria-hidden="true">•</span>}
      </span>
      <span>{label}{!complete && !label.includes("optional") ? " — missing" : ""}</span>
    </div>
  );
}

function getInitials(value) {
  return String(value || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
