const crypto = require("crypto");
const { pool } = require("../config/database.pg");
const { sendSms } = require("./smsService");
const { sendEmail } = require("./emailService");

const ACCESS_TTL = 8 * 60 * 60 * 1000;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCKOUT_TTL = 10 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required in the environment.");
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
  if (!header || !body || !signature) throw Object.assign(new Error("Invalid token"), { status: 401 });
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  const suppliedSignature = Buffer.from(signature);
  const expectedSignature = Buffer.from(expected);
  if (suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) throw Object.assign(new Error("Invalid token"), { status: 401 });
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch (_error) {
    throw Object.assign(new Error("Invalid token"), { status: 401 });
  }
  if (payload.exp < Date.now()) throw Object.assign(new Error("Token expired"), { status: 401 });
  return payload;
}

function requestMeta(req) { return { ip: req.ip || req.socket?.remoteAddress || "unknown", userAgent: req.get("user-agent") || "unknown" }; }
async function recordLogin(userId, email, req, status) { const meta = requestMeta(req); await pool.query("INSERT INTO login_history (id,user_id,email,ip_address,user_agent,status) VALUES ($1,$2,$3,$4,$5,$6)", [crypto.randomUUID(), userId || null, email, meta.ip, meta.userAgent, status]); return meta; }
async function publicUser(user) {
  const profile = user.targetSchool !== undefined
    ? { targetSchool: user.targetSchool }
    : (await pool.query("SELECT target_school AS \"targetSchool\" FROM student_profiles WHERE user_id=$1", [user.id])).rows[0];
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    name: user.name || user.displayName,
    nickname: user.nickname,
    school: profile?.targetSchool || "",
    phoneNumber: user.phone_number || user.sms_number || "",
    smsNumber: user.sms_number || user.phone_number || "",
    recoveryEmail: user.recovery_email || "",
    isVerified: Boolean(user.is_verified),
    // A student is ready for assessments only after completing the Settings
    // profile and recovery details. Admin accounts are always complete.
    profileCompleted: user.role === "admin" || Boolean(
      String(user.name || "").trim()
      && String(user.nickname || "").trim()
      && String(profile?.targetSchool || "").trim()
      && String(user.phone_number || user.sms_number || "").trim()
      && String(user.recovery_email || "").trim()
    )
  };
}

async function ensureDefaultAdmin() {
  if (!DEFAULT_ADMIN_PASSWORD || !DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_USERNAME || !DEFAULT_ADMIN_NAME) {
    throw new Error("DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_NAME, and DEFAULT_ADMIN_PASSWORD are required in the environment.");
  }
  const existing = (await pool.query("SELECT * FROM users WHERE email = $1", [DEFAULT_ADMIN_EMAIL])).rows[0];
  if (!existing) {
    const credentials = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    await pool.query("INSERT INTO users (email,username,password_hash,password_salt,role,name,is_verified,is_active,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)", [DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME, credentials.hash, credentials.salt, "admin", DEFAULT_ADMIN_NAME, true, true]);
  } else if (!existing.password_hash) {
    const credentials = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    await pool.query("UPDATE users SET username=$1,password_hash=$2,password_salt=$3,role='admin',is_verified=TRUE,is_active=TRUE WHERE id=$4", [DEFAULT_ADMIN_USERNAME, credentials.hash, credentials.salt, existing.id]);
  }
}

async function register({ email, username, password, name }, req) {
  if ((await pool.query("SELECT id FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($2)", [email, username])).rows[0]) throw Object.assign(new Error("Email or username already exists."), { status: 409 });
  const credentials = await hashPassword(password);
  const normalizedName = String(name || username).trim().toUpperCase();
  const result = await pool.query("INSERT INTO users (email,username,password_hash,password_salt,role,name,is_verified,is_active,updated_at) VALUES ($1,$2,$3,$4,$5,$6,FALSE,TRUE,CURRENT_TIMESTAMP) RETURNING id", [email.toLowerCase(), username, credentials.hash, credentials.salt, "student", normalizedName]);
  const userId = result.rows[0].id;
  const verificationToken = crypto.randomBytes(32).toString("hex");
  await pool.query("INSERT INTO email_verification_tokens (id,user_id,token,expires_at) VALUES ($1,$2,$3,$4)", [crypto.randomUUID(), userId, verificationToken, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]);
  await recordLogin(userId, email, req, "registered");
  const user = (await pool.query("SELECT * FROM users WHERE id=$1", [userId])).rows[0];
  const session = await createSession(user, requestMeta(req));
  return { ...session, verificationToken };
}

