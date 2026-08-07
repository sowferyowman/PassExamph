import { useState } from "react";
import { FaLock, FaSave, FaUserCircle } from "react-icons/fa";
import { changePassword, updateProfile } from "../api/authApi";
import AdminSidebar from "../components/AdminSidebar";
import { useAuthContext } from "../context/AuthContext";
import { getCurrentUser } from "../services/storage";

export default function AdminSettingsPage() {
  const { refreshUser } = useAuthContext();
  const currentUser = getCurrentUser();
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || "",
    nickname: currentUser?.nickname || "",
    smsNumber: currentUser?.smsNumber || "",
    recoveryEmail: currentUser?.recoveryEmail || currentUser?.email || ""
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const normalizedSms = profileForm.smsNumber.replace(/[\s()-]/g, "");
  const smsIsValid = !normalizedSms || /^\+?\d{10,15}$/.test(normalizedSms);

  async function saveProfile(event) {
    event.preventDefault();
    setMessage(""); setError("");
    if (!smsIsValid) { setError("Enter a valid mobile number before saving."); return; }
    const profile = {
      name: profileForm.name.trim(),
      nickname: profileForm.nickname.trim(),
      smsNumber: profileForm.smsNumber.trim(),
      recoveryEmail: profileForm.recoveryEmail.trim()
    };
    try {
      await updateProfile({ ...profile, phoneNumber: profile.smsNumber });
      await refreshUser();
      setMessage("Profile updated successfully.");
    } catch (reason) {
      setError(reason.response?.data?.error || "Could not save your profile.");
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    setMessage(""); setError("");
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password updated successfully. Please sign in again.");
    } catch (reason) {
      setError(reason.response?.data?.error || "Could not change password.");
    }
  }

  const displayName = profileForm.nickname || profileForm.name || currentUser?.email || "Admin";
  const initials = getInitials(displayName);

  return (
    <main className="admin-shell">
      <AdminSidebar active="settings" />
      <div className="admin-content">
        <div className="admin-page max-w-3xl">
          <p className="workspace-eyebrow">Admin Account</p>
          <h1 className="workspace-title">Settings</h1>
          <p className="workspace-description">Manage your administrator profile and password.</p>

          <form onSubmit={saveProfile} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-lg font-black text-primary">
                {initials || <FaUserCircle />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Profile</p>
                <h2 className="mt-0.5 text-lg font-black text-slate-950">{displayName}</h2>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Name" value={profileForm.name} onChange={(name) => setProfileForm((current) => ({ ...current, name }))} placeholder="Full name" autoComplete="name" />
              <Field label="Display name or nickname" value={profileForm.nickname} onChange={(nickname) => setProfileForm((current) => ({ ...current, nickname }))} placeholder="Name shown in the app" />
              <Field label="Mobile number" value={profileForm.smsNumber} onChange={(smsNumber) => setProfileForm((current) => ({ ...current, smsNumber }))} placeholder="+63**********" type="tel" autoComplete="tel" invalid={!smsIsValid} />
              <Field label="Recovery email" value={profileForm.recoveryEmail} onChange={(recoveryEmail) => setProfileForm((current) => ({ ...current, recoveryEmail }))} placeholder="@gmail.com" type="email" autoComplete="email" />
            </div>
            <button className="button-primary mt-3" disabled={!smsIsValid}><FaSave /> Save Profile</button>
          </form>

          <form onSubmit={submitPassword} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><FaLock /></span>
              <div><h2 className="text-lg font-black text-slate-950">Change Password</h2><p className="text-xs font-semibold text-slate-500">Use at least 8 characters.</p></div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Current password" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })} />
              <Field label="New password" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })} />
            </div>
            <button className="button-primary mt-3">Update Password</button>
          </form>

          {message && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p>}
          {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", autoComplete, invalid = false, ...rest }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
      <input
        required={type === "password"}
        minLength={type === "password" ? 8 : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        placeholder={placeholder}
        className={`form-control mt-1 ${invalid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
        {...rest}
      />
    </label>
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