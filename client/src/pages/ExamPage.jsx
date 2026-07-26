import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, FaBookOpen, FaClock, FaClipboardCheck, FaLayerGroup, 
  FaPlay, FaArrowUp, FaArrowDown, FaMinus, FaSearch
} from "react-icons/fa";
import { scoreEssay } from "../api/aiApi";
import { advanceExamSection, completeExamSession, createExamSession, getActiveExamSession, saveExamProgress, startExamSection, syncExamSession } from "../api/examSessionApi";
import ExamShell from "../features/exam/ExamShell";
import ResultsView from "../features/exam/ResultsView";
import {
  getCurrentUser,
  getExamBlueprints,
  getStudentDashboard,
  saveExamAttemptForStudent,
  scoreBlueprintAttempt,
  updateLatestEssayReview
} from "../services/storage";

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

export default function ExamPage({ historyOnly = false }) {
  const navigate = useNavigate();
  const [availableExams, setAvailableExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [responses, setResponses] = useState([]);
  const [activeSection, setActiveSection] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [phase, setPhase] = useState(historyOnly ? "history" : "loading");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [questionMetrics, setQuestionMetrics] = useState([]);
  const [historyData, setHistoryData] = useState({ exams: [] });
  const [serverTimeLeft, setServerTimeLeft] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
        const dashboard = getStudentDashboard(user?.email);
        
        // Process exams with additional data
        const processedExams = (dashboard.exams || []).map((exam, index, arr) => {
          const prevExam = arr[index + 1];
          return {
            ...exam,
            status: exam.status || (exam.hasPendingEssays ? "Pending Review" : "Analyzed"),
            duration: exam.duration || Math.floor(Math.random() * 30) + 15, // Mock duration in minutes
            pointsEarned: exam.pointsEarned || Math.floor(Math.random() * 100) + 50,
            passingScore: Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75,
            passed: typeof exam.passed === "boolean" ? exam.passed : exam.score >= (Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75),
            previousScore: prevExam?.score || null
          };
        });
        
        setHistoryData({ exams: processedExams });

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
                        at: new Date().toISOString(),
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
      const user = getCurrentUser();
      const rawResults = scoreBlueprintAttempt(blueprint, responses, { questionMetrics: finalQuestionMetrics });
      const passingScore = Number.isFinite(Number(blueprint.passingScore)) ? Number(blueprint.passingScore) : 75;
      const scoredResults = { ...rawResults, passingScore, passed: rawResults.finalPct >= passingScore };
      const durationSeconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
      const nextDashboard = saveExamAttemptForStudent(user, blueprint, responses, scoredResults, { durationSeconds, questionMetrics: finalQuestionMetrics });
      const essays = nextDashboard.attempts?.[0]?.essayResponses || [];
      if (essays.length) {
        await Promise.all(essays.map(async (essay) => {
          try {
            const scored = await scoreEssay({ response: essay.response, rubric: essay.rubric, points: blueprint.sections[essay.sectionIndex].questions[essay.questionIndex].points || 1 });
            if (Number.isFinite(Number(scored.score))) {
              updateLatestEssayReview(user.email, essay.id, { aiScore: Number(scored.score), status: "ai_graded" });
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
        return {
          ...exam,
          duration: Math.floor(Math.random() * 30) + 15,
          pointsEarned: Math.floor(Math.random() * 100) + 50,
            passingScore: Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75,
            passed: typeof exam.passed === "boolean" ? exam.passed : exam.score >= (Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75),
          previousScore: prevExam?.score || null
        };
      });
      
      setHistoryData({ exams: processedExams });
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
    await flushProgress();
    const section = sections[activeSection];
    if (!section) return;

    if (activeQuestion < section.questions.length - 1) {
      const nextQuestion = activeQuestion + 1;
      positionRef.current = { section: activeSection, question: nextQuestion };
      setActiveQuestion(nextQuestion);
      queueProgressSave();
      return;
    }
    finishCurrentSection();
  }, [activeQuestion, activeSection, finishCurrentSection, flushProgress, recordActiveQuestionTime, sections]);

  const previous = useCallback(async () => {
    recordActiveQuestionTime();
    await flushProgress();
    const nextQuestion = Math.max(0, activeQuestion - 1);
    positionRef.current = { section: activeSection, question: nextQuestion };
    setActiveQuestion(nextQuestion);
    queueProgressSave();
  }, [activeQuestion, activeSection, flushProgress, recordActiveQuestionTime]);

  const jump = useCallback(async (questionIndex) => {
    recordActiveQuestionTime();
    await flushProgress();
    positionRef.current = { section: activeSection, question: questionIndex };
    setActiveQuestion(questionIndex);
    queueProgressSave();
  }, [activeSection, flushProgress, recordActiveQuestionTime]);

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

  function selectExam(nextBlueprint) {
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

  // --- RENDERS ---

  if ((phase === "loading" || phase === "submitting") && !historyOnly) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-gradient-to-b from-[#001529] via-[#002147] to-[#000d1a] px-6 py-10 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        
        <div className="relative max-w-xl rounded-2xl border border-blue-800/40 bg-[#00284e]/40 p-8 text-center backdrop-blur-xl shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
            {phase === "loading" ? "Loading Exam" : "Submitting Attempt"}
          </p>
          <h1 className="mt-3 text-3xl font-black text-white leading-snug">
            {phase === "loading" ? "Preparing your academic mock exam..." : "Calculating scores & diagnostics..."}
          </h1>
          <div className="mt-6 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-400" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-[#001529] via-[#002147] to-[#000d1a] px-6 py-10 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        
        <div className="relative mx-auto max-w-7xl space-y-8">
          <header className="border-b border-blue-900/40 pb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Mock Exams</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white md:text-5xl">ACET Mock Exams</h1>
            <p className="mt-2 text-sm text-slate-300">Practice the exam experience with scored, section-based mock tests.</p>
          </header>

          <section className="relative overflow-hidden rounded-2xl border-l-4 border-blue-500 border-y border-r border-blue-900/40 bg-[#00284e]/40 p-8 backdrop-blur-xl shadow-xl">
            <div className="inline-flex rounded-xl bg-blue-900/40 p-4 text-2xl text-blue-300 border border-blue-800/50">
              <FaClipboardCheck />
            </div>
            <h2 className="mt-5 text-2xl font-black text-white">No mock exam has been published yet.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">An administrator needs to publish an exam before you can begin. You can continue with your dashboard or study plan in the meantime.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button 
                type="button" 
                onClick={() => navigate("/dashboard")} 
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-500 active:scale-[0.98]"
              >
                <FaArrowLeft className="text-[10px]" /> Dashboard
              </button>
              <button 
                type="button" 
                onClick={() => navigate("/reviewers")} 
                className="inline-flex items-center gap-2 rounded-xl border border-blue-900 bg-[#001224] px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-blue-950"
              >
                <FaBookOpen className="text-[10px]" /> Study Plan
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "select") {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-[#001529] via-[#002147] to-[#000d1a] px-6 py-10 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        
        <div className="relative mx-auto max-w-7xl space-y-6">
          <button 
            type="button" 
            onClick={() => navigate("/dashboard")} 
            className="inline-flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 transition"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Dashboard
          </button>
          
          <header className="border-b border-blue-900/40 pb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Mock Exam Library</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white md:text-5xl">Choose an ACET Mock Exam</h1>
            <p className="mt-2 text-sm text-slate-300">Browse all available admin-published exams, then open the preview screen for your selected test.</p>
          </header>

          <section className="space-y-4">
            {availableExams.map((exam) => {
              const questionCount = getQuestionCount(exam);
              const durationMinutes = getDurationMinutes(exam);
              return (
                <article 
                  key={exam.id} 
                  className="group relative overflow-hidden rounded-2xl border border-blue-900/50 bg-[#001e38]/70 p-6 shadow-md transition duration-300 hover:border-blue-600/50 hover:bg-[#001e38]/90 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">Published Mock Exam</p>
                      {(exam.sections || []).slice(0, 4).map((section) => (
                        <span key={section.subjectTitle} className="rounded-full bg-blue-950/60 border border-blue-900/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">
                          {section.subjectTitle}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-3 break-words text-xl font-extrabold text-white group-hover:text-blue-300 transition-colors leading-snug">{exam.title}</h2>
                    {exam.description && <p className="mt-2 text-sm leading-relaxed text-slate-300 line-clamp-2">{exam.description}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 lg:shrink-0">
                    <div className="grid grid-cols-3 gap-2 w-full sm:w-72">
                      <MiniFact label="Sections" value={exam.sections?.length || 0} />
                      <MiniFact label="Items" value={questionCount} />
                      <MiniFact label="Time" value={durationMinutes ? `${durationMinutes}m` : "Set"} />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => selectExam(exam)} 
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-500 active:scale-[0.98]"
                    >
                      <FaClipboardCheck /> View Details
                    </button>
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

    return (
      <div className="relative min-h-screen bg-gradient-to-b from-[#001529] via-[#002147] to-[#000d1a] px-6 py-10 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        
        <div className="relative mx-auto max-w-5xl space-y-6">
          <button 
            type="button" 
            onClick={() => setPhase("select")} 
            className="inline-flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 transition"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Exam List
          </button>
          
          <section className="overflow-hidden rounded-2xl border border-blue-900/60 bg-[#001c38]/90 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-blue-900/50 bg-[#00254b]/50 p-6 md:p-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Published Mock Exam</p>
              <h1 className="mt-2 break-words text-3xl font-black text-white md:text-4xl">{blueprint?.title || "ACET Mock Exam"}</h1>
              {blueprint?.description && <p className="mt-3 text-sm leading-relaxed text-slate-300">{blueprint.description}</p>}
            </div>
            
            <div className="space-y-6 p-6 md:p-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ExamFact icon={FaLayerGroup} label="Sections" value={sections.length} />
                <ExamFact icon={FaClipboardCheck} label="Questions" value={questionCount} />
                {durationMinutes !== null && <ExamFact icon={FaClock} label="Estimated time" value={`${durationMinutes} min`} />}
              </div>
              
              <div className="rounded-xl border border-blue-900/60 bg-[#001224]/80 p-5">
                <h2 className="text-lg font-extrabold text-white">Before you begin</h2>
                <ul className="mt-3 space-y-2.5 text-xs font-semibold leading-relaxed text-slate-300 list-disc list-inside">
                  <li>Each section has its own timer and begins after a short section overview.</li>
                  <li>You can move between questions within the current section before its time expires.</li>
                  <li>Your answers, answer changes, and time per question are recorded for scoring and diagnostics.</li>
                  <li>Leaving the exam before submission will end this session without saving a scored attempt.</li>
                </ul>
              </div>
              
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button 
                  type="button" 
                  onClick={() => setPhase("select")} 
                  className="rounded-xl border border-blue-900 bg-[#001224] px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-blue-950"
                >
                  Choose Another Exam
                </button>
                <button 
                  type="button" 
                  onClick={beginAttempt} 
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-500 active:scale-[0.98]"
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
      <div className={historyOnly ? "" : "relative min-h-screen bg-gradient-to-b from-[#001529] via-[#002147] to-[#000d1a] px-6 py-10 text-white overflow-hidden"}>
        {!historyOnly && <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />}
        
        <div className={historyOnly ? "space-y-6" : "relative mx-auto max-w-7xl space-y-6"}>
          {!historyOnly && (
            <button 
              type="button" 
              onClick={() => setPhase(blueprint ? "overview" : "empty")} 
              className="inline-flex items-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to Mock Exam
            </button>
          )}
          <EnhancedExamHistorySection 
            exams={filteredExams} 
            dark={!historyOnly} 
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
      <div className="relative grid min-h-screen place-items-center bg-gradient-to-b from-[#001529] via-[#002147] to-[#000d1a] px-6 py-10 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        
        <div className="relative max-w-xl rounded-2xl border-l-4 border-rose-500 border-y border-r border-blue-900/40 bg-[#00284e]/40 p-8 backdrop-blur-xl shadow-2xl" role="alert">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Unable to load exam</p>
          <h1 className="mt-3 text-3xl font-black text-white leading-snug">Something went wrong while preparing the exam.</h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">{error}</p>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-500 active:scale-[0.98]"
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
      onExit={() => navigate("/dashboard")}
    />
  );
}

// ============================================
// ENHANCED EXAM HISTORY SECTION
// ============================================

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
    <section id="exams" className="space-y-6">
      <header className={dark ? "border-b border-blue-900/40 pb-6" : "border-b border-slate-200 pb-6"}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className={`text-3xl font-black tracking-tight md:text-4xl ${dark ? "text-white" : "text-slate-950"}`}>
              Exam Records
            </h2>
            <p className={`mt-1 text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
              Review completed exam attempts and scores.
            </p>
          </div>
        </div>
      </header>

      {/* Search, compact stats, and status filter — one toolbar row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
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
            <thead className={`sticky top-0 text-xs font-black uppercase tracking-wider shadow-sm z-10 ${
              dark ? "bg-gradient-to-r from-blue-800 to-blue-900 text-blue-100" : "bg-blue-600 text-white"
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
                          {exam.takenAt}
                        </span>
                      </td>
                      
                      <td className={`px-6 py-4 font-mono text-sm font-semibold tabular-nums ${dark ? "text-slate-200" : "text-slate-700"}`}>
                        {exam.status === "Pending Review" ? "—" : `${exam.score}%`}
                      </td>
                      
                      <td className={`px-6 py-4 font-semibold ${dark ? "text-white/70" : "text-slate-700"}`}>
                        {exam.duration || "—"} min
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
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
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
    <div className="rounded-xl border border-blue-900/60 bg-[#001224] p-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ExamFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-blue-900/60 bg-[#001c38] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-blue-950 border border-blue-900/40 p-2.5 text-blue-400"><Icon /></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-0.5 text-lg font-black text-white">{value}</p>
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

function hydrateResponses(sections, saved = []) {
  return sections.map((section, sectionIndex) => section.questions.map((_, questionIndex) => saved?.[sectionIndex]?.[questionIndex] ?? null));
}