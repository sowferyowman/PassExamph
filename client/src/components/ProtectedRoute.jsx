import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRole }) {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-slate-950" />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  if (allowedRole === "student" && !user.profileCompleted && location.pathname !== "/settings") {
    return <Navigate to="/settings" replace state={{ profileSetupRequired: true, from: location.pathname }} />;
  }

  if (allowedRole === "student" && user.profileCompleted && location.pathname === "/student-profiling") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
