const express = require('express');
const prisma = require('../config/prisma');
const { snap, coreApi } = require('../config/midtrans');
const { isAuthenticated } = require('../middlewares/authMiddleware');

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

const SUCCESS_TRANSACTION_STATUSES = new Set(['settlement', 'capture']);

function mapMidtransToLocalStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === 'capture') {
    return fraudStatus === 'accept' ? 'paid' : 'pending';
  }

  if (transactionStatus === 'settlement') return 'paid';
  if (transactionStatus === 'pending') return 'pending';
  if (transactionStatus === 'deny') return 'failed';
  if (transactionStatus === 'cancel') return 'failed';
  if (transactionStatus === 'expire') return 'expired';
  if (transactionStatus === 'failure') return 'failed';

  return 'pending';
}

function buildOrderId(userId) {
  return `ORDER-${userId}-${Date.now()}`;
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
    const localStatus = mapMidtransToLocalStatus(
      verifiedStatus.transaction_status,
      verifiedStatus.fraud_status
    );

    const updatedTransaction = await prisma.transaction.update({
      where: { orderId: incomingOrderId },
      data: {
        status: localStatus,
        paymentType: verifiedStatus.payment_type || null,
        transactionStatus: verifiedStatus.transaction_status || null,
      },
    });

    if (SUCCESS_TRANSACTION_STATUSES.has(verifiedStatus.transaction_status)) {
      await prisma.user.update({
        where: { id: updatedTransaction.userId },
        data: { isPaid: true },
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
