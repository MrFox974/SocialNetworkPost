import api from './api';

export const fetchPlans = async () => {
  try {
    const { data } = await api.get('/api/payment/plans');
    return data.plans || [];
  } catch (error) {
    console.error('Erreur lors de fetchPlans:', error);
    throw error;
  }
};

export const createCheckoutSession = async (planId) => {
  try {
    const baseUrl = window.location.origin;
    const { data } = await api.post('/api/payment/checkout-session', {
      planId,
      successUrl: `${baseUrl}/dashboard/plans/success`,
      cancelUrl: `${baseUrl}/dashboard/plans`,
    });
    return data;
  } catch (error) {
    console.error('Erreur lors de createCheckoutSession:', error);
    throw error;
  }
};

export const subscriptionComplete = async (sessionId) => {
  try {
    const { data } = await api.post('/api/auth/subscription-complete', { session_id: sessionId });
    return data;
  } catch (error) {
    console.error('Erreur lors de subscriptionComplete:', error);
    throw error;
  }
};

export const unsubscribe = async (reason) => {
  try {
    const { data } = await api.post('/api/auth/unsubscribe', { reason });
    return data;
  } catch (error) {
    console.error('Erreur lors de unsubscribe:', error);
    throw error;
  }
};

