import { useState } from "react";
import {
  FaBolt, FaCheckCircle, FaDownload, FaEllipsisV, FaExclamationTriangle,
  FaFileImport, FaPlus, FaSave, FaTrash, FaEdit, FaTimes
} from "react-icons/fa";
import AdminSidebar from "../components/AdminSidebar";
import TinyMCEEditor from "../components/TinyMCEEditor";
import { deleteDrillQuestion, getDrillBankQuestions, publishDrillQuestion, updateDrillQuestion } from "../services/storage";

const emptyForm = {
  title: "",
  questionType: "multiple_choice",
  type: "multiple_choice",
  stem: "",
  choiceOpts: ["", ""],
  answerIdx: 0,
  correctAnswers: [],
  correctText: "",
  gradingPlaceholder: "",
  subjectTitle: "",
  diagnosticSubcategory: "",
  diagnosticSkillTag: "",
  explanation: "",
  points: 1
};

const CSV_HEADERS = [
  "drill_title", "subject_category", "question_type", "question_text", "question_image_url",
  "option_a", "option_b", "option_c", "option_d", "option_e", "option_f",
  "correct_answer", "correct_text", "rubric", "points", "diagnostic_subcategory", "diagnostic_skill_tag", "explanation"
];
const CSV_ROWS = [
  ["Arithmetic Warm-up", "Mathematics", "multiple_choice", "What is 2 + 2?", "", "2", "3", "4", "5", "", "", "C", "", "", "1", "Arithmetic", "Addition", "Add the two values."],
  ["Prime Number Practice", "Mathematics", "checkboxes", "Which are prime numbers?", "", "2", "3", "4", "5", "", "", "A;B;D", "", "", "2", "Number Theory", "Primes", "A prime number has exactly two factors."],
  ["Verb Tenses", "English", "short_answer", "What is the past tense of go?", "", "", "", "", "", "", "", "", "went", "", "1", "Grammar", "Verb Tenses", ""],
  ["Theme Analysis", "English", "paragraph", "Explain the theme of the poem.", "", "", "", "", "", "", "", "", "", "Discuss loss and renewal.", "4", "Literature", "Theme Analysis", "Use the rubric when reviewing the response."]
];
const CSV_TYPES = ["multiple_choice", "checkboxes", "short_answer", "paragraph"];
const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"];

function stripHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function usesOptions(type) {
  return type === "multiple_choice" || type === "checkboxes";
}

function getOptionLabel(index) {
  return String.fromCharCode(65 + index);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (inQuotes) {
      if (character === '"' && next === '"') { field += '"'; index += 1; }
      else if (character === '"') inQuotes = false;
      else field += character;
    } else if (character === '"') inQuotes = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

function csvRecords(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || "").trim()])));
}

function escapedStem(text, imageUrl) {
  const escapeHtml = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parts = text ? [`<p>${escapeHtml(text)}</p>`] : [];
  if (/^https?:\/\/\S+$/i.test(imageUrl || "")) parts.push(`<p><img src="${imageUrl}" alt="Question image" style="max-width:100%;height:auto;" /></p>`);
  return parts.join("");
}

function answerIndex(value) {
  const code = String(value || "").trim().toUpperCase().charCodeAt(0);
  return code >= 65 && code <= 90 ? code - 65 : -1;
}

