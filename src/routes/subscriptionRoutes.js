const express = require('express');
const prisma = require('../config/prisma');
const { snap } = require('../config/midtrans');
const { isAuthenticated } = require('../middlewares/authMiddleware');

const router = express.Router();

const RECURRING_SUPPORTED_METHODS = new Set(['credit_card', 'gopay']);
const DEFAULT_FALLBACK_PAYMENTS = ['credit_card', 'bank_transfer', 'qris', 'gopay'];

function buildOrderId(userId, planCode) {
  const safeUserPart = String(userId || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'user';
  const safePlanPart = String(planCode || 'plan').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'plan';
  return `SUB-${Date.now()}-${safePlanPart}-${safeUserPart}`;
}

function ensureDevMode(res) {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ message: 'Dev simulation endpoints are disabled in production' });
    return false;
  }
  return true;
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
    const { planCode, paymentMethod, enabledPayments } = req.body;
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
      enabled_payments: Array.isArray(enabledPayments) && enabledPayments.length > 0
        ? enabledPayments
        : Array.from(new Set([paymentMethod, ...DEFAULT_FALLBACK_PAYMENTS])),
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
      paymentMethod,
      enabledPayments: parameter.enabled_payments,
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

router.post('/dev/make-due', isAuthenticated, async (req, res) => {
  if (!ensureDevMode(res)) return;
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found for user' });
    }

    const dueDate = new Date(Date.now() - 60 * 1000);
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'past_due',
        currentPeriodEnd: dueDate,
        nextBillingAt: dueDate,
      },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isPaid: false },
    });

    return res.json({
      message: 'Subscription moved to due/past_due simulation state',
      subscription: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to simulate due subscription', error: error.message });
  }
});

router.post('/dev/make-expired', isAuthenticated, async (req, res) => {
  if (!ensureDevMode(res)) return;
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found for user' });
    }

    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'expired',
        currentPeriodEnd: expiredDate,
        nextBillingAt: expiredDate,
        canceledAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isPaid: false },
    });

    return res.json({
      message: 'Subscription moved to expired simulation state',
      subscription: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to simulate expired subscription', error: error.message });
  }
});

router.post('/dev/reset-active', isAuthenticated, async (req, res) => {
  if (!ensureDevMode(res)) return;
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription || !subscription.plan) {
      return res.status(404).json({ message: 'No subscription with plan found for user' });
    }

    const currentStart = new Date();
    const currentEnd = new Date(currentStart);
    if (subscription.plan.interval === 'year') {
      currentEnd.setFullYear(currentEnd.getFullYear() + 1);
    } else {
      currentEnd.setMonth(currentEnd.getMonth() + 1);
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        nextBillingAt: currentEnd,
        canceledAt: null,
        cancelAtPeriodEnd: false,
      },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isPaid: true },
    });

    return res.json({
      message: 'Subscription reset to active simulation state',
      subscription: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset subscription simulation state', error: error.message });
  }
});

module.exports = router;
