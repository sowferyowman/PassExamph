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

  const isNameComplete = Boolean(form.name.trim());
  const isNicknameComplete = Boolean(form.nickname.trim());
  const isSchoolComplete = Boolean(form.school.trim());
  const isSmsComplete = Boolean(form.smsNumber.trim()) && smsIsValid;
  const isEmailComplete = Boolean(form.recoveryEmail.trim());
  
  const allFieldsComplete = isNameComplete && isNicknameComplete && isSchoolComplete && isSmsComplete && isEmailComplete;

  async function saveSettings(event) {
    event.preventDefault();
    const profile = { 
      name: form.name.trim(), 
      nickname: form.nickname.trim(), 
      school: form.school.trim(), 
      smsNumber: form.smsNumber.trim(), 
      recoveryEmail: form.recoveryEmail.trim() 
    };
    
    if (!allFieldsComplete) {
      setMessage(" Please complete all required fields before saving.");
      return;
    }
    
    if (!smsIsValid) {
      setMessage(" Enter a valid mobile number before saving.");
      return;
    }
    
    try { 
      await updateProfile({ ...profile, phoneNumber: profile.smsNumber }); 
      await refreshUser(); 
      setMessage(" Settings saved successfully!");
    } catch (error) { 
      setMessage(error.response?.data?.error || "Could not save your settings."); 
    }
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

      {location.state?.profileSetupRequired && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
           Please complete all fields below before starting an exam, reviewer module, or drill.
        </div>
      )}

      <form onSubmit={saveSettings} className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-4">
          <div className="card-section">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-lg font-black text-[#003A6C]">
                {initials || <FaUserCircle />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Profile</p>
                <h2 className="mt-0.5 text-lg font-black text-slate-950">{displayName}</h2>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field 
                label="Name" 
                value={form.name} 
                onChange={(name) => setForm((current) => ({ ...current, name }))} 
                placeholder="Full name" 
                autoComplete="name"
                required
              />
              <Field 
                label="Display name or nickname" 
                value={form.nickname} 
                onChange={(nickname) => setForm((current) => ({ ...current, nickname }))} 
                placeholder="Name shown in the app" 
                required
              />
              <Field 
                label="School / Institution" 
                value={form.school} 
                onChange={(school) => setForm((current) => ({ ...current, school }))} 
                placeholder="Ateneo de Manila University" 
                autoComplete="organization"
                required
              />
            </div>
          </div>

          <div className="card-section">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Security</p>
            <h2 className="mt-0.5 text-lg font-black text-slate-950">Change Password</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field 
                label="Current password" 
                type="password" 
                value={passwordForm.currentPassword} 
                onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })} 
                placeholder="Current password" 
              />
              <Field 
                label="New password" 
                type="password" 
                value={passwordForm.newPassword} 
                onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })} 
                placeholder="At least 8 characters" 
              />
            </div>
            <button 
              type="button" 
              onClick={async () => { 
                try { 
                  await changePassword(passwordForm); 
                  setPasswordForm({ currentPassword: "", newPassword: "" }); 
                  setMessage(" Password changed successfully."); 
                } catch (error) { 
                  setMessage(error.response?.data?.error || "Could not change password."); 
                } 
              }} 
              className="button-secondary mt-3"
            >
              Update Password
            </button>
          </div>

          <div className="card-section">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#003A6C]">
                <FaMobileAlt />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Recovery Services</h2>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field 
                label="Mobile number" 
                value={form.smsNumber} 
                onChange={(smsNumber) => setForm((current) => ({ ...current, smsNumber }))} 
                placeholder="+63**********" 
                type="tel" 
                autoComplete="tel" 
                invalid={!smsIsValid}
                helper={smsIsValid ? "Enter 10–15 digits, optionally starting with +." : "Invalid number format."}
                required
              />
              <Field 
                label="Gmail address" 
                value={form.recoveryEmail} 
                onChange={(recoveryEmail) => setForm((current) => ({ ...current, recoveryEmail }))} 
                placeholder="@gmail.com" 
                type="email" 
                autoComplete="email"
                required
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card-section">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Profile setup</p>
            <h2 className="mt-0.5 text-base font-black text-slate-950">Setup checklist</h2>
            <div className="mt-3 space-y-2">
              <ChecklistItem complete={isNameComplete} label="Name added" />
              <ChecklistItem complete={isNicknameComplete} label="Display name or nickname added" />
              <ChecklistItem complete={isSchoolComplete} label="School or institution added" />
              <ChecklistItem complete={isSmsComplete} label="Recovery number added" />
              <ChecklistItem complete={isEmailComplete} label="Recovery email added" />
            </div>
          </div>

          <button 
            type="submit" 
            className="button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!allFieldsComplete}
          >
            <FaSave /> Save Settings
          </button>
          
          {message && (
            <p className={`rounded-lg px-4 py-2.5 text-sm font-bold ${
              message.includes('✅') 
                ? 'bg-emerald-50 text-emerald-800' 
                : 'bg-amber-50 text-amber-800'
            }`}>
              {message}
            </p>
          )}
          
          {!allFieldsComplete && (
            <p className="text-xs text-rose-400 font-semibold">
               Complete all fields above to save your profile.
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = "", helper, invalid = false, type = "text", autoComplete, required = false }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className={`form-control mt-1 ${invalid ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
        placeholder={placeholder}
        required={required}
      />
      {helper && (
        <span className={`mt-1 block text-xs leading-5 ${invalid ? "font-semibold text-rose-600" : "text-slate-500"}`}>
          {helper}
        </span>
      )}
    </label>
  );
}

function ChecklistItem({ complete, label }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs transition-colors ${
        complete 
          ? "bg-emerald-100 text-emerald-700" 
          : "bg-rose-100 text-rose-500"
      }`}>
        {complete ? <FaCheckCircle className="text-[10px]" /> : "✕"}
      </span>
      <span 
        className={`transition-all duration-200 ${
          complete 
            
        }`}
        title={!complete ? ` ${label} is required` : ""}
      >
        {label}
        {!complete && (
          <span className="ml-1 text-[10px] font-medium text-rose-400 hover:text-rose-600 transition-colors duration-200">
         </span>
        )}
      </span>
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