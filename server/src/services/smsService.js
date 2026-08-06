let twilioClient;

function getClient() {
  if (twilioClient !== undefined) return twilioClient;
  try {
    const twilio = require("twilio");
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } else twilioClient = null;
  } catch (_error) { twilioClient = null; }
  return twilioClient;
}

async function sendSms(to, body) {
  const client = getClient();
  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn(`[SMS DEV] ${to}: ${body}`);
    return { sent: false, development: true };
  }
  await client.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
  return { sent: true };
}

module.exports = { sendSms };
