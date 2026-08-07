import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import { useLocation, useNavigate } from "react-router-dom";
  import { 
    FaArrowLeft, FaBookOpen, FaClock, FaClipboardCheck, FaLayerGroup, 
    FaPlay, FaArrowUp, FaArrowDown, FaMinus, FaSearch
  } from "react-icons/fa";
  import { scoreEssay } from "../api/aiApi";
  import { abandonExamSession, advanceExamSection, completeExamSession, createExamSession, getActiveExamSession, saveExamProgress, startExamSection, syncExamSession } from "../api/examSessionApi";
  import ExamShell from "../features/exam/ExamShell";
  import ResultsView from "../features/exam/ResultsView";
  import {
    getCurrentUser,
    getExamBlueprints,
    getStudentDashboard,
    hydrateAllFromServer,
    saveExamAttemptForStudent,
    saveIncompleteExamAttemptForStudent,
    scoreBlueprintAttempt,
    updateLatestEssayReview
  } from "../services/storage";

  function formatPHTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}
  function createEmptyResponses(sections) {
    return sections.map((section) => section.questions.map(() => null));
  }

  function createEmptyQuestionMetrics(sections) {
    return sections.map((section) =>
      section.questions.map(() => ({
        timeSpentMs: 0,
        answerEvents: []
      }))
    );
  }

  function isAttemptForExam(attempt, exam) {
    if (attempt?.examId != null && exam?.id != null && String(attempt.examId) === String(exam.id)) return true;
    // Attempts saved before examId was added can still enforce their original
    // one-time/limited access rule through the immutable exam title.
    return !attempt?.examId
      && Boolean(exam?.title)
      && (attempt?.examTitle === exam.title || attempt?.name === exam.title);
  }

  function getAttemptsUsedForExam(dashboard, exam) {
    const examsCount = (dashboard?.exams || []).filter((attempt) => isAttemptForExam(attempt, exam)).length;
    const attemptsCount = (dashboard?.attempts || []).filter((attempt) => isAttemptForExam(attempt, exam)).length;
    // Completed attempts are stored in both collections, while an abandoned
    // attempt may exist only in exams. Use the larger count to avoid double counting.
    return Math.max(examsCount, attemptsCount);
  }

  function hasReachedAttemptLimit(dashboard, exam) {
    if (exam?.accessType === "unlimited" || !exam?.accessType) return false;
    const maxAttempts = exam.accessType === "once" ? 1 : Number(exam.maxAttempts || 1);
    return getAttemptsUsedForExam(dashboard, exam) >= maxAttempts;
  }

  function resultsFromReviewedAttempt(attempt) {
    const items = Array.isArray(attempt?.itemDiagnostics) ? attempt.itemDiagnostics : [];
    const subjectScores = Array.isArray(attempt?.subjectScores) ? attempt.subjectScores : [];
    return {
      finalPct: Number(attempt?.finalPct || 0),
      correct: items.filter((item) => Number(item.earnedPoints || 0) > 0).length,
      total: items.length,
      passingScore: Number(attempt?.passingScore || 75),
      passed: Boolean(attempt?.passed),
      subjectScores,
      weaknesses: subjectScores.filter((subject) => Number(subject.pct || 0) < 80).map((subject) => ({ ...subject, topicFocus: subject.title })),
      itemDiagnostics: items,
      hasEssays: false,
      status: "Reviewed"
    };
  }

  export default function ExamPage({ historyOnly = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const reviewedAttempt = location.state?.reviewedAttempt;
    const [availableExams, setAvailableExams] = useState([]);
    const [sections, setSections] = useState([]);
    const [blueprint, setBlueprint] = useState(null);
    const [responses, setResponses] = useState([]);
    const [activeSection, setActiveSection] = useState(0);
    const [activeQuestion, setActiveQuestion] = useState(0);
    const [phase, setPhase] = useState(reviewedAttempt ? "results" : historyOnly ? "history" : "loading");
    const [results, setResults] = useState(() => reviewedAttempt ? resultsFromReviewedAttempt(reviewedAttempt) : null);
    const [error, setError] = useState(null);
    const [startedAt, setStartedAt] = useState(null);
    const [questionMetrics, setQuestionMetrics] = useState([]);
    const [historyData, setHistoryData] = useState({ exams: [] });
    const [serverTimeLeft, setServerTimeLeft] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showExitReminder, setShowExitReminder] = useState(false);
    const activeQuestionStartedAt = useRef(Date.now());
    const questionMetricsRef = useRef([]);
    const responsesRef = useRef([]);
    const positionRef = useRef({ section: 0, question: 0 });
    const sessionRef = useRef(null);
    const saveTimerRef = useRef(null);

    useEffect(() => {
      let mounted = true;

      async function loadExam() {
        try {
          const user = getCurrentUser();
          // Exam Records must use the server copy after an admin reviews an essay.
          await hydrateAllFromServer().catch(() => false);
          const dashboard = getStudentDashboard(user?.email);
          
          // Process exams with additional data
          const processedExams = (dashboard.exams || []).map((exam, index, arr) => {
            const prevExam = arr[index + 1];
            const durationSeconds = Number(exam.durationSeconds ?? dashboard.attempts?.[index]?.durationSeconds ?? 0);
            return {
              ...exam,
              status: exam.status || (exam.hasPendingEssays ? "Pending Review" : "Analyzed"),
              durationSeconds,
              pointsEarned: exam.earnedPoints,
              passingScore: Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75,
              passed: typeof exam.passed === "boolean" ? exam.passed : exam.score >= (Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75),
              previousScore: prevExam?.score || null,
              examId: exam.examId || dashboard.attempts?.[index]?.examId
            };
          });
          
          setHistoryData({ exams: processedExams, attempts: dashboard.attempts || [] });

          if (historyOnly) {
            setPhase("history");
            return;
          }

          const examBlueprints = getExamBlueprints();
          if (!mounted) return;

          setAvailableExams(examBlueprints);

          if (!examBlueprints.length) {
            setPhase("empty");
            return;
          }

          const activeSession = await getActiveExamSession().catch(() => null);
          const resumableBlueprint = activeSession && examBlueprints.find((exam) => String(exam.id) === String(activeSession.examId));
          if (resumableBlueprint) {
            const nextSections = resumableBlueprint.sections || [];
            const restoredResponses = hydrateResponses(nextSections, activeSession.responses);
            setBlueprint(resumableBlueprint); setSections(nextSections); setResponses(restoredResponses);
            responsesRef.current = restoredResponses;
            setActiveSection(activeSession.activeSection); setActiveQuestion(activeSession.activeQuestion);
            positionRef.current = { section: activeSession.activeSection, question: activeSession.activeQuestion };
            sessionRef.current = activeSession; setServerTimeLeft(activeSession.remainingSeconds);
            questionMetricsRef.current = createEmptyQuestionMetrics(nextSections); setQuestionMetrics(questionMetricsRef.current);
            activeQuestionStartedAt.current = Date.now(); setStartedAt(activeSession.serverNow);
            setPhase(activeSession.status === "active" ? "testing" : "intermission");
            return;
          }
          setPhase("select");
        } catch (err) {
          console.error("Exam blueprint storage error:", err);
          if (mounted) {
            setError("The published exam could not be loaded. Please return to the dashboard and try again.");
            setPhase("error");
          }
        }
      }

      loadExam();

      return () => {
        mounted = false;
      };
    }, [historyOnly]);

    // Calculate stats from filtered exams
    const filteredExams = useMemo(() => {
      let exams = historyData.exams;
      
      // Filter by search
      if (searchQuery) {
        exams = exams.filter(e => 
          e.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Filter by status
      if (statusFilter !== "all") {
        exams = exams.filter(e => 
          e.status?.toLowerCase() === statusFilter.toLowerCase()
        );
      }
      
      return exams;
    }, [historyData.exams, searchQuery, statusFilter]);

    // Calculate stats
    const stats = useMemo(() => {
      const total = filteredExams.length;
      const passedCount = filteredExams.filter(e => e.passed === true).length;
      const failedCount = filteredExams.filter(e => e.passed === false).length;
      const pendingCount = filteredExams.filter(e => e.status === "Pending Review").length;
      
      return { total, passedCount, failedCount, pendingCount };
    }, [filteredExams]);

    // Compare scores for trend
    const getTrend = useCallback((exam, index, arr) => {
      if (index === arr.length - 1) return null;
      const prevScore = arr[index + 1]?.score;
      if (prevScore === undefined || prevScore === null) return null;
      if (exam.score > prevScore) return 'up';
      if (exam.score < prevScore) return 'down';
      return 'same';
    }, []);

    const applySession = useCallback((session) => {
      sessionRef.current = session;
      setServerTimeLeft(session.remainingSeconds);
      return session;
    }, []);

    const persistProgress = useCallback(async () => {
      const session = sessionRef.current;
      if (!session || !["overview", "intermission", "active"].includes(session.status)) return null;
      try {
        return applySession(await saveExamProgress(session.id, { responses: responsesRef.current, activeSection: positionRef.current.section, activeQuestion: positionRef.current.question }));
      } catch (error) {
        console.warn("Exam autosave will retry when the connection returns.", error);
        return null;
      }
    }, [applySession]);

    const queueProgressSave = useCallback(() => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(persistProgress, 750);
    }, [persistProgress]);

    const flushProgress = useCallback(async () => {
      clearTimeout(saveTimerRef.current);
      return persistProgress();
    }, [persistProgress]);

    useEffect(() => {
      const interval = setInterval(flushProgress, 20000);
      return () => { clearInterval(interval); clearTimeout(saveTimerRef.current); };
    }, [flushProgress]);

    const currentSection = sections[activeSection];
    const currentQuestion = currentSection?.questions[activeQuestion];
    const response = responses[activeSection]?.[activeQuestion] ?? null;

    const progress = useMemo(() => {
      const flatResponses = responses.flat();
      return {
        answered: flatResponses.filter((item) => Array.isArray(item) ? item.length > 0 : item !== null && item !== "").length,
        total: flatResponses.length
      };
    }, [responses]);

    const recordActiveQuestionTime = useCallback(() => {
      if (phase !== "testing") return questionMetricsRef.current;
      const elapsedMs = Math.max(0, Date.now() - activeQuestionStartedAt.current);
      if (!elapsedMs) return questionMetricsRef.current;

      const nextMetrics = questionMetricsRef.current.map((sectionMetrics, sectionIndex) =>
          sectionIndex === activeSection
            ? sectionMetrics.map((item, questionIndex) =>
                questionIndex === activeQuestion ? { ...item, timeSpentMs: Number(item.timeSpentMs || 0) + elapsedMs } : item
              )
            : sectionMetrics
      );
      questionMetricsRef.current = nextMetrics;
      setQuestionMetrics(nextMetrics);
      activeQuestionStartedAt.current = Date.now();
      return nextMetrics;
    }, [activeQuestion, activeSection, phase]);

    const saveResponse = useCallback((value) => {
      const previousResponse = responses[activeSection]?.[activeQuestion] ?? null;
      const elapsedMs = Math.max(0, Date.now() - activeQuestionStartedAt.current);

      const nextMetrics = questionMetricsRef.current.map((sectionMetrics, sectionIndex) =>
          sectionIndex === activeSection
            ? sectionMetrics.map((item, questionIndex) =>
                questionIndex === activeQuestion
                  ? {
                      ...item,
                      answerEvents: [
  ...(item.answerEvents || []),
  {
    at: formatPHTimestamp(),   // was: new Date().toISOString()
    elapsedMs,
    from: previousResponse,
    to: value
  }
]
                    }
                  : item
              )
            : sectionMetrics
      );
      questionMetricsRef.current = nextMetrics;
      setQuestionMetrics(nextMetrics);

      const nextResponses = responsesRef.current.map((sectionResponses, sectionIndex) =>
        sectionIndex === activeSection
          ? sectionResponses.map((item, questionIndex) => (questionIndex === activeQuestion ? value : item))
          : sectionResponses
      );
      responsesRef.current = nextResponses;
      setResponses(nextResponses);
      queueProgressSave();
    }, [activeQuestion, activeSection, queueProgressSave, responses]);

    const submitAttempt = useCallback(async () => {
      try {
        const finalQuestionMetrics = recordActiveQuestionTime();
        setPhase("submitting");
        await flushProgress();
        if (sessionRef.current) await completeExamSession(sessionRef.current.id).then(applySession);
        const rawResults = scoreBlueprintAttempt(blueprint, responses, { questionMetrics: finalQuestionMetrics });
        const passingScore = Number.isFinite(Number(blueprint.passingScore)) ? Number(blueprint.passingScore) : 75;
        const passed = rawResults.hasEssays ? null : rawResults.finalPct >= passingScore;
        const scoredResults = {
          ...rawResults,
          passingScore,
          passed,
          // For a failed attempt, the next-attempt target is the exact score
          // required by this exam. Omit it after a pass so no stale target is shown.
          ...(!rawResults.hasEssays && !passed ? { targetScore: passingScore } : {})
        };
        const durationSeconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
        const user = getCurrentUser();
        const nextDashboard = await saveExamAttemptForStudent(user, blueprint, responses, scoredResults, { durationSeconds, questionMetrics: finalQuestionMetrics });
        const essays = nextDashboard.attempts?.[0]?.essayResponses || [];
        if (essays.length) {
          await Promise.all(essays.map(async (essay) => {
            try {
              const scored = await scoreEssay({ response: essay.response, rubric: essay.rubric, points: blueprint.sections[essay.sectionIndex].questions[essay.questionIndex].points || 1 });
              if (Number.isFinite(Number(scored.score))) {
                updateLatestEssayReview(user.email, essay.id, { aiScore: Number(scored.score), aiRationale: scored.rationale || "", status: "ai_graded" });
              }
            } catch (error) {
              console.warn("Essay AI scoring unavailable; kept pending review.", error);
            }
          }));
        }
        const latestDashboard = getStudentDashboard(user.email);
        
        // Process exams with additional data
        const processedExams = (latestDashboard.exams || nextDashboard.exams || []).map((exam, index, arr) => {
          const prevExam = arr[index + 1];
          const durationSeconds = Number(exam.durationSeconds ?? latestDashboard.attempts?.[index]?.durationSeconds ?? 0);
          return {
            ...exam,
            durationSeconds,
            pointsEarned: exam.earnedPoints,
              passingScore: Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75,
              passed: typeof exam.passed === "boolean" ? exam.passed : exam.score >= (Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75),
            previousScore: prevExam?.score || null
          };
        });
        
        setHistoryData({ exams: processedExams, attempts: latestDashboard.attempts || [] });
        setResults(scoredResults);
        setPhase("results");
      } catch (err) {
        console.error("Exam submission storage error:", err);
        setError("Your exam attempt could not be saved. Please return to the dashboard and try again.");
        setPhase("error");
      }
    }, [applySession, blueprint, flushProgress, recordActiveQuestionTime, responses, startedAt]);

    const finishCurrentSection = useCallback(async () => {
      recordActiveQuestionTime();
      await flushProgress();
      const session = sessionRef.current;
      if (!session) return submitAttempt();
      const updated = applySession(await advanceExamSection(session.id));
      if (updated.status === "completed") return submitAttempt();
      positionRef.current = { section: updated.activeSection, question: 0 };
      setActiveSection(updated.activeSection); setActiveQuestion(0); setPhase("intermission"); setServerTimeLeft(null);
    }, [applySession, flushProgress, recordActiveQuestionTime, submitAttempt]);

    const next = useCallback(async () => {
      recordActiveQuestionTime();
      const section = sections[activeSection];
      if (!section) return;

      if (activeQuestion < section.questions.length - 1) {
        const nextQuestion = activeQuestion + 1;
        positionRef.current = { section: activeSection, question: nextQuestion };
        setActiveQuestion(nextQuestion);
        // Navigate first: an unavailable autosave must never trap a student on an item.
        queueProgressSave();
        return;
      }
      await flushProgress();
      finishCurrentSection();
    }, [activeQuestion, activeSection, finishCurrentSection, flushProgress, recordActiveQuestionTime, sections]);

    const previous = useCallback(async () => {
      recordActiveQuestionTime();
      const nextQuestion = Math.max(0, activeQuestion - 1);
      positionRef.current = { section: activeSection, question: nextQuestion };
      setActiveQuestion(nextQuestion);
      queueProgressSave();
    }, [activeQuestion, activeSection, queueProgressSave, recordActiveQuestionTime]);

    const jump = useCallback(async (questionIndex) => {
      recordActiveQuestionTime();
      positionRef.current = { section: activeSection, question: questionIndex };
      setActiveQuestion(questionIndex);
      queueProgressSave();
    }, [activeSection, queueProgressSave, recordActiveQuestionTime]);

    async function updatePhase(nextPhase) {
      if (nextPhase === "testing") {
        try {
          const session = applySession(await startExamSection(sessionRef.current.id, activeSection));
          if (!startedAt) setStartedAt(session.serverNow);
        } catch (_error) {
          setError("Unable to synchronize the exam timer. Please reconnect and try again."); setPhase("error"); return;
        }
      }
      if (nextPhase === "testing") {
        activeQuestionStartedAt.current = Date.now();
      }
      setPhase(nextPhase);
    }

    async function beginAttempt() {
      try {
        const user = getCurrentUser();
        if (hasReachedAttemptLimit(getStudentDashboard(user?.email), blueprint)) {
          setPhase("select");
          return;
        }
        const session = applySession(await createExamSession({ examId: blueprint.id, sectionDurations: sections.map((section) => Number(section.allottedTimeSec || 60)) }));
        responsesRef.current = responses; positionRef.current = { section: 0, question: 0 };
        setStartedAt(session.serverNow); setPhase("intermission");
      } catch (_error) {
        setError("Unable to create a server-synchronized exam session."); setPhase("error");
      }
    }

    const syncTimer = useCallback(async () => {
      if (!sessionRef.current) return null;
      try { return applySession(await syncExamSession(sessionRef.current.id)); } catch (_error) { return null; }
    }, [applySession]);

    const exitExam = useCallback(async () => {
      const session = sessionRef.current;
      setShowExitReminder(false);
      try {
        await flushProgress();
        if (session) await abandonExamSession(session.id);
        const user = getCurrentUser();
        if (user && blueprint?.accessType !== "unlimited") saveIncompleteExamAttemptForStudent(user, blueprint, session?.id);
      } finally {
        navigate("/dashboard");
      }
    }, [blueprint, flushProgress, navigate]);

    function selectExam(nextBlueprint) {
      const user = getCurrentUser();
      if (hasReachedAttemptLimit(getStudentDashboard(user?.email), nextBlueprint)) return;
      const nextSections = nextBlueprint.sections || [];
      const initialResponses = createEmptyResponses(nextSections);
      const initialMetrics = createEmptyQuestionMetrics(nextSections);

      setBlueprint(nextBlueprint);
      setSections(nextSections);
      setResponses(initialResponses);
      responsesRef.current = initialResponses;
      setActiveSection(0);
      setActiveQuestion(0);
      setResults(null);
      setStartedAt(null);
      questionMetricsRef.current = initialMetrics;
      setQuestionMetrics(initialMetrics);
      activeQuestionStartedAt.current = Date.now();
      positionRef.current = { section: 0, question: 0 };
      sessionRef.current = null;
      setServerTimeLeft(null);
      setPhase("overview");
    }

    // RENDERS 

    if ((phase === "loading" || phase === "submitting") && !historyOnly) {
      return (
        <div className="grid min-h-screen place-items-center bg-white px-6 py-8 text-slate-900">
          <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {phase === "loading" ? "Loading Exam" : "Submitting Attempt"}
            </p>
            <h1 className="mt-2 text-lg font-black text-slate-900 leading-snug">
              {phase === "loading" ? "Preparing your academic mock exam..." : "Calculating scores & diagnostics..."}
            </h1>
            <div className="mt-4 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
            </div>
          </div>
        </div>
      );
    }

    if (phase === "empty") {
      return (
        <div className="min-h-screen bg-white px-6 py-8 text-slate-900">
          <div className="mx-auto max-w-7xl space-y-4">
            <header className="border-b border-slate-200 pb-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">ACET Mock Exams</h1>
              <p className="mt-1 text-sm text-slate-500">Practice the exam experience with scored, section-based mock tests.</p>
            </header>

            <section className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-blue-200">
              <div className="inline-flex rounded-lg bg-slate-100 p-3 text-lg text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-500">
                <FaClipboardCheck />
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-900">No mock exam has been published yet.</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">An administrator needs to publish an exam before you can begin. You can continue with your dashboard or study plan in the meantime.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  type="button" 
                  onClick={() => navigate("/dashboard")} 
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <FaArrowLeft className="text-[10px]" /> Dashboard
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate("/reviewers")} 
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                >
                  <FaBookOpen className="text-[10px]" /> Learning Materials
                </button>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (phase === "select") {
      return (
        <div className="min-h-screen bg-white px-6 py-8 text-slate-900">
          <div className="mx-auto max-w-7xl space-y-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 transition hover:text-blue-600"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Dashboard
            </button>

            <header className="border-b border-slate-200 pb-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Choose an ACET Mock Exam</h1>
              <p className="mt-1 text-sm text-slate-500">Browse all available admin-published exams, then open the preview screen for your selected test.</p>
            </header>

            {/* Compact grid — cards sit side by side instead of stacking full-width */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {availableExams.map((exam) => {
                const questionCount = getQuestionCount(exam);
                const durationMinutes = getDurationMinutes(exam);
                const unavailable = hasReachedAttemptLimit(
                  historyData,
                  exam
                );
                return (
                  <article
                    key={exam.id}
                    role="button"
                    tabIndex={unavailable ? -1 : 0}
                    aria-disabled={unavailable}
                    onClick={() => { if (!unavailable) selectExam(exam); }}
                    onKeyDown={(e) => {
                      if (unavailable) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectExam(exam);
                      }
                    }}
                    className={`group flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition duration-200 ${unavailable ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 active:scale-[0.99]"}`}
                  >
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 break-words text-base font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-blue-600">{exam.title}</h2>
                      {exam.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{exam.description}</p>}
                    </div>

                    <div className="flex items-stretch justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                      <MiniFact label="Sections" value={exam.sections?.length || 0} />
                      <span className="w-px shrink-0 bg-slate-200" />
                      <MiniFact label="Items" value={questionCount} />
                      <span className="w-px shrink-0 bg-slate-200" />
                      <MiniFact label="Time" value={durationMinutes ? `${durationMinutes}m` : "Set"} />
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </div>
      );
    }

    if (phase === "overview") {
      const questionCount = sections.reduce((total, section) => total + (section.questions?.length || 0), 0);
      const durationSeconds = sections.reduce((total, section) => total + Number(section.allottedTimeSec || 0), 0);
      const durationMinutes = durationSeconds > 0 ? Math.ceil(durationSeconds / 60) : null;
      const accessLabel = blueprint?.accessType === "unlimited" ? "Unlimited attempts" : blueprint?.accessType === "limited" ? `${Number(blueprint?.maxAttempts || 1)} attempts allowed` : "One attempt only";

      return (
        <div className="min-h-screen bg-white px-6 py-8 text-slate-900">
          <div className="mx-auto max-w-5xl space-y-4">
            <button 
              type="button" 
              onClick={() => setPhase("select")} 
              className="inline-flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-blue-600 transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Exam List
            </button>
            
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 p-5 md:p-6">
                <h1 className="break-words text-xl font-black text-slate-900 md:text-2xl">{blueprint?.title || "ACET Mock Exam"}</h1>
                {blueprint?.description && <p className="mt-2 text-sm leading-relaxed text-slate-500">{blueprint.description}</p>}
              </div>
              
              <div className="space-y-4 p-5 md:p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ExamFact icon={FaLayerGroup} label="Sections" value={sections.length} />
                  <ExamFact icon={FaClipboardCheck} label="Questions" value={questionCount} />
                  {durationMinutes !== null && <ExamFact icon={FaClock} label="Estimated time" value={`${durationMinutes} min`} />}
                  <ExamFact icon={FaClipboardCheck} label="Attempt access" value={accessLabel} />
                </div>
                
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-extrabold text-slate-900">Before you begin</h2>
                  <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-relaxed text-slate-500 list-disc list-inside">
                    <li>Each section has its own timer and begins after a short section overview.</li>
                    <li>You can move between questions within the current section before its time expires.</li>
                    <li>Your answers, answer changes, and time per question are recorded for scoring and diagnostics.</li>
                    <li>{blueprint?.accessType === "unlimited" ? "This is unlimited practice: leaving does not use an attempt, and you can restart anytime." : "Leaving this exam records an incomplete attempt and uses one of your available attempts."}</li>
                  </ul>
                </div>
                
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button 
                    type="button" 
                    onClick={() => setPhase("select")} 
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Choose Another Exam
                  </button>
                 <button 
  type="button" 
  onClick={beginAttempt} 
  className="inline-flex items-center gap-2 rounded-lg border border-[#003A6C] bg-[#003A6C] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:border-[#002A4C] hover:bg-[#002A4C]"
>
  <FaPlay className="text-[10px]" /> Start ACET Mock Exam
</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (phase === "history") {
      return (
        <div className={historyOnly ? "" : "min-h-screen bg-white px-6 py-8 text-slate-900"}>
          <div className={historyOnly ? "space-y-6" : "mx-auto max-w-7xl space-y-4"}>
            {!historyOnly && (
              <button 
                type="button" 
                onClick={() => setPhase(blueprint ? "overview" : "empty")} 
                className="inline-flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-blue-600 transition"
              >
                <FaArrowLeft className="text-[10px]" /> Back to Mock Exam
              </button>
            )}
            <EnhancedExamHistorySection 
              exams={filteredExams} 
              dark={false} 
              stats={stats}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              getTrend={getTrend}
            />
          </div>
        </div>
      );
    }

    if (phase === "error") {
      return (
        <div className="grid min-h-screen place-items-center bg-white px-6 py-8 text-slate-900">
          <div className="max-w-md rounded-xl border-l-4 border-rose-400 border-y border-r border-slate-200 bg-white p-6 shadow-sm" role="alert">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Unable to load exam</p>
            <h1 className="mt-2 text-lg font-black text-slate-900 leading-snug">Something went wrong while preparing the exam.</h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{error}</p>
            <button 
              onClick={() => navigate("/dashboard")} 
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    if (phase === "results") {
      return <ResultsView results={results} onBack={() => navigate("/dashboard")} />;
    }

    return (
      <>
      <ExamShell
        phase={phase}
        setPhase={updatePhase}
        sections={sections}
        activeSection={activeSection}
        activeQuestion={activeQuestion}
        currentSection={currentSection}
        currentQuestion={currentQuestion}
        response={response}
        responses={responses}
        progress={progress}
        serverTimeLeft={serverTimeLeft}
        onSaveResponse={saveResponse}
        onNext={next}
        onPrevious={previous}
        onJump={jump}
        onSyncTime={syncTimer}
        onTimeExpired={finishCurrentSection}
        onExit={() => setShowExitReminder(true)}
      />
      {showExitReminder && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="exit-exam-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">Leave exam?</p>
            <h2 id="exit-exam-title" className="mt-2 text-xl font-black text-slate-950">Your attempt will be marked incomplete.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">For one-time or limited exams, leaving now uses one attempt. No score, points, or leaderboard result will be saved. Unlimited practice exams can be restarted.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowExitReminder(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">Keep taking exam</button>
              <button type="button" onClick={exitExam} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700">Leave and mark incomplete</button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }


  function EnhancedExamHistorySection({ 
    exams, 
    dark = false, 
    stats,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getTrend 
  }) {
    return (
      <section id="exams" className="space-y-4">
        <header className={dark ? "border-b border-blue-900/40 pb-3" : "border-b border-slate-200 pb-3"}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className={`text-xl font-black tracking-tight md:text-2xl ${dark ? "text-white" : "text-slate-950"}`}>
                Exam Records
              </h2>
              <p className={`mt-0.5 text-xs font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                Review completed exam attempts and scores.
              </p>
            </div>
          </div>
        </header>

        {/* Search, compact stats, and status filter — one toolbar row */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="relative flex-1 lg:min-w-[220px]">
            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${dark ? "text-white/20" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Search exams by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-full w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none focus:ring-2 ${
                dark 
                  ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500 focus:ring-blue-500/20" 
                  : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:shrink-0 lg:gap-2">
            <StatChip dark={dark} value={stats.total} label="Total" />
            <StatChip dark={dark} value={stats.passedCount} label="Passed" />
            <StatChip dark={dark} value={stats.failedCount} label="Failed" />
            <StatChip dark={dark} value={stats.pendingCount} label="Pending" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 lg:shrink-0 ${
              dark 
                ? "bg-white/5 border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/20" 
                : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20"
            }`}
          >
            <option value="all">All Status</option>
            <option value="pending review">Pending Review</option>
            <option value="analyzed">Analyzed</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>

        {/* Exam Table */}
        <div className={`overflow-hidden rounded-2xl border shadow-xl backdrop-blur-xl ${
          dark ? "border-blue-900/60 bg-[#001c38]/90" : "border-slate-200 bg-white"
        }`}>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm">
            <thead className={`sticky top-0 text-xs font-black uppercase tracking-wider shadow-sm z-10 transition-colors ${
  dark ? "bg-gradient-to-r from-blue-800 to-blue-900 text-blue-100" : "bg-[#003A6C] text-white hover:bg-[#002A4C]"
}`}>
                <tr>
                  <th className="px-6 py-4">Exam Name</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Points</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Trend</th>
                  <th className="px-6 py-4">Result</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-blue-950/40" : "divide-y divide-slate-100"}>
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                      No exams match your search criteria.
                    </td>
                  </tr>
                ) : (
                  exams.map((exam, index, arr) => {
                    const trend = getTrend(exam, index, arr);
                    const isPending = exam.status === "Pending Review";
                    
                    return (
                      <tr 
                        key={`${exam.name}-${exam.takenAt}`} 
                        className={`transition-colors ${
                          dark ? "hover:bg-blue-900/20" : "hover:bg-slate-50/80"
                        } ${isPending ? (dark ? "bg-amber-950/20 border-l-4 border-amber-500" : "bg-amber-50/50 border-l-4 border-amber-500") : ""}`}
                      >
                        <td className={`px-6 py-4 font-bold ${dark ? "text-white" : "text-slate-900"}`}>
                          {exam.name}
                         <span className={`block text-[10px] font-semibold mt-1 ${dark ? "text-slate-400" : "text-slate-400"}`}>
  {exam.takenAt ? formatPHTimestamp(new Date(exam.takenAt)) : "—"}
</span>
                        </td>
                        
                        <td className={`px-6 py-4 font-mono text-sm font-semibold tabular-nums ${dark ? "text-slate-200" : "text-slate-700"}`}>
                          {exam.status === "Pending Review" ? "—" : `${exam.score}%`}
                        </td>
                        
                        <td className={`px-6 py-4 font-semibold ${dark ? "text-white/70" : "text-slate-700"}`}>
                          {formatAttemptDuration(exam.durationSeconds)}
                        </td>
                        
                        <td className={`px-6 py-4 font-semibold ${dark ? "text-white/70" : "text-slate-700"}`}>
                          {exam.pointsEarned || "—"}
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            isPending
                              ? "border-amber-700/30 bg-amber-500/5 text-amber-500/90"
                              : "border-emerald-700/30 bg-emerald-500/5 text-emerald-500/90"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isPending ? "bg-amber-500/70" : "bg-emerald-500/70"}`} />
                            {exam.status || "Analyzed"}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          {trend === 'up' && <FaArrowUp className="text-xs text-emerald-500/80" title="Improving" />}
                          {trend === 'down' && <FaArrowDown className="text-xs text-rose-500/80" title="Declining" />}
                          {trend === 'same' && <FaMinus className="text-xs text-slate-400" title="Stable" />}
                          {!trend && <span className="text-xs text-white/20">—</span>}
                        </td>
                        
                        <td className="px-6 py-4">
                          {!isPending && exam.passed !== undefined && (
                            <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              exam.passed
                                ? dark ? "border-emerald-700/30 bg-emerald-500/5 text-emerald-500/90" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : dark ? "border-rose-700/30 bg-rose-500/5 text-rose-500/90" : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}>
                              {exam.passed ? "Pass" : "Fail"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Summary Row */}
        {exams.length > 0 && (
          <div className={`flex items-center justify-between text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
            <span>Showing {exams.length} exam{exams.length > 1 ? 's' : ''}</span>
<span>Last updated: {formatPHTimestamp()}</span>          </div>
        )}
      </section>
    );
  }

  function StatChip({ dark, value, label }) {
    return (
      <div className={`rounded-xl border px-3.5 py-2 leading-tight ${dark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
        <p className={`text-sm font-black ${dark ? "text-white" : "text-slate-900"}`}>{value}</p>
        <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-wider ${dark ? "text-white/40" : "text-slate-400"}`}>{label}</p>
      </div>
    );
  }

  function MiniFact({ label, value }) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-xs font-black text-slate-700">{value}</p>
      </div>
    );
  }

  function ExamFact({ icon: Icon, label, value }) {
    return (
      <div className="group rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-200">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-slate-100 p-2 text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-600"><Icon /></span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
          </div>
        </div>
      </div>
    );
  }

  function getQuestionCount(exam) {
    return (exam.sections || []).reduce((total, section) => total + (section.questions?.length || 0), 0);
  }

function getDurationMinutes(exam) {
  if (Number(exam.duration) > 0) return Number(exam.duration);
  const durationSeconds = (exam.sections || []).reduce((total, section) => total + Number(section.allottedTimeSec || 0), 0);
  return durationSeconds > 0 ? Math.ceil(durationSeconds / 60) : null;
}

function formatAttemptDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  if (!totalSeconds) return "—";
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (!minutes) return `${remainingSeconds} sec`;
  return remainingSeconds ? `${minutes} min ${remainingSeconds} sec` : `${minutes} min`;
}

  function hydrateResponses(sections, saved = []) {
    return sections.map((section, sectionIndex) => section.questions.map((_, questionIndex) => saved?.[sectionIndex]?.[questionIndex] ?? null));
  }
