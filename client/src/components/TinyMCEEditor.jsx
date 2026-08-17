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

// Keep this list in one place: TinyMCE writes the selected family inline, and
// the same Google stylesheet is loaded by the app for published questions and
// reviewer modules.
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=ABeeZee&family=Abril+Fatface&family=Anton&family=Arvo&family=Bebas+Neue&family=Bitter&family=Cabin&family=Caveat&family=Comfortaa&family=Concert+One&family=Courier+Prime&family=Crimson+Text&family=DM+Mono&family=DM+Sans&family=DM+Serif+Display&family=Dancing+Script&family=EB+Garamond&family=Exo+2&family=Fira+Code&family=Fira+Sans&family=Fraunces&family=Great+Vibes&family=Inconsolata&family=Indie+Flower&family=Inter&family=Josefin+Sans&family=Kalam&family=Karla&family=Lato&family=Lexend&family=Libre+Baskerville&family=Lobster&family=Manrope&family=Merriweather&family=Montserrat&family=Mulish&family=Nunito&family=Nunito+Sans&family=Open+Sans&family=Oswald&family=Outfit&family=Pacifico&family=Patrick+Hand&family=Playfair+Display&family=Plus+Jakarta+Sans&family=Poppins&family=Press+Start+2P&family=PT+Mono&family=PT+Sans&family=PT+Serif&family=Quicksand&family=Raleway&family=Roboto&family=Roboto+Condensed&family=Roboto+Mono&family=Roboto+Slab&family=Rokkitt&family=Rubik&family=Sacramento&family=Shadows+Into+Light&family=Source+Code+Pro&family=Source+Sans+3&family=Space+Grotesk&family=Space+Mono&family=Spectral&family=Ubuntu&family=Ubuntu+Mono&family=Vollkorn&family=Work+Sans&family=Yeseva+One&display=swap";

const fontFamilies = [
  ["Inter", "Inter,Arial,sans-serif"], ["Arial", "Arial,Helvetica,sans-serif"], ["Arial Black", "Arial Black,Gadget,sans-serif"], ["Comic Sans MS", "Comic Sans MS,cursive"], ["Courier New", "Courier New,Courier,monospace"], ["Georgia", "Georgia,Palatino,serif"], ["Helvetica", "Helvetica,Arial,sans-serif"], ["Impact", "Impact,Charcoal,sans-serif"], ["Lucida Console", "Lucida Console,Monaco,monospace"], ["Lucida Sans Unicode", "Lucida Sans Unicode,Lucida Grande,sans-serif"], ["Palatino", "Palatino Linotype,Book Antiqua,Palatino,serif"], ["Tahoma", "Tahoma,Geneva,sans-serif"], ["Times New Roman", "Times New Roman,Times,serif"], ["Trebuchet MS", "Trebuchet MS,Helvetica,sans-serif"], ["Verdana", "Verdana,Geneva,sans-serif"],
  ["ABeeZee", "ABeeZee,sans-serif"], ["Abril Fatface", "Abril Fatface,serif"], ["Anton", "Anton,sans-serif"], ["Arvo", "Arvo,serif"], ["Bebas Neue", "Bebas Neue,sans-serif"], ["Bitter", "Bitter,serif"], ["Cabin", "Cabin,sans-serif"], ["Caveat", "Caveat,cursive"], ["Comfortaa", "Comfortaa,sans-serif"], ["Concert One", "Concert One,sans-serif"], ["Courier Prime", "Courier Prime,monospace"], ["Crimson Text", "Crimson Text,serif"], ["DM Mono", "DM Mono,monospace"], ["DM Sans", "DM Sans,sans-serif"], ["DM Serif Display", "DM Serif Display,serif"], ["Dancing Script", "Dancing Script,cursive"], ["EB Garamond", "EB Garamond,serif"], ["Exo 2", "Exo 2,sans-serif"], ["Fira Code", "Fira Code,monospace"], ["Fira Sans", "Fira Sans,sans-serif"], ["Fraunces", "Fraunces,serif"], ["Great Vibes", "Great Vibes,cursive"], ["Inconsolata", "Inconsolata,monospace"], ["Indie Flower", "Indie Flower,cursive"], ["Josefin Sans", "Josefin Sans,sans-serif"], ["Kalam", "Kalam,cursive"], ["Karla", "Karla,sans-serif"], ["Lato", "Lato,sans-serif"], ["Lexend", "Lexend,sans-serif"], ["Libre Baskerville", "Libre Baskerville,serif"], ["Lobster", "Lobster,cursive"], ["Manrope", "Manrope,sans-serif"], ["Merriweather", "Merriweather,serif"], ["Montserrat", "Montserrat,sans-serif"], ["Mulish", "Mulish,sans-serif"], ["Nunito", "Nunito,sans-serif"], ["Nunito Sans", "Nunito Sans,sans-serif"], ["Open Sans", "Open Sans,sans-serif"], ["Oswald", "Oswald,sans-serif"], ["Outfit", "Outfit,sans-serif"], ["Pacifico", "Pacifico,cursive"], ["Patrick Hand", "Patrick Hand,cursive"], ["Playfair Display", "Playfair Display,serif"], ["Plus Jakarta Sans", "Plus Jakarta Sans,sans-serif"], ["Poppins", "Poppins,sans-serif"], ["Press Start 2P", "Press Start 2P,monospace"], ["PT Mono", "PT Mono,monospace"], ["PT Sans", "PT Sans,sans-serif"], ["PT Serif", "PT Serif,serif"], ["Quicksand", "Quicksand,sans-serif"], ["Raleway", "Raleway,sans-serif"], ["Roboto", "Roboto,sans-serif"], ["Roboto Condensed", "Roboto Condensed,sans-serif"], ["Roboto Mono", "Roboto Mono,monospace"], ["Roboto Slab", "Roboto Slab,serif"], ["Rokkitt", "Rokkitt,serif"], ["Rubik", "Rubik,sans-serif"], ["Sacramento", "Sacramento,cursive"], ["Shadows Into Light", "Shadows Into Light,cursive"], ["Source Code Pro", "Source Code Pro,monospace"], ["Source Sans 3", "Source Sans 3,sans-serif"], ["Space Grotesk", "Space Grotesk,sans-serif"], ["Space Mono", "Space Mono,monospace"], ["Spectral", "Spectral,serif"], ["Ubuntu", "Ubuntu,sans-serif"], ["Ubuntu Mono", "Ubuntu Mono,monospace"], ["Vollkorn", "Vollkorn,serif"], ["Work Sans", "Work Sans,sans-serif"], ["Yeseva One", "Yeseva One,serif"]
];

