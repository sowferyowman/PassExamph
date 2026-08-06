const progression = [
  { label: "Mock 1", score: 55 },
  { label: "Mock 2", score: 58 },
  { label: "Mock 3", score: 61 },
  { label: "Mock 4", score: 64 },
  { label: "Mock 5", score: 66 },
  { label: "Mock 6", score: 65 },
  { label: "Mock 7", score: 72 },
  { label: "Mock 8", score: 75 },
  { label: "Mock 9", score: 78 },
  { label: "Mock 10", score: 82 }
];

const subjects = [
  { name: "Abstract Reasoning", mastery: 94, color: "emerald" },
  { name: "Mathematics", mastery: 85, color: "blue" },
  { name: "English and General Knowledge", mastery: 78, color: "amber" },
  { name: "Logical Reasoning", mastery: 65, color: "rose" }
];

const exams = [
  { name: "ACET Full Mock #10", takenAt: "2025-10-12", score: 82, status: "Analyzed" },
  { name: "ACET Full Mock #9", takenAt: "2025-10-05", score: 78, status: "Analyzed" },
  { name: "Logic Diagnostic Drill", takenAt: "2025-10-02", score: 65, status: "AI Flagged" },
  { name: "ACET Full Mock #8", takenAt: "2025-09-28", score: 75, status: "Archived" },
  { name: "ACET Full Mock #7", takenAt: "2025-09-21", score: 72, status: "Archived" },
  { name: "ACET Full Mock #6", takenAt: "2025-09-14", score: 65, status: "Archived" }
];

const studyPlan = [
  {
    day: "Tuesday",
    title: "English: General Knowledge Sprint",
    detail: "Timed review of Philippine institutions and grammar correction patterns.",
    status: "today"
  },
  {
    day: "Wednesday",
    title: "Mathematics: Algebra and Geometry",
    detail: "Two short lessons, then a mixed 20-item drill.",
    status: "upcoming"
  },
  {
    day: "Thursday",
    title: "Logical Syllogisms",
    detail: "Inserted by AI because double-negative syllogisms are slowing you down.",
    status: "priority"
  },
  {
    day: "Friday",
    title: "Full Mock Review",
    detail: "Review missed items and write a 20-minute Magis essay.",
    status: "upcoming"
  }
];

const rewards = [
  { title: "Top 12% Nationwide", description: "Current peer standing from completed mocks.", points: 880 },
  { title: "10 Mock Streak", description: "Completed ten full ACET simulations.", points: 500 },
  { title: "Essay Climber", description: "Essay average improved to 4.2 out of 5.", points: 420 }
];

const dashboardMetrics = [
  { key: "peer_percentile", label: "Peer Percentile", value: "88th", detail: "Top 12% nationwide", accent: "indigo" },
  { key: "essay_average", label: "Essay Average", value: "4.2 / 5.0", detail: "Evaluated from submitted essay attempts", accent: "teal" }
];

const aiInsight = {
  title: "AI Deep Dive: Logical Reasoning",
  priority: "Priority Intervention Required",
  detail: "The current bottleneck is syllogisms with double negatives. Your average computation time is dropping on those item sets."
};

const examStructure = [
  {
    subjectTitle: "Abstract Reasoning",
    allottedTimeSec: 420,
    questions: [
      {
        type: "mcq",
        stem: "Find the next figure pattern: square, triangle, circle, square, triangle, ...",
        choiceOpts: ["Square", "Triangle", "Circle", "Pentagon"],
        answerIdx: 2
      },
      {
        type: "mcq",
        stem: "Which item best completes the sequence: 3, 6, 12, 24, ...",
        choiceOpts: ["30", "36", "42", "48"],
        answerIdx: 3
      },
      {
        type: "mcq",
        stem: "A folded paper is punched once at the center. When opened twice, how many holes appear?",
        choiceOpts: ["1", "2", "4", "8"],
        answerIdx: 2
      }
    ]
  },
  {
    subjectTitle: "Mathematics",
    allottedTimeSec: 600,
    questions: [
      { type: "mcq", stem: "If 3x + 7 = 22, what is x?", choiceOpts: ["3", "4", "5", "6"], answerIdx: 2 },
      {
        type: "mcq",
        stem: "A triangle has angles 45 and 65 degrees. What is the third angle?",
        choiceOpts: ["60", "70", "80", "90"],
        answerIdx: 1
      },
      {
        type: "mcq",
        stem: "What is 15% of 240?",
        choiceOpts: ["24", "30", "36", "42"],
        answerIdx: 2
      }
    ]
  },
  {
    subjectTitle: "English and General Knowledge",
    allottedTimeSec: 540,
    questions: [
      {
        type: "mcq",
        stem: "Identify the error: The board of directors are expected to announce the merger tomorrow.",
        choiceOpts: ["The board", "are", "to announce", "No error"],
        answerIdx: 1
      },
      {
        type: "mcq",
        stem: "Republic Act No. 9184 is primarily concerned with:",
        choiceOpts: ["Data Privacy", "Government Procurement", "Cybercrime", "Civil Service Rules"],
        answerIdx: 1
      },
      {
        type: "mcq",
        stem: "Who wrote The Indolence of the Filipinos?",
        choiceOpts: ["Andres Bonifacio", "Apolinario Mabini", "Jose Rizal", "Emilio Jacinto"],
        answerIdx: 2
      }
    ]
  },
  {
    subjectTitle: "Logical Reasoning",
    allottedTimeSec: 600,
    questions: [
      {
        type: "mcq",
        stem: "All A are B. Some B are C. Therefore, some A are C. This syllogism is:",
        choiceOpts: ["Valid", "Invalid: undistributed middle", "Invalid: illicit major", "Cannot be determined"],
        answerIdx: 1
      },
      {
        type: "mcq",
        stem: "If it rains, the ground gets wet. The ground is wet. Therefore, it rained. What fallacy is this?",
        choiceOpts: ["Ad hominem", "Denying the antecedent", "Affirming the consequent", "Straw man"],
        answerIdx: 2
      },
      {
        type: "mcq",
        stem: "Which is the contrapositive of: If I study, I will pass?",
        choiceOpts: ["If I pass, I studied", "If I do not study, I will not pass", "If I do not pass, I did not study", "I will pass if I study"],
        answerIdx: 2
      }
    ]
  },
  {
    subjectTitle: "Ateneo Essay",
    allottedTimeSec: 900,
    questions: [
      {
        type: "essay",
        stem: "Ateneo emphasizes Magis, or doing more for others. Describe a specific instance where you went beyond expectations to assist your community."
      }
    ]
  }
];

module.exports = { aiInsight, dashboardMetrics, progression, subjects, exams, studyPlan, rewards, examStructure };
