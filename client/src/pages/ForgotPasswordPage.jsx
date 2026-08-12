import { Link } from "react-router-dom";
import { FaTools } from "react-icons/fa";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-black text-slate-950">Forgot Password</h1>

        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <FaTools className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            Password recovery is temporarily unavailable while we finish moving account
            authentication to a new provider. Please contact an administrator directly if you
            need your password reset.
          </p>
        </div>

        <input
          disabled
          type="email"
          placeholder="you@example.com"
          className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-slate-400"
        />
        <button disabled className="w-full cursor-not-allowed rounded-lg bg-slate-300 py-3 font-black text-slate-500">
          Request Reset
        </button>

        <Link to="/login" className="block text-center text-sm font-bold text-blue-700">
          Back to login
        </Link>
      </div>
    </main>
  );
}