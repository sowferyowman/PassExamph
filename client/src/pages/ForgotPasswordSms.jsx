import { Link } from "react-router-dom";
import { FaTools } from "react-icons/fa";

export default function ForgotPasswordSms() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-black text-slate-950">Recover your password</h1>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <FaTools className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            Password recovery is temporarily unavailable while we finish moving account
            authentication to a new provider. Please contact an administrator directly if you
            need your password reset.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 opacity-40">
          <button type="button" disabled className="cursor-not-allowed rounded-lg px-3 py-2 text-sm font-black text-slate-500">
            SMS
          </button>
          <button type="button" disabled className="cursor-not-allowed rounded-lg px-3 py-2 text-sm font-black text-slate-500">
            Gmail / Email
          </button>
        </div>

        <input
          disabled
          type="text"
          placeholder="Recovery code or email"
          className="mt-4 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400"
        />
        <button disabled className="mt-4 w-full cursor-not-allowed rounded-lg bg-slate-300 py-3 font-black text-slate-500">
          Send Code
        </button>

        <Link to="/login" className="mt-6 block text-center text-sm font-bold text-blue-700">
          Back to login
        </Link>
      </div>
    </main>
  );
}