const { pool } = require("../config/database.pg");
const { verifyToken } = require("../services/authService");

function cookies(req) {
  return String(req.headers.cookie || "").split(";").reduce((all, item) => { const [key, ...value] = item.trim().split("="); if (key) all[key] = decodeURIComponent(value.join("=")); return all; }, {});
}

async function authenticate(req, res, next) {
  try {
    const payload = verifyToken(cookies(req).accessToken);
    const user = (await pool.query("SELECT id,email,username,role,name,nickname,phone_number,sms_number,recovery_email,is_verified AS \"isVerified\" FROM users WHERE id=$1 AND is_active=TRUE", [payload.sub])).rows[0];
    if (!user) return res.status(401).json({ error: "Authentication required." });
    req.user = user; req.auth = payload; next();
  } catch (_error) { return res.status(401).json({ error: "Authentication required." }); }
}

async function resolveStudent(req, res, next) {
  if (req.headers.cookie?.includes("accessToken=")) return authenticate(req, res, next);
  if (process.env.NODE_ENV === "production") return res.status(401).json({ error: "Authentication required." });
  const requestedStudentId = Number.parseInt(req.get("x-student-id") || process.env.DEV_STUDENT_ID || "2", 10);
  const studentId = Number.isInteger(requestedStudentId) && requestedStudentId > 0 ? requestedStudentId : 1;
  const student = (await pool.query("SELECT users.id,users.email,users.username,users.role,users.name,student_profiles.display_name AS \"displayName\",student_profiles.target_school AS \"targetSchool\" FROM users LEFT JOIN student_profiles ON student_profiles.user_id=users.id WHERE users.id=$1", [studentId])).rows[0];
  if (!student) return res.status(401).json({ error: "Student account context could not be resolved." });
  req.user = student; next();
}

module.exports = { authenticate, resolveStudent, parseCookies: cookies };
