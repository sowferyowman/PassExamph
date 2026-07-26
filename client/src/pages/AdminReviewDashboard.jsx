import { useEffect, useMemo, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisV,
  FaExclamationTriangle,
  FaSearch,
  FaSort,
  FaTimes,
  FaUsers,
  FaFilter
} from "react-icons/fa";
import AdminSidebar from "../components/AdminSidebar";
import { deleteStudentAccount, getDashboardStore, getDrillSessions, getEssayResponses, getReviewerProgress, getUserAccounts, resetStudentPassword, updateLatestEssayReview, updateStudentAccount } from "../services/storage";

const STUDENTS_PER_PAGE = 6;

// Placeholder for whoever is logged into the admin panel. Swap for real auth/session data
// once you have it — this only feeds the audit-trail fields below.
const CURRENT_ADMIN_NAME = "Admin Workspace";

// Define test accounts to filter out
const TEST_ACCOUNTS = {
  emails: ['student1@exams.ph', 'markzuckerberg@gmail.com', 'elonmusk@gmail.com'],
  names: ['Stanley Mejia', 'mark zuckerberg', 'Elon Musk']
};

export default function AdminReviewDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [students, setStudents] = useState([]);
  const [pending, setPending] = useState([]);
  const [totalExams, setTotalExams] = useState(0);

  const [reviewItem, setReviewItem] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentSort, setStudentSort] = useState({ key: "name", asc: true });
  const [studentPage, setStudentPage] = useState(1);
  const [studentMenuOpenId, setStudentMenuOpenId] = useState(null);
  const [studentModal, setStudentModal] = useState(null);
  const [studentAction, setStudentAction] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);

  // Filter states - hide test accounts by default
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [examFilter, setExamFilter] = useState("all");
  const [hideTestAccounts, setHideTestAccounts] = useState(true); // TRUE by default

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const store = getDashboardStore();
      const studentAccounts = getUserAccounts().filter((user) => user.role === "student");
      const pendingItems = studentAccounts.flatMap((student) =>
        (store[student.email]?.attempts || []).flatMap((attempt) =>
          getEssayResponses(attempt)
            .filter((essay) => ["pending_review", "ai_graded"].includes(essay.status))
            .map((essay) => ({
              ...essay,
              email: student.email,
              studentName: student.name || student.email,
              examTitle: attempt.examTitle || "Essay Exam"
            }))
        )
      );
      const examCount = studentAccounts.reduce((sum, student) => sum + (store[student.email]?.attempts?.length || 0), 0);

      setStudents(studentAccounts.map((student) => buildStudentRow(student, store)));
      setPending(pendingItems);
      setTotalExams(examCount);
    } catch (err) {
      setError(err?.message || "Something went wrong loading the dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const filteredSortedStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    
    const filtered = students.filter((student) => {
      // Search filter
      if (query && !`${student.name || ""} ${student.email || ""}`.toLowerCase().includes(query)) {
        return false;
      }

      // Hide test accounts filter - TRUE by default
      if (hideTestAccounts) {
        if (TEST_ACCOUNTS.emails.includes(student.email) || 
            TEST_ACCOUNTS.names.includes(student.name)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        const status = student.status?.toLowerCase() || "";
        if (statusFilter === "active" && status !== "active") return false;
        if (statusFilter === "inactive" && status !== "inactive") return false;
      }

      // Score filter
      if (scoreFilter !== "all") {
        if (scoreFilter === "passed" && !student.passed) return false;
        if (scoreFilter === "failed" && student.passed !== false) return false;
        if (scoreFilter === "no-score" && student.latestScore !== null) return false;
      }

      // Exam filter
      if (examFilter !== "all") {
        if (examFilter === "has-exams" && student.totalExams === 0) return false;
        if (examFilter === "no-exams" && student.totalExams > 0) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortableStudentValue(a, studentSort.key);
      const bVal = sortableStudentValue(b, studentSort.key);
      if (aVal < bVal) return studentSort.asc ? -1 : 1;
      if (aVal > bVal) return studentSort.asc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [students, studentSearch, studentSort, statusFilter, scoreFilter, examFilter, hideTestAccounts]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredSortedStudents.length / STUDENTS_PER_PAGE));
  const paginatedStudents = filteredSortedStudents.slice((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE);

  useEffect(() => setStudentPage(1), [studentSearch, studentSort, statusFilter, scoreFilter, examFilter, hideTestAccounts]);
  useEffect(() => {
    if (studentPage > totalStudentPages) setStudentPage(totalStudentPages);
  }, [studentPage, totalStudentPages]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  }

  function requestApprove(item) {
    const maxPoints = Math.max(1, Number(item.points || 1));
    const score = Number(scores[item.id] ?? item.aiScore);

    if (!Number.isFinite(score)) {
      alert("Please enter a valid score.");
      return;
    }
    if (score < 0 || score > maxPoints) {
      alert(`Score must be between 0 and ${maxPoints}.`);
      return;
    }
    setConfirmAction({ item, type: "approve", score });
  }

  function requestReject(item) {
    setConfirmAction({ item, type: "reject" });
  }

  function runConfirmedAction() {
    if (!confirmAction) return;
    const { item, type, score } = confirmAction;

    if (type === "approve") {
      updateLatestEssayReview(item.email, item.id, {
        finalScore: score,
        status: "approved",
        reviewedBy: CURRENT_ADMIN_NAME,
        reviewedAt: new Date().toISOString()
      });
      showToast(`Approved ${item.studentName}'s essay (${score}/${Math.max(1, Number(item.points || 1))}).`);
    } else {
      updateLatestEssayReview(item.email, item.id, {
        aiScore: null,
        finalScore: null,
        status: "pending_review",
        reviewedBy: CURRENT_ADMIN_NAME,
        reviewedAt: new Date().toISOString()
      });
      showToast(`Sent ${item.studentName}'s essay back for re-review.`);
    }

    setConfirmAction(null);
    setReviewItem(null);
    setRefresh((value) => value + 1);
  }

  function handleEditStudent(student) {
    setStudentMenuOpenId(null);
    setStudentModal({ type: "edit", student });
  }
  function handleViewProfile(student) {
    setStudentMenuOpenId(null);
    setStudentModal({ type: "view", student });
  }
  function handleResetPassword(student) {
    setStudentMenuOpenId(null);
    setStudentAction({ type: "reset-password", student });
  }
  function handleDeleteStudent(student) {
    setStudentMenuOpenId(null);
    setStudentAction({ type: "delete", student });
  }
  function requestSaveStudent(student, changes) {
    setStudentModal(null);
    setStudentAction({ type: "edit", student, changes });
  }
  function runConfirmedStudentAction() {
    if (!studentAction) return;
    const { student, type, changes } = studentAction;
    if (type === "edit") {
      updateStudentAccount(student.id, changes);
      showToast(`${changes.name || student.email}'s profile was updated.`);
    } else if (type === "reset-password") {
      const result = resetStudentPassword(student.id);
      if (result) setTemporaryPassword({ name: student.name || student.email, password: result.temporaryPassword });
    } else if (type === "delete") {
      deleteStudentAccount(student.id);
      showToast(`${student.name || student.email}'s account and local learning data were deleted.`);
    }
    setStudentAction(null);
    setRefresh((value) => value + 1);
  }

  function clearAllFilters() {
    setStatusFilter("all");
    setScoreFilter("all");
    setExamFilter("all");
    setHideTestAccounts(true);
    setStudentSearch("");
  }

  // Get filter counts
  const activeFilterCount = [
    statusFilter !== "all",
    scoreFilter !== "all",
    examFilter !== "all",
    hideTestAccounts
  ].filter(Boolean).length;

  return (
    <main className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar active="dashboard" />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header>
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Dashboard</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Admin Control Center</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">Your central command for user management and AI evaluation approvals.</p>
          </header>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <div>
                <p className="font-black text-sm">Couldn't load the dashboard.</p>
                <p className="mt-1 text-xs font-semibold">{error}</p>
                <button onClick={() => setRefresh((value) => value + 1)} className="mt-3 rounded-lg bg-rose-600 px-3.5 py-1.5 text-[10px] font-black text-white hover:bg-rose-700">Try again</button>
              </div>
            </div>
          )}

          {!error && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-2.5">
                    <FaUsers className="text-blue-600 text-sm" />
                    <h2 className="text-base font-black text-slate-950">Student Accounts</h2>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
                        {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filter Dropdown */}
                    <div className="relative">
                      <button 
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        onClick={() => {
                          const dropdown = document.getElementById('filterDropdown');
                          if (dropdown) {
                            dropdown.classList.toggle('hidden');
                          }
                        }}
                      >
                        <FaFilter className="text-[10px]" />
                        Filter
                        {activeFilterCount > 0 && (
                          <span className="ml-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] text-blue-700">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                      <div 
                        id="filterDropdown"
                        className="absolute right-0 top-full mt-2 hidden w-72 rounded-xl border border-slate-200 bg-white p-5 shadow-lg z-20"
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</label>
                            <select 
                              value={statusFilter} 
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                            >
                              <option value="all">All Status</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score</label>
                            <select 
                              value={scoreFilter} 
                              onChange={(e) => setScoreFilter(e.target.value)}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                            >
                              <option value="all">All Scores</option>
                              <option value="passed">Passed</option>
                              <option value="failed">Failed</option>
                              <option value="no-score">No Score</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Exams</label>
                            <select 
                              value={examFilter} 
                              onChange={(e) => setExamFilter(e.target.value)}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                            >
                              <option value="all">All Students</option>
                              <option value="has-exams">Has Exams</option>
                              <option value="no-exams">No Exams</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                            <input
                              type="checkbox"
                              id="hideTestAccounts"
                              checked={hideTestAccounts}
                              onChange={(e) => setHideTestAccounts(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <label htmlFor="hideTestAccounts" className="text-[11px] font-semibold text-slate-600">
                              Hide test accounts {hideTestAccounts ? "(on)" : "(off)"}
                            </label>
                          </div>
                          {activeFilterCount > 0 && (
                            <button 
                              onClick={clearAllFilters}
                              className="w-full rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-200"
                            >
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="relative block">
                      <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                      <input 
                        value={studentSearch} 
                        onChange={(event) => setStudentSearch(event.target.value)} 
                        placeholder="Search..." 
                        className="w-48 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" 
                      />
                    </label>
                  </div>
                </div>

                {loading ? (
                  <SkeletonRows count={3} />
                ) : filteredSortedStudents.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <th className="px-4 py-3 w-10">#</th>
                            <th className="px-4 py-3 w-36">Student ID</th>
                            <th className="px-4 py-3 w-32">
                              <button onClick={() => setStudentSort((current) => ({ key: "name", asc: current.key === "name" ? !current.asc : true }))} className="inline-flex items-center gap-1.5 hover:text-slate-600">Name <FaSort className="text-[8px]" /></button>
                            </th>
                            <th className="px-4 py-3 w-40">
                              <button onClick={() => setStudentSort((current) => ({ key: "email", asc: current.key === "email" ? !current.asc : true }))} className="inline-flex items-center gap-1.5 hover:text-slate-600">Email <FaSort className="text-[8px]" /></button>
                            </th>
                            <th className="px-4 py-3 w-28">School</th>
                            <th className="px-4 py-3 w-28">Latest Score</th>
                            <th className="px-4 py-3 w-16 text-center">Exams</th>
                            <th className="px-4 py-3 w-16 text-center">Modules</th>
                            <th className="px-4 py-3 w-28">Activity</th>
                            <th className="px-4 py-3 w-20">Status</th>
                            <th className="px-4 py-3 w-24">Joined</th>
                            <th className="px-4 py-3 w-14 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {paginatedStudents.map((student, index) => {
                            const key = student.id || student.email;
                            return (
                              <tr key={key} className="hover:bg-slate-50">
                                <td className="px-4 py-3.5 font-bold text-slate-400 text-center">{(studentPage - 1) * STUDENTS_PER_PAGE + index + 1}</td>
                                <td className="px-4 py-3.5 font-mono text-[10px] font-bold text-slate-500 truncate max-w-36">{student.id || "—"}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-[9px] font-black text-blue-700">{getInitials(student.name || student.email)}</span>
                                    <span className="font-black text-slate-900 truncate max-w-24">{student.name || "Student"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 truncate max-w-40">{student.email}</td>
                                <td className="px-4 py-3.5 text-slate-500 text-[10px] truncate max-w-28">{student.school || "Not provided"}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black whitespace-nowrap ${student.passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                    {student.latestScore === null ? "No score" : `${student.latestScore}%`}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-black text-slate-700 text-center">{student.totalExams}</td>
                                <td className="px-4 py-3.5 font-black text-slate-700 text-center">{student.totalModules}</td>
                                <td className="px-4 py-3.5 text-[10px] font-semibold text-slate-500 truncate max-w-28">{formatLastActivity(student.lastActivity)}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase whitespace-nowrap ${student.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-[10px] text-slate-500 truncate max-w-24">{student.dateJoined ? new Date(student.dateJoined).toLocaleDateString() : "—"}</td>
                                <td className="px-4 py-3.5 text-right">
                                  <button onClick={() => setStudentMenuOpenId(studentMenuOpenId === key ? null : key)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <FaEllipsisV className="text-[10px]" />
                                  </button>
                                  {studentMenuOpenId === key && (
                                    <div className="absolute right-4 top-11 z-10 w-40 rounded-xl border border-slate-200 bg-white py-1.5 text-left shadow-lg">
                                      <button onClick={() => handleViewProfile(student)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50">View profile</button>
                                      <button onClick={() => handleEditStudent(student)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50">Edit details</button>
                                      <button onClick={() => handleResetPassword(student)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50">Reset password</button>
                                      <button onClick={() => handleDeleteStudent(student)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50">Delete account</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                      <p className="text-[10px] font-semibold text-slate-400">
                        Page {studentPage} of {totalStudentPages} · 
                        {filteredSortedStudents.length} student{filteredSortedStudents.length === 1 ? "" : "s"}
                        {activeFilterCount > 0 && ` (filtered)`}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setStudentPage((value) => Math.max(1, value - 1))} disabled={studentPage === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"><FaChevronLeft className="text-[10px]" /></button>
                        <button onClick={() => setStudentPage((value) => Math.min(totalStudentPages, value + 1))} disabled={studentPage === totalStudentPages} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50"><FaChevronRight className="text-[10px]" /></button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-xs font-semibold text-slate-500">
                      {studentSearch || activeFilterCount > 0 
                        ? "No students match your filters. Try adjusting your search or filter criteria."
                        : "No student accounts found."}
                    </p>
                    {(studentSearch || activeFilterCount > 0) && (
                      <button 
                        onClick={clearAllFilters}
                        className="mt-3 rounded-lg bg-blue-50 px-3.5 py-2 text-[10px] font-black text-blue-600 hover:bg-blue-100"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-black text-slate-950">Pending Essay Reviews</h2>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">Click Review to inspect the full response and AI rationale before deciding.</p>
                </div>

                {loading ? (
                  <SkeletonRows count={3} />
                ) : pending.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="px-6 py-3 w-32">Student</th>
                          <th className="px-6 py-3">Essay / Exam</th>
                          <th className="px-6 py-3 w-28">Score</th>
                          <th className="px-6 py-3 w-24">Status</th>
                          <th className="px-6 py-3 w-20 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {pending.map((item) => {
                          const maxPoints = Math.max(1, Number(item.points || 1));
                          return (
                            <tr key={`${item.email}-${item.id}`} className="hover:bg-slate-50">
                              <td className="px-6 py-3.5">
                                <p className="font-black text-slate-900 text-[11px] truncate max-w-28">{item.studentName}</p>
                                <p className="text-[9px] font-semibold text-slate-400 truncate max-w-28">{item.email}</p>
                              </td>
                              <td className="px-6 py-3.5">
                                <p className="font-bold text-slate-700 text-[11px] truncate max-w-xs">{item.examTitle}</p>
                                {item.reviewedBy && (
                                  <p className="mt-0.5 text-[9px] font-semibold text-slate-400">By {item.reviewedBy}</p>
                                )}
                              </td>
                              <td className="px-6 py-3.5 font-black text-slate-900">
                                {item.aiScore ?? "—"} <span className="text-[9px] font-semibold text-slate-400">/ {maxPoints}</span>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${item.status === "ai_graded" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                                  {item.status === "ai_graded" ? "AI Graded" : "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <button onClick={() => setReviewItem(item)} className="rounded-lg bg-blue-600 px-3.5 py-2 text-[10px] font-black text-white hover:bg-blue-700">Review</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="p-8 text-center text-xs font-semibold text-slate-500">No essay submissions are waiting for review.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {reviewItem && (
        <ReviewWorkbench
          item={reviewItem}
          score={scores[reviewItem.id] ?? reviewItem.aiScore ?? ""}
          onScoreChange={(value) => setScores((current) => ({ ...current, [reviewItem.id]: value }))}
          onClose={() => setReviewItem(null)}
          onApprove={() => requestApprove(reviewItem)}
          onReject={() => requestReject(reviewItem)}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === "approve" ? "Approve this score?" : "Reject this essay?"}
          message={
            confirmAction.type === "approve"
              ? `This finalizes ${confirmAction.item.studentName}'s score at ${confirmAction.score}/${Math.max(1, Number(confirmAction.item.points || 1))}. This action is recorded against your admin account.`
              : `This clears the AI score and sends ${confirmAction.item.studentName}'s essay back for re-review. This action is recorded against your admin account.`
          }
          confirmLabel={confirmAction.type === "approve" ? "Approve" : "Reject"}
          tone={confirmAction.type === "approve" ? "emerald" : "rose"}
          onCancel={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
      )}

      {studentModal && (
        <StudentProfileModal
          mode={studentModal.type}
          student={studentModal.student}
          onClose={() => setStudentModal(null)}
          onSave={(changes) => requestSaveStudent(studentModal.student, changes)}
        />
      )}

      {studentAction && (
        <ConfirmDialog
          title={studentAction.type === "delete" ? "Delete this student account?" : studentAction.type === "reset-password" ? "Reset this student's password?" : "Save profile changes?"}
          message={studentAction.type === "delete"
            ? `This permanently deletes ${studentAction.student.name || studentAction.student.email} and their locally stored attempts, drills, and reviewer progress.`
            : studentAction.type === "reset-password"
              ? `A new temporary password will be generated for ${studentAction.student.name || studentAction.student.email}. Their current password will stop working.`
              : `Save the updated profile details for ${studentAction.student.name || studentAction.student.email}?`}
          confirmLabel={studentAction.type === "delete" ? "Delete account" : studentAction.type === "reset-password" ? "Reset password" : "Save changes"}
          tone={studentAction.type === "delete" ? "rose" : "emerald"}
          onCancel={() => setStudentAction(null)}
          onConfirm={runConfirmedStudentAction}
        />
      )}

      {temporaryPassword && (
        <TemporaryPasswordDialog
          {...temporaryPassword}
          onClose={() => setTemporaryPassword(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function buildStudentRow(student, dashboardStore) {
  const dashboard = dashboardStore[student.email] || {};
  const attempts = Array.isArray(dashboard.attempts) ? dashboard.attempts : [];
  const exams = Array.isArray(dashboard.exams) ? dashboard.exams : [];
  const latestCompleted = attempts.find((attempt) => attempt.status !== "Pending Review" && !attempt.hasPendingEssays)
    || exams.find((exam) => exam.status !== "Pending Review" && !exam.hasPendingEssays);
  const latestScoreValue = latestCompleted?.finalPct ?? latestCompleted?.score;
  const latestScore = Number.isFinite(Number(latestScoreValue)) ? Number(latestScoreValue) : null;
  const passingScore = Number(latestCompleted?.passingScore || 75);
  const moduleProgress = getReviewerProgress(student.email);
  const totalModules = Object.values(moduleProgress).reduce((total, completed) => total + (Array.isArray(completed) ? completed.length : 0), 0);
  const activityDates = [student.dateJoined, latestCompleted?.takenAt, ...getDrillSessions(student.email).map((session) => session.completedAt || session.createdAt)].map((value) => new Date(value).getTime()).filter(Number.isFinite);
  const lastActivity = activityDates.length ? new Date(Math.max(...activityDates)).toISOString() : null;
  const inactiveDays = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000) : Infinity;
  return { ...student, latestScore, passed: latestScore !== null && latestScore >= passingScore, totalExams: attempts.length || exams.length, totalModules, lastActivity, status: inactiveDays >= 20 ? "Inactive" : "Active" };
}

function sortableStudentValue(student, key) {
  const value = key === "name" ? student.name || student.email : key === "email" ? student.email : student[key];
  if (typeof value === "number") return value;
  if (key === "lastActivity") return value ? new Date(value).getTime() : 0;
  return String(value || "").toLowerCase();
}

function formatLastActivity(value) {
  if (!value) return "No activity";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`;
}

function getInitials(value) {
  return String(value || "Student").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function SkeletonRows({ count }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function ReviewWorkbench({ item, score, onScoreChange, onClose, onApprove, onReject }) {
  const maxPoints = Math.max(1, Number(item.points || 1));
  const rationale = item.aiRationale || item.feedback || null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40">
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">{item.examTitle}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{item.studentName}</h2>
            <p className="text-[10px] font-semibold text-slate-400">{item.email}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><FaTimes className="text-sm" /></button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-2">
          <div className="border-b border-slate-100 p-6 md:border-b-0 md:border-r">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted Response</p>
            <p className="mt-2.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{item.response || "No response submitted."}</p>
          </div>

          <div className="space-y-5 p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Evaluation Rubric</p>
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">{item.rubric || "Default criteria"}</p>
              <p className="mt-1.5 text-[10px] font-semibold text-slate-400">Max Points: {maxPoints}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI Rationale</p>
              {rationale ? (
                <p className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">{rationale}</p>
              ) : (
                <p className="mt-2 rounded-xl border border-dashed border-slate-200 p-3 text-xs font-semibold text-slate-400">
                  No AI rationale returned for this submission. The scoring engine currently only returns a numeric score — worth adding a short per-essay explanation here.
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score Override</p>
              <div className="mt-2 flex items-center gap-2.5">
                <input
                  type="number"
                  min="0"
                  max={maxPoints}
                  step="0.5"
                  value={score}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") { onScoreChange(""); return; }
                    const numeric = Math.max(0, Math.min(maxPoints, Number(value)));
                    onScoreChange(Number.isFinite(numeric) ? numeric : "");
                  }}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"
                />
                <span className="text-[10px] font-semibold text-slate-400">/ {maxPoints} · AI suggested {item.aiScore ?? "—"}</span>
              </div>
            </div>

            {item.reviewedBy && (
              <p className="text-[10px] font-semibold text-slate-400">Last touched by {item.reviewedBy}{item.reviewedAt ? ` on ${new Date(item.reviewedAt).toLocaleString()}` : ""}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
          <button onClick={onReject} className="rounded-lg bg-slate-100 px-4 py-2.5 text-[10px] font-black text-slate-600 hover:bg-slate-200">Reject</button>
          <button onClick={onApprove} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-[10px] font-black text-white hover:bg-emerald-700">Approve &amp; Finalize</button>
        </div>
      </div>
    </div>
  );
}

function StudentProfileModal({ mode, student, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: student.name || "",
    nickname: student.nickname || "",
    school: student.school || "",
    smsNumber: student.smsNumber || "",
    recoveryEmail: student.recoveryEmail || ""
  }));
  const viewOnly = mode === "view";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Student profile</p><h3 className="mt-1 text-lg font-black text-slate-950">{viewOnly ? "Profile details" : "Edit student details"}</h3></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><FaTimes className="text-sm" /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AdminField label="Full name" value={form.name} disabled={viewOnly} onChange={(name) => setForm((current) => ({ ...current, name }))} />
          <AdminField label="Nickname" value={form.nickname} disabled={viewOnly} onChange={(nickname) => setForm((current) => ({ ...current, nickname }))} />
          <AdminField label="Email" value={student.email || ""} disabled />
          <AdminField label="School / Institution" value={form.school} disabled={viewOnly} onChange={(school) => setForm((current) => ({ ...current, school }))} />
          <AdminField label="Mobile number" value={form.smsNumber} disabled={viewOnly} onChange={(smsNumber) => setForm((current) => ({ ...current, smsNumber }))} />
          <AdminField label="Recovery email" value={form.recoveryEmail} disabled={viewOnly} onChange={(recoveryEmail) => setForm((current) => ({ ...current, recoveryEmail }))} />
        </div>
        {viewOnly && <p className="mt-4 text-[10px] font-semibold text-slate-500">Student ID: <span className="font-mono text-slate-700">{student.id}</span></p>}
        <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50">{viewOnly ? "Close" : "Cancel"}</button>{!viewOnly && <button onClick={() => onSave(form)} className="rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-black text-white hover:bg-blue-700">Review changes</button>}</div>
      </div>
    </div>
  );
}

function AdminField({ label, value, onChange, disabled = false }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><input value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50" /></label>;
}

function TemporaryPasswordDialog({ name, password, onClose }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-5"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Password reset complete</p><h3 className="mt-1 text-base font-black text-slate-950">Temporary password for {name}</h3><p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 font-mono text-sm font-black text-slate-900">{password}</p><p className="mt-3 text-[10px] font-semibold text-slate-500">Give this to the student securely. They should change it after signing in.</p><div className="mt-6 flex justify-end"><button onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-black text-white hover:bg-blue-700">Done</button></div></div></div>;
}

function ConfirmDialog({ title, message, confirmLabel, tone, onCancel, onConfirm }) {
  const toneClass = tone === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-[10px] font-black text-white ${toneClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}