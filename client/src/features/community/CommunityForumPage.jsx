import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBookOpen,
  FaBug,
  FaCommentDots,
  FaFilter,
  FaLightbulb,
  FaNewspaper,
  FaPlus,
  FaQuestionCircle,
  FaReply,
  FaSearch,
  FaTrophy,
  FaUserCircle
} from "react-icons/fa";
import {
  addForumReply,
  createForumThread,
  getCurrentUser,
  getFreshLeaderboard,
  getForumThreads,
  getLeaderboard,
  toggleForumReaction
} from "../../services/storage";

const POSTS_PER_PAGE = 10;
const LEADERBOARD_PER_PAGE = 10;
const forumCategories = ["Get Started", "Newsroom", "Share Knowledge", "Suggest an Idea", "Report an Issue"];

// Extra display metadata for the category picker cards. Keys must match forumCategories exactly.
const categoryMeta = {
  "Get Started": {
    icon: FaBookOpen,
    iconClass: "bg-blue-50 text-blue-600",
    description: "New to the forum? Here's what you need to know."
  },
  "Newsroom": {
    icon: FaNewspaper,
    iconClass: "bg-violet-50 text-violet-600",
    description: "Announcements, AMA events, and sneak previews of what's next."
  },
  "Share Knowledge": {
    icon: FaQuestionCircle,
    iconClass: "bg-lime-50 text-lime-600",
    description: "Ask questions, show off your study skills, or simply browse around."
  },
  "Suggest an Idea": {
    icon: FaLightbulb,
    iconClass: "bg-amber-50 text-amber-600",
    description: "Got an idea for the platform? Share it here and upvote your favorites."
  },
  "Report an Issue": {
    icon: FaBug,
    iconClass: "bg-rose-50 text-rose-600",
    description: "Ran into an issue? Not sure if it's a bug? You can share it right here."
  }
};

const reactionOptions = [
  { type: "like", label: "Like", activeClass: "border-blue-200 bg-blue-50 text-blue-700" },
  { type: "insightful", label: "Insightful", activeClass: "border-amber-200 bg-amber-50 text-amber-700" },
  { type: "fire", label: "Fire", activeClass: "border-rose-200 bg-rose-50 text-rose-700" }
];

