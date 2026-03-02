const stripeService = require('../services/stripe.service');

exports.getPlans = async (req, res) => {
  try {
    const plans = stripeService.getPublicPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Erreur getPlans:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body || {};

    if (!planId) {
      return res.status(400).json({ error: 'planId requis' });
    }

    const baseUrl = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
    const success = successUrl || `${baseUrl}/plan/success`;
    const cancel = cancelUrl || `${baseUrl}/plan`;

    const { url } = await stripeService.createCheckoutSessionSubscription(
      planId,
      req.user_id,
      req.user_email || null,
      success,
      cancel,
    );

    res.json({ url });
  } catch (error) {
    console.error('Erreur createCheckoutSession:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la création de la session de paiement' });
  }
};

