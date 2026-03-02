const authService = require('../services/auth.service');
const subscriptionService = require('../services/subscription.service');

/**
 * GET /api/auth/config — public, retourne { production: boolean }
 */
exports.getConfig = async (req, res) => {
  try {
    const config = authService.getAuthConfig();
    res.json(config);
  } catch (error) {
    console.error('Erreur getConfig:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { email, password, username } = req.body || {};
    const result = await authService.register({ email, password, username });
    if (result.user) {
      return res.status(201).json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    res.status(201).json({
      message: result.message,
      ...(result.verification_token && { verification_token: result.verification_token }),
    });
  } catch (error) {
    console.error('Erreur register:', error);
    const msg = error.message || 'Erreur serveur';
    if (msg.includes('déjà')) return res.status(409).json({ error: msg });
    if (msg.includes('requis')) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg, details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
  }
};

/**
 * POST /api/auth/verify-email — body { token }
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body || {};
    const result = await authService.verifyEmail(token);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Erreur verifyEmail:', error);
    res.status(400).json({ error: error.message || 'Token invalide ou expiré' });
  }
};

/**
 * POST /api/auth/resend-verification — body { email }
 */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    const result = await authService.resendVerification(email);
    res.json(result);
  } catch (error) {
    console.error('Erreur resendVerification:', error);
    res.status(400).json({ error: error.message || 'Impossible de renvoyer l\'email' });
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Erreur login:', error);
    const msg = error.message || 'Email ou mot de passe incorrect';
    if (msg.includes('Vérifiez')) return res.status(403).json({ error: msg });
    res.status(401).json({ error: msg });
  }
};

/**
 * POST /api/auth/google — body { idToken }
 */
exports.google = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const result = await authService.loginWithGoogle(idToken);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Erreur google:', error);
    res.status(401).json({ error: error.message || 'Connexion Google impossible' });
  }
};

/**
 * POST /api/auth/refresh — body { refreshToken }
 */
exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    const result = await authService.refresh(refreshToken);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Erreur refresh:', error);
    res.status(401).json({ error: 'Token expiré ou invalide' });
  }
};

/**
 * GET /api/auth/me — protégé
 */
exports.me = async (req, res) => {
  try {
    const user = await authService.getMe(req.user_id);
    res.json({ user });
  } catch (error) {
    console.error('Erreur me:', error);
    res.status(401).json({ error: error.message || 'Utilisateur non trouvé' });
  }
};

/**
 * POST /api/auth/subscription-complete — body { session_id }
 */
exports.subscriptionComplete = async (req, res) => {
  try {
    const { session_id } = req.body || {};
    const result = await subscriptionService.completeSubscriptionForUser(req.user_id, session_id);
    res.json(result);
  } catch (error) {
    console.error('Erreur subscriptionComplete:', error);
    res.status(400).json({ error: error.message || 'Impossible de finaliser l\'abonnement' });
  }
};

/**
 * POST /api/auth/unsubscribe — body optionnel { reason }
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const result = await subscriptionService.unsubscribeUser(req.user_id, reason);
    res.json(result);
  } catch (error) {
    console.error('Erreur unsubscribe:', error);
    res.status(400).json({ error: error.message || 'Impossible de résilier l\'abonnement' });
  }
};

/**
 * PATCH /api/auth/me — protégé, body { username?, email?, password?, currentPassword? }
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, password, currentPassword } = req.body || {};
    const user = await authService.updateProfile(req.user_id, {
      username,
      email,
      password,
      currentPassword,
    });
    res.json({ user });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    const msg = error.message || 'Impossible de mettre à jour le profil';
    if (msg.includes('existe déjà') || msg.includes('requis') || msg.includes('incorrect')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  }
};

/**
 * DELETE /api/auth/me — protégé, supprime le compte
 */
exports.deleteAccount = async (req, res) => {
  try {
    await authService.deleteAccount(req.user_id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur deleteAccount:', error);
    res.status(500).json({ error: error.message || 'Impossible de supprimer le compte' });
  }
};