const fontFamilyFormats = fontFamilies.map(([label, stack]) => `${label}=${stack}`).join(";");

export default function TinyMCEEditor({ value = "", onChange, placeholder, minHeightClass = "min-h-44", height = 280 }) {
  const [formulaPreview, setFormulaPreview] = useState("");

  return (
    <div className="mt-2">
      {/*
        Keep TinyMCE's chrome visible. The authoring pages place this editor in
        overflow-constrained panels; without these rules, the TinyMCE 8 header
        can collapse in production while the editable iframe and status bar
        remain visible.
      */}
      <style>{`
        .acet-rich-text .tox .tox-editor-header,
        .acet-rich-text .tox .tox-menubar,
        .acet-rich-text .tox .tox-toolbar-overlord,
        .acet-rich-text .tox .tox-toolbar {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .acet-rich-text .tox .tox-menubar,
        .acet-rich-text .tox .tox-toolbar {
          display: flex !important;
        }
        .acet-rich-text .tox .tox-editor-header {
          position: relative !important;
          z-index: 1;
          min-height: 76px;
        }
      `}</style>
      <div className={`acet-rich-text overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-blue-500 ${minHeightClass}`}>
        <Editor
        value={value}
        onEditorChange={onChange}
        licenseKey="gpl"
        init={{
          height,
          menubar: "file edit view insert format table tools",
          plugins,
          toolbar_mode: "wrap",
          toolbar: "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media formula | blockquote codesample code | table tableinsertrowbefore tableinsertrowafter tabledelete rowprops cellprops | removeformat | wordcount",
          table_toolbar: "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells",
          font_family_formats: fontFamilyFormats,
          fontsize_formats: "8pt 10pt 12pt 14pt 18pt 24pt 36pt 48pt",
          placeholder,
          branding: false,
          promotion: false,
          statusbar: true,
          resize: true,
          content_css: GOOGLE_FONTS_URL,
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
