import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPlans, createCheckoutSession, subscriptionComplete } from '../../utils/stripeApi';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const FEATURE_MAP = {
  starter: [
    '1 projet actif pour ton SaaS principal',
    'Jusqu’à 30 scripts générés par mois',
    'Pipeline complet : Propositions → Sélection → En ligne',
    'Notation manuelle des scripts (0–10) avec filtres de base',
  ],
  maitrise: [
    'Jusqu’à 5 projets (plusieurs SaaS / offres)',
    'Jusqu’à 150 scripts générés par mois',
    'Atelier d’édition rapide sur les scripts en sélection',
    'Pilotage par scores : top (7+), à améliorer (<5), non notés',
  ],
  performance: [
    'Jusqu’à 20 projets (marques / clients)',
    'Jusqu’à 600 scripts générés par mois',
    'Optimisation en continu à partir de tes meilleurs scripts',
    'Support prioritaire et usage intensif pensé pour équipes / agences',
  ],
};

function formatPriceCents(amount, currency) {
  if (amount === 0) return 'Gratuit';
  const value = (amount || 0) / 100;
  const suffix = currency === 'eur' ? '€' : currency?.toUpperCase() || '';
  return `${value.toFixed(2)} ${suffix}/mois`;
}

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, saveSession } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchPlans();
        setPlans(list);
      } catch (err) {
        addToast('Impossible de charger les plans pour le moment.', 'error');
      } finally {
        setLoadingPlans(false);
      }
    };
    load();
  }, [addToast]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    const run = async () => {
      setFinalizing(true);
      try {
        const data = await subscriptionComplete(sessionId);
        if (user) {
          const updatedUser = {
            ...user,
            subscription_plan: data.subscription_plan || user.subscription_plan,
            subscription_current_period_start: data.subscription_current_period_start || user.subscription_current_period_start,
            subscription_current_period_end: data.subscription_current_period_end || user.subscription_current_period_end,
          };
          saveSession(null, updatedUser, null);
        }
        addToast('Abonnement activé avec succès ✓', 'success');
        navigate('/dashboard/plans', { replace: true });
      } catch (err) {
        addToast(err.response?.data?.error || 'Impossible de finaliser l’abonnement.', 'error');
      } finally {
        setFinalizing(false);
      }
    };

    run();
  }, [searchParams, addToast, user, saveSession, navigate]);

  const handleStartFree = () => {
    navigate('/dashboard');
  };

  const handleCheckout = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const { url } = await createCheckoutSession(planId);
      if (url) {
        window.location.href = url;
      } else {
        addToast('URL de paiement introuvable.', 'error');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        addToast('Connecte-toi pour souscrire à un plan.', 'error');
        navigate('/login');
      } else {
        addToast(err.response?.data?.error || 'Impossible de lancer le paiement.', 'error');
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const currentPlanId = user?.subscription_plan || 'starter';

  return (
    <div className="space-y-10">
      <section className="text-center space-y-3">
        <p className="sf-section-label">04 — Plans</p>
        <h1 className="sf-heading-display">Choisis ton plan</h1>
        <p className="sf-subtitle-bracket mt-1">
          (démarre en Starter, passe à Maîtrise ou Performance quand tu es prêt)
        </p>
        {finalizing && (
          <p className="text-sm mt-2" style={{ color: 'var(--sf-text-muted)' }}>
            Finalisation de l’abonnement en cours…
          </p>
        )}
      </section>

      {loadingPlans ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border animate-pulse"
              style={{ borderColor: 'var(--sf-border)', backgroundColor: 'var(--sf-card)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const features = FEATURE_MAP[plan.id] || [];
            const isCurrent = currentPlanId === plan.id;
            const isFree = plan.isFree || plan.monthlyAmount === 0;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                  plan.id === 'maitrise'
                    ? 'border-[var(--sf-cta)]/70 bg-[var(--sf-card-hover)] shadow-lg shadow-[var(--sf-cta)]/20'
                    : 'border-[var(--sf-border)] bg-[var(--sf-card)] hover:border-[var(--sf-cta)]/40 hover:bg-[var(--sf-card-hover)]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2
                      className="text-xl font-semibold"
                      style={{ color: 'var(--sf-text)', fontFamily: 'var(--sf-heading-font)' }}
                    >
                      {plan.name}
                    </h2>
                    {isCurrent && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--sf-cta)]/15" style={{ color: 'var(--sf-cta)' }}>
                        Ton plan actuel
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--sf-text)' }}>
                    {formatPriceCents(plan.monthlyAmount, plan.currency)}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm" style={{ color: 'var(--sf-text-muted)' }}>
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-0.5 text-[var(--sf-cta)]">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  {isFree ? (
                    <button
                      type="button"
                      onClick={handleStartFree}
                      className="w-full sf-cta-button"
                      style={{
                        backgroundColor: 'var(--sf-card-hover)',
                        color: 'var(--sf-text)',
                      }}
                    >
                      Rester sur Starter
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={checkoutLoading === plan.id}
                      onClick={() => handleCheckout(plan.id)}
                      className="w-full sf-cta-button flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: 'var(--sf-cta)',
                        color: 'var(--sf-cta-text)',
                        opacity: checkoutLoading === plan.id ? 0.7 : 1,
                      }}
                    >
                      {checkoutLoading === plan.id ? 'Redirection vers Stripe…' : 'Choisir ce plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