function drillFromCsv(record) {
  const typeCandidate = String(record.question_type || "multiple_choice").trim().toLowerCase().replace(/\s+/g, "_");
  const questionType = CSV_TYPES.includes(typeCandidate) ? typeCandidate : "multiple_choice";
  let choiceOpts = OPTION_KEYS.map((key) => record[key] || "");
  while (choiceOpts.length > 2 && !choiceOpts.at(-1).trim()) choiceOpts.pop();
  if (choiceOpts.length < 2) choiceOpts = ["", ""];
  const selectedAnswer = answerIndex(record.correct_answer);
  return {
    ...emptyForm,
    title: record.drill_title || record.title || "",
    questionType,
    type: questionType,
    stem: escapedStem(record.question_text, record.question_image_url),
    choiceOpts: usesOptions(questionType) ? choiceOpts : [],
    answerIdx: questionType === "multiple_choice" && selectedAnswer >= 0 && selectedAnswer < choiceOpts.length ? selectedAnswer : 0,
    correctAnswers: questionType === "checkboxes" ? String(record.correct_answer || "").split(/[;,|]/).map(answerIndex).filter((index) => index >= 0 && index < choiceOpts.length) : [],
    correctText: record.correct_text || "",
    gradingPlaceholder: record.rubric || "",
    subjectTitle: record.subject_category || "",
    diagnosticSubcategory: record.diagnostic_subcategory || "",
    diagnosticSkillTag: record.diagnostic_skill_tag || "",
    explanation: record.explanation || "",
    points: Number(record.points) > 0 ? Number(record.points) : 1
  };
}

