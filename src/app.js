require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./config/passport'); // Load config passport

const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const docsRoutes = require('./routes/docsRoutes');
const { isAuthenticated, isPaidUser, isSubscriptionUser } = require('./middlewares/authMiddleware');

const app = express();

// Middleware
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true jika pakai HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/docs', docsRoutes);

app.get('/', (_req, res) => {
  res.json({
    service: 'express-midtrans',
    docs: '/docs',
  });
});

// Endpoint Protected for paid user only
app.get('/api/protected-content-paid', isAuthenticated, isPaidUser, (req, res) => {
  res.json({ 
    message: `Halo ${req.user.name}, ini adalah data khusus paid user.`,
    isPaid: req.user.isPaid 
  });
});

// Endpoint Protected for active subscription only
app.get('/api/protected-content-subscription', isAuthenticated, isSubscriptionUser, (req, res) => {
  res.json({
    message: `Halo ${req.user.name}, ini adalah data khusus subscription user.`,
    isPaid: req.user.isPaid,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
