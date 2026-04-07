const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Harap login terlebih dahulu" });
  };
  
  module.exports = { isAuthenticated };
  