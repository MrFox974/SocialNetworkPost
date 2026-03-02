const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
} else {
  console.warn('Stripe non configuré : STRIPE_SECRET_KEY manquant. Les routes de paiement renverront une erreur.');
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyAmount: 0,
    currency: 'eur',
    isFree: true,
  },
  {
    id: 'maitrise',
    name: 'Maîtrise',
    monthlyAmount: 1999,
    currency: 'eur',
    isFree: false,
  },
  {
    id: 'performance',
    name: 'Performance',
    monthlyAmount: 5999,
    currency: 'eur',
    isFree: false,
  },
];

const PRODUCT_ENV_KEYS = {
  maitrise: 'STRIPE_PRODUCT_MAITRISE',
  performance: 'STRIPE_PRODUCT_PERFORMANCE',
};

const priceCache = {};

function ensureStripeConfigured() {
  if (!stripe) {
    throw new Error('Stripe non configuré (STRIPE_SECRET_KEY manquant).');
  }
}

function getPlanById(planId) {
  return PLANS.find((p) => p.id === planId);
}

function getPublicPlans() {
  return PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    monthlyAmount: p.monthlyAmount,
    currency: p.currency,
    isFree: p.isFree,
  }));
}

async function getPriceIdForPlan(planId) {
  ensureStripeConfigured();
  const cacheKey = `${planId}:monthly`;
  if (priceCache[cacheKey]) {
    return priceCache[cacheKey];
  }

  const envKey = PRODUCT_ENV_KEYS[planId];
  if (!envKey) {
    throw new Error(`Aucun produit Stripe configuré pour le plan ${planId}`);
  }
  const productId = process.env[envKey];
  if (!productId) {
    throw new Error(`Variable d'environnement ${envKey} manquante pour le plan ${planId}`);
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring',
    limit: 1,
  });

  if (!prices.data.length) {
    throw new Error(`Aucun prix récurrent actif trouvé pour le produit Stripe ${productId}`);
  }

  const price = prices.data[0];
  priceCache[cacheKey] = price.id;
  return price.id;
}

async function createCheckoutSessionSubscription(planId, clientReferenceId, customerEmail, successUrl, cancelUrl) {
  ensureStripeConfigured();

  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error('Plan inconnu.');
  }
  if (plan.isFree) {
    throw new Error('Le plan gratuit ne nécessite pas de paiement.');
  }

  const priceId = await getPriceIdForPlan(planId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    client_reference_id: String(clientReferenceId),
    customer_email: customerEmail || undefined,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      planId,
      billingMode: 'monthly',
    },
    subscription_data: {
      metadata: {
        planId,
        billingMode: 'monthly',
      },
    },
  });

  return { url: session.url };
}

async function retrieveCheckoutSession(sessionId) {
  ensureStripeConfigured();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });
}

async function cancelSubscription(subscriptionId, atPeriodEnd = true) {
  ensureStripeConfigured();
  if (!subscriptionId) {
    throw new Error('subscriptionId requis pour annuler un abonnement');
  }
  if (atPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

module.exports = {
  PLANS,
  getPublicPlans,
  getPlanById,
  createCheckoutSessionSubscription,
  retrieveCheckoutSession,
  cancelSubscription,
};

