const crypto = require("crypto");
const { getDb } = require("../config/database");
const { sendSms } = require("./smsService");
const { sendEmail } = require("./emailService");

const ACCESS_TTL = 15 * 60 * 1000;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL;
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME;
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME;
const smsResetAttempts = new Map();
const emailResetAttempts = new Map();
function bcryptClient() {
  try { return require("bcrypt"); } catch (_error) { return null; }
}

async function hashPassword(password) {
  const bcrypt = bcryptClient();
  if (bcrypt) return { hash: await bcrypt.hash(password, 12), salt: "bcrypt" };
  const salt = crypto.randomBytes(16).toString("hex");
  return { hash: `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString("hex")}`, salt };
}

async function verifyPassword(password, stored, salt) {
  const bcrypt = bcryptClient();
  if (bcrypt && String(stored || "").startsWith("$2")) return bcrypt.compare(password, stored);
  if (!String(stored || "").startsWith("scrypt$")) return false;
  const [, storedSalt, expected] = stored.split("$");
  const actual = crypto.scryptSync(password, storedSalt || salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected || ""));
}

function token(payload, expiresIn) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + expiresIn })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(value) {
  const [header, body, signature] = String(value || "").split(".");
  if (!header || !body || !signature) throw new Error("Invalid token");
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ) throw new Error("Invalid token");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp < Date.now()) throw new Error("Token expired");
  return payload;
}

function requestMeta(req) { return { ip: req.ip || req.socket?.remoteAddress || "unknown", userAgent: req.get("user-agent") || "unknown" }; }
function recordLogin(db, userId, email, req, status) { const meta = requestMeta(req); db.prepare("INSERT INTO login_history (id,user_id,email,ip_address,user_agent,status) VALUES (?,?,?,?,?,?)").run(crypto.randomUUID(), userId || null, email, meta.ip, meta.userAgent, status); return meta; }
function publicUser(user) { return { id: user.id, email: user.email, username: user.username, role: user.role, name: user.name || user.displayName, nickname: user.nickname, phoneNumber: user.phone_number || user.sms_number || "", smsNumber: user.sms_number || user.phone_number || "", recoveryEmail: user.recovery_email || "", isVerified: Boolean(user.is_verified), profileCompleted: Boolean(user.name) }; }

async function ensureDefaultAdmin() {
  const db = getDb();
  if (!DEFAULT_ADMIN_PASSWORD || !DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_USERNAME || !DEFAULT_ADMIN_NAME) {
    throw new Error("DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_NAME, and DEFAULT_ADMIN_PASSWORD are required in server/.env");
  }
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(DEFAULT_ADMIN_EMAIL);
  if (!existing) {
    const credentials = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    db.prepare("INSERT INTO users (email,username,password_hash,password_salt,role,name,is_verified,is_active,updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").run(DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME, credentials.hash, credentials.salt, "admin", DEFAULT_ADMIN_NAME, 1, 1);
  } else if (!existing.password_hash) {
    const credentials = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    db.prepare("UPDATE users SET username=?,password_hash=?,password_salt=?,role='admin',is_verified=1,is_active=1 WHERE id=?").run(DEFAULT_ADMIN_USERNAME, credentials.hash, credentials.salt, existing.id);
  }
}

async function register({ email, username, password, name }, req) {
  const db = getDb();
  if (db.prepare("SELECT id FROM users WHERE lower(email)=lower(?) OR lower(username)=lower(?)").get(email, username)) throw Object.assign(new Error("Email or username already exists."), { status: 409 });
  const credentials = await hashPassword(password);
  const normalizedName = String(name || username).trim().toUpperCase();
  const result = db.prepare("INSERT INTO users (email,username,password_hash,password_salt,role,name,is_verified,is_active,updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").run(email.toLowerCase(), username, credentials.hash, credentials.salt, "student", normalizedName, 0, 1);
  const userId = result.lastInsertRowid;
  const verificationToken = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO email_verification_tokens (id,user_id,token,expires_at) VALUES (?,?,?,?)").run(crypto.randomUUID(), userId, verificationToken, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  recordLogin(db, userId, email, req, "registered");
  return { user: publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(userId)), verificationToken };
}

