const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../config/database');
const crypto = require('crypto');

// Пакеты BRT
const BRT_PACKAGES = {
  basic: { price: 7, brt: 5.5, name: 'Basic Package' },
  silver: { price: 61, brt: 51, name: 'Silver Package' },
  gold: { price: 600, brt: 501, name: 'Gold Package' },
  platinum: { price: 1200, brt: 1001, name: 'Platinum Package' }
};

// Генерация уникального кода активации
const generateActivationCode = () => {
  return 'BRT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

// Расчет BRT для произвольной суммы
const calculateBRT = (amountUSD) => {
  return (amountUSD * 0.7857).toFixed(8);
};

class StripeController {
  // Создание Stripe Checkout Session
  static async createCheckout(req, res) {
    try {
      const { packageType, customAmount, email } = req.body;

      let amount, brt, packageName;

      // Определяем пакет или произвольную сумму
      if (packageType && BRT_PACKAGES[packageType]) {
        const pkg = BRT_PACKAGES[packageType];
        amount = pkg.price;
        brt = pkg.brt;
        packageName = pkg.name;
      } else if (customAmount) {
        amount = parseFloat(customAmount);
        if (amount < 1 || amount > 1000) {
          return res.status(400).json({ 
            success: false, 
            message: 'Custom amount must be between $1 and $1000' 
          });
        }
        brt = calculateBRT(amount);
        packageName = `Custom Package ($${amount})`;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Package type or custom amount required' 
        });
      }

      // Создаём Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: packageName,
                description: `Receive ${brt} BRT tokens`,
              },
              unit_amount: Math.round(amount * 100), // cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/shop`,
        customer_email: email || undefined,
        metadata: {
          amount_usd: amount.toString(),
          amount_brt: brt.toString(),
          package_type: packageType || 'custom',
          buyer_email: email || 'unknown'
        }
      });

      res.json({ 
        success: true, 
        sessionId: session.id,
        url: session.url 
      });
    } catch (error) {
      console.error('Create checkout error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create checkout session' 
      });
    }
  }

  // Webhook для обработки успешных платежей
  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Обработка события checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      try {
        // Генерируем уникальный код активации
        let code;
        let isUnique = false;
        
        while (!isUnique) {
          code = generateActivationCode();
          const existing = await query(
            'SELECT id FROM activation_codes WHERE code = $1',
            [code]
          );
          if (existing.rows.length === 0) {
            isUnique = true;
          }
        }

        // Сохраняем код в БД
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 год

        await query(
          `INSERT INTO activation_codes 
           (code, amount_usd, amount_brt, stripe_payment_id, stripe_session_id, 
            buyer_email, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)`,
          [
            code,
            session.metadata.amount_usd,
            session.metadata.amount_brt,
            session.payment_intent,
            session.id,
            session.metadata.buyer_email || session.customer_email,
            expiresAt
          ]
        );

        // Отправляем email с кодом активации
        const { sendActivationCodeEmail } = require('../services/emailService');
        await sendActivationCodeEmail(
          session.customer_email || session.metadata.buyer_email,
          session.metadata.buyer_email || 'Customer',
          code,
          session.metadata.amount_brt,
          session.metadata.amount_usd
        );

        console.log(`✅ Activation code created: ${code} for ${session.customer_email}`);
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    }

    res.json({ received: true });
  }

  // Получить сессию по ID (для проверки статуса)
  static async getSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      res.json({ 
        success: true, 
        session: {
          status: session.payment_status,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total / 100
        }
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve session' 
      });
    }
  }
}

module.exports = StripeController;