const prisma = require('../config/prisma');

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Harap login terlebih dahulu" });
  };

const isSubscriptionUser = async (req, res, next) => {
    const now = new Date();
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: { in: ['active', 'past_due'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (
      subscription &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) >= now
    ) {
        return next();
    }

    res.status(403).json({ message: "Anda harus memiliki subscription aktif untuk mengakses fitur ini" });
};

const isPaidUser = (req, res, next) => {
    if (req.user.isPaid) {
        return next();
    }
    res.status(403).json({ message: "Anda harus memiliki status paid untuk mengakses fitur ini" });
};
  
  module.exports = { isAuthenticated, isPaidUser, isSubscriptionUser };
  