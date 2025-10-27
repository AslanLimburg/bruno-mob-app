const express = require('express');
const router = express.Router();
const StripeController = require('../controllers/stripeController');

// Создать Stripe Checkout Session
router.post('/create-checkout', StripeController.createCheckout);

// Webhook для обработки платежей (НЕ требует auth!)
router.post('/webhook', express.raw({ type: 'application/json' }), StripeController.handleWebhook);

// Получить информацию о сессии (временно без auth для теста)
router.get('/session/:sessionId', StripeController.getSession);

// TEST ONLY - remove in production
router.post('/test-webhook', StripeController.testWebhook);

module.exports = router;
