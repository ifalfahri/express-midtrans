const express = require('express');
const prisma = require('../config/prisma');
const { snap } = require('../config/midtrans');
const { isAuthenticated } = require('../middlewares/authMiddleware');

const router = express.Router();

const RECURRING_SUPPORTED_METHODS = new Set(['credit_card', 'gopay']);

function buildOrderId(userId, planCode) {
  const safeUserPart = String(userId || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'user';
  const safePlanPart = String(planCode || 'plan').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'plan';
  return `SUB-${Date.now()}-${safePlanPart}-${safeUserPart}`;
}

router.get('/plans', async (_req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return res.json({ plans });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch plans', error: error.message });
  }
});

router.post('/checkout', isAuthenticated, async (req, res) => {
  try {
    const { planCode, paymentMethod } = req.body;
    if (!planCode || !paymentMethod) {
      return res.status(400).json({ message: 'planCode and paymentMethod are required' });
    }

    const plan = await prisma.plan.findFirst({
      where: { code: planCode, isActive: true },
    });
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const billingMode = RECURRING_SUPPORTED_METHODS.has(paymentMethod) ? 'auto_charge' : 'manual';

    const existing = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: { in: ['active', 'past_due', 'pending'] } },
      orderBy: { createdAt: 'desc' },
    });

    const subscription = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            billingMode,
            status: 'pending',
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        })
      : await prisma.subscription.create({
          data: {
            userId: req.user.id,
            planId: plan.id,
            billingMode,
            status: 'pending',
          },
        });

    const orderId = buildOrderId(req.user.id, plan.code);
    await prisma.transaction.create({
      data: {
        orderId,
        amount: plan.price,
        status: 'pending',
        userId: req.user.id,
        subscriptionId: subscription.id,
      },
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.price,
      },
      customer_details: {
        first_name: req.user.name || 'User',
        email: req.user.email,
      },
      enabled_payments: [paymentMethod],
    };

    const midtransResponse = await snap.createTransaction(parameter);

    return res.status(201).json({
      subscriptionId: subscription.id,
      plan: {
        code: plan.code,
        name: plan.name,
        interval: plan.interval,
        price: plan.price,
      },
      billingMode,
      orderId,
      snapToken: midtransResponse.token,
      redirectUrl: midtransResponse.redirect_url,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to start subscription checkout', error: error.message });
  }
});

router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      userId: req.user.id,
      isPaid: req.user.isPaid,
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch subscription', error: error.message });
  }
});

router.post('/cancel', isAuthenticated, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: { in: ['active', 'past_due', 'pending'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    return res.json({
      message: 'Subscription will be canceled at period end',
      subscription: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
  }
});

module.exports = router;
