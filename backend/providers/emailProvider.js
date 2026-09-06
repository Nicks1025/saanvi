const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT) {
    console.warn('[EmailProvider] SMTP credentials not provided. EmailProvider disabled.');
    return;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // We use a fresh connection for every email.
    // Pooling (pool: true) can cause strict SMTP servers like Gmail to silently 
    // drop emails if multiple identical messages are sent rapidly on the same connection.
    pool: false,
  });

  // Verify SMTP connection at startup
  transporter.verify((err) => {
    if (err) {
      console.error('[EmailProvider] SMTP connection verification failed:', err.message);
      // Reset so it re-initializes on the next send attempt
      transporter = null;
    } else {
      console.log('[EmailProvider] SMTP transporter initialized and verified.');
    }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  // Always ensure transporter is ready (re-init if it was reset due to verify failure)
  if (!transporter) {
    initTransporter();
  }

  if (!transporter) {
    throw new Error('EmailProvider is not configured with SMTP credentials.');
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || 'noreply@example.com';
  const fromName = (process.env.EMAIL_FROM_NAME || 'Saanvi System').replace(/^"|"$/g, '');

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    // Enrich error with SMTP response code if available
    const smtpCode = err.responseCode || err.code || '';
    const smtpResponse = err.response || '';
    const enrichedMessage = smtpCode
      ? `[SMTP ${smtpCode}] ${smtpResponse || err.message}`
      : err.message;
    
    console.error(`[EmailProvider] Failed to send email to ${to}: ${enrichedMessage}`);
    
    // If the connection was broken, reset the transporter so it re-connects on next attempt
    if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ESOCKET'].includes(err.code)) {
      console.warn('[EmailProvider] Network error detected — resetting transporter.');
      transporter = null;
    }

    const enrichedError = new Error(enrichedMessage);
    enrichedError.code = err.code;
    enrichedError.responseCode = err.responseCode;
    throw enrichedError;
  }
};

module.exports = {
  sendEmail
};

