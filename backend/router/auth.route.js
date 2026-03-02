const express = require('express');
const controller = require('../controllers/auth.controller');
const { authMiddlewares } = require('../middlewares/authMiddlewares');

const route = express.Router();

route.get('/config', controller.getConfig);
route.post('/register', controller.register);
route.post('/verify-email', controller.verifyEmail);
route.post('/resend-verification', controller.resendVerification);
route.post('/login', controller.login);
route.post('/google', controller.google);
route.post('/refresh', controller.refresh);
route.get('/me', authMiddlewares, controller.me);
route.patch('/me', authMiddlewares, controller.updateProfile);
route.delete('/me', authMiddlewares, controller.deleteAccount);
route.post('/subscription-complete', authMiddlewares, controller.subscriptionComplete);
route.post('/unsubscribe', authMiddlewares, controller.unsubscribe);

module.exports = route;