async function login(identifier, password, req) {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE lower(email)=lower(?) OR lower(username)=lower(?)").get(identifier, identifier);
  if (!user) { recordLogin(db, null, identifier, req, "failure"); throw Object.assign(new Error("Invalid credentials."), { status: 401 }); }
  if (user.locked_until && new Date(user.locked_until) > new Date()) throw Object.assign(new Error("Account temporarily locked. Try again later."), { status: 423 });
  if (!(await verifyPassword(password, user.password_hash, user.password_salt))) {
    const failures = Number(user.failed_login_attempts || 0) + 1;
    const locked = failures >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
    db.prepare("UPDATE users SET failed_login_attempts=?, locked_until=? WHERE id=?").run(failures, locked, user.id);
    recordLogin(db, user.id, user.email, req, "failure");
    throw Object.assign(new Error(locked ? "Account temporarily locked for 30 minutes." : "Invalid credentials."), { status: 401 });
  }
  const meta = requestMeta(req);
  db.prepare("UPDATE users SET failed_login_attempts=0, locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,last_login_ip=? WHERE id=?").run(meta.ip, user.id);
  recordLogin(db, user.id, user.email, req, "success");
  return createSession(db, user, meta);
}

function createSession(db, user, meta) {
  const sessionId = crypto.randomUUID();
  const accessToken = token({ sub: String(user.id), sid: sessionId, type: "access" }, ACCESS_TTL);
  const refreshToken = token({ sub: String(user.id), sid: sessionId, type: "refresh" }, REFRESH_TTL);
  db.prepare("INSERT INTO sessions (id,user_id,refresh_token,access_token,expires_at,ip_address,user_agent) VALUES (?,?,?,?,?,?,?)").run(sessionId, user.id, refreshToken, accessToken, new Date(Date.now() + REFRESH_TTL).toISOString(), meta.ip, meta.userAgent);
  return { user: publicUser(user), accessToken, refreshToken };
}

async function refresh(refreshToken, req) {
  const payload = verifyToken(refreshToken);
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id=? AND refresh_token=? AND is_revoked=0").get(payload.sid, refreshToken);
  if (!session) throw Object.assign(new Error("Session expired or revoked."), { status: 401 });
  db.prepare("UPDATE sessions SET is_revoked=1 WHERE id=?").run(session.id);
  const user = db.prepare("SELECT * FROM users WHERE id=? AND is_active=1").get(session.user_id);
  return createSession(db, user, requestMeta(req));
}

function revoke(sessionId) { getDb().prepare("UPDATE sessions SET is_revoked=1 WHERE id=?").run(sessionId); }
function revokeAll(userId) { getDb().prepare("UPDATE sessions SET is_revoked=1 WHERE user_id=?").run(userId); }
function sessions(userId) { return getDb().prepare("SELECT id,created_at AS createdAt,expires_at AS expiresAt,ip_address AS ipAddress,user_agent AS userAgent,is_revoked AS revoked FROM sessions WHERE user_id=? ORDER BY created_at DESC").all(userId); }

async function changePassword(userId, currentPassword, newPassword) {
  const db = getDb(); const user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  if (!(await verifyPassword(currentPassword, user.password_hash, user.password_salt))) throw Object.assign(new Error("Current password is incorrect."), { status: 401 });
  const credentials = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(credentials.hash, credentials.salt, userId); revokeAll(userId);
}

async function forgotPassword(email) {
  const db = getDb(); const user = db.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email);
  if (!user) return { message: "If that account exists, a reset link has been created." };
  const resetToken = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO password_reset_tokens (id,user_id,token,expires_at) VALUES (?,?,?,?)").run(crypto.randomUUID(), user.id, resetToken, new Date(Date.now() + 60 * 60 * 1000).toISOString());
  return { message: "If that account exists, a reset link has been created.", resetToken };
}

async function resetPassword(resetToken, newPassword) {
  const db = getDb(); const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token=? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP").get(resetToken);
  if (!row) throw Object.assign(new Error("Reset token is invalid or expired."), { status: 400 });
  const credentials = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(credentials.hash, credentials.salt, row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id); revokeAll(row.user_id);
}

function normalizePhone(value) {
  const raw = String(value || "").replace(/[\s()-]/g, "");
  if (/^09\d{9}$/.test(raw)) return `+63${raw.slice(1)}`;
  if (/^63\d{10}$/.test(raw)) return `+${raw}`;
  return raw;
}

