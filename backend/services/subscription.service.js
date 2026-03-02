const User = require('../models/User');
const stripeService = require('./stripe.service');

async function completeSubscriptionForUser(userId, sessionId) {
  if (!userId) {
    throw new Error('Utilisateur requis');
  }
  if (!sessionId) {
    throw new Error('session_id Stripe requis');
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  const session = await stripeService.retrieveCheckoutSession(sessionId);

  if (!session) {
    throw new Error('Session Stripe introuvable');
  }

  if (session.mode !== 'subscription') {
    throw new Error('Cette session ne correspond pas à un abonnement');
  }

  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    throw new Error('Paiement non complété');
  }

  const subscription = session.subscription;
  if (!subscription) {
    throw new Error('Aucun abonnement associé à la session');
  }

  const metadata = subscription.metadata || session.metadata || {};
  const planId = metadata.planId || metadata.plan_id;
  const billingMode = metadata.billingMode || metadata.billing_mode || 'monthly';

  if (!planId) {
    throw new Error('Plan non trouvé dans les métadonnées Stripe');
  }

  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  user.subscription_plan = planId;
  user.stripe_subscription_id = subscription.id;
  user.stripe_customer_id = subscription.customer || user.stripe_customer_id || null;
  user.subscription_current_period_start = periodStart;
  user.subscription_current_period_end = periodEnd;

  await user.save();

  return {
    success: true,
    subscription_plan: user.subscription_plan,
    subscription_current_period_start: user.subscription_current_period_start,
    subscription_current_period_end: user.subscription_current_period_end,
    billingMode,
  };
}

async function unsubscribeUser(userId, reason) {
  if (!userId) {
    throw new Error('Utilisateur requis');
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  if (!user.subscription_plan || user.subscription_plan === 'starter') {
    return { success: true, subscription_plan: 'starter' };
  }

  if (user.stripe_subscription_id) {
    try {
      await stripeService.cancelSubscription(user.stripe_subscription_id, true);
    } catch (error) {
      console.error('Erreur Stripe lors de l’annulation de l’abonnement:', error);
    }
  }

  user.subscription_plan = 'starter';
  user.stripe_subscription_id = null;
  user.subscription_current_period_start = null;
  user.subscription_current_period_end = null;
  await user.save();

  if (reason) {
    console.log('Motif de désabonnement:', reason, 'pour l’utilisateur', user.id);
  }

  return {
    success: true,
    subscription_plan: user.subscription_plan,
  };
}

module.exports = {
  completeSubscriptionForUser,
  unsubscribeUser,
};

