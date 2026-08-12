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

const isProduction = process.env.NODE_ENV === "production";
const configuredSameSite = String(process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax")).toLowerCase();
const cookieSameSite = ["lax", "strict", "none"].includes(configuredSameSite) ? configuredSameSite : (isProduction ? "none" : "lax");
function cookieOptions(maxAge) { return { httpOnly: true, secure: isProduction, sameSite: cookieSameSite, ...(maxAge ? { maxAge } : {}), path: "/" }; }
function fallbackCookie(name, value, maxAge) { return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=${cookieSameSite[0].toUpperCase()}${cookieSameSite.slice(1)}; Path=/;${isProduction ? " Secure;" : ""}${maxAge === undefined ? "" : ` Max-Age=${maxAge};`}`; }
function setSessionCookies(res, session, rememberMe = true) {
  const accessOptions = cookieOptions(rememberMe ? auth.ACCESS_TTL : undefined);
  const refreshOptions = cookieOptions(rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined);
  if (typeof res.cookie === "function") {
    res.cookie("accessToken", session.accessToken, accessOptions);
    res.cookie("refreshToken", session.refreshToken, refreshOptions);
    if (rememberMe) res.cookie("rememberMe", "1", cookieOptions(7 * 24 * 60 * 60 * 1000));
    else res.clearCookie("rememberMe", cookieOptions());
  } else {
    res.setHeader("Set-Cookie", [fallbackCookie("accessToken", session.accessToken, rememberMe ? 900 : undefined), fallbackCookie("refreshToken", session.refreshToken, rememberMe ? 604800 : undefined), fallbackCookie("rememberMe", rememberMe ? "1" : "", rememberMe ? 604800 : 0)]);
  }
}
function clearCookies(res) { if (typeof res.clearCookie === "function") { res.clearCookie("accessToken", cookieOptions()); res.clearCookie("refreshToken", cookieOptions()); res.clearCookie("rememberMe", cookieOptions()); } else res.setHeader("Set-Cookie", [fallbackCookie("accessToken", "", 0), fallbackCookie("refreshToken", "", 0), fallbackCookie("rememberMe", "", 0)]); }
function error(res, value) { return res.status(value.status || 400).json({ error: value.message }); }

router.post("/register", async (req, res) => { try { const { email, username, password, name } = req.body || {}; if (!email || !username || !password || password.length < 8) return res.status(400).json({ error: "Email, username, and a password of at least 8 characters are required." }); const result = await auth.register({ email: email.trim(), username: username.trim(), password, name: String(name || username).trim() }, req); setSessionCookies(res, result); res.status(201).json({ user: result.user, verificationToken: process.env.NODE_ENV === "production" ? undefined : result.verificationToken, message: "Account created. Verify your email to activate it." }); } catch (e) { error(res, e); } });
router.post("/login", rateLimit, async (req, res) => { try { const result = await auth.login(String(req.body?.identifier || req.body?.email || "").trim(), String(req.body?.password || ""), req); loginAttempts.delete(req.loginRateLimitKey); setSessionCookies(res, result, Boolean(req.body?.rememberMe)); res.json({ user: result.user }); } catch (e) { error(res, e); } });
router.post("/refresh", async (req, res) => { try { const cookies = parseCookies(req); const result = await auth.refresh(cookies.refreshToken, req); setSessionCookies(res, result, cookies.rememberMe === "1"); res.json({ user: result.user }); } catch (e) { error(res, e); } });
router.post("/logout", authenticate, async (req, res) => { await auth.revoke(req.auth.sid); clearCookies(res); res.json({ ok: true }); });
router.post("/logout-all", authenticate, async (req, res) => { await auth.revokeAllExcept(req.user.id, req.auth.sid); res.json({ ok: true }); });
router.get("/me", authenticate, async (req, res) => res.json({ user: await auth.publicUser(req.user) }));
router.get("/sessions", authenticate, async (req, res) => res.json({ sessions: await auth.sessions(req.user.id) }));
router.post("/forgot-password", async (req, res) => { const result = await auth.forgotPassword(String(req.body?.email || "").trim()); res.json({ ...result, resetToken: process.env.NODE_ENV === "production" ? undefined : result.resetToken }); });
router.post("/reset-password", async (req, res) => { try { await auth.resetPassword(req.body?.token, req.body?.password); res.json({ ok: true }); } catch (e) { error(res, e); } });
router.get("/verify-email/:token", async (req, res) => { try { await auth.verifyEmail(req.params.token); res.json({ ok: true, message: "Email verified." }); } catch (e) { error(res, e); } });
router.post("/change-password", authenticate, async (req, res) => { try { await auth.changePassword(req.user.id, req.body?.currentPassword, req.body?.newPassword); clearCookies(res); res.json({ ok: true }); } catch (e) { error(res, e); } });
router.post("/forgot-password-sms", async (req, res) => { try { res.json(await auth.requestSmsReset(req.body?.phoneNumber)); } catch (e) { error(res, e); } });
router.post("/reset-password-sms", async (req, res) => { try { res.json(await auth.resetPasswordWithSms(req.body?.code, req.body?.newPassword)); } catch (e) { error(res, e); } });
router.post("/forgot-password-email", async (req, res) => { try { res.json(await auth.requestEmailReset(req.body?.email)); } catch (e) { error(res, e); } });
router.post("/reset-password-email", async (req, res) => { try { res.json(await auth.resetPasswordWithEmail(req.body?.code, req.body?.newPassword)); } catch (e) { error(res, e); } });
router.patch("/profile", authenticate, async (req, res) => { try { const user = await auth.updateProfile(req.user.id, req.body || {}); res.json({ user }); } catch (e) { error(res, e); } });

module.exports = { router, setSessionCookies };
