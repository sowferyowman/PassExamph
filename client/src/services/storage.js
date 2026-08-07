import http from "../api/http";

const SESSION_KEY = "exams_ph_current_user";
const CURRENT_ACTIVE_USER_KEY = "currentActiveUser";
const EXAMS_KEY = "global_exam_blueprints";
const EXAMS_DATA_KEY = "examsData";
const STUDY_PLAN_KEY = "studyPlanData";
const REVIEWERS_KEY = "reviewersData";
const DRILL_BANK_KEY = "drillBankData";
const DRILL_SESSIONS_KEY = "drillSessionsData";
const DASHBOARD_KEY = "acet_dashboard_data";
const LEGACY_FORUM_KEY = "acet_forum_threads";
const FORUM_KEY = "forumPosts";
const NOTIFICATIONS_KEY = "notificationsData";
const REVIEWER_PROGRESS_KEY = "reviewer_progress";

const defaultForumThreads = [
  { id: "forum_welcome", title: "Welcome to the ACET Study Community", body: "Start by introducing yourself, ask respectful questions, and share study methods that helped you. Keep replies constructive and protect exam integrity.", tag: "Get Started", author: "ACET Study Team", createdAt: "2026-07-24T08:00:00.000Z", replies: [] },
  { id: "forum_news", title: "Weekly study reminder: build consistency first", body: "Set one realistic goal for this week: complete a reviewer lesson, take a timed drill, or review missed questions. Small, consistent sessions compound quickly.", tag: "Newsroom", author: "ACET Study Team", createdAt: "2026-07-24T09:00:00.000Z", replies: [] },
  { id: "forum_knowledge", title: "What is your best method for reviewing mistakes?", body: "Share a technique that helps you turn missed questions into better decisions on the next attempt. Include the subject and the skill you practiced.", tag: "Share Knowledge", author: "ACET Study Team", createdAt: "2026-07-24T10:00:00.000Z", replies: [] },
  { id: "forum_ideas", title: "What feature would improve your study flow?", body: "Suggest an idea for drills, reviewers, analytics, or community learning. React to ideas you would find most useful.", tag: "Suggest an Idea", author: "ACET Study Team", createdAt: "2026-07-24T11:00:00.000Z", replies: [] },
  { id: "forum_issue", title: "Found an issue? Let us know here", body: "Report a problem with the page, question content, or study flow. Include what happened and the steps that led to it so it can be investigated.", tag: "Report an Issue", author: "ACET Study Team", createdAt: "2026-07-24T12:00:00.000Z", replies: [] }
];

const studyPlanData = [
  {
    id: "study_week_01",
    week: 1,
    title: "Mathematics & Quantitative Reasoning",
    objectives: [
      "Rebuild algebraic fluency under time pressure.",
      "Recognize function composition traps before performing long calculations.",
      "Translate word problems into constraints, equations, and inequality checks.",
      "Recover theorems for similarity, circles, quadrilaterals, and coordinate geometry."
    ],
    focusAreas: ["Advanced Algebra", "Complex Functions", "Word Problems", "Geometric Theorems"],
    readingHtml: `
      <article class="space-y-3">
        <p><b>Core recovery target:</b> stop treating ACET quantitative items as isolated computations. Most difficult items combine algebraic structure with a verbal condition that removes one tempting shortcut.</p>
        <p><b>Advanced Algebra:</b> Review factoring by grouping, rational expressions, nested radicals, and parameterized quadratics. When a question asks for a value that is invariant, test whether the expression can be rewritten around a hidden sum/product pair. For example, if roots are described indirectly, use Vieta before solving.</p>
        <p><b>Complex Functions:</b> For compositions such as <i>f(g(x))</i>, identify the domain restriction before substituting. Logarithmic and radical functions usually hide the actual exam trap inside the boundary condition.</p>
        <p><b>Word Problems:</b> Annotate quantities as <b>rate</b>, <b>stock</b>, or <b>change</b>. A two-line table is faster than mental tracking when a problem includes work rates, mixtures, discounts, or moving objects.</p>
        <p><b>Geometry:</b> Build theorem recall around triggers: tangent means perpendicular radius; cyclic quadrilateral means opposite angles sum to 180; parallel lines invite similarity; median to hypotenuse creates equal radii.</p>
      </article>`
  },
  {
    id: "study_week_02",
    week: 2,
    title: "Logical Reasoning & Abstract Patterns",
    objectives: [
      "Decode double negatives and conditional statements without losing scope.",
      "Separate valid Venn conclusions from emotionally plausible but unsupported statements.",
      "Map spatial sequence rotations, reflections, and alternating transformations.",
      "Build a notation system for fast elimination."
    ],
    focusAreas: ["Double-Negative Syllogisms", "Venn Diagram Fallacies", "Spatial Sequence Patterns"],
    readingHtml: `
      <article class="space-y-3">
        <p><b>Core recovery target:</b> transform language into symbols before judging truth. The hardest reasoning questions are written to make the conclusion sound familiar while quietly changing quantity, direction, or exception scope.</p>
        <p><b>Syllogisms with double negatives:</b> Replace phrases like <i>not all are not</i> with a minimum-existence claim. If "not all artists are not scientists," then at least one artist is a scientist. Do not convert it into "all artists are scientists."</p>
        <p><b>Venn fallacies:</b> Universal statements allow containment; particular statements only place at least one element. Never assume the overlap is empty unless the premise explicitly says "no."</p>
        <p><b>Spatial sequences:</b> Track three channels independently: position, orientation, and shading. Many items alternate transformations, e.g. rotate 90 degrees on odd steps but mirror on even steps.</p>
        <p><b>Practice protocol:</b> Use symbols first, answer second. Under severe time pressure, eliminate any option that asserts a stronger conclusion than the premises justify.</p>
      </article>`
  },
  {
    id: "study_week_03",
    week: 3,
    title: "English Proficiency & Critical Reading",
    objectives: [
      "Read dense passages for argument structure instead of line-by-line memory.",
      "Identify grammar errors involving modifier placement, agreement, tense, and parallelism.",
      "Correct syntax without changing authorial meaning.",
      "Solve analogies by relationship type, not surface vocabulary."
    ],
    focusAreas: ["Timed Reading Comprehension", "Error Identification", "Syntax Correction", "Analogy Mapping"],
    readingHtml: `
      <article class="space-y-3">
        <p><b>Core recovery target:</b> answer from function. ACET-style English items often punish readers who remember a phrase but miss why the phrase appears.</p>
        <p><b>Timed reading:</b> First pass: mark thesis, contrast words, and conclusion. Second pass: answer evidence questions by returning to the exact paragraph role. If a choice is true but not used by the author, it is still wrong.</p>
        <p><b>Error identification:</b> Check subject-verb agreement after removing interrupting phrases. For modifiers, ask whether the nearest noun can logically perform the described action.</p>
        <p><b>Syntax correction:</b> Prefer the option that preserves meaning while improving concision, parallelism, and reference clarity. Beware choices that sound polished but shift tense or agency.</p>
        <p><b>Analogies:</b> Name the relation in a sentence: "A scalpel is used by a surgeon for precise cutting." Then test each option against the same relation, not against word familiarity.</p>
      </article>`
  },
  {
    id: "study_week_04",
    week: 4,
    title: "General Knowledge & High-Speed Performance Drills",
    objectives: [
      "Consolidate high-frequency facts through context, not memorized lists.",
      "Practice mathematical shortcuts that preserve accuracy.",
      "Review current socio-economic events through cause-effect chains.",
      "Build a pacing system for skipping, returning, and protecting easy points."
    ],
    focusAreas: ["Mathematical Shortcuts", "Current Socio-Economic Events", "High-Pressure Pacing"],
    readingHtml: `
      <article class="space-y-3">
        <p><b>Core recovery target:</b> convert preparation into execution. The final week should reduce hesitation, not add new anxiety.</p>
        <p><b>Math shortcuts:</b> Use estimation to reject impossible answers before exact work. For percentages, convert chained changes into multipliers. For ratios, scale to the least common base.</p>
        <p><b>General knowledge:</b> Study events as systems: policy, affected sector, consequence, and controversy. For socio-economic questions, understand inflation, unemployment, migration, energy, education, and governance as connected issues.</p>
        <p><b>Pacing:</b> Use a three-pass model. Pass 1 captures direct wins. Pass 2 handles medium problems with visible structure. Pass 3 is for time-intensive traps. Marking and moving is a skill, not a surrender.</p>
        <p><b>Final drill:</b> Complete mixed sets with a visible timer, then review not only wrong answers but also slow correct answers. Slow correctness is still a risk in a grueling entrance test.</p>
      </article>`
  }
];

