const express = require('express');
const prisma = require('../config/prisma');
const { snap, coreApi } = require('../config/midtrans');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const {
  resolveLocalPaymentStatus,
  applySubscriptionStateFromTransaction,
} = require('../services/subscriptionService');

const router = express.Router();

const ALLOWED_PAYMENT_METHODS = [
  'qris',
  'gopay',
  'shopeepay',
  'credit_card',
  'bank_transfer',
  'bca_va',
  'bni_va',
  'bri_va',
  'permata_va',
];

function buildOrderId(userId) {
  const safeUserPart = String(userId || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'user';
  return `ORD-${Date.now()}-${safeUserPart}`;
}

router.post('/create-transaction', isAuthenticated, async (req, res) => {
  try {
    const parsedAmount = Number(req.body.amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive integer' });
    }

    const enabledPayments = Array.isArray(req.body.enabledPayments)
      ? req.body.enabledPayments.filter((method) => ALLOWED_PAYMENT_METHODS.includes(method))
      : ALLOWED_PAYMENT_METHODS;

    const orderId = buildOrderId(req.user.id);

    await prisma.transaction.create({
      data: {
        orderId,
        amount: parsedAmount,
        status: 'pending',
        userId: req.user.id,
      },
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parsedAmount,
      },
      customer_details: {
        first_name: req.user.name || 'User',
        email: req.user.email,
      },
      enabled_payments: enabledPayments,
    };

    const midtransResponse = await snap.createTransaction(parameter);

    return res.status(201).json({
      orderId,
      amount: parsedAmount,
      status: 'pending',
      snapToken: midtransResponse.token,
      redirectUrl: midtransResponse.redirect_url,
      enabledPayments,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create transaction',
      error: error.message,
    });
  }
});

router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const latestTransaction = await prisma.transaction.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      userId: req.user.id,
      isPaid: req.user.isPaid,
      latestTransaction,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch payment status',
      error: error.message,
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const incomingOrderId = req.body.order_id;
    if (!incomingOrderId) {
      return res.status(400).json({ message: 'Missing order_id in webhook payload' });
    }

    const verifiedStatus = await coreApi.transaction.status(incomingOrderId);
    const localStatus = resolveLocalPaymentStatus(
      verifiedStatus.transaction_status,
      verifiedStatus.fraud_status
    );

    const existingTransaction = await prisma.transaction.findUnique({
      where: { orderId: incomingOrderId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!existingTransaction) {
      return res.status(404).json({ message: 'Transaction not found for order_id' });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { orderId: incomingOrderId },
      data: {
        status: localStatus,
        paymentType: verifiedStatus.payment_type || null,
        transactionStatus: verifiedStatus.transaction_status || null,
      },
    });

    if (existingTransaction.subscription && existingTransaction.subscription.plan) {
      await applySubscriptionStateFromTransaction(
        prisma,
        updatedTransaction,
        existingTransaction.subscription.plan,
        localStatus
      );
    } else if (localStatus === 'paid') {
      await prisma.user.update({
        where: { id: updatedTransaction.userId },
        data: { isPaid: true },
      });
    } else if (localStatus === 'failed' || localStatus === 'expired') {
      await prisma.user.update({
        where: { id: updatedTransaction.userId },
        data: { isPaid: false },
      });
    }

    return res.json({
      message: 'Webhook processed',
      orderId: incomingOrderId,
      status: localStatus,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to process Midtrans webhook',
      error: error.message,
    });
  }
});

module.exports = router;