async function login(identifier, password, req) {
  const user = (await pool.query("SELECT * FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($2)", [identifier, identifier])).rows[0];
  if (!user) { await recordLogin(null, identifier, req, "failure"); throw Object.assign(new Error("Invalid credentials."), { status: 401 }); }
  if (user.locked_until && new Date(user.locked_until) > new Date()) throw Object.assign(new Error("Account temporarily locked. Try again later."), { status: 423 });
  if (!(await verifyPassword(password, user.password_hash, user.password_salt))) {
    const failures = Number(user.failed_login_attempts || 0) + 1;
    const locked = failures >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOGIN_LOCKOUT_TTL).toISOString() : null;
    await pool.query("UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3", [failures, locked, user.id]);
    await recordLogin(user.id, user.email, req, "failure");
    throw Object.assign(new Error(locked ? "Account temporarily locked for 10 minutes." : "Invalid credentials."), { status: 401 });
  }
  const meta = requestMeta(req);
  await pool.query("UPDATE users SET failed_login_attempts=0, locked_until=NULL,last_login_at=CURRENT_TIMESTAMP,last_login_ip=$1 WHERE id=$2", [meta.ip, user.id]);
  await recordLogin(user.id, user.email, req, "success");
  return await createSession(user, meta);
}

async function createSession(user, meta) {
  const sessionId = crypto.randomUUID();
  const accessToken = token({ sub: String(user.id), sid: sessionId, type: "access" }, ACCESS_TTL);
  const refreshToken = token({ sub: String(user.id), sid: sessionId, type: "refresh" }, REFRESH_TTL);
  await pool.query("INSERT INTO sessions (id,user_id,refresh_token,access_token,expires_at,ip_address,user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)", [sessionId, user.id, refreshToken, accessToken, new Date(Date.now() + REFRESH_TTL).toISOString(), meta.ip, meta.userAgent]);
  return { user: await publicUser(user), accessToken, refreshToken };
}

async function availableGoogleUsername(email, providerId) {
  const localPart = String(email || "student").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "student";
  const suffix = String(providerId).replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase() || crypto.randomBytes(4).toString("hex");
  const base = `${localPart.slice(0, 40)}_${suffix}`;
  let candidate = base;
  let attempt = 1;
  while ((await pool.query("SELECT id FROM users WHERE lower(username)=lower($1)", [candidate])).rows[0]) {
    attempt += 1;
    candidate = `${base.slice(0, 55)}_${attempt}`;
  }
  return candidate;
}

async function loginWithSupabaseGoogle(identity, req) {
  const providerId = String(identity?.id || "").trim();
  const email = String(identity?.email || "").trim().toLowerCase();
  if (!providerId || !email || !identity?.emailConfirmed) throw Object.assign(new Error("Google did not provide a verified email address."), { status: 401 });

  let user = (await pool.query("SELECT * FROM users WHERE auth_provider='supabase-google' AND auth_provider_id=$1", [providerId])).rows[0];
  if (!user) {
    user = (await pool.query("SELECT * FROM users WHERE lower(email)=lower($1)", [email])).rows[0];
    if (user) {
      if (user.auth_provider_id && (user.auth_provider !== "supabase-google" || user.auth_provider_id !== providerId)) {
        throw Object.assign(new Error("This PassExam account is already linked to another sign-in provider."), { status: 409 });
      }
      await pool.query("UPDATE users SET auth_provider='supabase-google',auth_provider_id=$1,is_verified=TRUE,updated_at=CURRENT_TIMESTAMP WHERE id=$2", [providerId, user.id]);
      user = (await pool.query("SELECT * FROM users WHERE id=$1", [user.id])).rows[0];
    } else {
      const username = await availableGoogleUsername(email, providerId);
      const name = String(identity.name || "").trim() || null;
      const result = await pool.query(
        "INSERT INTO users (email,username,password_hash,password_salt,role,name,is_verified,is_active,auth_provider,auth_provider_id,updated_at) VALUES ($1,$2,NULL,NULL,'student',$3,TRUE,TRUE,'supabase-google',$4,CURRENT_TIMESTAMP) RETURNING *",
        [email, username, name, providerId]
      );
      user = result.rows[0];
    }
  }
  if (!user.is_active) throw Object.assign(new Error("This account is inactive."), { status: 403 });
  await recordLogin(user.id, user.email, req, "google_success");
  return createSession(user, requestMeta(req));
}

