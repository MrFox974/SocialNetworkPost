const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const emailService = require('./email.service');

const SALT_ROUNDS = 10;
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';
const VERIFICATION_EXPIRES_HOURS = 24;

function isProduction() {
  return process.env.PRODUCTION === 'true';
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET manquant');
  }
  return secret || 'dev-secret-change-in-prod';
}

function getJwtRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET manquant');
  }
  return secret || 'dev-refresh-secret-change-in-prod';
}

/**
 * Génère une paire access + refresh et persiste le refresh en base.
 */
async function createTokens(userId) {
  const accessToken = jwt.sign(
    { user_id: userId },
    getJwtSecret(),
    { expiresIn: ACCESS_EXPIRES }
  );
  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { user_id: userId, jti },
    getJwtRefreshSecret(),
    { expiresIn: REFRESH_EXPIRES }
  );
  await User.update(
    { refresh_token: refreshToken },
    { where: { id: userId } }
  );
  return { accessToken, refreshToken };
}

/**
 * En mode simple : crée l'utilisateur directement et retourne les tokens.
 * En mode production : crée une inscription en attente, envoie un email (stub si pas configuré).
 */
async function register({ email, password, username }) {
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm || !password) {
    throw new Error('Email et mot de passe requis');
  }
  const existing = await User.findOne({ where: { email: emailNorm } });
  if (existing) {
    throw new Error('Un compte existe déjà avec cet email');
  }

  if (!isProduction()) {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      email: emailNorm,
      password: hashed,
      username: (username || '').trim() || null,
      email_verified: true,
      auth_provider: 'local',
    });
    return { ...(await createTokens(user.id)), user: toPublicUser(user) };
  }

  await PendingRegistration.destroy({ where: { email: emailNorm } });
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const verification_token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000);
  await PendingRegistration.create({
    email: emailNorm,
    password: hashed,
    username: (username || '').trim() || null,
    verification_token,
    expires_at,
  });
  const sent = await emailService.sendVerificationEmail(emailNorm, verification_token);
  if (!sent.sent && process.env.NODE_ENV !== 'production') {
    console.warn('Auth production: email non envoyé (SMTP non configuré?). Token (dev):', verification_token);
  }
  return {
    message: 'Vérifiez votre email pour activer votre compte.',
    verification_token: process.env.NODE_ENV !== 'production' ? verification_token : undefined,
  };
}

/**
 * Vérification email : valide le token, crée le User, supprime la pending, retourne session.
 */
async function verifyEmail(token) {
  if (!token) {
    throw new Error('Token de vérification requis');
  }
  const pending = await PendingRegistration.findOne({
    where: { verification_token: token.trim() },
  });
  if (!pending) {
    throw new Error('Token invalide ou expiré');
  }
  if (new Date() > pending.expires_at) {
    await pending.destroy();
    throw new Error('Token expiré');
  }
  const user = await User.create({
    email: pending.email,
    password: pending.password,
    username: pending.username,
    email_verified: true,
    auth_provider: 'local',
  });
  await pending.destroy();
  emailService.sendWelcomeEmail(user.email, user.username).catch((err) => console.error('Welcome email:', err));
  return { ...(await createTokens(user.id)), user: toPublicUser(user) };
}

/**
 * Renvoyer un email de vérification (en production).
 */
async function resendVerification(email) {
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm) {
    throw new Error('Email requis');
  }
  const pending = await PendingRegistration.findOne({ where: { email: emailNorm } });
  if (!pending) {
    throw new Error('Aucune inscription en attente pour cet email');
  }
  if (new Date() > pending.expires_at) {
    await pending.destroy();
    throw new Error('Lien expiré. Inscrivez-vous à nouveau.');
  }
  await emailService.sendVerificationEmail(emailNorm, pending.verification_token);
  return { message: 'Si un compte existe, un email a été renvoyé.' };
}

/**
 * Connexion native : email + mot de passe.
 */
async function login({ email, password }) {
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm || !password) {
    throw new Error('Email et mot de passe requis');
  }
  const user = await User.findOne({ where: { email: emailNorm } });
  if (!user) {
    throw new Error('Email ou mot de passe incorrect');
  }
  if (user.auth_provider !== 'local') {
    throw new Error('Utilisez la connexion Google pour ce compte.');
  }
  if (!user.password) {
    throw new Error('Email ou mot de passe incorrect');
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new Error('Email ou mot de passe incorrect');
  }
  if (isProduction() && !user.email_verified) {
    throw new Error('Vérifiez votre email avant de vous connecter.');
  }
  return { ...(await createTokens(user.id)), user: toPublicUser(user) };
}

