import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  FaPlus, FaSave, FaTrash, FaUnlock, FaLock, FaUsers, 
  FaEdit, FaEye, FaEyeSlash, FaTimes, FaEllipsisV,
  FaChevronLeft, FaChevronRight, FaFileImport, FaDownload,
  FaCheckCircle, FaExclamationTriangle
} from "react-icons/fa";
import AdminSidebar from "../components/AdminSidebar";
import TinyMCEEditor from "../components/TinyMCEEditor";
import {
  getExamBlueprints,
  getReviewerBlueprints,
  hydrateAllFromServer,
  updateReviewerBlueprint,
  deleteReviewerBlueprint,
  publishExamBlueprint,
  publishReviewerBlueprint,
  deleteExamBlueprint,
  toggleExamVisibility,
  getExamBlueprintById,
  updateExamBlueprint
} from "../services/storage";

// CONFIRMATION DIALOG COMPONENT (Built-in)

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", cancelText = "Cancel", isDanger = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 border-b ${isDanger ? 'border-rose-100 bg-rose-50' : 'border-blue-100 bg-blue-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
              {isDanger ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


// ACTION DROPDOWN COMPONENT

function ExamActionsDropdown({ blueprint, onEdit, onToggleVisibility, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2.5 hover:bg-slate-100 rounded-lg transition-all duration-200"
        aria-label="More actions"
      >
        <FaEllipsisV className="w-5 h-5 text-slate-500" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1.5">
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <FaEdit className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-slate-700">Edit Exam</span>
            </button>
            
            <button
              onClick={() => {
                onToggleVisibility();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              {blueprint.isHidden ? (
                <>
                  <FaEye className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-slate-700">Show Exam</span>
                </>
              ) : (
                <>
                  <FaEyeSlash className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Hide Exam</span>
                </>
              )}
            </button>
            
            <hr className="my-1 border-slate-100" />
            
            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-rose-50 transition-colors"
            >
              <FaTrash className="w-4 h-4 text-rose-500" />
              <span className="font-medium text-rose-600">Delete Exam</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewerActionsDropdown({ reviewer, onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2.5 hover:bg-slate-100 rounded-lg transition-all duration-200"
        aria-label="More actions"
      >
        <FaEllipsisV className="w-5 h-5 text-slate-500" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1.5">
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <FaEdit className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-slate-700">Edit Reviewer</span>
            </button>
            
            <hr className="my-1 border-slate-100" />
            
            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-rose-50 transition-colors"
            >
              <FaTrash className="w-4 h-4 text-rose-500" />
              <span className="font-medium text-rose-600">Delete Reviewer</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// MAIN COMPONENT

const emptyQuestion = {
  type: "multiple_choice",
  stem: "",
  choiceOpts: ["", "", "", ""],
  answerIdx: 0,
  correctAnswers: [],
  correctText: "",
  rubric: "",
  diagnosticSubcategory: "",
  diagnosticSkillTag: "",
  points: 1
};

const initialExamForm = {
  title: "",
  description: "",
  passingScore: 75,
  accessType: "unlimited",
  maxAttempts: 1,
  sections: [
    {
      subjectTitle: "",
      allottedTimeSec: 600,
      questions: [{ ...emptyQuestion }]
    }
  ]
};

const initialReviewerForm = {
  title: "",
  subjectCategory: "",
  modules: [
    {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      estimatedMinutes: 15,
      content: "",
      videoUrl: ""
    }
  ]
};

// Helper functions
function stripHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

function usesOptions(type) {
  return type === "multiple_choice" || type === "checkboxes";
}

function getOptionLabel(index) {
  return String.fromCharCode(65 + index); // A, B, C, D, ...
}


// CSV BULK IMPORT HELPERS
// Column layout expected in the uploaded CSV (header row required, order does not matter):
// subject_category, time_minutes, question_type, question_text,
// option_a, option_b, option_c, option_d, option_e, option_f,
// correct_answer, correct_text, rubric, points,
// diagnostic_subcategory, diagnostic_skill_tag
const CSV_TEMPLATE_HEADERS = [
  "subject_category", "time_minutes", "question_type", "question_text", "question_image_url",
  "option_a", "option_b", "option_c", "option_d", "option_e", "option_f",
  "correct_answer", "correct_text", "rubric", "points",
  "diagnostic_subcategory", "diagnostic_skill_tag"
];

const CSV_TEMPLATE_ROWS = [
  ["Mathematics", "15", "multiple_choice", "What is 2 + 2?", "", "2", "3", "4", "5", "", "", "C", "", "", "1", "Arithmetic", "Addition"],
  ["Mathematics", "15", "multiple_choice", "Based on the graph below, what is the slope of the line?", "https://example.com/images/slope-graph.png", "1", "2", "3", "4", "", "", "B", "", "", "1", "Algebra", "Graph Reading"],
  ["Mathematics", "15", "checkboxes", "Which of the following are prime numbers?", "", "2", "3", "4", "5", "", "", "A;B", "", "", "1", "Number Theory", "Primes"],
  ["English", "10", "short_answer", "What is the past tense of 'go'?", "", "", "", "", "", "", "", "", "went", "", "1", "Grammar", "Verb Tenses"],
  ["English", "10", "paragraph", "Explain the theme of the poem.", "", "", "", "", "", "", "", "", "", "Look for discussion of loss and renewal.", "2", "Literature", "Theme Analysis"]
];

function csvEscapeField(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsvTemplateContent() {
  const lines = [CSV_TEMPLATE_HEADERS.join(",")];
  CSV_TEMPLATE_ROWS.forEach((row) => lines.push(row.map(csvEscapeField).join(",")));
  return lines.join("\n");
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes ("") and embedded commas/newlines.
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const endField = () => { row.push(field); field = ""; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
      continue;
    }

    if (char === '"') { inQuotes = true; }
    else if (char === ",") { endField(); }
    else if (char === "\n") { endRow(); }
    else { field += char; }
  }
  if (field.length > 0 || row.length > 0) endRow();

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function csvRowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => { record[header] = (cells[index] ?? "").trim(); });
    return record;
  });
}

function csvEscapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isLikelyImageUrl(url) {
  return /^https?:\/\/\S+$/i.test(String(url || "").trim());
}

function buildStemHtml(questionText, imageUrl) {
  const parts = [];
  if (questionText) parts.push(`<p>${csvEscapeHtml(questionText)}</p>`);
  const trimmedUrl = String(imageUrl || "").trim();
  if (trimmedUrl && isLikelyImageUrl(trimmedUrl)) {
    parts.push(`<p><img src="${trimmedUrl}" alt="Question image" style="max-width:100%;height:auto;" /></p>`);
  }
  return parts.join("");
}

function csvLetterToIndex(letter) {
  const code = String(letter || "").trim().toUpperCase().charCodeAt(0);
  return code >= 65 && code <= 90 ? code - 65 : -1;
}

const CSV_QUESTION_TYPES = ["multiple_choice", "checkboxes", "short_answer", "paragraph"];
const CSV_OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"];

function buildQuestionFromCsvRecord(record) {
  const rawType = String(record.question_type || "multiple_choice").trim().toLowerCase().replace(/\s+/g, "_");
  const type = CSV_QUESTION_TYPES.includes(rawType) ? rawType : "multiple_choice";

  let choiceOpts = CSV_OPTION_KEYS.map((key) => record[key] || "");
  while (choiceOpts.length > 2 && choiceOpts[choiceOpts.length - 1].trim() === "") choiceOpts.pop();
  if (choiceOpts.length < 2) choiceOpts = ["", ""];

  const question = {
    type,
    stem: buildStemHtml(record.question_text, record.question_image_url),
    choiceOpts,
    answerIdx: 0,
    correctAnswers: [],
    correctText: record.correct_text || "",
    rubric: record.rubric || "",
    diagnosticSubcategory: record.diagnostic_subcategory || "",
    diagnosticSkillTag: record.diagnostic_skill_tag || "",
    points: Number(record.points) > 0 ? Number(record.points) : 1
  };

  if (type === "multiple_choice") {
    const idx = csvLetterToIndex(record.correct_answer);
    question.answerIdx = idx >= 0 && idx < choiceOpts.length ? idx : 0;
  } else if (type === "checkboxes") {
    question.correctAnswers = String(record.correct_answer || "")
      .split(/[;,|]/)
      .map((part) => csvLetterToIndex(part))
      .filter((idx) => idx >= 0 && idx < choiceOpts.length)
      .sort((a, b) => a - b);
  }

  return question;
}

// Groups CSV rows into { subjectTitle, allottedTimeSec, questions[] } sections, collecting row-level errors.
function buildSectionsFromCsvRecords(records) {
  const errors = [];
  const sectionsByKey = new Map();

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +1 for header row, +1 for 1-based row count
    const subjectTitle = String(record.subject_category || "").trim();
    const questionText = String(record.question_text || "").trim();

    if (!subjectTitle) { errors.push(`Row ${rowNumber}: missing subject_category`); return; }
    if (!questionText) { errors.push(`Row ${rowNumber}: missing question_text`); return; }

    const imageUrl = String(record.question_image_url || "").trim();
    if (imageUrl && !isLikelyImageUrl(imageUrl)) {
      errors.push(`Row ${rowNumber}: question_image_url doesn't look like a valid link, image was skipped`);
    }

    const key = subjectTitle.toLowerCase();
    if (!sectionsByKey.has(key)) {
      const minutes = Number(record.time_minutes);
      sectionsByKey.set(key, {
        subjectTitle,
        allottedTimeSec: minutes > 0 ? minutes * 60 : 600,
        questions: []
      });
    }
    sectionsByKey.get(key).questions.push(buildQuestionFromCsvRecord(record));
  });

  return { importedSections: Array.from(sectionsByKey.values()), errors };
}

export default function CreateExamPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "reviewer" ? "reviewer" : "exam";
  const [mode, setMode] = useState(initialMode);
  const [examForm, setExamForm] = useState(initialExamForm);
  const [reviewerForm, setReviewerForm] = useState(initialReviewerForm);
  const [blueprints, setBlueprints] = useState(() => getExamBlueprints());
  const [reviewers, setReviewers] = useState(() => getReviewerBlueprints());
  const [message, setMessage] = useState("");
  const [editingExamId, setEditingExamId] = useState(null);
  const [editingReviewerId, setEditingReviewerId] = useState(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Delete",
    isDanger: true
  });

  const [csvImportResult, setCsvImportResult] = useState(null); // { importedCount, errors: [] } | null

  const totalQuestions = useMemo(
    () => examForm.sections.reduce((sum, section) => sum + section.questions.length, 0),
    [examForm.sections]
  );

  useEffect(() => {
    const routeMode = searchParams.get("mode") === "reviewer" ? "reviewer" : "exam";
    setMode(routeMode);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    hydrateAllFromServer().catch(() => false).then(() => {
      if (active) setReviewers(getReviewerBlueprints());
    });
    return () => { active = false; };
  }, []);

  // Helper function to show confirmation
  function showConfirm({ title, message, onConfirm, confirmText = "Delete", isDanger = true }) {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      isDanger
    });
  }

  function loadExamForEdit(examId) {
    const exam = getExamBlueprintById(examId);
    if (exam) {
      setEditingExamId(examId);
      setExamForm({
        title: exam.title || "",
        description: exam.description || "",
        passingScore: Number.isFinite(Number(exam.passingScore)) ? Number(exam.passingScore) : 75,
        accessType: exam.accessType || "unlimited",
        maxAttempts: exam.maxAttempts || 1,
        sections: exam.sections || [{ ...initialExamForm.sections[0], questions: [{ ...emptyQuestion }] }]
      });
      setMessage(`Editing: "${exam.title}"`);
    }
  }

  function cancelEditing() {
    setEditingExamId(null);
    setEditingReviewerId(null);
    setExamForm(initialExamForm);
    setMessage("");
  }

  function loadReviewerForEdit(reviewerId) {
    const reviewer = reviewers.find((item) => item.id === reviewerId);
    if (!reviewer) return;
    setEditingReviewerId(reviewerId);
    setReviewerForm({ 
      title: reviewer.title || "", 
      subjectCategory: reviewer.subjectCategory || "", 
      modules: (reviewer.modules || []).map((module) => ({ 
        ...module, 
        description: module.description || "", 
        estimatedMinutes: Number(module.estimatedMinutes) || 15 
      })) 
    });
    setMessage(`Editing: "${reviewer.title}"`);
  }

  function handleDeleteReviewer(reviewerId) {
    const reviewer = reviewers.find((item) => item.id === reviewerId);
    showConfirm({ 
      title: "Delete Reviewer", 
      message: `Delete "${reviewer?.title || "this reviewer"}"?`, 
      onConfirm: async () => { 
        try {
          await deleteReviewerBlueprint(reviewerId);
          setReviewers(getReviewerBlueprints());
          setMessage("Reviewer deleted successfully.");
        } catch (error) {
          setMessage(error.response?.data?.error || "Reviewer could not be deleted.");
        }
      } 
    });
  }

  function handleDeleteExam(examId) {
    const exam = blueprints.find(b => b.id === examId);
    showConfirm({
      title: "Delete Exam",
      message: `Delete "${exam?.title || 'this exam'}"?\n\nThis action cannot be undone.\nAll student attempts and data for this exam will also be removed.`,
      onConfirm: async () => {
        try { await deleteExamBlueprint(examId); setBlueprints(getExamBlueprints()); setMessage("Exam deleted successfully."); }
        catch (error) { setMessage(error.response?.data?.error || "Exam could not be deleted."); }
      }
    });
  }

  async function handleToggleVisibility(examId) {
    try {
      const updated = await toggleExamVisibility(examId);
      setBlueprints(getExamBlueprints());
      setMessage(updated.isHidden ? "Exam hidden from students." : "Exam is now visible to students.");
    } catch (error) { setMessage(error.response?.data?.error || "Exam visibility could not be updated."); }
  }

  function updateSection(sectionIndex, updates) {
    setExamForm((current) => ({
      ...current,
      sections: current.sections.map((section, index) => (index === sectionIndex ? { ...section, ...updates } : section))
    }));
  }

  function updateQuestion(sectionIndex, questionIndex, updates) {
    setExamForm((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: section.questions.map((question, qIndex) => (qIndex === questionIndex ? { ...question, ...updates } : question))
            }
          : section
      )
    }));
  }

  function updateOption(sectionIndex, questionIndex, optionIndex, value) {
    const question = examForm.sections[sectionIndex].questions[questionIndex];
    const nextOptions = question.choiceOpts.map((option, index) => (index === optionIndex ? value : option));
    updateQuestion(sectionIndex, questionIndex, { choiceOpts: nextOptions });
  }

  // Add option to question
  function addOption(sectionIndex, questionIndex) {
    const question = examForm.sections[sectionIndex].questions[questionIndex];
    const newOptions = [...question.choiceOpts, ""];
    updateQuestion(sectionIndex, questionIndex, { 
      choiceOpts: newOptions,
      answerIdx: question.answerIdx >= newOptions.length ? 0 : question.answerIdx,
      correctAnswers: question.correctAnswers.filter(idx => idx < newOptions.length)
    });
  }

  // Remove option from question
  function removeOption(sectionIndex, questionIndex, optionIndex) {
    const question = examForm.sections[sectionIndex].questions[questionIndex];
    if (question.choiceOpts.length <= 2) {
      setMessage("You need at least 2 options for multiple choice or checkbox questions.");
      return;
    }
    
    const newOptions = question.choiceOpts.filter((_, idx) => idx !== optionIndex);
    updateQuestion(sectionIndex, questionIndex, { 
      choiceOpts: newOptions,
      answerIdx: question.answerIdx >= newOptions.length ? 0 : 
                  (question.answerIdx === optionIndex ? 0 : 
                   question.answerIdx > optionIndex ? question.answerIdx - 1 : question.answerIdx),
      correctAnswers: question.correctAnswers
        .filter(idx => idx !== optionIndex)
        .map(idx => idx > optionIndex ? idx - 1 : idx)
    });
  }

  function downloadCsvTemplate() {
    const blob = new Blob([buildCsvTemplateContent()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam_questions_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so the same filename can be re-uploaded later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const records = csvRowsToObjects(parseCsvText(text));
        const { importedSections, errors } = buildSectionsFromCsvRecords(records);

        if (!importedSections.length) {
          setCsvImportResult({ importedCount: 0, errors: errors.length ? errors : ["No valid question rows were found in that file."] });
          return;
        }

        setExamForm((current) => {
          const nextSections = current.sections.map((section) => ({ ...section, questions: [...section.questions] }));
          importedSections.forEach((imported) => {
            const existing = nextSections.find(
              (section) => section.subjectTitle.trim().toLowerCase() === imported.subjectTitle.toLowerCase()
            );
            if (existing) {
              existing.questions.push(...imported.questions);
            } else {
              nextSections.push(imported);
            }
          });
          return { ...current, sections: nextSections };
        });

        const importedCount = importedSections.reduce((sum, section) => sum + section.questions.length, 0);
        setCsvImportResult({ importedCount, errors });
        setMessage(
          errors.length
            ? `Imported ${importedCount} question(s) from CSV, ${errors.length} row(s) skipped.`
            : `Imported ${importedCount} question(s) from CSV successfully.`
        );
      } catch (error) {
        setCsvImportResult({ importedCount: 0, errors: ["Could not read that file. Make sure it's a valid CSV export."] });
      }
    };
    reader.readAsText(file);
  }

  function addSubject() {
    setExamForm((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          subjectTitle: "",
          allottedTimeSec: 600,
          questions: [{ ...emptyQuestion, choiceOpts: [...emptyQuestion.choiceOpts] }]
        }
      ]
    }));
  }

  function removeSubject(sectionIndex) {
    const subjectName = examForm.sections[sectionIndex]?.subjectTitle || 'Untitled Subject';
    const questionCount = examForm.sections[sectionIndex]?.questions?.length || 0;
    
    showConfirm({
      title: "Remove Subject",
      message: `Remove "${subjectName}"?\n\nThis will remove ${questionCount} question${questionCount > 1 ? 's' : ''} from this subject.\nThis action cannot be undone.`,
      onConfirm: () => {
        setExamForm((current) => ({
          ...current,
          sections: current.sections.filter((_, index) => index !== sectionIndex)
        }));
      }
    });
  }

  function addQuestion(sectionIndex) {
    setExamForm((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, questions: [...section.questions, { ...emptyQuestion, choiceOpts: [...emptyQuestion.choiceOpts] }] }
          : section
      )
    }));
  }

  function removeQuestion(sectionIndex, questionIndex) {
    const section = examForm.sections[sectionIndex];
    const question = section?.questions[questionIndex];
    const questionPreview = stripHtml(question?.stem || '').slice(0, 50);
    
    showConfirm({
      title: "Remove Question",
      message: `Remove this question?\n\n"${questionPreview}${questionPreview.length > 50 ? '...' : ''}"\n\nThis action cannot be undone.`,
      onConfirm: () => {
        setExamForm((current) => ({
          ...current,
          sections: current.sections.map((section, index) =>
            index === sectionIndex
              ? { ...section, questions: section.questions.filter((_, qIndex) => qIndex !== questionIndex) }
              : section
          )
        }));
      }
    });
  }

  function updateReviewerModule(moduleId, updates) {
    setReviewerForm((current) => ({
      ...current,
      modules: current.modules.map((module) => (module.id === moduleId ? { ...module, ...updates } : module))
    }));
  }

  function addReviewerModule() {
    setReviewerForm((current) => ({
      ...current,
      modules: [
        ...current.modules,
        {
          id: crypto.randomUUID(),
          title: "",
          content: "",
          videoUrl: ""
        }
      ]
    }));
  }

  function removeReviewerModule(moduleId) {
    const module = reviewerForm.modules.find(m => m.id === moduleId);
    
    showConfirm({
      title: "Remove Module",
      message: `Remove "${module?.title || 'this module'}"?\n\nThis action cannot be undone.`,
      onConfirm: () => {
        setReviewerForm((current) => ({
          ...current,
          modules: current.modules.filter((module) => module.id !== moduleId)
        }));
      }
    });
  }

  function validateExamBlueprint() {
    if (!examForm.title.trim()) return "Exam title is required.";
    if (!Number.isFinite(Number(examForm.passingScore)) || Number(examForm.passingScore) < 0 || Number(examForm.passingScore) > 100) return "Passing score must be between 0 and 100.";
    if (!examForm.sections.length) return "At least one subject category is required.";

    for (const section of examForm.sections) {
      if (!section.subjectTitle.trim()) return "Every subject needs a title.";
      if (!section.questions.length) return `${section.subjectTitle} needs at least one question.`;

      for (const question of section.questions) {
        if (!stripHtml(question.stem)) return "Every question needs question text.";
        if (usesOptions(question.type) && question.choiceOpts.some((option) => !option.trim())) {
          return "Every option must be filled.";
        }
        if (question.type === "short_answer" && !String(question.correctText || "").trim()) {
          return "Short answer items need an answer key.";
        }
        if (question.type === "checkboxes" && !question.correctAnswers.length) {
          return "Checkbox items need at least one correct option.";
        }
      }
    }
    return "";
  }

  function validateReviewer() {
    if (!reviewerForm.title.trim()) return "Reviewer title is required.";
    if (!reviewerForm.subjectCategory.trim()) return "Subject category is required.";
    if (!reviewerForm.modules.length) return "Add at least one module or chapter.";

    for (const module of reviewerForm.modules) {
      if (!module.title.trim()) return "Every module needs a title.";
      if (!stripHtml(module.content)) return `${module.title} needs reading material.`;
    }
    return "";
  }

  async function publishItem() {
    if (mode === "exam") {
      const validationError = validateExamBlueprint();
      if (validationError) {
        setMessage(validationError);
        return;
      }

      if (editingExamId) {
        const updated = await updateExamBlueprint(editingExamId, {
          ...examForm,
          accessType: examForm.accessType || "unlimited",
          maxAttempts: examForm.accessType === "once" ? 1 : examForm.accessType === "limited" ? (examForm.maxAttempts || 3) : 999
        });
        setBlueprints(getExamBlueprints());
        setMessage(`"${updated.title}" was updated successfully!`);
        setEditingExamId(null);
        setExamForm({
          ...initialExamForm,
          sections: [{ ...initialExamForm.sections[0], questions: [{ ...emptyQuestion }] }]
        });
        return;
      }

      const published = await publishExamBlueprint({
        ...examForm,
        accessType: examForm.accessType || "unlimited",
        maxAttempts: examForm.accessType === "once" ? 1 : examForm.accessType === "limited" ? (examForm.maxAttempts || 3) : 999
      });
      setBlueprints(getExamBlueprints());
      setMessage(`"${published.title}" was published successfully! Students can now access this exam.`);
      setExamForm({
        ...initialExamForm,
        sections: [{ ...initialExamForm.sections[0], questions: [{ ...emptyQuestion }] }]
      });
      return;
    }

    const validationError = validateReviewer();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      if (editingReviewerId) {
        const updated = await updateReviewerBlueprint(editingReviewerId, reviewerForm);
        setReviewers(getReviewerBlueprints());
        setMessage(`"${updated.title}" was updated successfully!`);
        setEditingReviewerId(null);
        setReviewerForm(initialReviewerForm);
        return;
      }
      const published = await publishReviewerBlueprint(reviewerForm);
      setReviewers(getReviewerBlueprints());
      setMessage(`"${published.title}" was published successfully! Students can now access this reviewer.`);
      setReviewerForm({
        ...initialReviewerForm,
        modules: [{ ...initialReviewerForm.modules[0], id: crypto.randomUUID() }]
      });
    } catch (error) {
      const reason = error.response?.data?.error || error.message || "Unknown connection error";
      setMessage(`Reviewer could not be saved: ${reason}. Please sign in again and retry.`);
    }
  }

  return (
    <main className="admin-shell">
      {/* Enlarge the rich-text editor so it uses the available width/height instead of a cramped box */}
      <style>{`
        .tox-tinymce {
          min-height: 340px !important;
          border-radius: 0.5rem !important;
        }
        .tox .tox-edit-area,
        .tox .tox-edit-area__iframe {
          min-height: 260px !important;
        }
        .tox .tox-toolbar__group {
          flex-wrap: wrap;
        }
      `}</style>

      <AdminSidebar active={mode} onModeChange={setMode} />

      <div className="admin-content">
        <header className="workspace-header">
          <div className="mx-auto max-w-[1800px] flex items-start justify-between gap-4">
            <div>
              <p className="workspace-eyebrow">Admin Workspace</p>
              <h1 className="workspace-title">
                {editingExamId ? "Edit Exam" : `Create ${mode === "exam" ? "Exam" : "Reviewer"}`}
              </h1>
              <p className="workspace-description">
                {mode === "exam"
                  ? "Build scored questionnaire blocks for students."
                  : "Build course-style study modules with readings and video resources."}
              </p>
            </div>
            <button
              onClick={() => setIsPanelCollapsed((current) => !current)}
              className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition whitespace-nowrap"
              title={isPanelCollapsed ? "Show published list" : "Hide published list for more editing space"}
            >
              {isPanelCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
              {isPanelCollapsed ? "Show List" : "Widen Editor"}
            </button>
          </div>
        </header>

        <div
          className={`mx-auto grid max-w-[1800px] gap-4 p-4 transition-all duration-200 ${
            isPanelCollapsed ? "grid-cols-1" : "lg:grid-cols-[1fr_24rem]"
          }`}
        >
          <section className="space-y-3 min-w-0">
            {(editingExamId || editingReviewerId) && (
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-700">Editing {editingExamId ? "Exam" : "Reviewer"} - Make your changes and click update</p>
                <button onClick={cancelEditing} className="text-blue-700 hover:text-blue-900">
                  <FaTimes /> Cancel
                </button>
              </div>
            )}

            {mode === "exam" ? renderExamBuilder() : renderReviewerBuilder()}

            <div className="flex flex-wrap gap-3">
              {mode === "exam" ? (
                <button onClick={addSubject} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">
                  <FaPlus /> Add Subject
                </button>
              ) : (
                <button onClick={addReviewerModule} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">
                  <FaPlus /> Add Module
                </button>
              )}
              <button onClick={publishItem} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                <FaSave /> {editingExamId || editingReviewerId ? `Update ${mode === "exam" ? "Exam" : "Reviewer"}` : `Publish ${mode === "exam" ? "Exam" : "Reviewer"}`}
              </button>
            </div>
            {message && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
          </section>

          {!isPanelCollapsed && (
            <aside className="space-y-3 min-w-0">
              {mode === "exam" ? <div className="glass-card p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Current Draft</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{mode === "exam" ? totalQuestions : reviewerForm.modules.length}</p>
                <p className="text-sm font-semibold text-slate-500">
                  {mode === "exam" 
                    ? `${totalQuestions} question${totalQuestions > 1 ? "s" : ""} across ${examForm.sections.length} subject${examForm.sections.length > 1 ? "s" : ""}` 
                    : `${reviewerForm.modules.length} module${reviewerForm.modules.length > 1 ? "s" : ""} in ${reviewerForm.subjectCategory || "uncategorized"}`}
                </p>
                {mode === "exam" && examForm.title && (
                  <p className="mt-2 text-xs font-semibold text-slate-400 truncate">{examForm.title}</p>
                )}
                {mode === "exam" && examForm.accessType && (
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {examForm.accessType === "once" && "One attempt only"}
                    {examForm.accessType === "limited" && `${examForm.maxAttempts || 3} attempts allowed`}
                    {examForm.accessType === "unlimited" && "Unlimited attempts"}
                  </p>
                )}
              </div> : <div className="glass-card p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Published Reviewers</p>
                <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
                  {reviewers.length ? reviewers.map((reviewer) => (
                    <div key={reviewer.id} className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-900 text-base truncate">{reviewer.title}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {reviewer.subjectCategory} · {reviewer.modules?.length || 0} modules
                          </p>
                          <span className="text-xs font-semibold text-emerald-600">Published</span>
                        </div>
                        <ReviewerActionsDropdown
                          reviewer={reviewer}
                          onEdit={() => loadReviewerForEdit(reviewer.id)}
                          onDelete={() => handleDeleteReviewer(reviewer.id)}
                        />
                      </div>
                    </div>
                  )) : <p className="text-sm text-slate-500">No published reviewers yet.</p>}
                </div>
              </div>}

              {mode === "exam" && (
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Published Exams</p>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                      {blueprints.length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {blueprints.length > 0 ? blueprints.map((blueprint) => (
                      <div 
                        key={blueprint.id} 
                        className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              {blueprint.isHidden && (
                                <FaEyeSlash className="text-slate-400 text-sm flex-shrink-0 mt-0.5" />
                              )}
                              <p className="font-bold text-slate-900 text-base break-words leading-tight">
                                {blueprint.title || "Untitled Exam"}
                              </p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                                📚 {blueprint.sections?.length || 0} subjects
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                                {blueprint.accessType === "once" && "🔒 Once"}
                                {blueprint.accessType === "limited" && `🔄 ${blueprint.maxAttempts || 3}x`}
                                {(!blueprint.accessType || blueprint.accessType === "unlimited") && "♾️ Unlimited"}
                              </span>
                              {blueprint.isHidden ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">
                                  👁️ Hidden
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap">
                                  ✅ Published
                                </span>
                              )}
                            </div>
                            {blueprint.description && (
                              <p className="mt-2 text-xs text-slate-500 line-clamp-2 break-words">
                                {blueprint.description}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 mt-0.5">
                            <ExamActionsDropdown
                              blueprint={blueprint}
                              onEdit={() => loadExamForEdit(blueprint.id)}
                              onToggleVisibility={() => handleToggleVisibility(blueprint.id)}
                              onDelete={() => handleDeleteExam(blueprint.id)}
                            />
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-500">No published exams yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Create and publish your first exam above.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDanger={confirmDialog.isDanger}
      />
    </main>
  );

  // ============================================
  // RENDER FUNCTIONS - REORGANIZED
  // ============================================

  function renderExamBuilder() {
    return (
      <>
        {/* ============================================
            EXAM INFORMATION - GROUPED TOGETHER
            ============================================ */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Exam Information</h2>
          </div>
          
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Exam Title <span className="text-rose-500">*</span></span>
              <input
                value={examForm.title}
                onChange={(event) => setExamForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                placeholder="Enter exam title"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_10rem] gap-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Description <span className="text-slate-400">(optional)</span></span>
                <input
                  value={examForm.description || ""}
                  onChange={(event) => setExamForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                  placeholder="Add a brief description"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600">Passing Score % <span className="text-rose-500">*</span></span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={examForm.passingScore ?? 75}
                  onChange={(event) => setExamForm((current) => ({ ...current, passingScore: Number(event.target.value) }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="0-100%"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ============================================
            ACCESS CONTROL - CLEANER LAYOUT
            ============================================ */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Student Access Control</h2>
          </div>
          
          <div className={`grid grid-cols-1 ${examForm.accessType === "limited" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-2`}>
            <button
              type="button"
              onClick={() => setExamForm((current) => ({ ...current, accessType: "once", maxAttempts: 1 }))}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${
                examForm.accessType === "once" 
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200" 
                  : "border-slate-300 hover:border-slate-400 text-slate-600"
              }`}
            >
              <FaLock className="text-sm flex-shrink-0" />
              <span className="font-bold text-xs">One Attempt</span>
            </button>
            
            <button
              type="button"
              onClick={() => setExamForm((current) => ({ ...current, accessType: "limited", maxAttempts: current.maxAttempts || 3 }))}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${
                examForm.accessType === "limited" 
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200" 
                  : "border-slate-300 hover:border-slate-400 text-slate-600"
              }`}
            >
              <FaUsers className="text-sm flex-shrink-0" />
              <span className="font-bold text-xs">Limited Attempts</span>
            </button>
            
            <button
              type="button"
              onClick={() => setExamForm((current) => ({ ...current, accessType: "unlimited", maxAttempts: 999 }))}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${
                examForm.accessType === "unlimited" || !examForm.accessType
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200" 
                  : "border-slate-300 hover:border-slate-400 text-slate-600"
              }`}
            >
              <FaUnlock className="text-sm flex-shrink-0" />
              <span className="font-bold text-xs">Unlimited</span>
            </button>

            {examForm.accessType === "limited" && (
              <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Max Attempts</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={examForm.maxAttempts || 3}
                  onChange={(event) => setExamForm((current) => ({ ...current, maxAttempts: Number(event.target.value) }))}
                  className="w-14 rounded border border-slate-300 px-2 py-1 text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            )}
          </div>
        </div>

        {/* ============================================
            CSV BULK IMPORT
            ============================================ */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-green-500 rounded-full"></div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Bulk Import Questions</h2>
          </div>
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Upload a CSV with many questions at once instead of adding them one by one. Rows are grouped into subjects by the
                <span className="font-bold text-slate-700"> subject_category</span> column — matching an existing subject name adds
                to it, a new name creates a new subject.
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
              >
                <FaDownload /> Download Template
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800 transition whitespace-nowrap">
                <FaFileImport /> Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>
          </div>

          <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-500">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-600">CSV column format</summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5">
              <p><span className="font-bold text-slate-700">subject_category</span> — subject/section name</p>
              <p><span className="font-bold text-slate-700">time_minutes</span> — time per subject</p>
              <p><span className="font-bold text-slate-700">question_type</span> — multiple_choice, checkboxes, short_answer, paragraph</p>
              <p><span className="font-bold text-slate-700">question_text</span> — the question</p>
              <p><span className="font-bold text-slate-700">question_image_url</span> — optional image link</p>
              <p><span className="font-bold text-slate-700">option_a</span> to <span className="font-bold text-slate-700">option_f</span> — choices</p>
              <p><span className="font-bold text-slate-700">correct_answer</span> — letter (C) or letters (A;C)</p>
              <p><span className="font-bold text-slate-700">correct_text</span> — answer key for short_answer</p>
              <p><span className="font-bold text-slate-700">rubric</span> — grading notes for paragraph</p>
              <p><span className="font-bold text-slate-700">points</span> — point value (defaults to 1)</p>
              <p className="md:col-span-2"><span className="font-bold text-slate-700">diagnostic_subcategory</span> / <span className="font-bold text-slate-700">diagnostic_skill_tag</span> — optional tags</p>
            </div>
          </details>

          {csvImportResult && (
            <div className={`mt-3 rounded-lg border p-3 text-sm font-semibold ${
              csvImportResult.importedCount > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"
            }`}>
              <div className="flex items-center gap-2">
                {csvImportResult.importedCount > 0 ? <FaCheckCircle /> : <FaExclamationTriangle />}
                <span>
                  {csvImportResult.importedCount > 0
                    ? `Imported ${csvImportResult.importedCount} question(s) successfully.`
                    : "No questions were imported."}
                </span>
              </div>
              {csvImportResult.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-rose-600">
                  {csvImportResult.errors.slice(0, 8).map((err, index) => <li key={index}>{err}</li>)}
                  {csvImportResult.errors.length > 8 && <li>...and {csvImportResult.errors.length - 8} more row(s) skipped.</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ============================================
            SUBJECT SECTIONS
            ============================================ */}
        {examForm.sections.map((section, sectionIndex) => (
          <article key={`${section.subjectTitle || sectionIndex}-${sectionIndex}`} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Subject #{sectionIndex + 1}</h2>
            </div>
            
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid flex-1 gap-3 md:grid-cols-[1fr_10rem]">
                <label>
                  <span className="text-xs font-bold text-slate-600">Subject Category <span className="text-rose-500">*</span></span>
                  <input
                    value={section.subjectTitle}
                    onChange={(event) => updateSection(sectionIndex, { subjectTitle: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="Mathematics, English, Science"
                  />
                </label>
                <label>
                  <span className="text-xs font-bold text-slate-600">Time Allotment <span className="text-rose-500">*</span></span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={Math.round(section.allottedTimeSec / 60)}
                      onChange={(event) => updateSection(sectionIndex, { allottedTimeSec: Number(event.target.value) * 60 })}
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Minutes"
                    />
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">minutes</span>
                  </div>
                </label>
              </div>
              <button onClick={() => removeSubject(sectionIndex)} className="icon-button text-rose-500 hover:text-rose-700 transition flex-shrink-0" aria-label="Remove subject">
                <FaTrash />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {section.questions.map((question, questionIndex) => renderQuestionCard(sectionIndex, questionIndex, question))}
            </div>

            <button onClick={() => addQuestion(sectionIndex)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
              <FaPlus /> Add Question
            </button>
          </article>
        ))}
      </>
    );
  }

  // ============================================
  // RENDER QUESTION CARD - REORGANIZED
  // ============================================
  function renderQuestionCard(sectionIndex, questionIndex, question) {
    return (
      <div key={`${sectionIndex}-${questionIndex}`} className="rounded-lg border border-slate-200 bg-white p-4">
        {/* Question Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-black">
              {questionIndex + 1}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Question</span>
          </div>
          <button onClick={() => removeQuestion(sectionIndex, questionIndex)} className="icon-button text-rose-500 hover:text-rose-700 transition flex-shrink-0" aria-label="Remove question">
            <FaTrash />
          </button>
        </div>

        {/* Question Text - Full Width Editor */}
        <div className="w-full">
          <TinyMCEEditor
            value={question.stem}
            onChange={(value) => updateQuestion(sectionIndex, questionIndex, { stem: value })}
            placeholder="Type your question here..."
          />
        </div>

        {/* Question Configuration - Grouped Row */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label>
            <span className="text-xs font-bold text-slate-600">Question Type</span>
            <select
              value={question.type}
              onChange={(event) => {
                const newType = event.target.value;
                const updates = { type: newType };
                if (newType === "multiple_choice") {
                  updates.answerIdx = 0;
                  updates.correctAnswers = [];
                } else if (newType === "checkboxes") {
                  updates.correctAnswers = [];
                  updates.answerIdx = 0;
                } else {
                  updates.correctText = "";
                  updates.answerIdx = 0;
                  updates.correctAnswers = [];
                }
                updateQuestion(sectionIndex, questionIndex, updates);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="checkboxes">Checkboxes</option>
              <option value="short_answer">Short Answer</option>
              <option value="paragraph">Paragraph</option>
            </select>
          </label>

          <label>
            <span className="text-xs font-bold text-slate-600">Points</span>
            <input
              type="number"
              min="1"
              value={question.points || 1}
              onChange={(event) => updateQuestion(sectionIndex, questionIndex, { points: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {/* Options Section - Only for MC and Checkboxes */}
        {(question.type === "multiple_choice" || question.type === "checkboxes") && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">
                Answer Options <span className="text-rose-500">*</span>
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({question.choiceOpts.length} options)
                </span>
              </span>
              <button
                type="button"
                onClick={() => addOption(sectionIndex, questionIndex)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
              >
                <FaPlus className="text-xs" /> Add Option
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5">
              {question.choiceOpts.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <span className="w-8 text-sm font-bold text-slate-500 text-center">
                    {getOptionLabel(optionIndex)}
                  </span>
                  <input
                    value={option}
                    onChange={(event) => updateOption(sectionIndex, questionIndex, optionIndex, event.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder={`Option ${getOptionLabel(optionIndex)}`}
                  />
                  {question.type === "multiple_choice" && (
                    <button
                      type="button"
                      onClick={() => updateQuestion(sectionIndex, questionIndex, { answerIdx: optionIndex })}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition whitespace-nowrap ${
                        question.answerIdx === optionIndex
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {question.answerIdx === optionIndex ? "✓ Correct" : "Set Correct"}
                    </button>
                  )}
                  {question.type === "checkboxes" && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentCorrect = question.correctAnswers || [];
                        const newCorrect = currentCorrect.includes(optionIndex)
                          ? currentCorrect.filter(idx => idx !== optionIndex)
                          : [...currentCorrect, optionIndex].sort((a, b) => a - b);
                        updateQuestion(sectionIndex, questionIndex, { correctAnswers: newCorrect });
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition whitespace-nowrap ${
                        (question.correctAnswers || []).includes(optionIndex)
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {(question.correctAnswers || []).includes(optionIndex) ? "✓ Correct" : "Mark Correct"}
                    </button>
                  )}
                  {question.choiceOpts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(sectionIndex, questionIndex, optionIndex)}
                      className="text-rose-400 hover:text-rose-600 transition p-1"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {question.type === "checkboxes" && (
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Selected correct options: {(question.correctAnswers || []).length > 0 
                  ? (question.correctAnswers || []).map(idx => getOptionLabel(idx)).join(', ') 
                  : 'None selected'}
              </div>
            )}
          </div>
        )}

        {/* Short Answer Section */}
        {question.type === "short_answer" && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Answer Key <span className="text-rose-500">*</span></span>
              <input
                value={question.correctText || ""}
                onChange={(event) => updateQuestion(sectionIndex, questionIndex, { correctText: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                placeholder="Enter the correct answer"
              />
            </label>
          </div>
        )}

        {/* Paragraph Section */}
        {question.type === "paragraph" && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Sample Answer / Rubric <span className="text-slate-400">(optional)</span></span>
              <TinyMCEEditor
                value={question.rubric || ""}
                onChange={(value) => updateQuestion(sectionIndex, questionIndex, { rubric: value })}
                placeholder="Describe the key points the AI should look for..."
                minHeightClass="min-h-40"
                height={220}
              />
            </label>
          </div>
        )}

        {/* ============================================
            DIAGNOSTIC TAGS - PROPERLY GROUPED TOGETHER
            ============================================ */}
        <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Diagnostic Tags</span>
            <span className="text-xs text-indigo-400 font-medium">(optional)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label>
              <span className="text-xs font-medium text-indigo-600">Subcategory</span>
              <input
                value={question.diagnosticSubcategory || ""}
                onChange={(event) => updateQuestion(sectionIndex, questionIndex, { diagnosticSubcategory: event.target.value })}
                className="mt-1 w-full rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                placeholder="Algebra, Grammar, Reading"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-indigo-600">Skill Tag</span>
              <input
                value={question.diagnosticSkillTag || ""}
                onChange={(event) => updateQuestion(sectionIndex, questionIndex, { diagnosticSkillTag: event.target.value })}
                className="mt-1 w-full rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                placeholder="Addition, Theme Analysis, Vocabulary"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  function renderReviewerBuilder() {
    return (
      <>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Reviewer Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Reviewer Title <span className="text-rose-500">*</span></span>
              <input
                value={reviewerForm.title}
                onChange={(event) => setReviewerForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                placeholder="Enter reviewer title"
              />
            </label>
            
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Subject Category <span className="text-rose-500">*</span></span>
              <input
                value={reviewerForm.subjectCategory}
                onChange={(event) => setReviewerForm((current) => ({ ...current, subjectCategory: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                placeholder="Mathematics, English, Science"
              />
            </label>
          </div>
        </div>

        {reviewerForm.modules.map((module) => (
          <article key={module.id} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Module</h2>
            </div>
            
            <div className="flex items-start gap-3 mb-3">
              <div className="grid flex-1 grid-cols-1 md:grid-cols-[1fr_1fr_8rem] gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Module Title <span className="text-rose-500">*</span></span>
                  <input
                    value={module.title}
                    onChange={(event) => updateReviewerModule(module.id, { title: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="Enter module title"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Short Description <span className="text-slate-400">(optional)</span></span>
                  <input
                    value={module.description || ""}
                    onChange={(event) => updateReviewerModule(module.id, { description: event.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Brief module description"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Estimated Time <span className="text-slate-400">(min)</span></span>
                  <input
                    type="number"
                    min="1"
                    value={module.estimatedMinutes || 15}
                    onChange={(event) => updateReviewerModule(module.id, { estimatedMinutes: Math.max(1, Number(event.target.value)) })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="15"
                  />
                </label>
              </div>
              <button onClick={() => removeReviewerModule(module.id)} className="icon-button text-rose-500 hover:text-rose-700 transition flex-shrink-0 mt-6" aria-label="Remove module">
                <FaTrash />
              </button>
            </div>

            <label className="block mt-3">
              <span className="text-xs font-bold text-slate-600">Reading Material <span className="text-rose-500">*</span></span>
              <div className="w-full mt-1">
                <TinyMCEEditor
                  value={module.content}
                  onChange={(value) => updateReviewerModule(module.id, { content: value })}
                  placeholder="Write the reading material here..."
                />
              </div>
            </label>
            
            <label className="block mt-3">
              <span className="text-xs font-bold text-slate-600">Video URL <span className="text-slate-400">(optional)</span></span>
              <input
                value={module.videoUrl || ""}
                onChange={(event) => updateReviewerModule(module.id, { videoUrl: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                placeholder="https://youtube.com/watch?v=..."
              />
            </label>
          </article>
        ))}
      </>
    );
  }
}