async function refresh(refreshToken, req) {
  if (!refreshToken) throw Object.assign(new Error("Refresh token is missing."), { status: 401 });
  const payload = verifyToken(refreshToken);
  if (payload.type !== "refresh") throw Object.assign(new Error("Invalid token"), { status: 401 });
  const session = (await pool.query("UPDATE sessions SET is_revoked=TRUE WHERE id=$1 AND refresh_token=$2 AND is_revoked=FALSE AND expires_at > CURRENT_TIMESTAMP RETURNING *", [payload.sid, refreshToken])).rows[0];
  if (!session) throw Object.assign(new Error("Session expired or revoked."), { status: 401 });
  const user = (await pool.query("SELECT * FROM users WHERE id=$1 AND is_active=TRUE", [session.user_id])).rows[0];
  if (!user) throw Object.assign(new Error("Session expired or revoked."), { status: 401 });
  return await createSession(user, requestMeta(req));
}

async function revoke(sessionId) { await pool.query("UPDATE sessions SET is_revoked=TRUE WHERE id=$1", [sessionId]); }
async function revokeAll(userId) { await pool.query("UPDATE sessions SET is_revoked=TRUE WHERE user_id=$1", [userId]); }
async function revokeAllExcept(userId, sessionId) { await pool.query("UPDATE sessions SET is_revoked=TRUE WHERE user_id=$1 AND id<>$2", [userId, sessionId]); }
async function sessions(userId) { return (await pool.query("SELECT id,created_at AS \"createdAt\",expires_at AS \"expiresAt\",ip_address AS \"ipAddress\",user_agent AS \"userAgent\",is_revoked AS revoked FROM sessions WHERE user_id=$1 ORDER BY created_at DESC", [userId])).rows; }

async function changePassword(userId, currentPassword, newPassword) {
  const user = (await pool.query("SELECT * FROM users WHERE id=$1", [userId])).rows[0];
  if (!(await verifyPassword(currentPassword, user.password_hash, user.password_salt))) throw Object.assign(new Error("Current password is incorrect."), { status: 401 });
  const credentials = await hashPassword(newPassword);
  await pool.query("UPDATE users SET password_hash=$1,password_salt=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3", [credentials.hash, credentials.salt, userId]); await revokeAll(userId);
}

async function forgotPassword(email) {
  const user = (await pool.query("SELECT * FROM users WHERE lower(email)=lower($1)", [email])).rows[0];
  if (!user) return { message: "If that account exists, a reset link has been created." };
  const resetToken = crypto.randomBytes(32).toString("hex");
  await pool.query("INSERT INTO password_reset_tokens (id,user_id,token,expires_at) VALUES ($1,$2,$3,$4)", [crypto.randomUUID(), user.id, resetToken, new Date(Date.now() + 60 * 60 * 1000).toISOString()]);
  return { message: "If that account exists, a reset link has been created.", resetToken };
}

async function resetPassword(resetToken, newPassword) {
  const row = (await pool.query("SELECT * FROM password_reset_tokens WHERE token=$1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP", [resetToken])).rows[0];
  if (!row) throw Object.assign(new Error("Reset token is invalid or expired."), { status: 400 });
  const credentials = await hashPassword(newPassword);
  await pool.query("UPDATE users SET password_hash=$1,password_salt=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3", [credentials.hash, credentials.salt, row.user_id]);
  await pool.query("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=$1", [row.id]); await revokeAll(row.user_id);
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
  const user = (await pool.query("SELECT id FROM users WHERE phone_number=$1 OR sms_number=$2", [phone, phone])).rows[0];
  const generic = { success: true, message: "If that number is registered, an SMS code has been sent." };
  if (!user) return generic;
  const code = String(crypto.randomInt(100000, 1000000));
  await pool.query("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND is_phone=TRUE AND used_at IS NULL", [user.id]);
  await pool.query("INSERT INTO password_reset_tokens (id,user_id,token,expires_at,is_phone) VALUES ($1,$2,$3,$4,TRUE)", [crypto.randomUUID(), user.id, code, new Date(Date.now() + 10 * 60 * 1000).toISOString()]);
  const result = await sendSms(phone, `ACET password reset code: ${code}. Expires in 10 minutes.`);
  return result.sent || process.env.NODE_ENV === "production" ? generic : { ...generic, developmentCode: code };
}

