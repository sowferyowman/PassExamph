import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import CommunityForumPage from "./features/community/CommunityForumPage";
import CreateExamPage from "./pages/CreateExamPage";
import AdminReviewDashboard from "./pages/AdminReviewDashboard";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import CreateDrill from "./pages/CreateDrill";
import DashboardPage from "./pages/DashboardPage";
import ExamPage from "./pages/ExamPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ForgotPasswordSms from "./pages/ForgotPasswordSms";
import ReviewersPage from "./pages/ReviewersPage";
import SettingsPage from "./pages/SettingsPage";
import StudentProfilingPage from "./pages/StudentProfilingPage";
import WeaknessDrillsPage from "./pages/WeaknessDrillsPage";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password-sms" element={<ForgotPasswordSms />} />

      <Route element={<ProtectedRoute allowedRole="student" />}>
        <Route path="/student-profiling" element={<StudentProfilingPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
        </Route>
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/exam-log" element={<DashboardLayout />}>
          <Route index element={<ExamPage historyOnly />} />
        </Route>
        <Route path="/reviewers" element={<DashboardLayout />}>
          <Route index element={<ReviewersPage />} />
        </Route>
        <Route path="/weakness-drills" element={<DashboardLayout />}>
          <Route index element={<WeaknessDrillsPage />} />
        </Route>
        <Route path="/community" element={<DashboardLayout />}>
          <Route index element={<CommunityForumPage />} />
        </Route>
        <Route path="/settings" element={<DashboardLayout />}>
          <Route index element={<SettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/admin/dashboard" element={<AdminReviewDashboard />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/dashboard-home" element={<AdminReviewDashboard />} />
        <Route path="/admin/create-exam" element={<CreateExamPage />} />
        <Route path="/admin/drills" element={<CreateDrill />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></AuthProvider>
  );
}