const reviewerBlueprintSeed = [
  {
    id: "reviewer_math_foundations",
    title: "Mathematics: Professor's Core Reasoning Course",
    subjectCategory: "Mathematics",
    focusAreas: ["Functions", "Algebra", "Geometry", "Word Problems"],
    modules: [
      { id: "math_module_01", title: "Reading Algebra as Structure", content: "Algebra is not a collection of tricks; it is a language for preserving relationships. Before manipulating an expression, identify what is fixed, what is changing, and what the question actually asks you to find. When you move a term across an equality, explain the operation to yourself rather than relying on visual habit. This discipline prevents sign errors and exposes impossible answer choices. In advanced items, factor before expanding, look for common structure, and use substitution only after domain restrictions are understood. A strong solver writes fewer lines because each line represents a deliberate claim." },
      { id: "math_module_02", title: "Functions, Composition, and Domain", content: "A function assigns one output to each permitted input. Treat the domain as part of the definition, not as a footnote. For a composition such as f(g(x)), calculate the inner function first, then substitute its output into the outer rule. Logarithms require positive arguments; square roots require nonnegative radicands; denominators may never equal zero. Many difficult questions are testing whether you notice these boundaries. When an inverse is involved, reverse the operations in order and verify by composing both ways. A numerical answer without a valid domain is not a complete solution." },
      { id: "math_module_03", title: "Geometry Through Theorem Triggers", content: "Geometry becomes manageable when diagrams are translated into theorem triggers. A tangent is perpendicular to the radius at the point of contact. Opposite angles in a cyclic quadrilateral sum to 180 degrees. Similar triangles preserve corresponding ratios and scale areas by the square of the side ratio. Parallel lines create equal alternate interior angles and proportional intercepts. Mark every given fact on the diagram, then state the theorem that connects it to the requested quantity. Do not trust a drawing's appearance; trust only the relationships supplied or proved." },
      { id: "math_module_04", title: "Word Problems and Quantitative Judgment", content: "Word problems reward organization more than speed. Translate the story into a table of quantities, units, rates, and changes. For work problems, add rates rather than times. For mixtures, track the amount of pure substance. For discounts, apply each percentage to the current price, not the original price. Estimate before calculating so that a misplaced decimal cannot survive unnoticed. If an answer choice is far outside the scale implied by the story, eliminate it immediately. Finish by checking units and asking whether the direction of change makes sense." }
    ]
  },
  {
    id: "reviewer_english_mastery",
    title: "English: Professor's Reading and Expression Seminar",
    subjectCategory: "English",
    focusAreas: ["Critical Reading", "Grammar", "Syntax", "Analogy"],
    modules: [
      { id: "english_module_01", title: "Argument, Evidence, and Main Claim", content: "Academic reading is an act of reconstruction. Identify the author's central claim, the reasons offered for it, and the evidence that makes those reasons credible. Contrast markers such as however, although, and yet often signal the author's real position. A choice can be factually true and still be wrong if it is not supported by the passage or if it is too broad. Prefer the answer that captures the passage's scope and qualification. When asked for evidence, return to the exact sentence function: definition, example, contrast, consequence, or conclusion." },
      { id: "english_module_02", title: "Grammar as Meaning and Control", content: "Grammar is not merely correction; it controls who acts, when an action occurs, and how ideas relate. For subject-verb agreement, strip away interrupting prepositional phrases and locate the true subject. For pronouns, check that the antecedent is singular or plural as required and that only one reasonable noun can be intended. Dangling modifiers occur when the opening phrase logically describes a person or object that does not immediately follow. Read the sentence literally, then revise so the intended actor is unmistakable." },
      { id: "english_module_03", title: "Syntax, Concision, and Parallelism", content: "The strongest revision preserves meaning while improving structure. Parallel items should share the same grammatical form: nouns with nouns, verbs with verbs, and clauses with clauses. Remove inflated phrases when a precise word does the work. Do not choose an option simply because it sounds formal; check whether it changes tense, agency, emphasis, or logical connection. Read each candidate aloud in your mind and compare the complete sentence, not only the underlined fragment. Clear writing is economical because the reader should not have to repair it." },
      { id: "english_module_04", title: "Analogies and Relationship Precision", content: "An analogy is solved by naming the relationship before looking at the options. Ask whether the pair expresses tool-to-purpose, degree, cause-to-effect, part-to-whole, category membership, or another precise connection. Then state the first pair as a sentence and test every option against the same sentence pattern. Surface association is a trap: two words may share a topic but not a relationship. The correct choice preserves direction as well as meaning. If the relationship can be reversed without changing the sentence, it is probably too vague." }
    ]
  },
  {
    id: "reviewer_logic_mastery",
    title: "Logical Reasoning: Formal Thinking and Pattern Analysis",
    subjectCategory: "Logical Reasoning",
    focusAreas: ["Syllogisms", "Conditionals", "Venn Diagrams", "Patterns"],
    modules: [
      { id: "logic_module_01", title: "Quantifiers and Syllogistic Scope", content: "Translate quantifier language before judging a conclusion. All means containment; no means exclusion; some means existence of at least one instance. The statement 'not all A are B' means that at least one A is not B, while 'not all A are not B' means at least one A is B. These are existence claims, not universal claims. Draw only the circles and marks that the premises require. A conclusion is necessary only when every allowed arrangement satisfies it; a merely possible conclusion is weaker." },
      { id: "logic_module_02", title: "Conditional Logic and Contrapositives", content: "In an implication, If P then Q, P is sufficient for Q and Q is necessary for P. The valid contrapositive is If not Q then not P. Do not reverse the statement into If Q then P, and do not negate only one side. Words such as only, unless, and except change direction and should be rewritten symbolically. When evaluating an argument, identify the trigger, the result, and whether the conclusion claims more than the premise supplies. Precision is more reliable than intuition." },
      { id: "logic_module_03", title: "Venn Diagrams and Fallacy Control", content: "A diagram is a model of permitted relationships, not a picture of what seems likely. Universal statements constrain entire sets; particular statements place at least one element but do not determine the rest of the set. From 'all scholars are readers' and 'some readers are poets,' you cannot conclude that any scholar is a poet. Mark required overlaps and exclusions, then test each answer against the diagram. Reject choices that convert some into all, possibility into certainty, or correlation into identity." },
      { id: "logic_module_04", title: "Sequences, Spatial Transformations, and Working Memory", content: "For patterns, separate the moving features instead of trying to recognize the whole image at once. Track position, orientation, shading, size, and count in separate columns. Numerical sequences often alternate two operations, so compare odd terms with odd terms and even terms with even terms. For spatial items, record rotations clockwise or counterclockwise and distinguish reflection from rotation. Write a short transformation chain. The goal is not to imagine faster; it is to reduce memory load through a stable notation." }
    ]
  },
  {
    id: "reviewer_gk_mastery",
    title: "General Knowledge: Context, Civics, and Social Analysis",
    subjectCategory: "General Knowledge",
    focusAreas: ["Economics", "Civics", "Media Literacy", "Society"],
    modules: [
      { id: "gk_module_01", title: "Economics Through Cause and Effect", content: "Economic questions are best answered by tracing incentives and constraints. Inflation reduces purchasing power when prices rise faster than nominal income. A supply shock shifts the supply curve and can raise prices even when demand is unchanged. Opportunity cost is the value of the best alternative forgone, not merely the money paid. When evaluating a policy, distinguish immediate effects from long-run effects and identify who gains, who bears the cost, and what behavior may change." },
      { id: "gk_module_02", title: "Civics, Institutions, and Accountability", content: "Civic knowledge requires knowing both the institution and the power being exercised. Separation of powers prevents one branch from concentrating authority. Judicial review concerns the compatibility of government action with constitutional limits. Transparency gives citizens access to information, while accountability adds the expectation that officials explain and answer for decisions. Read institutional questions carefully: a plausible public benefit does not identify the correct constitutional principle unless the mechanism matches." },
      { id: "gk_module_03", title: "Media Literacy and Source Evaluation", content: "Reliable knowledge is evaluated by provenance, evidence, method, and date. An official statistics release is stronger for a current figure than an anonymous post, but even official information must be read for definitions and measurement limits. Separate a claim from the evidence offered for it. Watch for misleading graphs, cherry-picked time periods, emotional language, and unsupported causal leaps. The responsible reader asks what would count as disconfirming evidence and whether the source has a reason to distort the presentation." },
      { id: "gk_module_04", title: "Society, Policy Tradeoffs, and Systems Thinking", content: "Social questions rarely have a single isolated effect. Migration can support household consumption through remittances while also creating dependency or labor-market concerns. Renewable energy can reduce emissions while requiring storage and grid investment. A fare subsidy may improve access while increasing fiscal pressure. Strong answers acknowledge the relevant tradeoff without collapsing into 'all benefits' or 'all costs.' Build a four-part chain: policy, affected group, intended gain, and possible consequence." }
    ]
  }
];

