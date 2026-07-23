import { useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import katex from "katex";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import tinymce from "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/models/dom";
import "tinymce/themes/silver";
import "tinymce/skins/ui/oxide/skin.css";
import "tinymce/skins/content/default/content.css";
import "tinymce/plugins/advlist";
import "tinymce/plugins/anchor";
import "tinymce/plugins/autolink";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/codesample";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/help";
import "tinymce/plugins/image";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/media";
import "tinymce/plugins/preview";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/wordcount";

// The React wrapper discovers a self-hosted TinyMCE instance from window.tinymce.
if (typeof window !== "undefined") window.tinymce = tinymce;

const plugins = "advlist anchor autolink charmap code codesample fullscreen help image insertdatetime link lists media preview searchreplace table visualblocks wordcount";

export default function TinyMCEEditor({ value = "", onChange, placeholder, minHeightClass = "min-h-44" }) {
  const [formulaPreview, setFormulaPreview] = useState("");

  return (
    <div className="mt-2">
      <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-blue-500 ${minHeightClass}`}>
        <Editor
        value={value}
        onEditorChange={onChange}
        licenseKey="gpl"
        init={{
          height: minHeightClass.includes("72") ? 432 : 280,
          menubar: "file edit view insert format table tools",
          plugins,
          toolbar_mode: "wrap",
          toolbar: "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media formula | blockquote codesample code | table tableinsertrowbefore tableinsertrowafter tabledelete rowprops cellprops | removeformat | wordcount",
          table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells",
          font_family_formats: "Inter=Inter,Arial,sans-serif; Arial=arial,helvetica,sans-serif; Georgia=georgia,palatino,serif; Times New Roman='times new roman',times,serif; Courier New='courier new',courier,monospace",
          fontsize_formats: "8pt 10pt 12pt 14pt 18pt 24pt 36pt 48pt",
          placeholder,
          branding: false,
          promotion: false,
          statusbar: true,
          resize: true,
          content_style: "body { font-family: Inter, Arial, sans-serif; font-size: 15px; line-height: 1.7; padding: 8px; } .math-inline { display: inline-block; vertical-align: middle; }",
          images_upload_handler: async (blobInfo) => `data:${blobInfo.blob().type};base64,${blobInfo.base64()}`,
          setup(editor) {
            editor.ui.registry.addButton("formula", {
              icon: "superscript",
              tooltip: "Insert LaTeX formula",
              onAction: () => {
                editor.windowManager.open({
                  title: "Insert mathematical formula",
                  body: { type: "panel", items: [{ type: "input", name: "latex", label: "LaTeX (example: \\frac{a}{b} or \\sqrt{x})" }] },
                  buttons: [
                    { type: "cancel", text: "Cancel" },
                    { type: "submit", text: "Insert", primary: true }
                  ],
                  onSubmit: (api) => {
                    const latex = api.getData().latex.trim();
                    if (!latex) return;
                    const rendered = katex.renderToString(latex, { displayMode: false, throwOnError: false });
                    editor.insertContent(`<span class="math-inline" data-latex="${tinymce.DOM.encode(latex)}">${rendered}</span>`);
                    setFormulaPreview(latex);
                    api.close();
                  }
                });
              }
            });
          }
          }}
        />
      </div>
      {formulaPreview && (
        <p className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500" aria-live="polite">
          Formula preview: <InlineMath math={formulaPreview} errorColor="#dc2626" />
        </p>
      )}
    </div>
  );
}
