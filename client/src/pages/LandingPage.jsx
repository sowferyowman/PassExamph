import { Link } from "react-router-dom";
import { FaCheckCircle, FaArrowRight, FaFileAlt, FaClock, FaChartLine, FaGraduationCap, FaAward, FaChair, FaHome, FaBriefcase, FaHeartbeat, FaBook, FaEllipsisH } from "react-icons/fa";

const EXAMS = [
  { icon: FaGraduationCap, name: "ACET", full: "Ateneo College Entrance Test", org: "Ateneo de Manila University", status: "live" },
  { icon: FaAward, name: "UPCAT", full: "UP College Admission Test", org: "University of the Philippines", status: "soon" },
  { icon: FaChair, name: "PSHS NCE", full: "National Competitive Exam", org: "Philippine Science High School", status: "soon" },
  { icon: FaHome, name: "DLSUCET", full: "DLSU College Entrance Test", org: "De La Salle University", status: "soon" },
  { icon: FaBriefcase, name: "Civil Service", full: "Civil Service Examination", org: "CSC Philippines", status: "soon" },
  { icon: FaHeartbeat, name: "Nursing LE", full: "Nurse Licensure Examination", org: "PRC Philippines", status: "soon" },
  { icon: FaBook, name: "Teachers LE", full: "Licensure Exam for Teachers", org: "PRC Philippines", status: "soon" },
  { icon: FaEllipsisH, name: "More Exams", full: "Many more coming"},
];

const FEATURES = [
  {
    tag: "PRACTICE",
    image: "/images/unlimited-practice-tests.jpg",
    stat: "10,000+",
    statLabel: "Questions in Data Bank",
    title: "Unlimited Practice Tests",
    body: "Take as many tests as you want. Encounter all possible questions that may appear on your exam with 10,000+ questions in our data bank.",
    Icon: FaFileAlt,
  },
  {
    tag: "SIMULATE",
    image: "/images/build-your-familiarity.jpg",
    stat: "1:1",
    statLabel: "Exam Simulation Fidelity",
    title: "Build your Familiarity",
    body: "Practice tests simulated on actual testing conditions — same exam structure, level of difficulty, number of items, time duration, and passing rates as your target exam.",
    Icon: FaClock,
  },
  {
    tag: "IMPROVE",
    image: "/images/measure-your-readiness.jpg",
    stat: "AI",
    statLabel: "Personalized Feedback",
    title: "Measure your Readiness",
    body: "See how you improve with every test taken. Know your strengths, practice on your weakest topics, and get personalized feedback from your adaptive tutor.",
    Icon: FaChartLine,
  },
];

const CTA_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 h-12 text-sm font-bold text-white hover:bg-white/20 transition-colors";

