const router = require("express").Router();
const auth = require("../services/authService");
const { authenticate, parseCookies } = require("../middleware/auth");
const loginAttempts = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const list = (loginAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (list.length >= 5) return res.status(429).json({ error: "Too many login attempts. Try again later." });
  list.push(now);
  loginAttempts.set(key, list);
  req.loginRateLimitKey = key;
  next();
}

function cookieOptions(maxAge) { return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge, path: "/" }; }
function setSessionCookies(res, session) { const options = cookieOptions(15 * 60 * 1000); if (typeof res.cookie === "function") { res.cookie("accessToken", session.accessToken, options); res.cookie("refreshToken", session.refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 }); } else res.setHeader("Set-Cookie", [`accessToken=${encodeURIComponent(session.accessToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=900`, `refreshToken=${encodeURIComponent(session.refreshToken)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`]); }
function clearCookies(res) { if (typeof res.clearCookie === "function") { res.clearCookie("accessToken", { httpOnly: true, sameSite: "lax", path: "/" }); res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax", path: "/" }); } else res.setHeader("Set-Cookie", ["accessToken=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0", "refreshToken=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"]); }
function error(res, value) { return res.status(value.status || 400).json({ error: value.message }); }

router.post("/register", async (req, res) => { try { const { email, username, password, name } = req.body || {}; if (!email || !username || !password || password.length < 8) return res.status(400).json({ error: "Email, username, and a password of at least 8 characters are required." }); const result = await auth.register({ email: email.trim(), username: username.trim(), password, name: String(name || username).trim() }, req); setSessionCookies(res, result); res.status(201).json({ user: result.user, verificationToken: process.env.NODE_ENV === "production" ? undefined : result.verificationToken, message: "Account created. Verify your email to activate it." }); } catch (e) { error(res, e); } });
router.post("/login", rateLimit, async (req, res) => { try { const result = await auth.login(String(req.body?.identifier || req.body?.email || "").trim(), String(req.body?.password || ""), req); loginAttempts.delete(req.loginRateLimitKey); setSessionCookies(res, result); res.json({ user: result.user }); } catch (e) { error(res, e); } });
router.post("/refresh", async (req, res) => { try { const result = await auth.refresh(parseCookies(req).refreshToken, req); setSessionCookies(res, result); res.json({ user: result.user }); } catch (e) { error(res, e); } });
router.post("/logout", authenticate, (req, res) => { auth.revoke(req.auth.sid); clearCookies(res); res.json({ ok: true }); });
router.post("/logout-all", authenticate, (req, res) => { auth.revokeAllExcept(req.user.id, req.auth.sid); res.json({ ok: true }); });
router.get("/me", authenticate, (req, res) => res.json({ user: auth.publicUser(req.user) }));
router.get("/sessions", authenticate, (req, res) => res.json({ sessions: auth.sessions(req.user.id) }));
router.post("/forgot-password", async (req, res) => { const result = await auth.forgotPassword(String(req.body?.email || "").trim()); res.json({ ...result, resetToken: process.env.NODE_ENV === "production" ? undefined : result.resetToken }); });
router.post("/reset-password", async (req, res) => { try { await auth.resetPassword(req.body?.token, req.body?.password); res.json({ ok: true }); } catch (e) { error(res, e); } });
router.get("/verify-email/:token", (req, res) => { try { auth.verifyEmail(req.params.token); res.json({ ok: true, message: "Email verified." }); } catch (e) { error(res, e); } });
router.post("/change-password", authenticate, async (req, res) => { try { await auth.changePassword(req.user.id, req.body?.currentPassword, req.body?.newPassword); clearCookies(res); res.json({ ok: true }); } catch (e) { error(res, e); } });
router.post("/forgot-password-sms", async (req, res) => { try { res.json(await auth.requestSmsReset(req.body?.phoneNumber)); } catch (e) { error(res, e); } });
router.post("/reset-password-sms", async (req, res) => { try { res.json(await auth.resetPasswordWithSms(req.body?.code, req.body?.newPassword)); } catch (e) { error(res, e); } });
router.post("/forgot-password-email", async (req, res) => { try { res.json(await auth.requestEmailReset(req.body?.email)); } catch (e) { error(res, e); } });
router.post("/reset-password-email", async (req, res) => { try { res.json(await auth.resetPasswordWithEmail(req.body?.code, req.body?.newPassword)); } catch (e) { error(res, e); } });
router.patch("/profile", authenticate, async (req, res) => { try { auth.updateProfile(req.user.id, req.body || {}); res.json({ ok: true }); } catch (e) { error(res, e); } });

module.exports = { router, setSessionCookies };