async function requestSmsReset(phoneNumber) {
  const phone = normalizePhone(phoneNumber); const now = Date.now();
  const attempts = (smsResetAttempts.get(phone) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (attempts.length >= 3) throw Object.assign(new Error("Too many requests. Try again later."), { status: 429 });
  attempts.push(now); smsResetAttempts.set(phone, attempts);
  const db = getDb(); const user = db.prepare("SELECT id FROM users WHERE phone_number=? OR sms_number=?").get(phone, phone);
  const generic = { success: true, message: "If that number is registered, an SMS code has been sent." };
  if (!user) return generic;
  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND is_phone=1 AND used_at IS NULL").run(user.id);
  db.prepare("INSERT INTO password_reset_tokens (id,user_id,token,expires_at,is_phone) VALUES (?,?,?,?,1)").run(crypto.randomUUID(), user.id, code, new Date(Date.now() + 10 * 60 * 1000).toISOString());
  const result = await sendSms(phone, `ACET password reset code: ${code}. Expires in 10 minutes.`);
  return result.sent || process.env.NODE_ENV === "production" ? generic : { ...generic, developmentCode: code };
}

async function resetPasswordWithSms(code, newPassword) {
  if (!newPassword || String(newPassword).length < 8) throw Object.assign(new Error("New password must be at least 8 characters."), { status: 400 });
  const db = getDb(); const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token=? AND is_phone=1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1").get(String(code || "").trim());
  if (!row) throw Object.assign(new Error("Invalid or expired SMS code."), { status: 400 });
  const credentials = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(credentials.hash, credentials.salt, row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id); revokeAll(row.user_id);
  return { success: true };
}

async function requestEmailReset(email) {
  const address = String(email || "").trim().toLowerCase(); const now = Date.now();
  const attempts = (emailResetAttempts.get(address) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (attempts.length >= 3) throw Object.assign(new Error("Too many requests. Try again later."), { status: 429 });
  attempts.push(now); emailResetAttempts.set(address, attempts);
  const db = getDb(); const user = db.prepare("SELECT id FROM users WHERE lower(email)=? OR lower(recovery_email)=?").get(address, address);
  const generic = { success: true, message: "If that email is registered, a recovery code has been sent." };
  if (!user) return generic;
  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND is_phone=0 AND used_at IS NULL").run(user.id);
  db.prepare("INSERT INTO password_reset_tokens (id,user_id,token,expires_at,is_phone) VALUES (?,?,?,?,0)").run(crypto.randomUUID(), user.id, code, new Date(Date.now() + 10 * 60 * 1000).toISOString());
  const result = await sendEmail(address, "ACET password reset code", `Your ACET password reset code is ${code}. It expires in 10 minutes.`);
  if (!result.sent && process.env.NODE_ENV !== "production") throw Object.assign(new Error("Email recovery is not configured."), { status: 503 });
  return generic;
}

async function resetPasswordWithEmail(code, newPassword) {
  if (!newPassword || String(newPassword).length < 8) throw Object.assign(new Error("New password must be at least 8 characters."), { status: 400 });
  const db = getDb(); const row = db.prepare("SELECT * FROM password_reset_tokens WHERE token=? AND length(token)=6 AND is_phone=0 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1").get(String(code || "").trim());
  if (!row) throw Object.assign(new Error("Invalid or expired email code."), { status: 400 });
  const credentials = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(credentials.hash, credentials.salt, row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id); revokeAll(row.user_id);
  return { success: true };
}

function updateProfile(userId, { name, nickname, phoneNumber, recoveryEmail }) {
  const phone = normalizePhone(phoneNumber);
  if (phone && !/^\+?\d{10,15}$/.test(phone)) throw Object.assign(new Error("Enter a valid phone number."), { status: 400 });
  const profileName = String(name || "").trim();
  const displayNickname = String(nickname || "").trim();
  const email = String(recoveryEmail || "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Enter a valid recovery email."), { status: 400 });
  getDb().prepare("UPDATE users SET name=CASE WHEN ? <> '' THEN ? ELSE name END,nickname=?,phone_number=?,sms_number=?,recovery_email=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(profileName, profileName, displayNickname || null, phone || null, phone || null, email || null, userId);
  return { name: profileName, nickname: displayNickname, phoneNumber: phone, recoveryEmail: email };
}

function verifyEmail(value) { const db = getDb(); const row = db.prepare("SELECT * FROM email_verification_tokens WHERE token=? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP").get(value); if (!row) throw Object.assign(new Error("Verification token is invalid or expired."), { status: 400 }); db.prepare("UPDATE users SET is_verified=1 WHERE id=?").run(row.user_id); db.prepare("UPDATE email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(row.id); }

module.exports = { ensureDefaultAdmin, register, login, refresh, verifyToken, publicUser, revoke, revokeAll, sessions, changePassword, forgotPassword, resetPassword, verifyEmail, requestSmsReset, resetPasswordWithSms, requestEmailReset, resetPasswordWithEmail, updateProfile };
