import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaClock, FaTimes } from "react-icons/fa";
import QuestionWorkspace from "./QuestionWorkspace";

function formatTime(total) {
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function ExamShell(props) {
  const {
    phase,
    setPhase,
    sections,
    activeSection,
    activeQuestion,
    currentSection,
    currentQuestion,
    response,
    responses,
    progress,
    onSaveResponse,
    onNext,
    onPrevious,
    onJump,
    onExit,
    serverTimeLeft,
    onSyncTime,
    onTimeExpired
  } = props;

  const [timeLeft, setTimeLeft] = useState(serverTimeLeft ?? currentSection.allottedTimeSec);
  const anchorRef = useRef({ remaining: serverTimeLeft ?? currentSection.allottedTimeSec, receivedAt: Date.now() });
  const expiredRef = useRef(false);

  useEffect(() => {
    const remaining = serverTimeLeft ?? currentSection.allottedTimeSec;
    anchorRef.current = { remaining, receivedAt: Date.now() };
    expiredRef.current = false;
    setTimeLeft(remaining);
  }, [currentSection, serverTimeLeft]);

  useEffect(() => {
    if (phase !== "testing") return undefined;
    const timer = setInterval(() => {
      const { remaining, receivedAt } = anchorRef.current;
      setTimeLeft(Math.max(0, remaining - Math.floor((Date.now() - receivedAt) / 1000)));
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "testing" && timeLeft === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onTimeExpired();
    }
  }, [phase, timeLeft, onTimeExpired]);

  useEffect(() => {
    if (phase !== "testing") return undefined;
    const sync = async () => {
      const session = await onSyncTime();
      if (session && Number.isFinite(session.remainingSeconds)) {
        anchorRef.current = { remaining: session.remainingSeconds, receivedAt: Date.now() };
        setTimeLeft(session.remainingSeconds);
      }
    };
    sync();
    const interval = setInterval(sync, 10000);
    return () => clearInterval(interval);
  }, [onSyncTime, phase]);

  if (phase === "intermission") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="glass-card max-w-xl p-8 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">{activeSection === 0 ? "Prepare to Begin" : "Subject Complete"}</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">{currentSection.subjectTitle}</h1>
          <p className="mt-2 text-sm text-slate-500">{Math.floor(currentSection.allottedTimeSec / 60)} minutes allotted</p>
          <button onClick={() => setPhase("testing")} className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-blue-800">
            Start Section
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((section, index) => (
            <span
              key={section.subjectTitle}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                index === activeSection ? "border-primary bg-primary text-white" : index < activeSection ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {section.subjectTitle}
            </span>
          ))}
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black ${timeLeft < 60 ? "border-red-500 bg-red-500 text-white" : "border-red-100 bg-red-50 text-red-500"}`}>
          <FaClock /> {formatTime(timeLeft)}
        </div>
        <button onClick={onExit} className="icon-button" aria-label="Exit exam">
          <FaTimes />
        </button>
      </header>

      <main className="grid flex-1 gap-5 p-5 lg:grid-cols-[1fr_18rem]">
        <QuestionWorkspace
          section={currentSection}
          question={currentQuestion}
          questionIndex={activeQuestion}
          response={response}
          onSaveResponse={onSaveResponse}
        />

        <aside className="glass-card h-max p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Question Navigator</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {progress.answered} of {progress.total} answered
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {currentSection.questions.map((question, index) => {
              const value = responses[activeSection][index];
              const answered = Array.isArray(value) ? value.length > 0 : value !== null && value !== "";
              return (
                <button
                  key={`${question.stem}-${index}`}
                  onClick={() => onJump(index)}
                  className={`h-10 rounded-xl border text-xs font-bold ${
                    index === activeQuestion ? "border-primary bg-primary text-white" : answered ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={onPrevious} disabled={activeQuestion === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600 disabled:opacity-40">
              <FaArrowLeft /> Prev
            </button>
            <button onClick={onNext} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-bold text-white hover:bg-blue-800">
              Next <FaArrowRight />
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