async function resetPasswordWithSms(code, newPassword) {
  if (!newPassword || String(newPassword).length < 8) throw Object.assign(new Error("New password must be at least 8 characters."), { status: 400 });
  const row = (await pool.query("SELECT * FROM password_reset_tokens WHERE token=$1 AND is_phone=TRUE AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1", [String(code || "").trim()])).rows[0];
  if (!row) throw Object.assign(new Error("Invalid or expired SMS code."), { status: 400 });
  const credentials = await hashPassword(newPassword);
  await pool.query("UPDATE users SET password_hash=$1,password_salt=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3", [credentials.hash, credentials.salt, row.user_id]);
  await pool.query("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=$1", [row.id]); await revokeAll(row.user_id);
  return { success: true };
}

async function requestEmailReset(email) {
  const address = String(email || "").trim().toLowerCase(); const now = Date.now();
  const attempts = (emailResetAttempts.get(address) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (attempts.length >= 3) throw Object.assign(new Error("Too many requests. Try again later."), { status: 429 });
  attempts.push(now); emailResetAttempts.set(address, attempts);
  const user = (await pool.query("SELECT id FROM users WHERE lower(email)=$1 OR lower(recovery_email)=$2", [address, address])).rows[0];
  const generic = { success: true, message: "If that email is registered, a recovery code has been sent." };
  if (!user) return generic;
  const code = String(crypto.randomInt(100000, 1000000));
  await pool.query("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND is_phone=FALSE AND used_at IS NULL", [user.id]);
  await pool.query("INSERT INTO password_reset_tokens (id,user_id,token,expires_at,is_phone) VALUES ($1,$2,$3,$4,FALSE)", [crypto.randomUUID(), user.id, code, new Date(Date.now() + 10 * 60 * 1000).toISOString()]);
  const result = await sendEmail(address, "ACET password reset code", `Your ACET password reset code is ${code}. It expires in 10 minutes.`);
  if (!result.sent && process.env.NODE_ENV !== "production") throw Object.assign(new Error("Email recovery is not configured."), { status: 503 });
  return generic;
}

async function resetPasswordWithEmail(code, newPassword) {
  if (!newPassword || String(newPassword).length < 8) throw Object.assign(new Error("New password must be at least 8 characters."), { status: 400 });
  const row = (await pool.query("SELECT * FROM password_reset_tokens WHERE token=$1 AND length(token)=6 AND is_phone=FALSE AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1", [String(code || "").trim()])).rows[0];
  if (!row) throw Object.assign(new Error("Invalid or expired email code."), { status: 400 });
  const credentials = await hashPassword(newPassword);
  await pool.query("UPDATE users SET password_hash=$1,password_salt=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3", [credentials.hash, credentials.salt, row.user_id]);
  await pool.query("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=$1", [row.id]); await revokeAll(row.user_id);
  return { success: true };
}

async function updateProfile(userId, { name, username, nickname, school, phoneNumber, recoveryEmail }) {
  const phone = normalizePhone(phoneNumber);
  if (phone && !/^\+?\d{10,15}$/.test(phone)) throw Object.assign(new Error("Enter a valid phone number."), { status: 400 });
  const profileName = String(name || "").trim();
  const displayNickname = String(nickname || "").trim();
  const email = String(recoveryEmail || "").trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  const targetSchool = String(school || "").trim();
  const currentUser = (await pool.query("SELECT * FROM users WHERE id=$1", [userId])).rows[0];
  if (!currentUser) throw Object.assign(new Error("Account not found."), { status: 404 });
  const requestedUsername = String(username || "").trim();
  if (requestedUsername) {
    const usernameTaken = (await pool.query("SELECT id FROM users WHERE lower(username)=lower($1) AND id<>$2", [requestedUsername, userId])).rows[0];
    if (usernameTaken) throw Object.assign(new Error("That username is already in use."), { status: 409 });
  }
  const accountEmail = email || currentUser.email;
  const duplicate = (await pool.query("SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2", [accountEmail, userId])).rows[0];
  if (duplicate) throw Object.assign(new Error("That email address is already in use."), { status: 409 });

  await pool.query("UPDATE users SET email=$1,username=CASE WHEN $2 <> '' THEN $2 ELSE username END,name=CASE WHEN $3 <> '' THEN $4 ELSE name END,nickname=$5,phone_number=$6,sms_number=$7,recovery_email=$8,updated_at=CURRENT_TIMESTAMP WHERE id=$9", [accountEmail, requestedUsername, profileName, profileName, displayNickname || null, phone || null, phone || null, accountEmail, userId]);
  const existingProfile = (await pool.query("SELECT user_id FROM student_profiles WHERE user_id=$1", [userId])).rows[0];
  if (existingProfile) await pool.query("UPDATE student_profiles SET display_name=CASE WHEN $1 <> '' THEN $2 ELSE display_name END,target_school=$3 WHERE user_id=$4", [profileName, profileName, targetSchool, userId]);
  else await pool.query("INSERT INTO student_profiles (user_id,display_name,target_school) VALUES ($1,$2,$3)", [userId, profileName || "Student", targetSchool]);

  // Legacy browser data is keyed by email inside each user's private record.
  // Keep that key aligned when an account email changes so the admin dashboard
  // and the student keep seeing the same saved activity.
  if (accountEmail !== currentUser.email) {
    const records = (await pool.query("SELECT namespace,data_key,payload FROM app_data WHERE user_id=$1", [userId])).rows;
    for (const record of records) {
      try {
        const value = typeof record.payload === "string" ? JSON.parse(record.payload) : record.payload;
        if (!value || typeof value !== "object" || Array.isArray(value) || !Object.prototype.hasOwnProperty.call(value, currentUser.email)) continue;
        value[accountEmail] = value[currentUser.email];
        delete value[currentUser.email];
        await pool.query("UPDATE app_data SET payload=$1,updated_at=CURRENT_TIMESTAMP WHERE user_id=$2 AND namespace=$3 AND data_key=$4", [JSON.stringify(value), userId, record.namespace, record.data_key]);
      } catch (_error) {
        // Leave a malformed legacy record untouched rather than blocking a profile update.
      }
    }
  }

  return await publicUser((await pool.query("SELECT * FROM users WHERE id=$1", [userId])).rows[0]);
}

async function resetStudentPasswordByAdmin(userId) {
  const student = (await pool.query("SELECT id FROM users WHERE id=$1 AND role='student'", [userId])).rows[0];
  if (!student) throw Object.assign(new Error("Student account not found."), { status: 404 });
  const temporaryPassword = `ACET-${crypto.randomBytes(4).toString("hex").toUpperCase()}!`;
  const credentials = await hashPassword(temporaryPassword);
  await pool.query("UPDATE users SET password_hash=$1,password_salt=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3", [credentials.hash, credentials.salt, userId]);
  await revokeAll(userId);
  return temporaryPassword;
}

async function verifyEmail(value) { const row = (await pool.query("SELECT * FROM email_verification_tokens WHERE token=$1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP", [value])).rows[0]; if (!row) throw Object.assign(new Error("Verification token is invalid or expired."), { status: 400 }); await pool.query("UPDATE users SET is_verified=TRUE WHERE id=$1", [row.user_id]); await pool.query("UPDATE email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=$1", [row.id]); }

module.exports = { ACCESS_TTL, ensureDefaultAdmin, register, login, loginWithSupabaseGoogle, refresh, verifyToken, publicUser, revoke, revokeAll, revokeAllExcept, sessions, changePassword, forgotPassword, resetPassword, verifyEmail, requestSmsReset, resetPasswordWithSms, requestEmailReset, resetPasswordWithEmail, updateProfile, resetStudentPasswordByAdmin };