export default function CreateDrill() {
  const [form, setForm] = useState(emptyForm);
  const [drillBank, setDrillBank] = useState(() => getDrillBankQuestions());
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [csvImportResult, setCsvImportResult] = useState(null);

  function updateOption(index, value) {
    setForm((current) => ({ ...current, choiceOpts: current.choiceOpts.map((option, optionIndex) => optionIndex === index ? value : option) }));
  }

  function addOption() { setForm((current) => ({ ...current, choiceOpts: [...current.choiceOpts, ""] })); }

  function removeOption(index) {
    if (form.choiceOpts.length <= 2) { setMessage("You need at least 2 options."); return; }
    setForm((current) => ({
      ...current,
      choiceOpts: current.choiceOpts.filter((_, optionIndex) => optionIndex !== index),
      answerIdx: current.answerIdx === index || current.answerIdx >= current.choiceOpts.length - 1 ? 0 : current.answerIdx > index ? current.answerIdx - 1 : current.answerIdx,
      correctAnswers: current.correctAnswers.filter((answer) => answer !== index).map((answer) => answer > index ? answer - 1 : answer)
    }));
  }

  function updateQuestionType(questionType) {
    setForm((current) => ({
      ...current, questionType, type: questionType,
      choiceOpts: usesOptions(questionType) ? (current.choiceOpts.length >= 2 ? current.choiceOpts : ["", ""]) : [],
      answerIdx: 0, correctAnswers: [], correctText: "",
      gradingPlaceholder: questionType === "paragraph" ? current.gradingPlaceholder : ""
    }));
  }

  function validate(draft) {
    if (!draft.title.trim()) return "Drill title is required.";
    if (!stripHtml(draft.stem)) return "Question text is required.";
    if (usesOptions(draft.questionType) && (draft.choiceOpts.length < 2 || draft.choiceOpts.some((option) => !option.trim()))) return "Add at least 2 completed options.";
    if (draft.questionType === "checkboxes" && !draft.correctAnswers.length) return "Checkbox questions need at least one correct answer.";
    if (draft.questionType === "short_answer" && !draft.correctText.trim()) return "Short Answer needs a correct answer.";
    if (draft.questionType === "paragraph" && !draft.gradingPlaceholder.trim()) return "Long Paragraph needs a grading rubric.";
    if (!draft.subjectTitle.trim()) return "Subject category is required.";
    if (!draft.diagnosticSubcategory.trim()) return "Sub-category is required.";
    if (!draft.diagnosticSkillTag.trim()) return "Specific weakness tag is required.";
    return "";
  }

  function asPayload(draft) {
    return {
      ...draft, type: draft.questionType, questionType: draft.questionType, questionHtml: draft.stem,
      title: draft.title.trim(), choiceOpts: usesOptions(draft.questionType) ? draft.choiceOpts.map((option) => option.trim()) : [],
      answerIdx: draft.questionType === "multiple_choice" ? draft.answerIdx : 0,
      correctAnswers: draft.questionType === "checkboxes" ? draft.correctAnswers : [],
      correctText: draft.questionType === "short_answer" ? draft.correctText.trim() : draft.gradingPlaceholder.trim(),
      subjectTitle: draft.subjectTitle.trim(), category: draft.subjectTitle.trim(),
      diagnosticSubcategory: draft.diagnosticSubcategory.trim(), subCategory: draft.diagnosticSubcategory.trim(),
      diagnosticSkillTag: draft.diagnosticSkillTag.trim(), weaknessTag: draft.diagnosticSkillTag.trim(),
      points: Math.max(1, Number(draft.points) || 1),
      structuralTags: { category: draft.subjectTitle.trim(), subCategory: draft.diagnosticSubcategory.trim(), weaknessTag: draft.diagnosticSkillTag.trim(), path: [draft.subjectTitle.trim(), draft.diagnosticSubcategory.trim(), draft.diagnosticSkillTag.trim()] }
    };
  }

  function publishDrill() {
    const error = validate(form);
    if (error) { setMessage(error); return; }
    const published = editingId ? updateDrillQuestion(editingId, asPayload(form)) : publishDrillQuestion(asPayload(form));
    setDrillBank(getDrillBankQuestions());
    setMessage(`"${published.title}" ${editingId ? "updated" : "published"} successfully.`);
    setEditingId(null);
    setForm({ ...emptyForm, subjectTitle: form.subjectTitle });
  }

  function editDrill(question) {
    const questionType = question.questionType || question.type || "multiple_choice";
    setEditingId(question.id);
    setForm({ ...emptyForm, ...question, questionType, type: questionType, stem: question.stem || question.questionHtml || "", title: question.title || "", choiceOpts: question.choiceOpts?.length ? question.choiceOpts : (usesOptions(questionType) ? ["", ""] : []), gradingPlaceholder: question.gradingPlaceholder || (questionType === "paragraph" ? question.correctText || "" : "") });
    setOpenMenuId(null);
    setMessage(`Editing "${question.title || "Untitled Drill"}".`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmDeleteDrill() {
    if (!deleteTarget) return;
    deleteDrillQuestion(deleteTarget.id);
    setDrillBank(getDrillBankQuestions());
    setMessage(`"${deleteTarget.title || "Drill"}" deleted.`);
    setDeleteTarget(null);
  }

  function downloadTemplate() {
    const content = [CSV_HEADERS.join(","), ...CSV_ROWS.map((row) => row.map(csvEscape).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "drill_questions_template.csv"; link.click(); URL.revokeObjectURL(url);
  }

  function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const errors = [];
        const candidates = csvRecords(parseCsvText(reader.result));
        const valid = candidates.flatMap((record, index) => {
          const draft = drillFromCsv(record);
          const error = validate(draft);
          if (error) { errors.push(`Row ${index + 2}: ${error}`); return []; }
          return [draft];
        });
        if (!valid.length) { setCsvImportResult({ importedCount: 0, errors: errors.length ? errors : ["No valid question rows were found."] }); return; }
        valid.forEach((draft) => publishDrillQuestion(asPayload(draft)));
        setDrillBank(getDrillBankQuestions());
        setCsvImportResult({ importedCount: valid.length, errors });
        setMessage(`Imported and published ${valid.length} drill question${valid.length === 1 ? "" : "s"}.`);
      } catch {
        setCsvImportResult({ importedCount: 0, errors: ["Could not read that file. Make sure it is a valid CSV."] });
      }
    };
    reader.readAsText(file);
  }

  function renderAnswerWorkspace() {
    if (usesOptions(form.questionType)) {
      return (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600">
              Answer Options <span className="text-rose-500">*</span>
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({form.choiceOpts.length} options)
              </span>
            </span>
            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
            >
              <FaPlus className="text-xs" /> Add Option
            </button>
          </div>
          
          <div className="space-y-2">
            {form.choiceOpts.map((option, index) => {
              const selected = form.questionType === "multiple_choice" 
                ? form.answerIdx === index 
                : form.correctAnswers.includes(index);
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-8 text-center text-sm font-bold text-slate-500">
                    {getOptionLabel(index)}
                  </span>
                  <input
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder={`Option ${getOptionLabel(index)}`}
                  />
                  <button
                    type="button"
                    onClick={() => form.questionType === "multiple_choice" 
                      ? setForm((current) => ({ ...current, answerIdx: index }))
                      : setForm((current) => ({ 
                          ...current, 
                          correctAnswers: current.correctAnswers.includes(index) 
                            ? current.correctAnswers.filter((answer) => answer !== index) 
                            : [...current.correctAnswers, index].sort((a, b) => a - b) 
                        }))
                    }
                    className={`rounded px-3 py-1.5 text-xs font-bold ${
                      selected ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {selected ? "Correct" : "Set Correct"}
                  </button>
                  {form.choiceOpts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-1 text-rose-500 hover:text-rose-700"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {form.questionType === "checkboxes" && (
            <div className="mt-3 text-xs font-semibold text-slate-500">
              Selected correct options: {form.correctAnswers.length > 0 
                ? form.correctAnswers.map(idx => getOptionLabel(idx)).join(', ') 
                : 'None selected'}
            </div>
          )}
        </div>
      );
    }
    
    if (form.questionType === "short_answer") {
      return (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Answer Key <span className="text-rose-500">*</span></span>
            <input
              value={form.correctText}
              onChange={(event) => setForm((current) => ({ ...current, correctText: event.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Enter the correct answer"
            />
          </label>
        </div>
      );
    }
    
    return (
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Sample Answer / Rubric <span className="text-rose-500">*</span></span>
          <textarea
            value={form.gradingPlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, gradingPlaceholder: event.target.value }))}
            className="mt-1.5 min-h-28 w-full resize-y rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Describe the key points the AI should look for..."
          />
        </label>
      </div>
    );
  }

  return (
    <main className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar active="drill" />
      
      <div className="flex-1 overflow-y-auto">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-[1800px]">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Admin Workspace</p>
            <h1 className="text-2xl font-black text-slate-950">
              {editingId ? "Edit Drill" : "Create Drill"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Create, import, publish, and manage targeted remediation drills.
            </p>
          </div>
        </header>
        
        <div className="mx-auto grid max-w-[1800px] gap-6 p-6 lg:grid-cols-[1fr_24rem]">
          <section className="min-w-0 space-y-5">
            {editingId && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
                Editing this published drill. Save to update it.
                <button 
                  onClick={() => { setEditingId(null); setForm(emptyForm); }} 
                  className="inline-flex items-center gap-2 font-black"
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            )}
            
            {/* ============================================
                DRILL INFORMATION - GROUPED TOGETHER
                ============================================ */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Drill Information</h2>
              </div>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Drill Title <span className="text-rose-500">*</span></span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-3 text-lg font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Enter drill title"
                  />
                </label>
                
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Question Text <span className="text-rose-500">*</span></span>
                  <div className="mt-1.5">
                    <TinyMCEEditor
                      value={form.stem}
                      onChange={(value) => setForm((current) => ({ ...current, stem: value }))}
                      placeholder="Write the drill question here..."
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* ============================================
                QUESTION CONFIGURATION
                ============================================ */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Question Configuration</h2>
              </div>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Question Type</span>
                  <select
                    value={form.questionType}
                    onChange={(event) => updateQuestionType(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="checkboxes">Checkbox</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="paragraph">Long Paragraph</option>
                  </select>
                </label>

                {renderAnswerWorkspace()}

                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Points</span>
                  <input
                    type="number"
                    min="1"
                    value={form.points}
                    onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                    className="mt-1.5 w-32 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>

            {/* ============================================
                DIAGNOSTIC METADATA - PROPERLY GROUPED
                ============================================ */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">AI Classification Metadata</h2>
                <span className="text-xs text-indigo-400 font-medium">(required for AI grading)</span>
              </div>
              
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ["Subject Category", "subjectTitle"],
                    ["Sub-Category", "diagnosticSubcategory"],
                    ["Skill Tag", "diagnosticSkillTag"]
                  ].map(([label, key]) => (
                    <label key={key} className="block">
                      <span className="text-xs font-bold text-slate-600">{label} <span className="text-rose-500">*</span></span>
                      <input
                        value={form[key]}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder={`Enter ${label.toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>

                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Explanation <span className="text-slate-400">(optional)</span></span>
                  <textarea
                    value={form.explanation}
                    onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))}
                    className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Explain why the answer is correct (shown to students after answering)."
                  />
                </label>
              </div>
            </div>

            {/* ============================================
                CSV BULK IMPORT
                ============================================ */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Bulk Import Questions</h2>
              </div>
              
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Upload and publish many drill questions at once. Each row needs a title, question, category, sub-category, and skill tag.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition"
                  >
                    <FaDownload /> Template
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800 transition">
                    <FaFileImport /> Upload CSV
                    <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-500">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-600">CSV column format</summary>
                <div className="mt-3 space-y-1.5">
                  <p><span className="font-bold text-slate-700">Required columns:</span> drill_title, subject_category, question_type, question_text, diagnostic_subcategory, diagnostic_skill_tag</p>
                  <p><span className="font-bold text-slate-700">For choice questions:</span> option_a through option_f, correct_answer (letter or letters separated by ;)</p>
                  <p><span className="font-bold text-slate-700">For short answer:</span> correct_text</p>
                  <p><span className="font-bold text-slate-700">For paragraph:</span> rubric</p>
                  <p><span className="font-bold text-slate-700">Optional:</span> points, explanation, question_image_url</p>
                </div>
              </details>

              {csvImportResult && (
                <div className={`mt-4 rounded-lg border p-4 text-sm font-semibold ${
                  csvImportResult.importedCount ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"
                }`}>
                  <div className="flex items-center gap-2">
                    {csvImportResult.importedCount ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    {csvImportResult.importedCount 
                      ? `Imported ${csvImportResult.importedCount} drill question(s).` 
                      : "No questions were imported."}
                  </div>
                  {csvImportResult.errors.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-600">
                      {csvImportResult.errors.slice(0, 8).map((error, index) => <li key={index}>{error}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={publishDrill} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                <FaSave /> {editingId ? "Update Drill" : "Publish Drill"}
              </button>
            </div>
            
            {message && (
              <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>
            )}
          </section>

          {/* Sidebar - Published Drills */}
          <aside className="min-w-0 space-y-5">
            <div className="glass-card p-5">
              <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3 text-blue-700">
                <FaBolt />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Published Drills</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{drillBank.length}</p>
              <p className="text-sm font-semibold text-slate-500">Available for weakness practice</p>
            </div>

            <div className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Published Drill Items</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{drillBank.length}</span>
              </div>
              
              <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
                {drillBank.length ? drillBank.map((question) => (
                  <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-base font-black leading-tight text-slate-900">
                          {question.title || "Untitled Drill"}
                        </p>
                        <p className="mt-1 break-words text-xs font-semibold text-slate-500">
                          {stripHtml(question.stem || question.questionHtml) || "No question text"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            {question.questionType || question.type}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {question.points || 1} pt{Number(question.points || 1) === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-2 break-words text-xs font-semibold text-slate-500">
                          {question.subjectTitle || question.category} · {question.diagnosticSubcategory || question.subCategory} · {question.diagnosticSkillTag || question.weaknessTag}
                        </p>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((current) => current === question.id ? null : question.id)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          aria-label={`Actions for ${question.title || "drill"}`}
                        >
                          <FaEllipsisV />
                        </button>
                        {openMenuId === question.id && (
                          <div className="absolute right-0 top-10 z-20 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              onClick={() => editDrill(question)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(question); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              <FaTrash /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="py-6 text-center text-sm text-slate-500">No published drills yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Delete Drill</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600">
                Delete <span className="font-bold text-slate-900">{deleteTarget.title || "this drill"}</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={confirmDeleteDrill} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}