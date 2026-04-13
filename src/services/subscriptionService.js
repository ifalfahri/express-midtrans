const DEFAULT_GRACE_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS || 3);

function addPeriod(startDate, interval) {
  const start = new Date(startDate);
  const next = new Date(start);
  if (interval === 'year') {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  return next;
}

function resolveLocalPaymentStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === 'capture') {
    return fraudStatus === 'accept' ? 'paid' : 'pending';
  }
  if (transactionStatus === 'settlement') return 'paid';
  if (transactionStatus === 'pending') return 'pending';
  if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'failure') {
    return 'failed';
  }
  if (transactionStatus === 'expire') return 'expired';
  return 'pending';
}

async function applySubscriptionStateFromTransaction(prisma, transactionRecord, plan, localStatus) {
  if (!transactionRecord.subscriptionId) return;

  const now = new Date();
  const graceLimit = new Date(now);
  graceLimit.setDate(graceLimit.getDate() + DEFAULT_GRACE_DAYS);

  if (localStatus === 'paid') {
    const currentStart = now;
    const currentEnd = addPeriod(currentStart, plan.interval);
    await prisma.subscription.update({
      where: { id: transactionRecord.subscriptionId },
      data: {
        status: 'active',
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        nextBillingAt: currentEnd,
      },
    });
    await prisma.user.update({
      where: { id: transactionRecord.userId },
      data: { isPaid: true },
    });
    return;
  }

  if (localStatus === 'failed') {
    await prisma.subscription.update({
      where: { id: transactionRecord.subscriptionId },
      data: {
        status: 'past_due',
        nextBillingAt: graceLimit,
      },
    });
    await prisma.user.update({
      where: { id: transactionRecord.userId },
      data: { isPaid: false },
    });
    return;
  }

  if (localStatus === 'expired') {
    await prisma.subscription.update({
      where: { id: transactionRecord.subscriptionId },
      data: {
        status: 'expired',
        canceledAt: now,
      },
    });
    await prisma.user.update({
      where: { id: transactionRecord.userId },
      data: { isPaid: false },
    });
  }
}

module.exports = {
  addPeriod,
  resolveLocalPaymentStatus,
  applySubscriptionStateFromTransaction,
};
