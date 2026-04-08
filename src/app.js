require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./config/passport'); // Load config passport

const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { isAuthenticated, isPaidUser } = require('./middlewares/authMiddleware');

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

// Endpoint Protected
app.get('/api/protected-content', isAuthenticated, isPaidUser, (req, res) => {
  res.json({ 
    message: `Halo ${req.user.name}, ini adalah data rahasia.`,
    isPaid: req.user.isPaid 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
