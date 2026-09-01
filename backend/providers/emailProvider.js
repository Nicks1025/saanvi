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
  });

  console.log('[EmailProvider] SMTP transporter initialized.');
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    initTransporter();
  }

  if (!transporter) {
    throw new Error('EmailProvider is not configured with SMTP credentials.');
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || 'noreply@example.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Saanvi System';

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = {
  sendEmail
};
