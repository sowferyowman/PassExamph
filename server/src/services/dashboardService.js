const { pool } = require("../config/database.pg");

async function getDashboardSummary(studentId = 1) {
  const { rows } = await pool.query(`
    SELECT display_name AS displayName, target_school AS targetSchool
    FROM student_profiles
    WHERE user_id = $1
  `, [studentId]);
  const profile = rows[0];

  return {
    student: {
      id: studentId,
      displayName: profile?.displayName || "Student",
      targetSchool: profile?.targetSchool || "Ateneo de Manila University"
    },
    hasDashboardData: false,
    stats: [
      { label: "Latest Mock Score", value: "0%", detail: "Calculated from your last live testing block", accent: "blue" },
      { label: "Total Tests Taken", value: "0", detail: "0 hours of operational runtime", accent: "purple" }
    ],
    progression: [], subjects: [], exams: [], studyPlan: [], rewards: [], aiInsight: null
  };
}

module.exports = { getDashboardSummary };
