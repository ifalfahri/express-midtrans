const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Harap login terlebih dahulu" });
  };

const isPaidUser = (req, res, next) => {
    if (req.user.isPaid) {
        return next();
    }
    res.status(403).json({ message: "Anda harus berlangganan untuk mengakses fitur ini" });
};
  
  module.exports = { isAuthenticated, isPaidUser };
  