import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestEmailReset, requestSmsReset, resetPasswordEmail, resetPasswordSms } from "../api/authApi";

export default function ForgotPasswordSms() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("sms");
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function switchMethod(next) { setMethod(next); setStep(1); setMessage(""); setError(""); setIdentifier(""); setCode(""); }
  async function sendCode(event) {
    event.preventDefault(); setError("");
    try {
      const result = method === "sms" ? await requestSmsReset(identifier) : await requestEmailReset(identifier);
      setMessage(`${result.message}${result.developmentCode ? ` Test code: ${result.developmentCode}` : ""}`); setStep(2);
    } catch (reason) { setError(reason.response?.data?.error || "Could not send recovery code."); }
  }
  async function reset(event) {
    event.preventDefault(); setError("");
    try {
      if (method === "sms") await resetPasswordSms(code, newPassword); else await resetPasswordEmail(code, newPassword);
      setMessage("Password reset successful. Redirecting to login..."); setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (reason) { setError(reason.response?.data?.error || "Invalid or expired recovery code."); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-6"><div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"><h1 className="text-2xl font-black text-slate-950">Recover your password</h1><p className="mt-2 text-sm font-semibold text-slate-500">Choose where to receive your one-time recovery code.</p><div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => switchMethod("sms")} className={`rounded-lg px-3 py-2 text-sm font-black ${method === "sms" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>SMS</button><button type="button" onClick={() => switchMethod("email")} className={`rounded-lg px-3 py-2 text-sm font-black ${method === "email" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Gmail / Email</button></div>{step === 1 ? <form onSubmit={sendCode} className="mt-6 space-y-4"><Field label={method === "sms" ? "Recovery phone number" : "Gmail / account email"} type={method === "email" ? "email" : "tel"} value={identifier} onChange={setIdentifier} placeholder={method === "sms" ? "+63**********" : "@gmail.com"} /><button className="w-full rounded-lg bg-blue-700 py-3 font-black text-white">Send {method === "sms" ? "SMS" : "Email"} Code</button></form> : <form onSubmit={reset} className="mt-6 space-y-4"><Field label="Recovery code" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="******" /><Field label="New password" type="password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" /><button className="w-full rounded-lg bg-blue-700 py-3 font-black text-white">Reset Password</button></form>}{message && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p>}{error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}<Link to="/login" className="mt-6 block text-center text-sm font-bold text-blue-700">Back to login</Link></div></main>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) { return <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><input required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>; }