const examBlueprintSeed = [
  {
    id: "exam_acet_001",
    title: "ACET Mock Exam 1: Advanced Numerical Sprint",
    duration: 50,
    questions: [
      ["q_math_001", "Mathematics", "Advanced Algebra", "Composite Functions", "<p><b>Situation:</b> A scholarship committee models stress performance by composing two functions, <i>f(x)=3x^2-5x</i> and <i>g(x)=log<sub>2</sub>(x)</i>. If a candidate's raw pace index is constrained to <b>x=8</b>, evaluate <i>f(g(x))</i> and interpret it as the adjustment parameter.</p>", ["6", "12", "18", "24"], 1],
      ["q_math_002", "Mathematics", "Geometric Theorems", "Cyclic Quadrilaterals", "<p>A quadrilateral is inscribed in a circle. One angle is written as <b>3y+14</b> degrees and the opposite angle as <b>5y-2</b> degrees. What is the value of the smaller of the two opposite angles?</p>", ["73°", "86°", "94°", "107°"], 1],
      ["q_logic_001", "Logical Reasoning", "Syllogisms", "Double Negatives", "<p><b>Premises:</b> Not all diligent students are not artists. Every artist in the review hall is either a debater or a musician. No musician failed the diagnostic. Which conclusion must follow?</p>", ["All diligent students passed the diagnostic.", "At least one diligent student may be a debater or a musician.", "No debater failed the diagnostic.", "Every artist is diligent."], 1],
      ["q_eng_001", "English", "Syntax Correction", "Dangling Modifiers", "<p><b>Error identification:</b> <i>Walking through the old archive, the manuscripts seemed to whisper the history of the city to Mara.</i> Which revision best repairs the modifier?</p>", ["Walking through the old archive, Mara felt the manuscripts seemed to whisper the history of the city.", "The manuscripts walking through the old archive seemed to whisper history.", "Mara, the manuscripts walking through the old archive, heard history.", "Walking through the old archive seemed the manuscripts to whisper."], 0],
      ["q_gk_001", "General Knowledge", "Socio-Economic Analysis", "Inflation and Purchasing Power", "<p>A news brief states that nominal wages rose by 5% while consumer prices rose by 8% in the same period. Which interpretation is most accurate for workers whose consumption basket matches the index?</p>", ["Real purchasing power increased by about 3%.", "Real purchasing power declined despite higher nominal pay.", "Inflation is irrelevant if wages rise.", "Nominal wage growth always means improved welfare."], 1]
    ]
  },
  {
    id: "exam_acet_002",
    title: "ACET Simulation 2: Logic, Language, and Quantitative Endurance",
    duration: 50,
    questions: [
      ["q_math_006", "Mathematics", "Word Problems", "Work Rate Systems", "<p>Three printers prepare test booklets. Printer A can finish alone in 6 hours, B in 9 hours, and C joins only after the first hour. If A and B start together, how many additional hours are needed after C joins if C alone would take 12 hours?</p>", ["2.0 hours", "2.4 hours", "3.0 hours", "3.6 hours"], 1],
      ["q_logic_006", "Logical Reasoning", "Venn Diagram Fallacies", "Unsupported Conversion", "<p><b>Premises:</b> All campus journalists are writers. Some writers are athletes. No athlete in the data set is a chess finalist. Which statement is logically secure?</p>", ["Some journalists are athletes.", "No campus journalist is a chess finalist.", "Some writers are not chess finalists.", "All writers are campus journalists."], 2],
      ["q_eng_006", "English", "Reading Inference", "Authorial Purpose", "<p><b>Passage excerpt:</b> The author praises urban gardens not merely because they beautify vacant spaces, but because they expose residents to the hidden labor behind food systems. What is the author's likely purpose?</p>", ["To argue that gardens should replace all supermarkets", "To connect aesthetics with civic awareness", "To prove rural farms are obsolete", "To criticize residents for poor taste"], 1],
      ["q_math_007", "Mathematics", "Functions", "Piecewise Boundary Evaluation", "<p>For <i>h(x)=2x+1</i> when x&lt;3 and <i>h(x)=x^2-4</i> when x≥3, what is <i>h(h(2))</i>?</p>", ["5", "9", "21", "32"], 2],
      ["q_gk_006", "General Knowledge", "Governance", "Public Accountability", "<p>A local government publishes project costs, bidding documents, and completion reports online. Which democratic principle is most directly strengthened?</p>", ["Subsidiarity", "Transparency", "Isolationism", "Judicial restraint"], 1]
    ]
  },
  {
    id: "exam_acet_003",
    title: "ACET Simulation 3: Abstract Pattern and Reading Compression",
    duration: 48,
    questions: [
      ["q_logic_011", "Logical Reasoning", "Spatial Sequence Patterns", "Rotation Reflection Alternation", "<p>A figure rotates 90° clockwise on odd moves and reflects horizontally on even moves. Starting from an arrow pointing up with its shaded half on the left, what is its orientation after four moves?</p>", ["Arrow up, shaded left", "Arrow right, shaded right", "Arrow down, shaded left", "Arrow left, shaded right"], 0],
      ["q_math_011", "Mathematics", "Advanced Algebra", "Rational Expression Restrictions", "<p>Solve for the excluded values in the expression <b>(x²-9)/(x²-x-6)</b> before simplification. Which set must be removed from the domain?</p>", ["{3}", "{-2, 3}", "{-3, 2}", "{-3, -2, 3}"], 1],
      ["q_eng_011", "English", "Analogy Mapping", "Function Relationship", "<p><b>Analogy:</b> Compass : navigation :: rubric : _____. Choose the option preserving the same functional relationship.</p>", ["assessment", "essay", "teacher", "classroom"], 0],
      ["q_eng_012", "English", "Error Identification", "Pronoun Reference", "<p>In the sentence <i>When Carla placed the notebook beside the laptop, it was already damaged</i>, what is the main weakness?</p>", ["Faulty tense sequence", "Ambiguous pronoun reference", "Subject-verb disagreement", "Incorrect comparison"], 1],
      ["q_gk_011", "General Knowledge", "Economics", "Opportunity Cost", "<p>A student chooses a free review seminar over a paid tutoring shift. The seminar has no fee. What is the opportunity cost?</p>", ["Zero because the seminar is free", "The value of the paid tutoring shift forgone", "The total cost of all future seminars", "Only transportation expenses"], 1]
    ]
  },
  {
    id: "exam_acet_004",
    title: "ACET Simulation 4: Geometry, Evidence, and Civic Context",
    duration: 52,
    questions: [
      ["q_math_016", "Mathematics", "Geometric Theorems", "Similarity Ratios", "<p>Two similar triangles have corresponding sides 6 cm and 15 cm. If the smaller triangle has area 28 cm², what is the area of the larger triangle?</p>", ["70 cm²", "112 cm²", "175 cm²", "280 cm²"], 2],
      ["q_eng_016", "English", "Critical Reading", "Evidence Selection", "<p>A passage argues that digital archives democratize access but may flatten cultural context. Which evidence best supports the second half of the claim?</p>", ["More people can download documents.", "Metadata often omits ritual, location, and community memory.", "Servers require electricity.", "Students prefer searchable PDFs."], 1],
      ["q_logic_016", "Logical Reasoning", "Conditional Logic", "Contrapositive Trap", "<p>If a participant submits late, then the application is flagged. Mara's application was not flagged. What follows?</p>", ["Mara submitted late.", "Mara did not submit late.", "All unflagged applications are excellent.", "Flagged applications are always late."], 1],
      ["q_math_017", "Mathematics", "Word Problems", "Mixture Concentration", "<p>A 30% solution is mixed with 200 mL of a 60% solution to produce 500 mL of final solution. What is the final concentration?</p>", ["36%", "42%", "48%", "54%"], 1],
      ["q_gk_016", "General Knowledge", "Philippine Society", "Migration Effects", "<p>Which statement best captures a common socio-economic effect of overseas remittances?</p>", ["They may increase household consumption while creating dependency risks.", "They eliminate all unemployment.", "They directly lower every commodity price.", "They make taxation unnecessary."], 0]
    ]
  },
  {
    id: "exam_acet_005",
    title: "ACET Simulation 5: High-Pressure Mixed Reasoning",
    duration: 47,
    questions: [
      ["q_math_021", "Mathematics", "Functions", "Inverse Function Interpretation", "<p>A scoring curve is modeled by <i>f(x)=4x-7</i>. If the adjusted score is 65, what raw score x produced it?</p>", ["14", "16", "18", "20"], 2],
      ["q_logic_021", "Logical Reasoning", "Syllogisms", "Existential Conclusions", "<p>Some volunteers are tutors. All tutors completed orientation. Which conclusion follows?</p>", ["All volunteers completed orientation.", "Some volunteers completed orientation.", "No non-tutor completed orientation.", "All oriented people are tutors."], 1],
      ["q_eng_021", "English", "Syntax Correction", "Parallel Structure", "<p>Choose the best revision: <i>The program values discipline, curiosity, and students who serve others.</i></p>", ["discipline, curiosity, and service", "discipline, being curious, and students serving", "disciplined, curiosity, and service", "discipline, curious students, and serving"], 0],
      ["q_math_022", "Mathematics", "Advanced Algebra", "Quadratic Parameter", "<p>For what value of k will <i>x²-10x+k</i> have exactly one real root?</p>", ["10", "20", "25", "50"], 2],
      ["q_gk_021", "General Knowledge", "Media Literacy", "Source Reliability", "<p>Which source is strongest for verifying a current inflation figure?</p>", ["Anonymous comment thread", "Official statistics agency release", "A meme with a graph", "A decade-old textbook"], 1]
    ]
  },
  {
    id: "exam_acet_006",
    title: "ACET Simulation 6: Quantitative and Verbal Trapdoors",
    duration: 50,
    questions: [
      ["q_math_026", "Mathematics", "Word Problems", "Discount Compounding", "<p>A jacket is discounted 20% and then another 15% on the reduced price. What single discount is equivalent?</p>", ["32%", "35%", "38%", "40%"], 0],
      ["q_eng_026", "English", "Reading Comprehension", "Tone Under Constraint", "<p>An essay calls a policy <i>well-intentioned but administratively naive</i>. What is the tone?</p>", ["Unqualified praise", "Measured criticism", "Indifference", "Celebratory certainty"], 1],
      ["q_logic_026", "Logical Reasoning", "Venn Diagram Fallacies", "Some-versus-All", "<p>All scholars are readers. Some readers are poets. Which diagram must be possible but not required?</p>", ["Scholar circle entirely outside readers", "Poet circle overlapping readers", "Reader circle inside scholars", "No overlap between readers and poets"], 1],
      ["q_math_027", "Mathematics", "Geometric Theorems", "Circle Tangent", "<p>A radius to a point of tangency is 9 cm. A tangent segment from an external point is 12 cm. How far is the external point from the circle center?</p>", ["15 cm", "18 cm", "21 cm", "24 cm"], 0],
      ["q_eng_027", "English", "Analogy Mapping", "Cause-Effect Relationship", "<p>Drought : crop failure :: misinformation : _____. Choose the best effect relationship.</p>", ["public confusion", "library", "weather report", "harvest"], 0]
    ]
  },
  {
    id: "exam_acet_007",
    title: "ACET Simulation 7: Analytical Reading and Algebraic Precision",
    duration: 49,
    questions: [
      ["q_eng_031", "English", "Critical Reading", "Assumption Detection", "<p>An editorial argues that extending library hours will improve exam scores because students will study more. What assumption is required?</p>", ["Students will use the extra hours for study.", "Libraries should sell food.", "Exam scores never change.", "Students dislike quiet spaces."], 0],
      ["q_math_031", "Mathematics", "Advanced Algebra", "Exponential Equations", "<p>Solve <b>2<sup>x+1</sup> = 32</b>. What is x?</p>", ["3", "4", "5", "6"], 1],
      ["q_logic_031", "Logical Reasoning", "Conditional Logic", "Necessary Condition", "<p>Only students with clearance may enter the archive. Joel entered the archive. What follows?</p>", ["Joel has clearance.", "Joel is a librarian.", "Everyone with clearance entered.", "No one entered."], 0],
      ["q_math_032", "Mathematics", "Functions", "Domain Restriction", "<p>For <i>g(x)=sqrt(2x-6)</i>, which interval gives the domain?</p>", ["x&lt;3", "x≤3", "x≥3", "all real numbers"], 2],
      ["q_gk_031", "General Knowledge", "Civics", "Separation of Powers", "<p>Judicial review primarily refers to the power to do what?</p>", ["Create taxes", "Declare acts unconstitutional", "Command the military", "Conduct elections"], 1]
    ]
  },
  {
    id: "exam_acet_008",
    title: "ACET Simulation 8: Pattern Sprint and Grammar Accuracy",
    duration: 46,
    questions: [
      ["q_logic_036", "Logical Reasoning", "Abstract Patterns", "Alternating Arithmetic", "<p>Find the next term: 4, 9, 7, 14, 12, 19, 17, __. The pattern alternates operations.</p>", ["21", "22", "24", "26"], 2],
      ["q_eng_036", "English", "Error Identification", "Subject Verb Agreement", "<p>Choose the corrected verb: <i>The list of urgent review topics ___ on the coordinator's desk.</i></p>", ["are", "were", "is", "have been"], 2],
      ["q_math_036", "Mathematics", "Word Problems", "Ratio Scaling", "<p>A class ratio of STEM to HUMSS students is 7:5. If there are 96 students, how many are HUMSS?</p>", ["35", "40", "48", "56"], 1],
      ["q_eng_037", "English", "Syntax Correction", "Conciseness", "<p>Best revision: <i>Due to the fact that the schedule was compressed, reviewers had to prioritize.</i></p>", ["Because the schedule was compressed, reviewers had to prioritize.", "Due to compression of schedule reviewers prioritizing.", "The schedule was compressed due to the fact.", "Reviewers had to prioritize in a compressed way."], 0],
      ["q_gk_036", "General Knowledge", "Economics", "Supply Shock", "<p>A typhoon destroys crops. If demand stays similar, what is the likely short-run market effect?</p>", ["Supply rises and price falls", "Supply falls and price rises", "Demand disappears", "Price is legally fixed everywhere"], 1]
    ]
  },
  {
    id: "exam_acet_009",
    title: "ACET Simulation 9: Endurance Set for Weakness Isolation",
    duration: 53,
    questions: [
      ["q_math_041", "Mathematics", "Geometric Theorems", "Coordinate Distance", "<p>In the coordinate plane, points A(-2,5) and B(4,-3) define a segment. What is its length?</p>", ["8", "10", "12", "14"], 1],
      ["q_logic_041", "Logical Reasoning", "Syllogisms", "Quantifier Scope", "<p>Not every applicant who was not interviewed was rejected. What does this imply?</p>", ["At least one non-interviewed applicant was not rejected.", "All non-interviewed applicants were accepted.", "No rejected applicant was interviewed.", "Every applicant was interviewed."], 0],
      ["q_eng_041", "English", "Reading Inference", "Main Claim", "<p>A passage says technology expands access but intensifies distraction. What is the most balanced main claim?</p>", ["Technology is purely harmful.", "Access and attention costs must be weighed together.", "Distraction is imaginary.", "Only old technology helps students."], 1],
      ["q_math_042", "Mathematics", "Advanced Algebra", "Inequality Reasoning", "<p>If <i>3x-7 &lt; 11</i> and x is an integer greater than 1, what is the greatest possible x?</p>", ["4", "5", "6", "7"], 1],
      ["q_gk_041", "General Knowledge", "Current Events Reasoning", "Energy Policy Tradeoffs", "<p>A country shifts toward renewable energy but faces intermittency issues. Which policy response is most technically relevant?</p>", ["Ignore grid storage", "Invest in storage and grid modernization", "Ban all electricity use", "Rely only on slogans"], 1]
    ]
  },
  {
    id: "exam_acet_010",
    title: "ACET Simulation 10: Final Comprehensive Pressure Test",
    duration: 55,
    questions: [
      ["q_math_046", "Mathematics", "Functions", "Composite Logarithmic Functions", "<p><b>Final pressure item:</b> Let <i>f(x)=x²+2x</i> and <i>g(x)=log<sub>3</sub>(x)</i>. If x=27, what is <i>f(g(x))</i>?</p>", ["9", "12", "15", "18"], 2],
      ["q_logic_046", "Logical Reasoning", "Spatial Sequence Patterns", "Layered Transformation", "<p>A shaded square moves one corner clockwise each step while its internal diagonal flips every second step. After five steps, where is the square and what happened to the diagonal?</p>", ["Original corner, unchanged", "Next clockwise corner, flipped", "Opposite corner, unchanged", "Previous corner, flipped"], 1],
      ["q_eng_046", "English", "Analogy Mapping", "Degree Relationship", "<p>Whisper : shout :: drizzle : _____. Choose the pair matching intensity difference.</p>", ["storm", "cloud", "umbrella", "puddle"], 0],
      ["q_math_047", "Mathematics", "Word Problems", "Pacing Optimization", "<p>A student answers easy items at 45 seconds each and hard items at 150 seconds each. In a 20-minute block with 12 easy items, how many hard items can still be attempted?</p>", ["4", "5", "6", "7"], 0],
      ["q_gk_046", "General Knowledge", "Socio-Economic Analysis", "Policy Tradeoffs", "<p>A fare subsidy helps commuters but strains the public budget. Which analysis is most complete?</p>", ["It has only benefits.", "It has only costs.", "It requires weighing equity gains against fiscal sustainability.", "It cannot affect behavior."], 2]
    ]
  }
];

