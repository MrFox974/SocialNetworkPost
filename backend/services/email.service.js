const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'mail.gandi.net';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();
const SMTP_FROM = (process.env.SMTP_FROM || '').trim();
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '').trim().replace(/\/$/, '');

function isConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS && SMTP_FROM);
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!isConfigured()) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Envoi d'un email via SMTP (Gandi par défaut).
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.warn('Email service: SMTP non configuré (SMTP_USER, SMTP_PASS, SMTP_FROM)');
    return { sent: false, error: 'SMTP non configuré' };
  }
  const transport = getTransporter();
  if (!transport) return { sent: false, error: 'Transporter indisponible' };
  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject: subject || 'Message',
      text: text || '',
      html: html || text || '',
    });
    return { sent: true };
  } catch (err) {
    console.error('Email service sendMail:', err);
    return { sent: false, error: err.message };
  }
}

/**
 * Email de vérification d'inscription (lien avec token).
 */
async function sendVerificationEmail(email, verificationToken) {
  const link = FRONTEND_URL ? `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(verificationToken)}` : null;
  const subject = 'Vérifiez votre adresse email';
  const text = link
    ? `Cliquez sur le lien suivant pour activer votre compte : ${link}`
    : `Votre code de vérification : ${verificationToken}`;
  const html = link
    ? `<p>Cliquez sur le lien suivant pour activer votre compte :</p><p><a href="${link}">${link}</a></p>`
    : `<p>Votre code de vérification : <strong>${verificationToken}</strong></p>`;
  return sendMail({ to: email, subject, text, html });
}

/**
 * Email de bienvenue après vérification.
 */
async function sendWelcomeEmail(email, username) {
  const subject = 'Bienvenue';
  const text = username
    ? `Bienvenue ${username}, votre compte est activé.`
    : 'Bienvenue, votre compte est activé.';
  const html = `<p>${text}</p>`;
  return sendMail({ to: email, subject, text, html });
}

module.exports = {
  isConfigured,
  sendMail,
  sendVerificationEmail,
  sendWelcomeEmail,
};
