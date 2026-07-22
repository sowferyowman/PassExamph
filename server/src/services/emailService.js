let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  try {
    const nodemailer = require("nodemailer");
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_PORT) === "465", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    else transporter = null;
  } catch (_error) { transporter = null; }
  return transporter;
}
async function sendEmail(to, subject, text) {
  const client = getTransporter();
  if (!client) { console.warn(`[EMAIL DEV] ${to}: ${text}`); return { sent: false, development: true }; }
  await client.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
  return { sent: true };
}
module.exports = { sendEmail };