const examsData = examBlueprintSeed.map((exam) => ({
  id: exam.id,
  title: exam.title,
  duration: exam.duration,
  points: 100,
  questions: exam.questions.map(([id, subject, subCategory, weaknessTag, questionText, options, correctAnswer]) => ({
    id,
    questionText,
    options,
    correctAnswer,
    subject,
    subCategory,
    weaknessTag
  }))
}));

// A ready-to-use practice bank mirrors every published mock exam item, but carries
// drill-specific labels so recommendations can route students to the exact weak skill.
const drillBankSeed = examBlueprintSeed.flatMap((exam) => exam.questions.map(([id, subject, subCategory, weaknessTag, questionText, options, correctAnswer]) => ({
  id: `drill_${id}`,
  type: "multiple_choice",
  stem: questionText,
  choiceOpts: options,
  answerIdx: correctAnswer,
  subjectTitle: subject,
  category: subject,
  diagnosticSubcategory: subCategory,
  diagnosticSkillTag: weaknessTag,
  weaknessTag,
  explanation: `Review ${subCategory}: ${weaknessTag}. The best answer is ${options[correctAnswer]}.`,
  sourceExam: exam.title,
  points: 1,
  status: "published"
})));

const essayExamSeed = {
  id: "exam_essay_demo_001",
  title: "ACET Essay Review Demo: Education and Society",
  description: "A demonstration exam for paragraph responses, rubric guidance, and Pending Review scoring.",
  duration: 30,
  points: 10,
  status: "published",
  sections: [{
    subjectTitle: "Writing and Critical Thinking",
    allottedTimeSec: 1800,
    questions: [
      { id: "essay_demo_mcq_001", type: "multiple_choice", stem: "Which feature makes an argument strongest?", choiceOpts: ["A clear claim supported by relevant evidence", "A long introduction with no evidence", "Several unrelated opinions", "A conclusion that changes the topic"], answerIdx: 0, correctAnswers: [], correctText: "", points: 2, diagnosticSubcategory: "Argument Structure", diagnosticSkillTag: "Evidence Selection" },
      { id: "essay_demo_paragraph_001", type: "paragraph", stem: "In 250–400 words, explain one way education can improve a community while also creating a challenge that policymakers must address. Use a clear claim, one concrete example, and a reasoned conclusion.", choiceOpts: [], answerIdx: 0, correctAnswers: [], correctText: "", rubric: "Look for a clear claim, accurate explanation of a community benefit, a realistic challenge or tradeoff, a relevant example, organized reasoning, and a concluding insight. Score for reasoning and evidence, not exact wording.", points: 8, diagnosticSubcategory: "Essay Reasoning", diagnosticSkillTag: "Claim Evidence Tradeoff" }
    ]
  }]
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (typeof window !== "undefined" && key !== REVIEWERS_KEY && !SERVER_AUTH_KEYS?.has?.(key)) {
    fetch(`/api/data/legacy/${encodeURIComponent(key)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) }).catch(() => {});
  }
}

const SERVER_AUTH_KEYS = new Set([SESSION_KEY, CURRENT_ACTIVE_USER_KEY]);

export async function hydrateAllFromServer() {
  const response = await fetch("/api/data/legacy", { credentials: "include" });
  if (!response.ok) return false;
  const records = await response.json();
  if (!Array.isArray(records)) return false;

  let wroteRecord = false;
  records.forEach((record) => {
    if (!record || typeof record.key !== "string" || SERVER_AUTH_KEYS.has(record.key)) return;
    localStorage.setItem(record.key, JSON.stringify(record.value));
    wroteRecord = true;
  });
  const [sharedReviewers, sharedExams, sharedForum, notifications] = await Promise.all([
    http.get("/content/reviewers").catch(() => null), http.get("/content/exams").catch(() => null),
    http.get("/content/forum").catch(() => null), http.get("/content/notifications").catch(() => null)
  ]);
  if (Array.isArray(sharedReviewers?.data?.reviewers)) { localStorage.setItem(REVIEWERS_KEY, JSON.stringify(sharedReviewers.data.reviewers)); wroteRecord = true; }
  if (Array.isArray(sharedExams?.data?.exams)) { localStorage.setItem(EXAMS_KEY, JSON.stringify(sharedExams.data.exams)); wroteRecord = true; }
  if (Array.isArray(sharedForum?.data?.threads)) { localStorage.setItem(FORUM_KEY, JSON.stringify(sharedForum.data.threads)); wroteRecord = true; }
  if (Array.isArray(notifications?.data?.notifications)) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.data.notifications));
    window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    wroteRecord = true;
  }
  return wroteRecord;
}

export async function migrateLocalStorageToServer() {
  const user = readJson(CURRENT_ACTIVE_USER_KEY, readJson(SESSION_KEY, null));
  if (!user?.email) return { migrated: 0 };
  const records = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || SERVER_AUTH_KEYS.has(key) || key.startsWith("acet_auth_migrated_")) continue;
    const value = readJson(key, undefined);
    if (value !== undefined) records.push({ namespace: "legacy", key, value });
  }
  if (!records.length) return { migrated: 0 };
  const response = await fetch("/api/data/migrate", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
  if (!response.ok) throw new Error("Data migration failed");
  localStorage.setItem(`acet_auth_migrated_${user.email}`, new Date().toISOString());
  return response.json();
}

export function initializeLocalStorage() {
  if (!localStorage.getItem(EXAMS_DATA_KEY)) writeJson(EXAMS_DATA_KEY, examsData);
  if (!localStorage.getItem(STUDY_PLAN_KEY)) writeJson(STUDY_PLAN_KEY, studyPlanData);
  if (!localStorage.getItem(EXAMS_KEY)) writeJson(EXAMS_KEY, transformExamsDataToBlueprints(readJson(EXAMS_DATA_KEY, examsData)));
  if (!readJson(EXAMS_KEY, []).length) writeJson(EXAMS_KEY, transformExamsDataToBlueprints(readJson(EXAMS_DATA_KEY, examsData)));
  const storedBlueprints = readJson(EXAMS_KEY, []);
  if (!storedBlueprints.some((exam) => exam.id === essayExamSeed.id)) writeJson(EXAMS_KEY, [...storedBlueprints, essayExamSeed]);
  if (!localStorage.getItem(REVIEWERS_KEY)) localStorage.setItem(REVIEWERS_KEY, JSON.stringify(reviewerBlueprintSeed.map((reviewer) => ({ ...reviewer, status: "published", createdAt: "2026-07-22T00:00:00.000Z" }))));
  const storedDrills = readJson(DRILL_BANK_KEY, null);
  if (!Array.isArray(storedDrills) || storedDrills.length === 0) writeJson(DRILL_BANK_KEY, drillBankSeed);
  if (!localStorage.getItem(DASHBOARD_KEY)) writeJson(DASHBOARD_KEY, {});
  if (!localStorage.getItem(REVIEWER_PROGRESS_KEY)) writeJson(REVIEWER_PROGRESS_KEY, {});
  // An empty forum is a valid, intentional state. Do not repopulate it with
  // sample posts after an account's content has been cleared.
  if (!localStorage.getItem(FORUM_KEY)) writeJson(FORUM_KEY, []);
  removeSeededForumUsers();
  if (!localStorage.getItem(NOTIFICATIONS_KEY)) writeJson(NOTIFICATIONS_KEY, []);

}

export function getExamsData() {
  initializeLocalStorage();
  return readJson(EXAMS_DATA_KEY, examsData);
}

export function getStudyPlanData() {
  initializeLocalStorage();
  return readJson(STUDY_PLAN_KEY, studyPlanData);
}

export function getCurrentUser() {
  initializeLocalStorage();
  return readJson(CURRENT_ACTIVE_USER_KEY, readJson(SESSION_KEY, null));
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_ACTIVE_USER_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function setCurrentActiveUser(user) {
  const sessionUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    recoveryEmail: user.recoveryEmail || "",
    role: user.role || "student",
    name: user.name || "",
    nickname: user.nickname || "",
    school: user.school || "",
    smsNumber: user.smsNumber || "",
    isGoogleLinked: Boolean(user.isGoogleLinked),
    profileCompleted: Boolean(user.profileCompleted),
    academicMetrics: user.academicMetrics || { target: "", strengths: [], weakTags: [] }
  };

  writeJson(CURRENT_ACTIVE_USER_KEY, sessionUser);
  writeJson(SESSION_KEY, sessionUser);
  window.dispatchEvent(new CustomEvent("currentActiveUserUpdated", { detail: sessionUser }));
  return sessionUser;
}

function getUserDisplayName(user) {
  return user?.nickname || user?.name || user?.username || user?.email || "Student";
}

function normalizeForumThread(thread) {
  return {
    ...thread,
    author: thread.author || "Student",
    authorId: thread.authorId || thread.userId || "",
    authorEmail: thread.authorEmail || "",
    reactions: normalizeReactions(thread.reactions),
    replies: (thread.replies || []).map((reply) => ({
      ...reply,
      author: reply.author || "Student",
      authorId: reply.authorId || reply.userId || "",
      createdAt: reply.createdAt || new Date().toISOString()
    }))
  };
}

function normalizeReactions(reactions = {}) {
  return ["like", "insightful", "fire"].reduce((nextReactions, type) => {
    const reaction = reactions[type] || {};
    nextReactions[type] = {
      count: Number(reaction.count || 0),
      userIds: Array.isArray(reaction.userIds) ? reaction.userIds : []
    };
    return nextReactions;
  }, {});
}

function transformExamsDataToBlueprints(examRecords) {
  return examRecords.map((exam) => {
    const grouped = exam.questions.reduce((sections, question) => {
      const subject = question.subject || "General Knowledge";
      const existing = sections.find((section) => section.subjectTitle === subject);
      const target = existing || {
        subjectTitle: subject,
        allottedTimeSec: Math.round((Number(exam.duration || 50) * 60) / 4),
        questions: []
      };
      target.questions.push({
        id: question.id,
        type: "multiple_choice",
        stem: question.questionText,
        choiceOpts: question.options,
        answerIdx: question.correctAnswer,
        correctAnswers: [],
        correctText: "",
        diagnosticSubcategory: question.subCategory,
        diagnosticSkillTag: question.weaknessTag,
        category: question.subject,
        subCategory: question.subCategory,
        weaknessTag: question.weaknessTag,
        points: Math.max(1, Math.round(Number(exam.points || 100) / Math.max(1, exam.questions.length)))
      });
      return existing ? sections : [...sections, target];
    }, []);

    return {
      id: exam.id,
      title: exam.title,
      duration: exam.duration,
      points: exam.points,
      sections: grouped,
      createdAt: new Date().toISOString(),
      status: "published",
      source: "examsData"
    };
  });
}

function getStudyPlanCards() {
  return readJson(STUDY_PLAN_KEY, studyPlanData).map((week) => ({
    day: `Week ${week.week}`,
    title: week.title,
    detail: `${week.focusAreas.join(" • ")}. Objectives: ${week.objectives.join(" ")}`,
    detailHtml: week.readingHtml,
    status: week.week === 1 ? "today" : "upcoming",
    objectives: week.objectives,
    focusAreas: week.focusAreas
  }));
}

export function getExamBlueprints() {
  initializeLocalStorage();
  return readJson(EXAMS_KEY, []);
}

export function getActiveExamBlueprint() {
  const blueprints = getExamBlueprints();
  return blueprints[blueprints.length - 1] || null;
}

async function saveSharedExams(exams) { await http.put("/content/exams", { exams }); localStorage.setItem(EXAMS_KEY, JSON.stringify(exams)); return exams; }

export async function publishExamBlueprint(blueprint) {
  const blueprints = getExamBlueprints();
  const nextBlueprint = {
    ...blueprint,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "published"
  };

  await saveSharedExams([...blueprints, nextBlueprint]);
  return nextBlueprint;
}

export function getReviewerBlueprints() {
  initializeLocalStorage();
  return readJson(REVIEWERS_KEY, []);
}

async function saveSharedReviewers(reviewers) {
  await http.put("/content/reviewers", { reviewers });
  localStorage.setItem(REVIEWERS_KEY, JSON.stringify(reviewers));
  return reviewers;
}

export async function publishReviewerBlueprint(reviewer) {
  const reviewers = getReviewerBlueprints();
  const nextReviewer = {
    ...reviewer,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "published"
  };

  await saveSharedReviewers([...reviewers, nextReviewer]);
  return nextReviewer;
}

export function setAuthenticatedUser(user) {
  return setCurrentActiveUser(user);
}

export async function updateReviewerBlueprint(reviewerId, updates) {
  const updated = getReviewerBlueprints().map((reviewer) => reviewer.id === reviewerId ? { ...reviewer, ...updates, id: reviewerId, status: "published" } : reviewer);
  await saveSharedReviewers(updated);
  return updated.find((reviewer) => reviewer.id === reviewerId);
}

export async function deleteReviewerBlueprint(reviewerId) {
  const next = getReviewerBlueprints().filter((reviewer) => reviewer.id !== reviewerId);
  await saveSharedReviewers(next);
  return next;
}

//ADMIN FUNCTIONS FOR EXAM MANAGEMENT

// Get a single exam by ID for editing
export function getExamBlueprintById(examId) {
  const blueprints = getExamBlueprints();
  return blueprints.find((exam) => exam.id === examId) || null;
}

// Delete an exam by ID
export async function deleteExamBlueprint(examId) {
  const blueprints = getExamBlueprints();
  const filtered = blueprints.filter((exam) => exam.id !== examId);
  await saveSharedExams(filtered);
  return filtered;
}

// Hide/Unhide an exam
export async function toggleExamVisibility(examId) {
  const blueprints = getExamBlueprints();
  const updated = blueprints.map((exam) => {
    if (exam.id === examId) {
      return { 
        ...exam, 
        isHidden: !exam.isHidden,
        hiddenAt: exam.isHidden ? null : new Date().toISOString()
      };
    }
    return exam;
  });
  await saveSharedExams(updated);
  return updated.find((exam) => exam.id === examId);
}

// Update an existing exam
export async function updateExamBlueprint(examId, updates) {
  const blueprints = getExamBlueprints();
  const updated = blueprints.map((exam) => {
    if (exam.id === examId) {
      return {
        ...exam,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }
    return exam;
  });
  await saveSharedExams(updated);
  return updated.find((exam) => exam.id === examId);
}

// END OF ADMIN FUNCTIONS

export function getDrillBankQuestions() {
  initializeLocalStorage();
  return readJson(DRILL_BANK_KEY, []);
}

export function publishDrillQuestion(question) {
  const drillBank = getDrillBankQuestions();
  const type = question.type || question.questionType || "multiple_choice";
  const category = question.category || question.subjectTitle || "General Practice";
  const subCategory = question.subCategory || question.diagnosticSubcategory || "";
  const weaknessTag = question.weaknessTag || question.diagnosticSkillTag || "";
  const nextQuestion = {
    ...question,
    id: crypto.randomUUID(),
    type,
    questionType: question.questionType || type,
    questionHtml: question.questionHtml || question.stem,
    category,
    subCategory,
    weaknessTag,
    structuralTags: question.structuralTags || {
      category,
      subCategory,
      weaknessTag,
      path: [category, subCategory, weaknessTag].filter(Boolean)
    },
    status: "published",
    createdAt: new Date().toISOString()
  };

  writeJson(DRILL_BANK_KEY, [nextQuestion, ...drillBank]);
  return nextQuestion;
}

export function updateDrillQuestion(drillId, updates) {
  const updated = getDrillBankQuestions().map((question) => question.id === drillId ? { ...question, ...updates, id: drillId, status: "published" } : question);
  writeJson(DRILL_BANK_KEY, updated);
  return updated.find((question) => question.id === drillId);
}

export function deleteDrillQuestion(drillId) {
  const next = getDrillBankQuestions().filter((question) => question.id !== drillId);
  writeJson(DRILL_BANK_KEY, next);
  return next;
}

export function getDashboardStore() {
  initializeLocalStorage();
  return readJson(DASHBOARD_KEY, {});
}

export function getStudentDashboard(email) {
  const store = getDashboardStore();
  const dashboard = store[email] || createEmptyDashboard(email);
  const normalizedDashboard = normalizeDashboardAnalytics(normalizeEssayReviewStatuses(dashboard), email);

  if (JSON.stringify(dashboard) !== JSON.stringify(normalizedDashboard)) {
    writeJson(DASHBOARD_KEY, { ...store, [email]: normalizedDashboard });
  }

  return normalizedDashboard;
}

export function isStudentProfileComplete(user) {
  if (user?.role === "admin") return true;
  return Boolean(
    String(user?.name || "").trim()
    && String(user?.nickname || "").trim()
    && String(user?.school || "").trim()
    && String(user?.smsNumber || user?.phoneNumber || "").trim()
    && String(user?.recoveryEmail || "").trim()
  );
}

// Repairs old attempts created before the exam summary was updated alongside an
// approved essay. It also keeps the student record and admin history aligned.
function normalizeEssayReviewStatuses(dashboard) {
  const attempts = Array.isArray(dashboard?.attempts) ? dashboard.attempts : [];
  let changed = false;
  const nextAttempts = attempts.map((attempt) => {
    const essays = getEssayResponses(attempt);
    if (!essays.length) return attempt;
    const reviewed = essays.every((essay) => essay.status === "approved");
    const next = reviewed
      ? recalculateEssayAttempt({ ...attempt, essayResponses: essays, status: "Reviewed", hasPendingEssays: false })
      : { ...attempt, essayResponses: essays, finalPct: null, passed: null, status: "Pending Review", hasPendingEssays: true };
    if (JSON.stringify(next) !== JSON.stringify(attempt)) changed = true;
    return next;
  });
  if (!changed) return dashboard;
  const exams = (dashboard.exams || []).map((exam, index) => {
    const attempt = nextAttempts[index];
    return attempt?.essayResponses?.length ? {
      ...exam,
      score: attempt.finalPct,
      finalPct: attempt.finalPct,
      earnedPoints: attempt.earnedPoints,
      totalPoints: attempt.totalPoints,
      passed: attempt.passed,
      status: attempt.status,
      hasPendingEssays: attempt.hasPendingEssays
    } : exam;
  });
  return { ...dashboard, attempts: nextAttempts, exams };
}

export function saveStudentDashboard(email, dashboard) {
  const store = getDashboardStore();
  writeJson(DASHBOARD_KEY, { ...store, [email]: dashboard });
}

export function createEmptyDashboard(email) {
  return {
    student: { email, displayName: "Stanly Mejia" },
    hasDashboardData: false,
    stats: [
      { label: "Latest Mock Score", value: "0%", detail: "No completed exam attempts yet", accent: "blue" },
      { label: "Total Tests Taken", value: "0", detail: "0 completed mock exams", accent: "purple" }
    ],
    progression: [],
    subjects: [],
    exams: [],
    attempts: [],
    studyPlan: getStudyPlanCards(),
    rewards: [],
    aiInsight: null
  };
}

function normalizeDashboardAnalytics(dashboard, email) {
  const exams = Array.isArray(dashboard.exams) ? dashboard.exams : [];
  const attempts = Array.isArray(dashboard.attempts) ? dashboard.attempts : [];
  const attemptsForChart = attempts.length
    ? attempts
    : exams.map((exam, index) => ({
        id: `legacy_attempt_${index + 1}`,
        examTitle: exam.name,
        takenAt: exam.takenAt,
        finalPct: exam.score,
        subjectScores: []
      }));

  const isPendingEssayReview = (attempt) => attempt?.hasPendingEssays || attempt?.status === "Pending Review";
  const completedAttempts = attemptsForChart.filter((attempt) => !isPendingEssayReview(attempt));
  const chronologicalAttempts = [...completedAttempts].reverse();
  const latestCompletedAttempt = completedAttempts[0];
  const previousCompletedAttempt = completedAttempts[1];
  const progression = chronologicalAttempts.map((attempt, index) => ({
    label: attempt.examTitle || attempt.name || `Mock ${index + 1}`,
    score: Number(attempt.finalPct ?? attempt.score ?? 0),
    takenAt: attempt.takenAt || "",
    examTitle: attempt.examTitle || attempt.name || `Mock ${index + 1}`
  }));

  const latestSubjectScores = Array.isArray(latestCompletedAttempt?.subjectScores) ? latestCompletedAttempt.subjectScores : [];
  const subjects = latestSubjectScores.length
    ? latestSubjectScores.map((subject) => ({
        name: subject.title || subject.name,
        mastery: Number(subject.pct ?? subject.mastery ?? 0),
        color: Number(subject.pct ?? subject.mastery ?? 0) >= 90 ? "emerald" : Number(subject.pct ?? subject.mastery ?? 0) >= 80 ? "blue" : Number(subject.pct ?? subject.mastery ?? 0) >= 70 ? "amber" : "rose"
      }))
    : dashboard.subjects || [];
  const totalTests = attemptsForChart.length || exams.length;
  const totalAvailableMocks = getExamBlueprints().length;
  const rewardSummary = buildCommunityRewardSummary(email, { ...dashboard, attempts });
  const studyPoints = rewardSummary.totalPoints;
  const attemptsBeforeLatest = latestCompletedAttempt
    ? attempts.filter((attempt) => attempt !== latestCompletedAttempt)
    : attempts;
  const previousRewardSummary = latestCompletedAttempt
    ? buildCommunityRewardSummary(email, { ...dashboard, attempts: attemptsBeforeLatest })
    : rewardSummary;
  const latestScore = Number(latestCompletedAttempt?.finalPct ?? latestCompletedAttempt?.score ?? 0);
  const previousScore = Number(previousCompletedAttempt?.finalPct ?? previousCompletedAttempt?.score ?? 0);
  const scoreDifference = latestScore - previousScore;
  const scoreTrend = previousCompletedAttempt
    ? { direction: scoreDifference > 0 ? "up" : scoreDifference < 0 ? "down" : "same", text: `${scoreDifference > 0 ? "+" : ""}${scoreDifference} pts vs previous attempt` }
    : latestCompletedAttempt
      ? { direction: "same", text: "First completed attempt" }
      : null;
  const pointsDifference = studyPoints - previousRewardSummary.totalPoints;
  const pointsTrend = latestCompletedAttempt
    ? { direction: pointsDifference > 0 ? "up" : pointsDifference < 0 ? "down" : "same", text: pointsDifference === 0 ? "No points change from this attempt" : `${pointsDifference > 0 ? "+" : ""}${pointsDifference.toLocaleString()} pts from latest attempt` }
    : null;

  return {
    ...dashboard,
    student: dashboard.student || { email, displayName: "Stanly Mejia" },
    hasDashboardData: exams.length > 0 || attemptsForChart.length > 0 || Boolean(dashboard.hasDashboardData),
    stats: [
      {
        label: "Latest Mock Score",
        value: latestCompletedAttempt ? `${Number(latestCompletedAttempt.finalPct ?? latestCompletedAttempt.score ?? 0)}%` : "0%",
        detail: latestCompletedAttempt ? `Scored from ${latestCompletedAttempt.examTitle || latestCompletedAttempt.name || "completed mock exam"}` : "No completed exam attempts yet",
        accent: "blue",
        trend: scoreTrend
      },
      {
        label: "Total Tests Taken",
        value: String(totalTests),
        detail: `${totalTests} completed mock exam${totalTests === 1 ? "" : "s"} out of ${totalAvailableMocks} available`,
        accent: "purple",
        trend: totalTests ? { direction: "up", text: "+1 completed from previous attempt" } : null
      },
      {
        label: "Leaderboard Placement",
        value: "-",
        detail: "See the Community leaderboard for your current rank",
        accent: "indigo"
      },
      {
        label: "Study Points",
        value: studyPoints.toLocaleString(),
        detail: "From exams and completed modules",
        accent: "teal",
        trend: pointsTrend
      }
    ],
    progression,
    subjects,
    exams,
    attempts
  };
}

export async function saveExamAttemptForStudent(user, blueprint, responses, results, meta = {}) {
  if (!user?.email) throw new Error("Your signed-in student account is unavailable.");
  const currentDashboard = getStudentDashboard(user.email);
  const attemptNumber = currentDashboard.exams.length + 1;
  const takenAt = new Date().toISOString();
  const durationSeconds = Number(meta.durationSeconds || 0);
  const isPendingEssayReview = Boolean(results.hasEssays);
  // Academic points are the single score basis: earned question points out of
  // available question points. Community rewards never change an exam score.
  const earnedMockPoints = isPendingEssayReview ? 0 : Math.max(0, Number(results.earnedPoints || 0));
  const passingScore = Number.isFinite(Number(blueprint.passingScore)) ? Number(blueprint.passingScore) : 75;
  const passed = isPendingEssayReview ? null : Number(results.finalPct) >= passingScore;
  // Freeze all question fields with the attempt so admin history remains
  // complete even if the exam blueprint is later edited or replaced.
  const itemDiagnostics = snapshotAttemptDiagnostics(blueprint, responses, results.itemDiagnostics);

  const essayResponses = (blueprint.sections || []).flatMap((section, sectionIndex) =>
    (section.questions || []).flatMap((question, questionIndex) => {
      if (question.type !== "paragraph" && question.type !== "essay") return [];
      return [{
        id: crypto.randomUUID(), sectionIndex, questionIndex,
        questionId: question.id || null,
        response: String(responses?.[sectionIndex]?.[questionIndex] || ""),
        points: Math.max(1, Number(question.points || 1)),
        rubric: question.rubric || "", aiScore: null, finalScore: null,
        status: "pending_review"
      }];
    })
  );
  const reviewStatus = essayResponses.length ? "Pending Review" : "Analyzed";
  const finalScore = isPendingEssayReview ? null : results.finalPct;
  const exams = [
    { examId: blueprint.id, name: blueprint.title, takenAt, score: finalScore, finalPct: finalScore, earnedPoints: Number(results.earnedPoints || 0), totalPoints: Number(results.totalPoints || 0), durationSeconds, passingScore, passed, status: reviewStatus, hasPendingEssays: essayResponses.length > 0 },
    ...currentDashboard.exams
  ];

  const attempts = [
    {
      id: crypto.randomUUID(),
      examId: blueprint.id,
      examTitle: blueprint.title,
      takenAt,
      finalPct: finalScore,
      passingScore,
      passed,
      earnedMockPoints,
      earnedPoints: Number(results.earnedPoints || 0),
      totalPoints: Number(results.totalPoints || 0),
      durationSeconds,
      subjectScores: results.subjectScores,
      itemDiagnostics,
      essayResponses,
      status: reviewStatus,
      hasPendingEssays: essayResponses.length > 0
    },
    ...(currentDashboard.attempts || [])
  ];

  const hasPendingEssayReview = (attempt) => attempt?.hasPendingEssays || attempt?.status === "Pending Review";
  const completedAttempts = attempts.filter((attempt) => !hasPendingEssayReview(attempt));
  const latestCompletedAttempt = completedAttempts[0];
  const progression = [...completedAttempts].reverse().map((attempt, index) => ({
    label: attempt.examTitle || `Mock ${index + 1}`,
    score: Number(attempt.finalPct || 0),
    takenAt: attempt.takenAt,
    examTitle: attempt.examTitle || `Mock ${index + 1}`
  }));
  const subjects = (isPendingEssayReview ? [] : results.subjectScores).map((subject) => ({
    name: subject.title,
    mastery: subject.pct,
    color: subject.pct >= 90 ? "emerald" : subject.pct >= 80 ? "blue" : subject.pct >= 70 ? "amber" : "rose"
  }));

  const studyPlan = getStudyPlanCards().map((item, index) => {
    if (isPendingEssayReview) return item;
    const weakness = results.weaknesses[index % Math.max(1, results.weaknesses.length)];
    if (!weakness) return item;
    return {
      ...item,
      title: `${item.title}: ${weakness.title} Recovery`,
      detail: `Focus on ${weakness.topicFocus}. ${item.detail}`,
      status: index === 0 ? "today" : item.status
    };
  });
  const rewardSummary = buildCommunityRewardSummary(user.email, { ...currentDashboard, attempts });
  const nextDashboard = {
    ...currentDashboard,
    hasDashboardData: true,
    stats: [
      { label: "Latest Mock Score", value: latestCompletedAttempt ? `${Number(latestCompletedAttempt.finalPct ?? latestCompletedAttempt.score ?? 0)}%` : "0%", detail: latestCompletedAttempt ? `Scored from ${latestCompletedAttempt.examTitle || latestCompletedAttempt.name || "completed mock exam"}` : "No completed exam attempts yet", accent: "blue" },
      { label: "Total Tests Taken", value: String(exams.length), detail: `${exams.length} completed mock exam${exams.length === 1 ? "" : "s"} out of ${getExamBlueprints().length} available`, accent: "purple" },
      { label: "Leaderboard Placement", value: "-", detail: "See the Community leaderboard for your current rank", accent: "indigo" },
      { label: "Study Points", value: rewardSummary.totalPoints.toLocaleString(), detail: "From exams and completed modules", accent: "teal" }
    ],
    progression,
    subjects,
    exams,
    attempts,
    studyPlan,
    rewards: [{ title: `${attemptNumber} Mock${attemptNumber === 1 ? "" : "s"} Completed`, description: "Earned from completed localStorage-tracked exams.", points: earnedMockPoints }],
    aiInsight: isPendingEssayReview
      ? { title: "Essay review pending", priority: "Awaiting Review", detail: "Your final score and recommendations will be available after the essay review is complete." }
      : results.weaknesses.length
      ? { title: `AI Deep Dive: ${results.weaknesses[0].title}`, priority: "Priority Intervention Required", detail: `Your latest attempt showed lower mastery in ${results.weaknesses[0].topicFocus}.` }
      : { title: "AI Deep Dive: Strong Performance", priority: "Maintenance Mode", detail: "You scored above the intervention threshold across all MCQ subjects." }
  };

  const normalizedDashboard = normalizeDashboardAnalytics(nextDashboard, user.email);
  saveStudentDashboard(user.email, normalizedDashboard);
  // An exam is only complete once the server has accepted the exact dashboard
  // record used by the results, dashboard, points, and drill recommendations.
  const dashboardStore = getDashboardStore();
  await http.put(`/data/legacy/${encodeURIComponent(DASHBOARD_KEY)}`, { value: dashboardStore });
  return normalizedDashboard;
}

export function saveIncompleteExamAttemptForStudent(user, blueprint, sessionId) {
  const dashboard = getStudentDashboard(user.email);
  if (blueprint.accessType === "unlimited") return dashboard;
  if ((dashboard.exams || []).some((exam) => exam.sessionId === sessionId)) return dashboard;
  const nextDashboard = {
    ...dashboard,
    exams: [{
      examId: blueprint.id,
      sessionId,
      name: blueprint.title,
      takenAt: new Date().toISOString(),
      score: null,
      status: "Incomplete",
      incomplete: true,
      passed: false
    }, ...(dashboard.exams || [])]
  };
  saveStudentDashboard(user.email, nextDashboard);
  return nextDashboard;
}

function snapshotAttemptDiagnostics(blueprint, responses, diagnostics = []) {
  let diagnosticIndex = 0;
  return (blueprint.sections || []).flatMap((section, sectionIndex) =>
    (section.questions || []).map((question, questionIndex) => {
      const diagnostic = diagnostics[diagnosticIndex++] || {};
      const points = Math.max(1, Number(question.points || diagnostic.points || 1));
      const hasStudentAnswer = Object.prototype.hasOwnProperty.call(diagnostic, "studentAnswer");
      return {
        ...diagnostic,
        questionId: diagnostic.questionId || question.id || null,
        questionText: diagnostic.questionText || question.stem || "",
        questionType: diagnostic.questionType || question.type || "multiple_choice",
        choiceOpts: Array.isArray(diagnostic.choiceOpts) && diagnostic.choiceOpts.length ? diagnostic.choiceOpts : (question.choiceOpts || []),
        studentAnswer: hasStudentAnswer ? diagnostic.studentAnswer : (responses?.[sectionIndex]?.[questionIndex] ?? null),
        correctAnswerIdx: diagnostic.correctAnswerIdx ?? question.answerIdx ?? null,
        correctAnswers: Array.isArray(diagnostic.correctAnswers) && diagnostic.correctAnswers.length ? diagnostic.correctAnswers : (question.correctAnswers || []),
        correctText: diagnostic.correctText || question.correctText || "",
        points,
        earnedPoints: diagnostic.isCorrect === true ? points : 0
      };
    })
  );
}

export function saveAiDiagnosticForLatestAttempt(email, diagnostic) {
  const dashboard = getStudentDashboard(email);
  const attempts = Array.isArray(dashboard.attempts) ? dashboard.attempts : [];
  if (!attempts.length) return dashboard;

  const nextAttempts = attempts.map((attempt, index) => (
    index === 0
      ? {
          ...attempt,
          aiDiagnostic: diagnostic,
          aiDiagnosticGeneratedAt: new Date().toISOString()
        }
      : attempt
  ));

  const nextDashboard = {
    ...dashboard,
    attempts: nextAttempts,
    aiInsight: diagnostic?.weakness_paragraph
      ? {
          title: "AI Deep Dive: Adaptive Diagnostic",
          priority: diagnostic.percentage_score < 75 ? "Priority Intervention Required" : "Maintenance Mode",
          detail: diagnostic.weakness_paragraph
        }
      : dashboard.aiInsight
  };

  saveStudentDashboard(email, nextDashboard);
  return getStudentDashboard(email);
}

export function scoreBlueprintAttempt(blueprint, responses, meta = {}) {
  let earnedPoints = 0;
  let totalPoints = 0;
  let correct = 0;
  let total = 0;
  const itemDiagnostics = [];

  const subjectScores = blueprint.sections.map((section, sectionIndex) => {
    const sectionResponses = responses[sectionIndex] || [];
    let sectionCorrect = 0;
    let sectionTotal = 0;
    let sectionEarnedPoints = 0;
    let sectionTotalPoints = 0;

    section.questions.forEach((question, questionIndex) => {
      const points = Math.max(1, Number(question.points || 1));
      const response = sectionResponses[questionIndex];
      const correctItem = isCorrectAnswer(question, response);
      sectionTotal += 1;
      total += 1;
      // Keep the essay in the saved attempt for later recalculation, but do
      // not expose a score while an administrator has not reviewed it.
      sectionTotalPoints += points;
      totalPoints += points;

      if (correctItem === true) {
        sectionCorrect += 1;
        correct += 1;
        sectionEarnedPoints += points;
        earnedPoints += points;
      }

      itemDiagnostics.push(
        buildItemDiagnostic({
          section,
          question,
          response,
          isCorrect: correctItem,
          metrics: meta.questionMetrics?.[sectionIndex]?.[questionIndex]
        })
      );
    });

    return {
      title: section.subjectTitle,
      correct: sectionCorrect,
      total: sectionTotal,
      earnedPoints: sectionEarnedPoints,
      totalPoints: sectionTotalPoints,
      pct: sectionTotalPoints ? Math.round((sectionEarnedPoints / sectionTotalPoints) * 100) : 0
    };
  });

  const calculatedPct = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const essayQuestions = blueprint.sections.flatMap((section) => section.questions.filter((question) => question.type === "paragraph" || question.type === "essay"));
  const hasEssays = essayQuestions.length > 0;
  const weaknesses = hasEssays ? [] : subjectScores.filter((subject) => subject.total > 0 && subject.pct < 80).map((subject) => ({ ...subject, topicFocus: subject.title }));
  return { finalPct: hasEssays ? null : calculatedPct, correct, total, earnedPoints, totalPoints, subjectScores, weaknesses, itemDiagnostics, hasEssays, essayCount: essayQuestions.length, status: hasEssays ? "Pending Review" : "Analyzed" };
}

export function getWeaknessAnalysis(email, threshold = 75) {
  const dashboard = getStudentDashboard(email);
  const attempts = dashboard.attempts || [];
  if (!attempts.length && !dashboard.subjects.length) return { hasAttempts: false, weakSubjects: [], diagnosticInsights: [] };

  const subjectMap = new Map();
  attempts.forEach((attempt) => {
    attempt.subjectScores?.forEach((subject) => {
      const current = subjectMap.get(subject.title) || { subject: subject.title, totalPct: 0, count: 0, lowestPct: 100 };
      current.totalPct += subject.pct;
      current.count += 1;
      current.lowestPct = Math.min(current.lowestPct, subject.pct);
      subjectMap.set(subject.title, current);
    });
  });

  if (!subjectMap.size) {
    dashboard.subjects.forEach((subject) => subjectMap.set(subject.name, { subject: subject.name, totalPct: subject.mastery, count: 1, lowestPct: subject.mastery }));
  }

  const ranked = [...subjectMap.values()].map((item) => ({ subject: item.subject, averagePct: Math.round(item.totalPct / item.count), lowestPct: item.lowestPct })).sort((a, b) => a.averagePct - b.averagePct);
  const weakSubjects = ranked.filter((item) => item.averagePct < threshold);
  const diagnosticInsights = buildDiagnosticInsights(attempts);
  return { hasAttempts: true, weakSubjects: weakSubjects.length ? weakSubjects : ranked.slice(0, 1), diagnosticInsights, primaryDiagnostic: diagnosticInsights[0] || null };
}

export function getQuestionsForSubject(subjectName, limit = 10, diagnosticFocus = null) {
  const normalizedSubject = subjectName.toLowerCase();
  const questions = getDrillBankQuestions()
    .filter((question) => question.subjectTitle?.toLowerCase() === normalizedSubject)
    .map((question) => {
      const section = { subjectTitle: question.subjectTitle };
      const diagnosticTags = getDiagnosticTags(section, question);
      return { ...question, ...diagnosticTags, explanation: question.explanation || buildExplanation(question) };
    });

  return questions
    .sort((a, b) => getDiagnosticMatchScore(b, diagnosticFocus) - getDiagnosticMatchScore(a, diagnosticFocus))
    .slice(0, limit);
}

export function scoreDrillAttempt(questions, responses) {
  let correct = 0;
  const items = questions.map((question, index) => {
    const isCorrect = isCorrectAnswer(question, responses[index]);
    if (isCorrect) correct += 1;
    return { question, response: responses[index], isCorrect, explanation: question.explanation || buildExplanation(question) };
  });
  let streak = 0;
  let bestStreak = 0;
  items.forEach((item) => {
    streak = item.isCorrect ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  });
  return { correct, total: questions.length, pct: questions.length ? Math.round((correct / questions.length) * 100) : 0, points: correct * 10 + bestStreak * 5, bestStreak, items };
}

export function getDrillSessions(email) {
  initializeLocalStorage();
  const sessions = readJson(DRILL_SESSIONS_KEY, {});
  return Array.isArray(sessions[email]) ? sessions[email] : [];
}

export function saveDrillSession(email, session) {
  const sessions = readJson(DRILL_SESSIONS_KEY, {});
  const next = [{ ...session, id: session.id || crypto.randomUUID(), savedAt: new Date().toISOString() }, ...(sessions[email] || [])].slice(0, 25);
  writeJson(DRILL_SESSIONS_KEY, { ...sessions, [email]: next });
  return next[0];
}

export function getReviewerProgress(email) {
  initializeLocalStorage();
  const progress = readJson(REVIEWER_PROGRESS_KEY, {});
  return progress[email] || {};
}

export function markReviewerModuleComplete(email, reviewerId, moduleId) {
  return setReviewerModuleCompletion(email, reviewerId, moduleId, true);
}

export function setReviewerModuleCompletion(email, reviewerId, moduleId, completed) {
  const progress = readJson(REVIEWER_PROGRESS_KEY, {});
  const userProgress = progress[email] || {};
  const moduleSet = new Set(userProgress[reviewerId] || []);
  if (completed) moduleSet.add(moduleId);
  else moduleSet.delete(moduleId);
  const nextProgress = { ...progress, [email]: { ...userProgress, [reviewerId]: [...moduleSet] } };
  writeJson(REVIEWER_PROGRESS_KEY, nextProgress);
  return nextProgress[email];
}

export function getCommunityRewardSummary(email) {
  const dashboard = getStudentDashboard(email);
  return buildCommunityRewardSummary(email, dashboard);
}

function buildCommunityRewardSummary(email, dashboard) {
  const exams = getExamBlueprints();
  const reviewers = getReviewerBlueprints();
  const progress = getReviewerProgress(email);
  const attempts = dashboard.attempts || [];
  const mockPoints = attempts.reduce((sum, attempt) => sum + Number(attempt.earnedMockPoints ?? attempt.earnedPoints ?? 0), 0);
  const reviewerModules = reviewers.flatMap((reviewer) => reviewer.modules.map((module) => ({ reviewerId: reviewer.id, moduleId: module.id })));
  const completedReviewerModules = reviewerModules.filter((module) => progress[module.reviewerId]?.includes(module.moduleId));
  const reviewerPoints = completedReviewerModules.length * 75;
  const totalPoints = mockPoints + reviewerPoints;

  return {
    totalPoints,
    mockPoints,
    reviewerPoints,
    completedReviewerModules: completedReviewerModules.length,
    totalReviewerModules: reviewerModules.length,
    completedExams: new Set(attempts.map((attempt) => attempt.examId).filter(Boolean)).size,
    totalExams: exams.length,
    latestScore: attempts[0]?.finalPct || 0
  };
}

// Use this when displaying global standings so every account is ranked against
// the server's current, per-student records.
export async function getFreshLeaderboard(currentEmail) {
  const response = await fetch("/api/data/leaderboard", {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Could not load the current leaderboard.");
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map((row) => ({ ...row, isCurrent: row.email === currentEmail })) : [];
}

export function getForumThreads() {
  initializeLocalStorage();
  return readJson(FORUM_KEY, []).map(normalizeForumThread).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createForumThread(_user, payload) {
  const { data } = await http.post("/content/forum/threads", payload);
  localStorage.setItem(FORUM_KEY, JSON.stringify(data.threads));
  window.dispatchEvent(new CustomEvent("forumPostsUpdated", { detail: data.thread }));
  return data.thread;
}

export async function addForumReply(_user, threadId, body) {
  const { data } = await http.post(`/content/forum/threads/${encodeURIComponent(threadId)}/replies`, { body });
  localStorage.setItem(FORUM_KEY, JSON.stringify(data.threads));
  window.dispatchEvent(new CustomEvent("forumPostsUpdated", { detail: { threadId, reply: data.reply } }));
  return data.reply;
}

export async function toggleForumReaction(threadId, reactionType, _userId) {
  const { data } = await http.post(`/content/forum/threads/${encodeURIComponent(threadId)}/reactions`, { type: reactionType });
  localStorage.setItem(FORUM_KEY, JSON.stringify(data.threads));
  window.dispatchEvent(new CustomEvent("forumPostsUpdated"));
  return data.threads.find((thread) => thread.id === threadId);
}

export function getNotificationsForUser(userId) {
  initializeLocalStorage();
  return readJson(NOTIFICATIONS_KEY, [])
    .filter((notification) => notification.userId === userId)
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
}

export function markNotificationsRead(userId, notificationId = null) {
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const updated = notifications.map((notification) => {
    const matchesUser = notification.userId === userId;
    const matchesItem = !notificationId || notification.id === notificationId;
    return matchesUser && matchesItem ? { ...notification, isRead: true } : notification;
  });
  writeJson(NOTIFICATIONS_KEY, updated);
  window.dispatchEvent(new CustomEvent("notificationsUpdated"));
  // Notification read status belongs to the signed-in student, so persist it
  // before the next server hydration can replace this browser copy.
  http.patch("/content/notifications/read", notificationId ? { notificationId } : {})
    .catch((error) => console.warn("Unable to save notification read status:", error));
  return updated.filter((notification) => notification.userId === userId);
}

function removeSeededForumUsers() {
  const threads = readJson(FORUM_KEY, []);
  const retiredStanlyPosts = new Set(["5d0afba5-f3a5-4f7a-8c4f-448f9dc4ae8b", "c96fc172-af1f-450b-b64b-e748938420ea"]);
  const filtered = threads
    .map((thread) => ({
      ...thread,
      replies: (thread.replies || []).filter((reply) => !["User#4410", "User#8821"].includes(reply.author))
    }))
    .filter((thread) => !["User#4410", "User#8821"].includes(thread.author))
    // Remove the two retired Stanly Mejia posts from old browser copies too.
    .filter((thread) => !retiredStanlyPosts.has(thread.id));

  if (filtered.length !== threads.length || JSON.stringify(filtered) !== JSON.stringify(threads)) {
    writeJson(FORUM_KEY, filtered);
  }
}

function createNotification({ userId, type, message, metadata = {} }) {
  if (!userId) return null;
  const notifications = readJson(NOTIFICATIONS_KEY, []);
  const nextNotification = {
    id: crypto.randomUUID(),
    userId,
    type,
    message,
    isRead: false,
    timestamp: Date.now(),
    metadata
  };
  writeJson(NOTIFICATIONS_KEY, [nextNotification, ...notifications]);
  window.dispatchEvent(new CustomEvent("notificationsUpdated", { detail: nextNotification }));
  return nextNotification;
}

function buildExplanation(question) {
  const type = question.type || "multiple_choice";
  if (type === "checkboxes") {
    const answers = (question.correctAnswers || []).map((index) => question.choiceOpts?.[index]).filter(Boolean).join(", ");
    return `Correct answer(s): ${answers || "No answer key provided"}. Review the source material for this category.`;
  }
  if (type === "short_answer") return `Expected answer: ${question.correctText || "No answer key provided"}.`;
  const answer = question.choiceOpts?.[Number(question.answerIdx ?? 0)];
  return `Correct answer: ${answer || "No answer key provided"}. Revisit this concept before your next mock.`;
}

function buildItemDiagnostic({ section, question, response, isCorrect, metrics = {} }) {
  const tags = getDiagnosticTags(section, question);
  const answerEvents = metrics.answerEvents || [];
  const timeSpentMs = Number(metrics.timeSpentMs || 0);
  const lastAnswerAtMs = Number(answerEvents.at(-1)?.elapsedMs || 0);
  const responseDurationSeconds = Math.round(Math.max(timeSpentMs, lastAnswerAtMs) / 1000);
  const changedCorrectToIncorrect = answerEvents.some((event) => {
    if (event.from === null || event.from === undefined || event.to === null || event.to === undefined) return false;
    const wasCorrect = isCorrectAnswer(question, event.from);
    const becameIncorrect = isCorrectAnswer(question, event.to) === false;
    const lastSecondWindow = !responseDurationSeconds || Number(event.elapsedMs || 0) >= responseDurationSeconds * 1000 - 15000;
    return wasCorrect && becameIncorrect && lastSecondWindow;
  });
  const points = Math.max(1, Number(question.points || 1));
  return {
    ...tags,
    //  new fields needed for the exam submissions viewer 
    questionId: question.id || null,
    questionText: question.stem || "",
    questionType: question.type || "multiple_choice",
    choiceOpts: question.choiceOpts || [],
    studentAnswer: response ?? null,
    correctAnswerIdx: question.answerIdx ?? null,
    correctAnswers: question.correctAnswers || [],
    correctText: question.correctText || "",
    points,
    earnedPoints: isCorrect ? points : 0,
    //  existing fields 
    responseDurationSeconds,
    isCorrect,
    errorFlag: isCorrect === false,
    changedCorrectToIncorrect,
    changedAnswerCount: Math.max(0, answerEvents.length - 1)
  };
} 

function getDiagnosticTags(section, question) {
  const category = cleanLabel(question.category || question.subjectTitle || section.subjectTitle, "General Practice");
  const subcategory = cleanLabel(question.diagnosticSubcategory || question.subCategory || question.subcategory || question.topic, inferSubcategory(question));
  const skillTag = cleanLabel(question.diagnosticSkillTag || question.skillTag || question.tag || normalizeTags(question.tags), inferSkillTag(question));
  const path = [category, subcategory, skillTag].filter(Boolean);
  return {
    category,
    subcategory,
    skillTag,
    path,
    pathLabel: path.join(" -> ")
  };
}

function getDiagnosticMatchScore(question, diagnosticFocus) {
  if (!diagnosticFocus) return 0;
  let score = 0;
  if (question.category === diagnosticFocus.category) score += 1;
  if (question.subcategory === diagnosticFocus.subcategory) score += 3;
  if (question.skillTag === diagnosticFocus.skillTag) score += 5;
  return score;
}

function buildDiagnosticInsights(attempts) {
  const items = attempts.flatMap((attempt) => attempt.itemDiagnostics || []);
  if (!items.length) return [];

  const timedItems = items.filter((item) => Number(item.responseDurationSeconds) > 0);
  const globalAverageSeconds = timedItems.length
    ? timedItems.reduce((sum, item) => sum + Number(item.responseDurationSeconds || 0), 0) / timedItems.length
    : 0;
  const slowThreshold = Math.max(75, globalAverageSeconds * 1.25);
  const groups = new Map();

  items.forEach((item) => {
    const key = item.pathLabel || item.category;
    const group = groups.get(key) || {
      ...item,
      attempts: 0,
      errors: 0,
      durationTotal: 0,
      timedCount: 0,
      changedCorrectToIncorrect: 0
    };
    group.attempts += 1;
    if (item.errorFlag) group.errors += 1;
    if (Number(item.responseDurationSeconds) > 0) {
      group.durationTotal += Number(item.responseDurationSeconds);
      group.timedCount += 1;
    }
    if (item.changedCorrectToIncorrect) group.changedCorrectToIncorrect += 1;
    groups.set(key, group);
  });

  return [...groups.values()]
    .map((group) => {
      const averageSeconds = group.timedCount ? Math.round(group.durationTotal / group.timedCount) : 0;
      const errorRate = group.attempts ? group.errors / group.attempts : 0;
      const hasRepeatedErrors = group.errors >= 2 || errorRate >= 0.5;
      const hasTimeBottleneck = hasRepeatedErrors && averageSeconds >= slowThreshold;
      const hasSelfDoubt = group.changedCorrectToIncorrect >= 2 || (group.changedCorrectToIncorrect >= 1 && group.errors <= 2);

      let insightType = "accuracy";
      if (hasSelfDoubt) insightType = "self-doubt";
      else if (hasTimeBottleneck) insightType = "time-bottleneck";

      return {
        ...group,
        averageSeconds,
        averageMinutes: Number((averageSeconds / 60).toFixed(1)),
        errorRate,
        insightType,
        priorityScore: group.errors * 3 + group.changedCorrectToIncorrect * 4 + (hasTimeBottleneck ? 3 : 0)
      };
    })
    .filter((group) => group.errors > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);
}

function cleanLabel(value, fallback = "") {
  const label = String(value || "").trim();
  return label || fallback;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean).join(", ");
  return tags;
}

function inferSubcategory(question) {
  if (question.type === "checkboxes") return "Multi-select Reasoning";
  if (question.type === "short_answer") return "Constructed Response";
  if (question.type === "paragraph") return "Written Explanation";
  return "Core Concept";
}

function inferSkillTag(question) {
  const stem = String(question.stem || "").toLowerCase();
  if (stem.includes("not") || stem.includes("except") || stem.includes("false")) return "Negative Wording";
  if (stem.includes("therefore") || stem.includes("conclude") || stem.includes("follows")) return "Logical Inference";
  return "Untyped Skill";
}

function isCorrectAnswer(question, response) {
  const type = question.type || "multiple_choice";
  if (type === "paragraph" || type === "essay") return null;
  if (type === "mcq" || type === "multiple_choice") return response === Number(question.answerIdx ?? 0);
  if (type === "checkboxes") {
    const expected = [...(question.correctAnswers || [])].map(Number).sort().join(",");
    const actual = [...(response || [])].map(Number).sort().join(",");
    return expected === actual;
  }
  if (type === "short_answer") {
    const expected = String(question.correctText || "").trim().toLowerCase();
    const actual = String(response || "").trim().toLowerCase();
    return expected.length > 0 && actual === expected;
  }
  return false;
}

export function updateLatestEssayReview(email, essayId, updates) {
  const dashboard = getStudentDashboard(email);
  const attempts = Array.isArray(dashboard.attempts) ? dashboard.attempts : [];
  if (!attempts.length) return dashboard;
  const nextAttempts = attempts.map((attempt) => {
    if (!getEssayResponses(attempt).some((essay) => essay.id === essayId)) return attempt;
    const essayResponses = getEssayResponses(attempt).map((essay) => essay.id === essayId ? { ...essay, ...updates } : essay);
    const reviewed = essayResponses.length > 0 && essayResponses.every((essay) => essay.status === "approved");
    return reviewed
      ? recalculateEssayAttempt({ ...attempt, essayResponses, status: "Reviewed", hasPendingEssays: false })
      : { ...attempt, essayResponses, finalPct: null, passed: null, status: "Pending Review", hasPendingEssays: true };
  });
  const updatedAttemptIndex = nextAttempts.findIndex((attempt) => getEssayResponses(attempt).some((essay) => essay.id === essayId));
  const updatedAttempt = nextAttempts[updatedAttemptIndex];
  const exams = (dashboard.exams || []).map((exam, index) => index === updatedAttemptIndex && updatedAttempt ? {
    ...exam,
    score: updatedAttempt.finalPct,
    passed: updatedAttempt.passed,
    status: updatedAttempt.status,
    hasPendingEssays: updatedAttempt.hasPendingEssays
  } : exam);
  saveStudentDashboard(email, { ...dashboard, attempts: nextAttempts, exams });
  return getStudentDashboard(email);
}

function recalculateEssayAttempt(attempt) {
  const essayResponses = getEssayResponses(attempt);
  const essayQuestionIds = new Set(essayResponses.map((essay) => essay.questionId).filter(Boolean));
  const itemDiagnostics = (attempt.itemDiagnostics || []).map((item) => {
    const essay = essayResponses.find((entry) => entry.questionId && entry.questionId === item.questionId);
    if (!essay) return item;
    const awarded = essay.status === "approved" && Number.isFinite(Number(essay.finalScore)) ? Number(essay.finalScore) : 0;
    return { ...item, points: essay.points, earnedPoints: awarded };
  });
  const mcqItems = itemDiagnostics.filter((item) => !essayQuestionIds.has(item.questionId) && item.questionType !== "paragraph" && item.questionType !== "essay");
  const mcqTotal = mcqItems.reduce((sum, item) => sum + Math.max(0, Number(item.points || 0)), 0);
  const mcqEarned = mcqItems.reduce((sum, item) => sum + Math.max(0, Number(item.earnedPoints || 0)), 0);
  const essayTotal = essayResponses.reduce((sum, essay) => sum + Math.max(0, Number(essay.points || 0)), 0);
  const essayEarned = essayResponses.reduce((sum, essay) => sum + Math.max(0, essay.status === "approved" && Number.isFinite(Number(essay.finalScore)) ? Number(essay.finalScore) : 0), 0);
  const totalPoints = mcqTotal + essayTotal;
  const earnedPoints = mcqEarned + essayEarned;
  const finalPct = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : Number(attempt.finalPct || 0);
  const passingScore = Number(attempt.passingScore || 75);
  return { ...attempt, itemDiagnostics, earnedPoints, totalPoints, finalPct, passed: finalPct >= passingScore };
}

export function getEssayResponses(attempt) {
  return Array.isArray(attempt?.essayResponses)
    ? attempt.essayResponses.map((essay) => {
        let configuredPoints = Number(essay.points);
        if (!Number.isFinite(configuredPoints) || configuredPoints <= 0) {
          const blueprint = attempt.examId
            ? getExamBlueprintById(attempt.examId)
            : getExamBlueprints().find((item) => item.title === attempt.examTitle);
          configuredPoints = Number(blueprint?.sections?.[essay.sectionIndex]?.questions?.[essay.questionIndex]?.points || 1);
        }
        return { ...essay, points: Math.max(1, configuredPoints) };
      })
    : [];
}

export function hasPendingEssays(value) {
  const attempts = Array.isArray(value) ? value : value?.attempts;
  if (attempts) return attempts.some((attempt) => hasPendingEssays(attempt));
  return getEssayResponses(value).some((essay) => ["pending_review", "ai_graded"].includes(essay.status));
}