/**
 * Connexion / inscription Google via idToken.
 */
async function loginWithGoogle(idToken) {
  if (!idToken) {
    throw new Error('idToken Google requis');
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google OAuth non configuré');
  }
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(clientId);
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: clientId });
  } catch (err) {
    console.error('Google verifyIdToken:', err);
    throw new Error('Token Google invalide');
  }
  const payload = ticket.getPayload();
  const googleId = payload.sub;
  const email = (payload.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Email non fourni par Google');
  }

  let user = await User.findOne({ where: { google_id: googleId } });
  if (user) {
    return { ...(await createTokens(user.id)), user: toPublicUser(user) };
  }
  user = await User.findOne({ where: { email } });
  if (user) {
    await user.update({ google_id: googleId, auth_provider: 'google', email_verified: true });
    return { ...(await createTokens(user.id)), user: toPublicUser(user) };
  }
  user = await User.create({
    email,
    username: payload.name || null,
    auth_provider: 'google',
    google_id: googleId,
    email_verified: true,
  });
  return { ...(await createTokens(user.id)), user: toPublicUser(user) };
}

/**
 * Refresh : échange refreshToken contre une nouvelle paire.
 */
async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new Error('Refresh token requis');
  }
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
  } catch (err) {
    throw new Error('Token expiré ou invalide');
  }
  const user = await User.findByPk(decoded.user_id);
  if (!user || user.refresh_token !== refreshToken) {
    throw new Error('Token expiré ou invalide');
  }
  return await createTokens(user.id);
}

/**
 * Profil utilisateur pour /auth/me.
 */
async function getMe(userId) {
  const user = await User.findByPk(userId, {
    attributes: [
      'id',
      'email',
      'username',
      'email_verified',
      'auth_provider',
      'subscription_plan',
      'subscription_current_period_start',
      'subscription_current_period_end',
    ],
  });
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  return toPublicUser(user);
}

function toPublicUser(user) {
  const u = user.get ? user.get({ plain: true }) : user;
  return {
    id: u.id,
    email: u.email,
    username: u.username || null,
    email_verified: !!u.email_verified,
    auth_provider: u.auth_provider || 'local',
    subscription_plan: u.subscription_plan || 'starter',
    subscription_current_period_start: u.subscription_current_period_start || null,
    subscription_current_period_end: u.subscription_current_period_end || null,
  };
}

/**
 * Met à jour le profil (username ; email/password uniquement si auth_provider === 'local').
 */
async function updateProfile(userId, { username, email, password, currentPassword }) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  const isGoogle = user.auth_provider === 'google';
  const updates = {};

  if (username !== undefined) {
    updates.username = (username || '').trim() || null;
  }

  if (!isGoogle) {
    if (email !== undefined) {
      const emailNorm = (email || '').trim().toLowerCase();
      if (!emailNorm) {
        throw new Error('L\'email est requis');
      }
      const existing = await User.findOne({ where: { email: emailNorm } });
      if (existing && existing.id !== userId) {
        throw new Error('Un compte existe déjà avec cet email');
      }
      updates.email = emailNorm;
    }
    if (password !== undefined && password !== '') {
      if (!currentPassword) {
        throw new Error('Le mot de passe actuel est requis pour en définir un nouveau');
      }
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) {
        throw new Error('Mot de passe actuel incorrect');
      }
      updates.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
  }

  if (Object.keys(updates).length === 0) {
    return toPublicUser(user);
  }
  await user.update(updates);
  return toPublicUser(await User.findByPk(userId, {
    attributes: ['id', 'email', 'username', 'email_verified', 'auth_provider', 'subscription_plan', 'subscription_current_period_start', 'subscription_current_period_end'],
  }));
}

/**
 * Supprime définitivement le compte utilisateur.
 */
async function deleteAccount(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  await user.destroy();
  return { success: true };
}

module.exports = {
  isProduction,
  getAuthConfig: () => ({ production: isProduction() }),
  register,
  verifyEmail,
  resendVerification,
  login,
  loginWithGoogle,
  refresh,
  getMe,
  updateProfile,
  deleteAccount,
};
