const express = require('express');
const controller = require('../controllers/payment.controller');
const { authMiddlewares } = require('../middlewares/authMiddlewares');

const route = express.Router();

route.get('/plans', controller.getPlans);
route.post('/checkout-session', authMiddlewares, controller.createCheckoutSession);

module.exports = route;

