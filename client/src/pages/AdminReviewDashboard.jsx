import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { deleteAdminStudent, getAdminStudentDashboards, getAdminStudentExamSubmissions, getAdminStudents, resetAdminStudentPassword, updateAdminStudent, updateAdminStudentEssay } from "../api/adminApi";
import { getDrillSessions, getEssayResponses, getReviewerProgress } from "../services/storage";

const STUDENTS_PER_PAGE = 15;

// Placeholder for whoever is logged into the admin panel. Swap for real auth/session data
// once you have it — this only feeds the audit-trail fields below.
const CURRENT_ADMIN_NAME = "Admin Workspace";

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
  const [studentMenuAnchor, setStudentMenuAnchor] = useState(null);
  const [studentModal, setStudentModal] = useState(null);
  const [studentAction, setStudentAction] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [examHistoryStudent, setExamHistoryStudent] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [examFilter, setExamFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const filterButtonRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [studentAccounts, store] = await Promise.all([getAdminStudents(), getAdminStudentDashboards()]);
        if (cancelled) return;
        const normalizedStudents = studentAccounts.map((student) => ({
          ...student,
          name: student.displayName || student.name || student.username || student.email,
          dateJoined: student.createdAt
        }));
        const pendingItems = normalizedStudents.flatMap((student) =>
          (store[student.email]?.attempts || []).flatMap((attempt) =>
            getEssayResponses(attempt)
              .filter((essay) => ["pending_review", "ai_graded"].includes(essay.status))
              .map((essay) => ({
              ...essay,
              studentId: student.id,
              email: student.email,
                studentName: student.name || student.email,
                examTitle: attempt.examTitle || "Essay Exam"
              }))
          )
        );
        const examCount = normalizedStudents.reduce((sum, student) => sum + (store[student.email]?.attempts?.length || 0), 0);

        setStudents(normalizedStudents.map((student) => buildStudentRow(student, store)));
        setPending(pendingItems);
        setTotalExams(examCount);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Something went wrong loading the dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [refresh]);

  const filteredSortedStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    
    const filtered = students.filter((student) => {
      // Search filter
      if (query && !`${student.name || ""} ${student.email || ""}`.toLowerCase().includes(query)) {
        return false;
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
  }, [students, studentSearch, studentSort, statusFilter, scoreFilter, examFilter]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredSortedStudents.length / STUDENTS_PER_PAGE));
  const paginatedStudents = filteredSortedStudents.slice((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE);

  useEffect(() => setStudentPage(1), [studentSearch, studentSort, statusFilter, scoreFilter, examFilter]);
  useEffect(() => {
    if (studentPage > totalStudentPages) setStudentPage(totalStudentPages);
  }, [studentPage, totalStudentPages]);

  // Reposition (or close) the open row menu / filter dropdown on scroll or resize,
  // since their position is computed from the trigger button's rect at open time.
  useEffect(() => {
    if (!studentMenuOpenId && !filterOpen) return;
    function closeOnScrollOrResize() {
      setStudentMenuOpenId(null);
      setStudentMenuAnchor(null);
      setFilterOpen(false);
    }
    window.addEventListener("scroll", closeOnScrollOrResize, true);
    window.addEventListener("resize", closeOnScrollOrResize);
    return () => {
      window.removeEventListener("scroll", closeOnScrollOrResize, true);
      window.removeEventListener("resize", closeOnScrollOrResize);
    };
  }, [studentMenuOpenId, filterOpen]);

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

  async function runConfirmedAction() {
    if (!confirmAction) return;
    const { item, type, score } = confirmAction;

    try {
      if (type === "approve") {
        await updateAdminStudentEssay(item.studentId, item.id, { finalScore: score, status: "approved", reviewedBy: CURRENT_ADMIN_NAME, reviewedAt: new Date().toISOString() });
        showToast(`Approved ${item.studentName}'s essay (${score}/${Math.max(1, Number(item.points || 1))}).`);
      } else {
        await updateAdminStudentEssay(item.studentId, item.id, { aiScore: null, finalScore: null, status: "pending_review", reviewedBy: CURRENT_ADMIN_NAME, reviewedAt: new Date().toISOString() });
        showToast(`Sent ${item.studentName}'s essay back for re-review.`);
      }
    } catch (error) {
      showToast(error.response?.data?.error || "Could not update the essay score.");
    }

    setConfirmAction(null);
    setReviewItem(null);
    setRefresh((value) => value + 1);
  }

  function handleEditStudent(student) {
    closeStudentMenu();
    setStudentModal({ type: "edit", student });
  }
  function handleViewProfile(student) {
    closeStudentMenu();
    setStudentModal({ type: "view", student });
  }
  async function handleViewExamSubmissions(student) {
    closeStudentMenu();
    try {
      const { attempts } = await getAdminStudentExamSubmissions(student.id);
      setExamHistoryStudent({ ...student, attempts });
    } catch (error) {
      showToast(error.response?.data?.error || "Could not load this student's exam submissions.");
    }
  }
  function handleResetPassword(student) {
    closeStudentMenu();
    setStudentAction({ type: "reset-password", student });
  }
  function handleDeleteStudent(student) {
    closeStudentMenu();
    setStudentAction({ type: "delete", student });
  }
  function requestSaveStudent(student, changes) {
    setStudentModal(null);
    setStudentAction({ type: "edit", student, changes });
  }
  async function runConfirmedStudentAction() {
    if (!studentAction) return;
    const { student, type, changes } = studentAction;
    try {
      if (type === "edit") {
        await updateAdminStudent(student.id, changes);
        showToast(`${changes.name || student.email}'s profile was updated.`);
      } else if (type === "reset-password") {
        const result = await resetAdminStudentPassword(student.id);
        setTemporaryPassword({ name: student.name || student.email, password: result.temporaryPassword });
      } else if (type === "delete") {
        await deleteAdminStudent(student.id);
        showToast(`${student.name || student.email}'s account was deleted.`);
      }
    } catch (error) {
      showToast(error.response?.data?.error || "Could not update the student account.");
    }
    setStudentAction(null);
    setRefresh((value) => value + 1);
  }

  function clearAllFilters() {
    setStatusFilter("all");
    setScoreFilter("all");
    setExamFilter("all");
    setStudentSearch("");
  }

  // Row action menu: measure the trigger button's position at click time so the
  // portal-rendered menu can be pinned next to it regardless of ancestor overflow.
  function toggleStudentMenu(event, key) {
    if (studentMenuOpenId === key) {
      closeStudentMenu();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 176; // matches w-44
    setStudentMenuAnchor({
      top: rect.bottom + 6,
      left: Math.max(8, rect.right - menuWidth)
    });
    setStudentMenuOpenId(key);
  }
  function closeStudentMenu() {
    setStudentMenuOpenId(null);
    setStudentMenuAnchor(null);
  }

  // Filter dropdown: same portal approach as the row menu above.
  function toggleFilterDropdown() {
    if (filterOpen) {
      setFilterOpen(false);
      return;
    }
    const rect = filterButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 288; // matches w-72
      setFilterAnchor({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - menuWidth)
      });
    }
    setFilterOpen(true);
  }

  // Get filter counts
  const activeFilterCount = [
    statusFilter !== "all",
    scoreFilter !== "all",
    examFilter !== "all"
  ].filter(Boolean).length;

  const activeMenuStudent = studentMenuOpenId
    ? paginatedStudents.find((student) => (student.id || student.email) === studentMenuOpenId)
    : null;

  return (
    <main className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar active="dashboard" />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#003A6C]">Dashboard</p>
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
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-2.5">
                    <FaUsers className="text-[#003A6C] text-sm" />
                    <h2 className="text-base font-black text-slate-950">Student Accounts</h2>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-[#003A6C]/10 px-2.5 py-1 text-[10px] font-black text-[#003A6C]">
                        {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filter Dropdown trigger — the dropdown itself is rendered via portal below */}
                    <div className="relative">
                      <button
                        ref={filterButtonRef}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        onClick={toggleFilterDropdown}
                      >
                        <FaFilter className="text-[10px]" />
                        Filter
                        {activeFilterCount > 0 && (
                          <span className="ml-0.5 rounded-full bg-[#003A6C]/10 px-1.5 py-0.5 text-[9px] text-[#003A6C]">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </div>

                    <label className="relative block">
                      <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                      <input 
                        value={studentSearch} 
                        onChange={(event) => setStudentSearch(event.target.value)} 
                        placeholder="Search..." 
                        className="w-48 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#003A6C] focus:ring-4 focus:ring-[#003A6C]/10"
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
                          <tr className="bg-[#003A6C] text-[10px] font-black uppercase tracking-wider text-white">
                            <th className="px-6 py-4 w-10">#</th>
                            <th className="px-6 py-4 w-36">Student ID</th>
                            <th className="px-6 py-4 w-32">
                              <button onClick={() => setStudentSort((current) => ({ key: "name", asc: current.key === "name" ? !current.asc : true }))} className="inline-flex items-center gap-1.5 hover:text-blue-200 text-white">Name <FaSort className="text-[8px]" /></button>
                            </th>
                            <th className="px-6 py-4 w-40">
                              <button onClick={() => setStudentSort((current) => ({ key: "email", asc: current.key === "email" ? !current.asc : true }))} className="inline-flex items-center gap-1.5 hover:text-blue-200 text-white">Email <FaSort className="text-[8px]" /></button>
                            </th>
                            <th className="px-6 py-4 w-28">School</th>
                            <th className="px-6 py-4 w-28">Latest Score</th>
                            <th className="px-6 py-4 w-16 text-center">Exams</th>
                            <th className="px-6 py-4 w-16 text-center">Modules</th>
                            <th className="px-6 py-4 w-28">Activity</th>
                            <th className="px-6 py-4 w-20">Status</th>
                            <th className="px-6 py-4 w-24">Joined</th>
                            <th className="px-6 py-4 w-14 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {paginatedStudents.map((student, index) => {
                            const key = student.id || student.email;
                            return (
                              <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-400 text-center">{(studentPage - 1) * STUDENTS_PER_PAGE + index + 1}</td>
                                <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-500 truncate max-w-36">{student.id || "—"}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#003A6C]/10 text-[10px] font-black text-[#003A6C]">{getInitials(student.name || student.email)}</span>
                                    <span className="font-black text-slate-900 truncate max-w-24">{student.name || "Student"}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 truncate max-w-40">{student.email}</td>
                                <td className="px-6 py-4 text-slate-500 text-[10px] truncate max-w-28">{student.school || "Not provided"}</td>
                                <td className="px-6 py-4">
                                  <span className={`rounded-full px-3 py-1.5 text-[9px] font-black whitespace-nowrap ${student.passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                    {student.latestScore === null ? "No score" : `${student.latestScore}%`}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-black text-slate-700 text-center">{student.totalExams}</td>
                                <td className="px-6 py-4 font-black text-slate-700 text-center">{student.totalModules}</td>
                                <td className="px-6 py-4 text-[10px] font-semibold text-slate-500 truncate max-w-28">{formatLastActivity(student.lastActivity)}</td>
                                <td className="px-6 py-4">
                                  <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase whitespace-nowrap ${student.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                    {student.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-[10px] text-slate-500 truncate max-w-24">{student.dateJoined ? new Date(student.dateJoined).toLocaleDateString() : "—"}</td>
                                <td className="px-6 py-4 text-right relative">
                                  <button onClick={(event) => toggleStudentMenu(event, key)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                    <FaEllipsisV className="text-[10px]" />
                                  </button>
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
                        <button onClick={() => setStudentPage((value) => Math.max(1, value - 1))} disabled={studentPage === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50 transition-colors"><FaChevronLeft className="text-[10px]" /></button>
                        <button onClick={() => setStudentPage((value) => Math.min(totalStudentPages, value + 1))} disabled={studentPage === totalStudentPages} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-30 hover:bg-slate-50 transition-colors"><FaChevronRight className="text-[10px]" /></button>
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
                        className="mt-3 rounded-lg bg-[#003A6C]/10 px-3.5 py-2 text-[10px] font-black text-[#003A6C] hover:bg-[#003A6C]/20"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                        <tr className="bg-[#003A6C] text-[10px] font-black uppercase tracking-wider text-white">
                          <th className="px-6 py-4 w-32">Student</th>
                          <th className="px-6 py-4">Essay / Exam</th>
                          <th className="px-6 py-4 w-28">Score</th>
                          <th className="px-6 py-4 w-24">Status</th>
                          <th className="px-6 py-4 w-20 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {pending.map((item) => {
                          const maxPoints = Math.max(1, Number(item.points || 1));
                          return (
                            <tr key={`${item.email}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-black text-slate-900 text-[11px] truncate max-w-28">{item.studentName}</p>
                                <p className="text-[9px] font-semibold text-slate-400 truncate max-w-28">{item.email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-700 text-[11px] truncate max-w-xs">{item.examTitle}</p>
                                {item.reviewedBy && (
                                  <p className="mt-0.5 text-[9px] font-semibold text-slate-400">By {item.reviewedBy}</p>
                                )}
                              </td>
                              <td className="px-6 py-4 font-black text-slate-900">
                                {item.aiScore ?? "—"} <span className="text-[9px] font-semibold text-slate-400">/ {maxPoints}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${item.status === "ai_graded" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                                  {item.status === "ai_graded" ? "AI Graded" : "Pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setReviewItem(item)} className="rounded-lg bg-[#003A6C] px-4 py-2 text-[10px] font-black text-white hover:bg-[#002A4C] transition-colors">Review</button>
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

      {/* ── Portal-rendered filter dropdown ─────────────────────────────── */}
      {filterOpen && filterAnchor && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
          <div
            style={{ position: "fixed", top: filterAnchor.top, left: filterAnchor.left }}
            className="z-50 w-72 rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
          >
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#003A6C]"
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
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#003A6C]"
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
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#003A6C]"
                >
                  <option value="all">All Students</option>
                  <option value="has-exams">Has Exams</option>
                  <option value="no-exams">No Exams</option>
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { clearAllFilters(); setFilterOpen(false); }}
                  className="w-full rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Portal-rendered row action menu ─────────────────────────────── */}
      {studentMenuOpenId && studentMenuAnchor && activeMenuStudent && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={closeStudentMenu} />
          <div
            style={{ position: "fixed", top: studentMenuAnchor.top, left: studentMenuAnchor.left }}
            className="z-50 w-44 rounded-xl border border-slate-200 bg-white py-1.5 text-left shadow-lg"
          >
            <button onClick={() => handleViewProfile(activeMenuStudent)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 text-left">View profile</button>
            <button onClick={() => handleEditStudent(activeMenuStudent)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 text-left">Edit details</button>
            <button onClick={() => handleViewExamSubmissions(activeMenuStudent)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 text-left">View exam submissions</button>
            <button onClick={() => handleResetPassword(activeMenuStudent)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 text-left">Reset password</button>
            <button onClick={() => handleDeleteStudent(activeMenuStudent)} className="block w-full px-3.5 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 text-left">Delete account</button>
          </div>
        </>,
        document.body
      )}

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

      {examHistoryStudent && (
        <ExamSubmissionsModal
          student={examHistoryStudent}
          attempts={examHistoryStudent.attempts || []}
          onClose={() => setExamHistoryStudent(null)}
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
            <p className="text-[10px] font-black uppercase tracking-wider text-[#003A6C]">{item.examTitle}</p>
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
          <div><p className="text-[10px] font-black uppercase tracking-wider text-[#003A6C]">Student profile</p><h3 className="mt-1 text-lg font-black text-slate-950">{viewOnly ? "Profile details" : "Edit student details"}</h3></div>
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
        <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50">{viewOnly ? "Close" : "Cancel"}</button>{!viewOnly && <button onClick={() => onSave(form)} className="rounded-lg bg-[#003A6C] px-4 py-2 text-[10px] font-black text-white hover:bg-[#002A4C]">Review changes</button>}</div>
      </div>
    </div>
  );
}

function AdminField({ label, value, onChange, disabled = false }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><input value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-50" /></label>;
}

function TemporaryPasswordDialog({ name, password, onClose }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-5"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Password reset complete</p><h3 className="mt-1 text-base font-black text-slate-950">Temporary password for {name}</h3><p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 font-mono text-sm font-black text-slate-900">{password}</p><p className="mt-3 text-[10px] font-semibold text-slate-500">Give this to the student securely. They should change it after signing in.</p><div className="mt-6 flex justify-end"><button onClick={onClose} className="rounded-lg bg-[#003A6C] px-4 py-2 text-[10px] font-black text-white hover:bg-[#002A4C]">Done</button></div></div></div>;
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

// ============================================
// EXAM SUBMISSIONS VIEWER
// ============================================

function ExamSubmissionsModal({ student, attempts, onClose }) {
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const selectedAttempt = attempts.find((attempt) => attempt.id === selectedAttemptId) || null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            {selectedAttempt && (
              <button
                onClick={() => setSelectedAttemptId(null)}
                className="mb-1 flex items-center gap-1 text-[10px] font-black text-[#003A6C] hover:underline"
              >
                <FaChevronLeft className="text-[8px]" /> Back to all exams
              </button>
            )}
            <h2 className="text-base font-black text-slate-950">
              {selectedAttempt ? selectedAttempt.examTitle : "Exam Submissions"}
            </h2>
            <p className="text-[10px] font-semibold text-slate-400">
              {student.name || student.email} · {student.email}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAttempt ? (
            <AttemptListView attempts={attempts} onSelect={(id) => setSelectedAttemptId(id)} />
          ) : (
            <AttemptDetailView attempt={selectedAttempt} />
          )}
        </div>
      </div>
    </div>
  );
}

function AttemptListView({ attempts, onSelect }) {
  if (!attempts.length) {
    return <p className="p-8 text-center text-xs font-semibold text-slate-500">This student hasn't taken any exams yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="bg-[#003A6C] text-[10px] font-black uppercase tracking-wider text-white">
            <th className="px-5 py-3">Exam</th>
            <th className="px-5 py-3 w-28">Date Taken</th>
            <th className="px-5 py-3 w-24">Score</th>
            <th className="px-5 py-3 w-24">Status</th>
            <th className="px-5 py-3 w-16 text-right">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {attempts.map((attempt) => (
            <tr key={attempt.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="px-5 py-3.5 font-black text-slate-900">{attempt.examTitle}</td>
              <td className="px-5 py-3.5 text-slate-500">{attempt.takenAt ? new Date(attempt.takenAt).toLocaleDateString() : "—"}</td>
              <td className="px-5 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${attempt.passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {attempt.finalPct}%
                </span>
              </td>
              <td className="px-5 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${attempt.hasPendingEssays ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {attempt.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <button onClick={() => onSelect(attempt.id)} className="rounded-lg bg-[#003A6C] px-3 py-1.5 text-[10px] font-black text-white hover:bg-[#002A4C]">
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttemptDetailView({ attempt }) {
  const items = attempt.itemDiagnostics || [];
  const essays = getEssayResponses(attempt);
  const hasLegacyItems = items.length > 0 && items.every((item) => !item.questionText);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <span className={`rounded-full px-3 py-1.5 text-xs font-black ${attempt.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {attempt.finalPct}%
        </span>
      <span className="text-[10px] font-semibold text-slate-500">
  {attempt.takenAt ? new Date(attempt.takenAt).toLocaleString(undefined, {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  }) : "—"}
</span>
        {Number.isFinite(Number(attempt.passingScore)) && (
          <span className="text-[10px] font-semibold text-slate-500">
            Passing score: {attempt.passingScore}%
          </span>
        )}
        {Number.isFinite(Number(attempt.earnedPoints)) && Number.isFinite(Number(attempt.totalPoints)) && (
          <span className="text-[10px] font-semibold text-slate-500">
            {attempt.earnedPoints} / {attempt.totalPoints} pts
          </span>
        )}
      </div>

      {hasLegacyItems && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-500 text-xs" />
          <p className="text-[10px] font-semibold text-amber-700">
            Detailed answer data (question text, points, student's answer) isn't available for this attempt because it was
            taken before per-question tracking was added. Newer attempts will show the full breakdown.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <QuestionBreakdownCard key={item.questionId || index} item={item} index={index} />
        ))}

        {essays.map((essay, index) => (
          <EssayBreakdownCard key={essay.id} essay={essay} index={items.length + index} />
        ))}

        {!items.length && !essays.length && (
          <p className="p-6 text-center text-xs font-semibold text-slate-500">No per-question details are stored for this attempt.</p>
        )}
      </div>
    </div>
  );
}

function QuestionBreakdownCard({ item, index }) {
  const isMultiChoiceLike = item.questionType === "multiple_choice" || item.questionType === "mcq";
  const isCheckbox = item.questionType === "checkboxes";
  const isShort = item.questionType === "short_answer";
  const hasQuestionData = Boolean(item.questionText);

  return (
    <div className={`rounded-xl border p-4 ${item.isCorrect ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-black text-slate-500 border border-slate-200">{index + 1}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">
            {typeLabel(item.questionType)}
          </span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${item.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {Number.isFinite(Number(item.points)) ? `${item.earnedPoints ?? 0}/${item.points} pts` : (item.isCorrect ? "Correct" : "Incorrect")}
        </span>
      </div>

      {hasQuestionData ? (
        <p className="mt-2.5 text-[11px] font-bold text-slate-800" dangerouslySetInnerHTML={{ __html: item.questionText }} />
      ) : (
        <p className="mt-2.5 text-[11px] font-semibold italic text-slate-400">Question text not available for this attempt.</p>
      )}

      {hasQuestionData && (isMultiChoiceLike || isCheckbox) && (
        <div className="mt-3 space-y-1.5">
          {(item.choiceOpts || []).map((opt, optIndex) => {
            const studentPicked = isCheckbox
              ? (item.studentAnswer || []).includes(optIndex)
              : item.studentAnswer === optIndex;
            const isCorrectOpt = isCheckbox
              ? (item.correctAnswers || []).includes(optIndex)
              : item.correctAnswerIdx === optIndex;

            return (
              <div
                key={optIndex}
                className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${
                  isCorrectOpt
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : studentPicked
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {studentPicked && <span className="mr-1.5 font-black">Student's answer →</span>}
                {isCorrectOpt && <span className="mr-1.5 font-black">✓ Correct →</span>}
                {opt}
              </div>
            );
          })}
        </div>
      )}

      {hasQuestionData && isShort && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="font-black text-slate-400 uppercase text-[9px]">Student's answer</p>
            <p className="mt-1 font-semibold text-slate-700">{item.studentAnswer || "(no answer)"}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
            <p className="font-black text-emerald-600 uppercase text-[9px]">Correct answer</p>
            <p className="mt-1 font-semibold text-emerald-800">{item.correctText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EssayBreakdownCard({ essay, index }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-black text-slate-500 border border-slate-200">{index + 1}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Essay</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-700">
          {essay.finalScore ?? essay.aiScore ?? "—"} / {essay.points} pts
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[9px] font-black uppercase text-slate-400">Student's response</p>
        <p className="mt-1 whitespace-pre-wrap text-[11px] font-medium text-slate-700">{essay.response || "(no answer)"}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <p className="text-[9px] font-black uppercase text-amber-600">AI score</p>
          <p className="mt-1 text-[11px] font-black text-amber-800">{essay.aiScore ?? "Not yet graded"}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
          <p className="text-[9px] font-black uppercase text-blue-600">Admin approval</p>
          <p className="mt-1 text-[11px] font-black text-blue-800">
            {essay.status === "approved" ? `Approved: ${essay.finalScore}` : "Pending"}
          </p>
        </div>
      </div>
    </div>
  );
}

function typeLabel(type) {
  if (type === "multiple_choice" || type === "mcq") return "Multiple Choice";
  if (type === "checkboxes") return "Checkbox";
  if (type === "short_answer") return "Short Answer";
  if (type === "paragraph" || type === "essay") return "Essay";
  return type || "Question";
}