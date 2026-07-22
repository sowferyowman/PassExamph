import { useMemo, useState } from "react";
import { FaBolt, FaEdit, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import AdminSidebar from "../components/AdminSidebar";
import PremiumRichTextEditor from "../components/PremiumRichTextEditor";
import { deleteDrillQuestion, getDrillBankQuestions, publishDrillQuestion, updateDrillQuestion } from "../services/storage";

const emptyForm = {
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
  explanation: ""
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

export default function CreateDrill() {
  const [form, setForm] = useState(emptyForm);
  const [drillBank, setDrillBank] = useState(() => getDrillBankQuestions());
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const subjectCounts = useMemo(() => {
    return drillBank.reduce((counts, question) => {
      counts[question.subjectTitle] = (counts[question.subjectTitle] || 0) + 1;
      return counts;
    }, {});
  }, [drillBank]);

  function updateOption(index, value) {
    setForm((current) => ({
      ...current,
      choiceOpts: current.choiceOpts.map((option, optionIndex) => (optionIndex === index ? value : option))
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      choiceOpts: [...current.choiceOpts, ""]
    }));
  }

  function removeOption(index) {
    if (form.choiceOpts.length <= 2) {
      setMessage("You need at least 2 options.");
      return;
    }
    setForm((current) => ({
      ...current,
      choiceOpts: current.choiceOpts.filter((_, i) => i !== index),
      answerIdx: current.answerIdx >= current.choiceOpts.length - 1 ? 0 : 
                 (current.answerIdx === index ? 0 : 
                  current.answerIdx > index ? current.answerIdx - 1 : current.answerIdx),
      correctAnswers: current.correctAnswers
        .filter(idx => idx !== index)
        .map(idx => idx > index ? idx - 1 : idx)
    }));
  }

  function updateQuestionType(questionType) {
    setForm((current) => ({
      ...current,
      questionType,
      type: questionType,
      choiceOpts: usesOptions(questionType) ? (current.choiceOpts.length >= 2 ? current.choiceOpts : ["", ""]) : [],
      answerIdx: 0,
      correctAnswers: [],
      correctText: "",
      gradingPlaceholder: questionType === "paragraph" ? current.gradingPlaceholder : ""
    }));
  }

  function validateForm() {
    if (!stripHtml(form.stem)) return "Question text is required.";
    if (usesOptions(form.questionType) && form.choiceOpts.some((option) => !option.trim())) return "All options must be filled.";
    if (usesOptions(form.questionType) && form.choiceOpts.length < 2) return "You need at least 2 options.";
    if (form.questionType === "checkboxes" && !form.correctAnswers.length) return "Checkbox questions need at least one correct answer.";
    if (form.questionType === "short_answer" && !form.correctText.trim()) return "Short Answer needs a correct keyphrase answer.";
    if (form.questionType === "paragraph" && !form.gradingPlaceholder.trim()) return "Long Paragraph needs a descriptive grading placeholder.";
    if (!form.subjectTitle.trim()) return "Subject category is required.";
    if (!form.diagnosticSubcategory.trim()) return "Sub-category is required.";
    if (!form.diagnosticSkillTag.trim()) return "Specific weakness tag is required.";
    return "";
  }

  function publishDrill() {
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    const drillPayload = {
      ...form,
      type: form.questionType,
      questionType: form.questionType,
      questionHtml: form.stem,
      choiceOpts: usesOptions(form.questionType) ? form.choiceOpts.map((option) => option.trim()) : [],
      answerIdx: form.questionType === "multiple_choice" ? form.answerIdx : 0,
      correctAnswers: form.questionType === "checkboxes" ? form.correctAnswers : [],
      correctText: form.questionType === "short_answer" ? form.correctText.trim() : form.gradingPlaceholder.trim(),
      diagnosticSubcategory: form.diagnosticSubcategory.trim(),
      diagnosticSkillTag: form.diagnosticSkillTag.trim(),
      category: form.subjectTitle,
      subCategory: form.diagnosticSubcategory.trim(),
      weaknessTag: form.diagnosticSkillTag.trim(),
      structuralTags: {
        category: form.subjectTitle,
        subCategory: form.diagnosticSubcategory.trim(),
        weaknessTag: form.diagnosticSkillTag.trim(),
        path: [form.subjectTitle, form.diagnosticSubcategory.trim(), form.diagnosticSkillTag.trim()]
      }
    };
    const published = editingId ? updateDrillQuestion(editingId, drillPayload) : publishDrillQuestion(drillPayload);

    setDrillBank(getDrillBankQuestions());
    setEditingId(null);
    setForm({ ...emptyForm, subjectTitle: form.subjectTitle });
    setMessage(`${editingId ? "Updated" : "Published"} drill question under ${published.subjectTitle} -> ${published.diagnosticSubcategory} -> ${published.diagnosticSkillTag}.`);
  }

  function editDrill(question) {
    setEditingId(question.id);
    setForm({ ...emptyForm, ...question, questionType: question.questionType || question.type || "multiple_choice", stem: question.stem || question.questionHtml || "", gradingPlaceholder: question.gradingPlaceholder || (question.type === "paragraph" ? question.correctText || "" : "") });
    setMessage(`Editing drill: ${question.subjectTitle || "Untitled"}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeDrill(question) {
    setDeleteTarget(question);
  }

  function confirmDeleteDrill() {
    if (!deleteTarget) return;
    deleteDrillQuestion(deleteTarget.id);
    setDrillBank(getDrillBankQuestions());
    setMessage("Drill deleted successfully.");
    setDeleteTarget(null);
  }

  function renderAnswerWorkspace() {
    if (usesOptions(form.questionType)) {
      return (
        <>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Options <span className="text-rose-500">*</span>
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
              {form.choiceOpts.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <span className="w-8 text-sm font-bold text-slate-500 text-center">
                    {getOptionLabel(optionIndex)}
                  </span>
                  <input
                    value={option}
                    onChange={(event) => updateOption(optionIndex, event.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder={`Option ${getOptionLabel(optionIndex)}`}
                  />
                  {form.questionType === "multiple_choice" && (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, answerIdx: optionIndex }))}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                        form.answerIdx === optionIndex
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {form.answerIdx === optionIndex ? "✓ Correct" : "Set Correct"}
                    </button>
                  )}
                  {form.questionType === "checkboxes" && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentCorrect = form.correctAnswers || [];
                        const newCorrect = currentCorrect.includes(optionIndex)
                          ? currentCorrect.filter(idx => idx !== optionIndex)
                          : [...currentCorrect, optionIndex].sort((a, b) => a - b);
                        setForm((current) => ({ ...current, correctAnswers: newCorrect }));
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                        (form.correctAnswers || []).includes(optionIndex)
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {(form.correctAnswers || []).includes(optionIndex) ? "✓ Correct" : "Mark Correct"}
                    </button>
                  )}
                  {form.choiceOpts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(optionIndex)}
                      className="text-rose-400 hover:text-rose-600 transition p-1"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {form.questionType === "checkboxes" && (
              <div className="mt-3 text-xs font-semibold text-slate-500">
                Selected correct options: {(form.correctAnswers || []).length > 0 
                  ? (form.correctAnswers || []).map(idx => getOptionLabel(idx)).join(', ') 
                  : 'None selected'}
              </div>
            )}
          </div>
        </>
      );
    }

    if (form.questionType === "short_answer") {
      return (
        <div className="mt-4">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Answer Key <span className="text-rose-500">*</span></span>
            <input
              value={form.correctText}
              onChange={(event) => setForm((current) => ({ ...current, correctText: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
              placeholder="Enter the correct answer"
            />
          </label>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Sample Answer / Rubric <span className="text-slate-400">(optional)</span></span>
          <textarea
            value={form.gradingPlaceholder}
            onChange={(event) => setForm((current) => ({ ...current, gradingPlaceholder: event.target.value }))}
            className="mt-2 min-h-28 w-full resize-y rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
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
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Admin Workspace</p>
            <h1 className="text-2xl font-black text-slate-950">Create Drill</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Publish remediation-only questions into drillBankData for student weakness practice.</p>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[1fr_20rem]">
          <section className="space-y-5">
            <div className="glass-card p-6">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Question Text <span className="text-rose-500">*</span></span>
                <PremiumRichTextEditor
                  value={form.stem}
                  onChange={(value) => setForm((current) => ({ ...current, stem: value }))}
                  placeholder="Write the drill question here..."
                />
              </label>
            </div>

            <div className="glass-card p-6">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Question Type</span>
                <select
                  value={form.questionType}
                  onChange={(event) => updateQuestionType(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="checkboxes">Checkbox</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="paragraph">Long Paragraph</option>
                </select>
              </label>

              {renderAnswerWorkspace()}
            </div>

            <div className="glass-card p-6">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">AI Classification Metadata</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Subject Category <span className="text-rose-500">*</span></span>
                  <input
                    value={form.subjectTitle}
                    onChange={(event) => setForm((current) => ({ ...current, subjectTitle: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="e.g., Mathematics, English"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Sub-Category <span className="text-rose-500">*</span></span>
                  <input
                    value={form.diagnosticSubcategory}
                    onChange={(event) => setForm((current) => ({ ...current, diagnosticSubcategory: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="e.g., Algebra, Reading Inference"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Skill Tag <span className="text-rose-500">*</span></span>
                  <input
                    value={form.diagnosticSkillTag}
                    onChange={(event) => setForm((current) => ({ ...current, diagnosticSkillTag: event.target.value }))}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    placeholder="e.g., Double Negatives, Rate Problems"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={publishDrill} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                <FaSave /> {editingId ? "Update Drill" : "Publish to Drill Bank"}
              </button>
              {editingId && <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600">Cancel Edit</button>}
            </div>
            {message && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</p>}
          </section>

          <aside className="space-y-5">
            <div className="glass-card p-5">
              <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3 text-blue-700">
                <FaBolt />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Drill Bank</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{drillBank.length}</p>
              <p className="text-sm font-semibold text-slate-500">Questions in drillBankData</p>
            </div>

            <div className="glass-card p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Subject Coverage</p>
              <div className="mt-4 space-y-3">
                {Object.keys(subjectCounts).length ? Object.entries(subjectCounts).map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-black text-slate-900">{subject}</p>
                    <p className="text-xs font-black text-blue-600">{count}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No drill questions published yet.</p>}
              </div>
            </div>

            <div className="glass-card p-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Latest Drill Items</p>
              <div className="mt-4 space-y-3">
                {drillBank.slice(0, 4).map((question) => (
                  <div key={question.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-black text-slate-900">{stripHtml(question.stem)}</p><div className="flex shrink-0 gap-1"><button onClick={() => editDrill(question)} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Edit drill"><FaEdit /></button><button onClick={() => removeDrill(question)} className="rounded p-1 text-rose-600 hover:bg-rose-50" title="Delete drill"><FaTrash /></button></div></div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{question.subjectTitle} / {question.diagnosticSubcategory} / {question.diagnosticSkillTag}</p>
                  </div>
                ))}
                {!drillBank.length && <p className="text-sm text-slate-500">Published drill questions will appear here.</p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600"><FaTrash /></div>
                <h3 className="text-lg font-bold text-slate-900">Delete Drill</h3>
              </div>
            </div>
            <div className="px-6 py-5"><p className="text-sm leading-relaxed text-slate-600">Delete this drill from <span className="font-bold text-slate-900">{deleteTarget.subjectTitle || "the drill bank"}</span>?</p><p className="mt-2 text-xs text-rose-600">This action cannot be undone.</p></div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4"><button onClick={() => setDeleteTarget(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button onClick={confirmDeleteDrill} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 hover:bg-rose-700">Yes, Delete</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
