const nodemailer = require('nodemailer');

// Track recently sent alerts to avoid spam (cooldown per greenhouse)
const alertCooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendIntrusionAlert = async ({ greenhouse_id, temp, hum, timestamp }) => {
  // Cooldown check
  const lastAlert = alertCooldowns.get(greenhouse_id);
  if (lastAlert && Date.now() - lastAlert < COOLDOWN_MS) {
    console.log(`⏳ Alert cooldown active for ${greenhouse_id}, skipping email`);
    return { skipped: true, reason: 'cooldown' };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 [DEMO] Intrusion alert would be sent for ${greenhouse_id}`);
    return { demo: true };
  }

  const transporter = createTransporter();
  const alertTime = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();

  const mailOptions = {
    from: `"🌿 Greenhouse Monitor" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `🚨 INTRUSION ALERT - ${greenhouse_id}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; color: white;">🚨 INTRUSION DETECTED</h1>
          <p style="margin: 8px 0 0; color: #fca5a5; font-size: 16px;">Nighttime security alert</p>
        </div>
        <div style="padding: 32px;">
          <div style="background: #1a1f2e; border: 1px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 16px; color: #f87171;">Greenhouse: ${greenhouse_id}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Alert Time</td>
                <td style="padding: 8px 0; color: #e2e8f0; font-weight: bold;">${alertTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Temperature</td>
                <td style="padding: 8px 0; color: #e2e8f0; font-weight: bold;">${temp}°C</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Humidity</td>
                <td style="padding: 8px 0; color: #e2e8f0; font-weight: bold;">${hum}%</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Mode</td>
                <td style="padding: 8px 0; color: #818cf8; font-weight: bold;">NIGHT</td>
              </tr>
            </table>
          </div>
          <p style="color: #94a3b8; font-size: 14px; text-align: center;">
            An unauthorized entry has been detected in your greenhouse during nighttime hours.<br>
            Please investigate immediately.
          </p>
        </div>
        <div style="background: #0a0d14; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #4b5563; font-size: 12px;">GreenWatch IoT Monitoring System</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    alertCooldowns.set(greenhouse_id, Date.now());
    console.log(`✅ Intrusion alert email sent for ${greenhouse_id}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ Failed to send alert email:`, error.message);
    return { error: error.message };
  }
};

module.exports = { sendIntrusionAlert };