export default function CommunityForumPage() {
  const user = getCurrentUser();
  const [threads, setThreads] = useState(() => getForumThreads());
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: "", body: "", tag: "Share Knowledge" });
  const [replyDrafts, setReplyDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedThreadIds, setExpandedThreadIds] = useState({});

  // Controls whether the category picker or the thread list is shown.
  // Starts true so the forum opens on the category grid (matches the reference layout).
  const [browsingCategory, setBrowsingCategory] = useState(true);

  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard(user?.email));
  const [leaderboardPage, setLeaderboardPage] = useState(1);

  const leaderboardTotalPages = Math.max(1, Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE));
  const paginatedLeaderboard = leaderboard.slice(
    (leaderboardPage - 1) * LEADERBOARD_PER_PAGE,
    leaderboardPage * LEADERBOARD_PER_PAGE
  );

  useEffect(() => {
    if (leaderboardPage > leaderboardTotalPages) setLeaderboardPage(leaderboardTotalPages);
  }, [leaderboardPage, leaderboardTotalPages]);

  const subjectTags = useMemo(() => [...new Set([...forumCategories, ...threads.map((thread) => thread.tag).filter(Boolean)])], [threads]);
  const filteredThreads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return threads.filter((thread) => {
      const matchesQuery = !query || `${thread.title} ${thread.body}`.toLowerCase().includes(query);
      const matchesTag = tagFilter === "all" || thread.tag === tagFilter;
      return matchesQuery && matchesTag;
    });
  }, [threads, searchTerm, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / POSTS_PER_PAGE));
  const paginatedThreads = filteredThreads.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  useEffect(() => setPage(1), [searchTerm, tagFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    let cancelled = false;
    async function refreshCommunityData() {
      setThreads(getForumThreads());
      try {
        const freshLeaderboard = await getFreshLeaderboard(user?.email);
        if (!cancelled) setLeaderboard(freshLeaderboard);
      } catch (_error) {
        // Preserve the local/offline fallback if the server is unavailable.
        if (!cancelled) setLeaderboard(getLeaderboard(user?.email));
      }
    }

    refreshCommunityData();
    window.addEventListener("forumPostsUpdated", refreshCommunityData);
    window.addEventListener("storage", refreshCommunityData);
    return () => {
      cancelled = true;
      window.removeEventListener("forumPostsUpdated", refreshCommunityData);
      window.removeEventListener("storage", refreshCommunityData);
    };
  }, [user?.email]);

  function submitTopic(event) {
    event.preventDefault();
    if (!topicForm.title.trim() || !topicForm.body.trim()) return;
    createForumThread(user, topicForm);
    setThreads(getForumThreads());
    setTopicForm({ title: "", body: "", tag: "Share Knowledge" });
    setShowTopicForm(false);
  }

  function submitReply(threadId) {
    const body = replyDrafts[threadId];
    if (!body?.trim()) return;
    addForumReply(user, threadId, body);
    setThreads(getForumThreads());
    setReplyDrafts((current) => ({ ...current, [threadId]: "" }));
  }

  function toggleReaction(threadId, reactionType) {
    if (!user?.id) return;
    toggleForumReaction(threadId, reactionType, user.id);
    setThreads(getForumThreads());
  }

  // Clicking a category card jumps into the filtered thread view for that category.
  function openCategory(category) {
    setTagFilter(category);
    setSearchTerm("");
    setBrowsingCategory(false);
  }

  function backToCategories() {
    setBrowsingCategory(true);
    setTagFilter("all");
    setSearchTerm("");
  }

  return (
    <div className="min-h-screen bg-gray-50 px-5 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">Community Forum</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">Student Discussion Hub</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Ask questions, compare strategies, and react to useful student posts.</p>
          </div>
          <button onClick={() => setShowTopicForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-blue-700">
            <FaPlus /> New Topic
          </button>
        </header>

        {showTopicForm && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <form onSubmit={submitTopic}>
              <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
                <input value={topicForm.title} onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Topic title" />
                <select value={topicForm.tag} onChange={(event) => setTopicForm((current) => ({ ...current, tag: event.target.value }))} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">{forumCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
              </div>
              <textarea value={topicForm.body} onChange={(event) => setTopicForm((current) => ({ ...current, body: event.target.value }))} className="mt-3 h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="What do you want to discuss?" />
              <div className="mt-3 flex justify-end">
                <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-blue-700">Post Topic</button>
              </div>
            </form>
          </section>
        )}

        {browsingCategory ? (
          // ── Category picker (landing view) ──────────────────────────────
          <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="divide-y divide-gray-100">
              {forumCategories.map((category) => {
                const meta = categoryMeta[category];
                const Icon = meta.icon;
                const count = threads.filter((thread) => thread.tag === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => openCategory(category)}
                    className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-gray-50 sm:rounded-xl sm:px-3"
                  >
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${meta.iconClass}`}>
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-950">{category}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-slate-500">{meta.description}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-slate-500">{count} {count === 1 ? "post" : "posts"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          // ── Filtered thread view ─────────────────────────────────────────
          <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
            <main className="space-y-5">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={backToCategories} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 hover:text-blue-900">
                    <FaArrowLeft /> All Categories
                  </button>
                  {tagFilter !== "all" && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">{tagFilter}</span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_16rem]">
                  <label className="relative block">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Search titles and discussion content..." />
                  </label>
                  <label className="relative block">
                    <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-black outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                      <option value="all">All subject tags</option>
                      {subjectTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <FilterChip active={tagFilter === "all"} onClick={() => setTagFilter("all")}>All</FilterChip>
                  {forumCategories.map((tag) => <FilterChip key={tag} active={tagFilter === tag} onClick={() => setTagFilter(tag)}>{tag}</FilterChip>)}
                </div>
              </section>

              <section className="space-y-3">
                {paginatedThreads.map((thread) => (
                  <article key={thread.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-slate-500">
                          <FaUserCircle className="text-xl" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-950">{thread.title}</h3>
                          <p className="mt-0.5 text-xs font-semibold text-slate-400">{thread.author} <span className="mx-1">|</span> {formatElapsed(thread.createdAt)}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">{thread.tag}</span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-slate-600">{expandedThreadIds[thread.id] ? thread.body : `${thread.body.slice(0, 170)}${thread.body.length > 170 ? "…" : ""}`}</p>
                    <button type="button" onClick={() => setExpandedThreadIds((current) => ({ ...current, [thread.id]: !current[thread.id] }))} className="mt-3 text-xs font-black text-blue-700 hover:text-blue-900">{expandedThreadIds[thread.id] ? "Show less" : "Read full post"}</button>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                      <ReactionBar thread={thread} userId={user?.id} onToggle={(reactionType) => toggleReaction(thread.id, reactionType)} />
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><FaCommentDots /> {thread.replies?.length || 0} Replies</div>
                    </div>

                    {expandedThreadIds[thread.id] && !!thread.replies?.length && (
                      <div className="mt-4 max-h-56 space-y-2.5 overflow-y-auto border-l-2 border-gray-200 pl-4">
                        {thread.replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                            <p className="font-bold text-slate-800">{reply.author} <span className="ml-1.5 text-xs font-semibold text-slate-400">{formatElapsed(reply.createdAt)}</span></p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {expandedThreadIds[thread.id] && <div className="mt-5 flex gap-2.5">
                      <input value={replyDrafts[thread.id] || ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [thread.id]: event.target.value }))} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Write a supportive reply..." />
                      <button onClick={() => submitReply(thread.id)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"><FaReply /> Reply</button>
                    </div>}
                  </article>
                ))}

                {!paginatedThreads.length && (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
                    <p className="text-lg font-black text-slate-950">No discussions yet.</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Be the first to start a helpful conversation in this category.</p>
                    <button type="button" onClick={() => setShowTopicForm(true)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">Create a topic</button>
                  </div>
                )}
              </section>

              <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
            </main>

            <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              {leaderboard.length > 1 ? (
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-700">Global Standings</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">All Students by Points</h2>
                  <div className="mt-5 space-y-2.5">
                    {paginatedLeaderboard.map((row) => <LeaderboardRow key={row.email} row={row} />)}
                  </div>
                  {leaderboardTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setLeaderboardPage((current) => Math.max(1, current - 1))}
                        disabled={leaderboardPage === 1}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Prev
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Page {leaderboardPage} of {leaderboardTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLeaderboardPage((current) => Math.min(leaderboardTotalPages, current + 1))}
                        disabled={leaderboardPage === leaderboardTotalPages}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-700">Community Progress</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Standings unlock as classmates join.</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">Complete exams, contribute helpful posts, and invite your study group to build a meaningful leaderboard.</p>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700"}`}>
      {children}
    </button>
  );
}

function ReactionBar({ thread, userId, onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {reactionOptions.map((reaction) => {
        const state = thread.reactions?.[reaction.type] || { count: 0, userIds: [] };
        const active = Boolean(userId && state.userIds?.includes(userId));
        return (
          <button key={reaction.type} type="button" onClick={() => onToggle(reaction.type)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${active ? reaction.activeClass : "border-gray-200 bg-gray-50 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`} aria-label={`${reaction.label} reaction`}>
            <span>{reaction.label}</span>
            <span className="text-[11px] font-black">{state.count || 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function PaginationControls({ page, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
      <div className="flex flex-wrap items-center gap-2">
        {pages.map((item) => (
          <button key={item} type="button" onClick={() => onPageChange(item)} className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black transition ${page === item ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 bg-white text-slate-500 hover:bg-gray-50"}`}>{item}</button>
        ))}
      </div>
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30">Next</button>
    </div>
  );
}

function LeaderboardRow({ row }) {
  return (
    <div className={`grid grid-cols-[3rem_1fr_4rem] items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold ${row.isCurrent ? "border border-blue-200 bg-blue-50 text-blue-800" : "bg-gray-50 text-slate-500"}`}>
      <span className={row.rank === 1 ? "flex items-center gap-1 text-amber-500" : "text-slate-400"}>{row.rank === 1 ? <FaTrophy /> : `#${row.rank}`}</span>
      <span className="truncate font-bold">{row.isCurrent ? `You (${row.name})` : row.name}</span>
      <span className="text-right font-black">{row.totalPoints.toLocaleString()} pts</span>
    </div>
  );
}

function formatElapsed(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}