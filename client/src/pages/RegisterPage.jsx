import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import { setAuthenticatedUser } from "../services/storage";

export default function RegisterPage() {
  const navigate = useNavigate(); const [form, setForm] = useState({ email: "", username: "", password: "", name: "" }); const [message, setMessage] = useState("");
  async function submit(event) { event.preventDefault(); try { const result = await register(form); setAuthenticatedUser(result.user); navigate("/student-profiling", { replace: true }); } catch (error) { setMessage(error.response?.data?.error || "Could not create account."); } }
  return <main className="grid min-h-screen place-items-center bg-slate-950 p-6"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-2xl"><h1 className="text-2xl font-black text-slate-950">Create Account</h1><p className="text-sm text-slate-500">Your account will use secure server-side authentication.</p>{[["name","Name"],["email","Email"],["username","Username"],["password","Password"]].map(([key,label]) => <label key={key} className="block text-sm font-bold text-slate-700">{label}<input required type={key === "password" ? "password" : key === "email" ? "email" : "text"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>)}{message && <p className="text-sm font-bold text-rose-600">{message}</p>}<button className="w-full rounded-lg bg-blue-700 py-3 font-black text-white">Create Account</button><Link to="/login" className="block text-center text-sm font-bold text-blue-700">Back to login</Link></form></main>;
}
