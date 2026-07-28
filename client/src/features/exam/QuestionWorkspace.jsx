import { useForm } from "react-hook-form";

export default function QuestionWorkspace({ section, question, questionIndex, response, onSaveResponse }) {
  const { register, watch } = useForm({ values: { essay: response || "" } });
  const essay = watch("essay") || "";
  const type = question.type || "multiple_choice";
  const isOptionsQuestion = type === "mcq" || type === "multiple_choice" || type === "checkboxes";

  function toggleCheckbox(index) {
    const current = Array.isArray(response) ? response : [];
    if (current.includes(index)) {
      onSaveResponse(current.filter((item) => item !== index));
      return;
    }
    onSaveResponse([...current, index]);
  }

  return (
    <section className="glass-card min-w-0 p-6 md:p-8">
      <p className="text-xs font-black uppercase tracking-wider text-blue-600">
        {section.subjectTitle} - Item {questionIndex + 1} of {section.questions.length}
      </p>
      <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        {getTypeLabel(type)} - {question.points || 1} pt{Number(question.points || 1) === 1 ? "" : "s"}
      </div>
      <div
        className="exam-question-content mt-6 w-full min-w-0 max-w-full text-2xl font-black leading-snug text-slate-950"
        dangerouslySetInnerHTML={{ __html: question.stem }}
      />

      {isOptionsQuestion ? (
        <div className="mt-8 space-y-3">
          {question.choiceOpts.map((option, index) => (
            <button
              key={option}
              onClick={() => (type === "checkboxes" ? toggleCheckbox(index) : onSaveResponse(index))}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left font-medium transition hover:bg-slate-50 ${
                isSelected(type, response, index) ? "border-primary bg-blue-50 text-primary ring-2 ring-blue-900/10" : "border-slate-200 text-slate-700"
              }`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center ${type === "checkboxes" ? "rounded" : "rounded-full"} border text-xs font-bold ${isSelected(type, response, index) ? "border-primary bg-primary text-white" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : type === "short_answer" ? (
        <div className="mt-8">
          <input
            value={response || ""}
            onChange={(event) => onSaveResponse(event.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 p-5 font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            placeholder="Type your short answer..."
          />
        </div>
      ) : (
        <div className="mt-8">
          <textarea
            {...register("essay", { onChange: (event) => onSaveResponse(event.target.value) })}
            className="h-[28rem] w-full max-w-full resize-y rounded-xl border-2 border-slate-200 p-5 font-medium leading-relaxed text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            placeholder="Begin typing your essay response here..."
          />
          <div className="mt-2 flex justify-end gap-4 text-xs font-bold text-slate-400">
            <span>{essay.trim().split(/\s+/).filter(Boolean).length} Words</span>
            <span>{essay.length} Characters</span>
          </div>
        </div>
      )}
    </section>
  );
}

function getTypeLabel(type) {
  if (type === "checkboxes") return "Checkboxes";
  if (type === "short_answer") return "Short Answer";
  if (type === "paragraph" || type === "essay") return "Paragraph";
  return "Multiple Choice";
}

function isSelected(type, response, index) {
  if (type === "checkboxes") {
    return Array.isArray(response) && response.includes(index);
  }

  return response === index;
}
