import { useState } from "react";
import { FaBookOpen, FaCheckCircle, FaChevronDown, FaChevronUp, FaPlayCircle, FaFileAlt, FaExternalLinkAlt, FaArrowRight } from "react-icons/fa";
import { getCurrentUser, getReviewerBlueprints, getReviewerProgress, setReviewerModuleCompletion } from "../services/storage";

export default function ReviewersPage() {
  const user = getCurrentUser();
  const reviewers = getReviewerBlueprints();
  const [progress, setProgress] = useState(() => getReviewerProgress(user?.email));
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState(null);

  function toggleModule(reviewerId, moduleId, completed) {
    const nextProgress = setReviewerModuleCompletion(user.email, reviewerId, moduleId, !completed);
    setProgress(nextProgress);
  }

  function renderContent(html) {
    if (!html) return <p className="text-slate-500 italic">No content available for this module.</p>;
    
    let cleanHtml = html
      .replace(/<p><br><\/p>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    return <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  }

  function getVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  }

  if (!reviewers.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-6xl">
          <header className="mb-10">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Study Plan</p>
            <h1 className="mt-2 text-4xl font-black text-slate-900">Published Study Modules</h1>
            <p className="mt-2 text-sm text-slate-500">Work through the reading materials and resources prepared for your ACET review.</p>
          </header>
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl text-slate-400">
              <FaBookOpen />
            </div>
            <h2 className="text-xl font-bold text-slate-700">No study modules yet</h2>
            <p className="mt-1 text-sm text-slate-500">Published study materials will appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <header className="mb-10">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Study Plan</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Published Study Modules</h1>
          <p className="mt-2 text-sm text-slate-500">Read each module, use its attached resource, and update your progress as you study.</p>
        </header>

        {/* Subject Selection Grid */}
        {!selectedReviewerId ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviewers.map((reviewer) => {
              const completedModules = progress[reviewer.id] || [];
              const totalModules = reviewer.modules?.length || 0;
              const completionRate = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

              return (
                <button
                  key={reviewer.id}
                  onClick={() => setSelectedReviewerId(reviewer.id)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"
                >
                  <div className="absolute left-0 right-0 top-0 h-1 bg-slate-100">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  
                  <div className="mt-3">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                        <FaBookOpen className="text-lg" />
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                        {reviewer.subjectCategory || "General"}
                      </span>
                    </div>
                    
                    <h2 className="text-lg font-bold text-slate-900 line-clamp-2">
                      {reviewer.title || "Untitled Reviewer"}
                    </h2>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        {completedModules.length} of {totalModules} modules completed
                      </span>
                      <button className="btn">
                        Start Learning <FaArrowRight className="ml-2 text-xs" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Module Detail View */
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => {
                setSelectedReviewerId(null);
                setSelectedModule(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              ← Back to all subjects
            </button>

            {reviewers.filter((reviewer) => reviewer.id === selectedReviewerId).map((reviewer) => {
              const completedModules = progress[reviewer.id] || [];
              const totalModules = reviewer.modules?.length || 0;
              const completionRate = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

              return (
                <article key={reviewer.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Reviewer Header */}
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                          <FaBookOpen className="text-xl" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                            {reviewer.subjectCategory || "Study Module"}
                          </p>
                          <h2 className="mt-1 text-2xl font-bold text-slate-900">
                            {reviewer.title || "Untitled Reviewer"}
                          </h2>
                          <div className="mt-2 flex items-center gap-4">
                            <span className="text-sm text-slate-500">
                              {completedModules.length} of {totalModules} modules completed
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-600">
                                {completionRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modules List */}
                  <div className="divide-y divide-slate-100">
                    {reviewer.modules?.map((module, index) => {
                      const completed = completedModules.includes(module.id);
                      const isOpen = selectedModule?.reviewerId === reviewer.id && selectedModule?.moduleId === module.id;
                      const videoId = getVideoId(module.videoUrl);

                      return (
                        <div key={module.id}>
                          {/* Module Header (clickable) */}
                          <button
                            type="button"
                            onClick={() => setSelectedModule(isOpen ? null : { reviewerId: reviewer.id, moduleId: module.id })}
                            className={`flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-all ${
                              isOpen 
                                ? 'bg-blue-50/50' 
                                : 'hover:bg-slate-50'
                            }`}
                            aria-expanded={isOpen}
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                completed 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {completed ? <FaCheckCircle className="text-emerald-600" /> : index + 1}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Module {index + 1}
                                </span>
                                <span className="mt-0.5 block truncate text-base font-bold text-slate-900">
                                  {module.title || `Module ${index + 1}`}
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 text-slate-400">
                              {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                            </span>
                          </button>

                          {/* Module Content (expanded) */}
                          {isOpen && (
                            <div className="border-t border-blue-100 bg-blue-50/20 p-6">
                              {/* Video FIRST - Full width at top */}
                              {videoId && (
                                <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                                  <div className="aspect-video">
                                    <iframe
                                      className="h-full w-full"
                                      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                                      title={module.title}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2">
                                    <FaPlayCircle className="text-blue-600" />
                                    <span className="text-sm font-semibold text-slate-700">Video: {module.title}</span>
                                  </div>
                                </div>
                              )}

                              {/* Content and Controls - Full width below video */}
                              <div className="space-y-6">
                                {/* Module Content */}
                                <div>
                                  <div className="mb-3 flex items-center gap-2">
                                    <FaFileAlt className="text-blue-600" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                      Module Content
                                    </span>
                                  </div>
                                  
                                  <div className="prose prose-slate max-w-none">
                                    {renderContent(module.content)}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
                                  <button
                                    onClick={() => toggleModule(reviewer.id, module.id, completed)}
                                    aria-pressed={completed}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 ${
                                      completed 
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-100' 
                                        : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-100'
                                    }`}
                                  >
                                    <FaCheckCircle />
                                    {completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                                  </button>

                                  {/* Module Status */}
                                  <div className="flex items-center gap-4">
                                    <span className={`text-sm font-semibold ${
                                      completed ? 'text-emerald-600' : 'text-slate-500'
                                    }`}>
                                      {completed ? '✅ Completed' : '⏳ In Progress'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {index + 1} of {totalModules}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Button Styles */}
      <style>{`
        .btn {
          position: relative;
          font-size: 14px;
          text-transform: uppercase;
          text-decoration: none;
          padding: 0.8em 1.8em;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          border-radius: 6em;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
          font-weight: 600;
          color: black;
          background-color: white;
          letter-spacing: 0.5px;
        }

        .btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .btn:active {
          transform: translateY(-1px);
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
        }

        .btn::after {
          content: "";
          display: inline-block;
          height: 100%;
          width: 100%;
          border-radius: 100px;
          position: absolute;
          top: 0;
          left: 0;
          z-index: -1;
          transition: all 0.4s;
          background-color: #fff;
        }

        .btn:hover::after {
          transform: scaleX(1.4) scaleY(1.6);
          opacity: 0;
        }
      `}</style>
    </div>
  );
}