const express = require('express');
const passport = require('passport');
const router = express.Router();

// Trigger Login Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback setelah login sukses/gagal
router.get('/callback/google', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.json({ message: "Login Berhasil!", user: req.user });
  }
);

// Get Current User
router.get('/me', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Belum ada sesi login" });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

module.exports = router;