export default function LandingPage() {
  return (
    <>
      <style>{`
        /* Ateneo Blue Studio Spotlight Backdrop */
        .studio-background {
          background-color: #001529;
          background-image:
            radial-gradient(ellipse 800px 500px at 50% 0%, rgba(59, 130, 246, 0.16), transparent 70%),
            linear-gradient(to bottom, #001529 0%, #002147 50%, #000d1a 100%);
        }

        .glass-card {
          background-color: rgba(0, 40, 78, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all .4s cubic-bezier(.23,1,.32,1);
        }

        .glass-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="studio-background min-h-screen text-white">
        {/*  NAV  */}
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#001529]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-serif text-lg font-black leading-tight text-white">PassExams.ph</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-sky-300/80">Philippine Exam Prep Platform</p>
            </div>
          </div>
          <Link to="/login" className={CTA_BUTTON_CLASSES}>
            Get Started 
          </Link>
        </div>
        </nav>

        {/*  HERO  */}
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
              Adaptive Diagnostic Ecosystem
            </p>

            <h1 className="mt-4 font-serif text-5xl font-black leading-[1.05] lg:text-6xl">
              Your Path to <span className="text-sky-300">Success</span> Starts Here.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80">
              PassExams.ph is your automated tool for intercepting your weaknesses in
              real-time and delivering personalized remediation so you walk into exam day
              fully prepared.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link to="/login" className={CTA_BUTTON_CLASSES}>
                Get Started — It's Free <FaArrowRight />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* HERO_IMAGE placeholder — swap src with your Ateneo gate photo */}
            <div className="glass-card overflow-hidden rounded-2xl shadow-2xl">
              <img
                src="/images/image-hero.jpg"
                alt="Student preparing for an entrance exam"
                className="h-72 w-full object-cover lg:h-96"
              />
              <div className="flex items-center gap-3 border-t border-white/10 bg-white/5 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-sky-300">
                  <FaCheckCircle />
                </span>
                <div>
                  <p className="text-xs text-white/60">Identifying weak areas and building your plan</p>
                </div>
              </div>
            </div>
            <div className="glass-card absolute -top-5 -right-5 rounded-2xl px-6 py-4 shadow-xl">
              <p className="font-serif text-2xl font-black text-sky-300">10K+</p>
              <p className="text-[11px] font-semibold text-white/70">Questions Available</p>
            </div>
          </div>
        </section>

        {/*  STATS BAR  */}
        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-10 lg:grid-cols-4 lg:px-10">
            {[
              ["10,000+", "Practice Questions"],
              ["Real-Time", "Adaptive Feedback"],
              ["Exam-Like", "Timing & Format"],
              ["AI", "Powered Diagnostics"],
            ].map(([stat, label]) => (
              <div key={label} className="border-l border-white/10 pl-6 first:border-l-0 first:pl-0">
                <p className="font-serif text-3xl font-black text-sky-300">{stat}</p>
                <p className="mt-1 text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/*  CHOOSE YOUR EXAM  */}
        <section id="exams" className="mx-auto max-w-7xl px-6 py-24 text-center lg:px-10">
          <a
            href="#exams"
            className="inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-sky-300/90 hover:bg-white/10 transition-colors"
          >
            Choose Your Exam
          </a>
          <h2 className="mx-auto mt-6 max-w-2xl font-serif text-4xl font-black leading-tight lg:text-5xl">
            One Platform, <span className="italic text-sky-300">Every Major Exam</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
            Start with ACET today. More Philippine entrance and licensure exams arriving soon.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EXAMS.map(({ name, full, org, status }) => (
              <div
                key={name}
                className={`glass-card rounded-2xl p-6 text-left ${status === "live" ? "border-sky-300/40" : ""}`}
              >
                <div className="flex items-start justify-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                      status === "live" ? "bg-emerald-500/15 text-emerald-400" : "border border-white/10 text-white/40"
                    }`}
                  >
                    {status === "live" ? "available" : "Coming Soon"}
                  </span>
                </div>
                <h3 className="mt-5 font-serif text-xl font-black text-white">{name}</h3>
                <p className="mt-1 text-xs font-semibold text-white/60">{full}</p>
                <p className={`mt-0.5 text-xs font-bold ${status === "live" ? "text-sky-300" : "text-white/40"}`}>{org}</p>
                {status === "live" ? (
                  <Link
                    to="/login"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sky-400/90 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#001529] hover:bg-sky-300 transition-colors"
                  >
                    Start Practicing <FaArrowRight className="text-[10px]" />
                  </Link>
                ) : (
                  <button className="mt-4 text-xs font-black uppercase tracking-wide text-white/40">
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/*  FEATURES  */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {FEATURES.map(({ tag, image, stat, statLabel, title, body, Icon }) => (
              <div key={title} className="glass-card overflow-hidden rounded-2xl">
                <div className="relative">
                  {/* Feature image placeholder — swap src with your saved photo */}
                  <img src={image} alt={title} className="h-40 w-full object-cover" />
                  <span className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300 backdrop-blur">
                    {tag}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-sky-300">
                      <Icon />
                    </span>
                    <div className="text-right">
                      <p className="font-serif text-xl font-black text-sky-300">{stat}</p>
                      <p className="text-[10px] text-white/50">{statLabel}</p>
                    </div>
                  </div>
                  <h3 className="mt-5 font-serif text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/*  CTA BANNER  */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="glass-card flex flex-col items-start justify-between gap-8 rounded-3xl p-10 lg:flex-row lg:items-center lg:p-14">
            <div>
              <h2 className="mt-5 font-serif text-4xl font-black leading-tight text-white lg:text-5xl">
                Early Testing <span className="italic text-sky-300">Now Open</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-white/70">
                Be among the first to access PassExams.ph and shape the platform before launch.
                Early testers get full access, priority support, and a permanent free tier — no strings attached.
              </p>
              <div className="mt-6 flex flex-wrap gap-6">
                
              </div>
            </div>
            <div className="text-center lg:text-right">
              <Link to="/login" className={CTA_BUTTON_CLASSES}>
                Claim Your Account <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>

        {/*  FOOTER  */}
        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-center lg:flex-row lg:px-10 lg:text-left">
            <div className="flex items-center gap-3">
              <p className="font-serif font-black text-white">PassExams.ph</p>
            </div>
            <p className="text-xs text-white/40">Not affiliated</p>
            <p className="text-xs text-white/40">© 2026 PassExams.ph</p>
          </div>
        </footer>
      </div>
    </>
  );
}