/**
 * Required External Modules
 * jwt: JSON Web Token implementation for Node.js
 */
const jwt = require("jsonwebtoken");

/**
 * Required Internal Modules
 * BlacklistedToken: MongoDB model for storing invalidated tokens
 */
const BlacklistedToken = require("../models/blacklist");

/**
 * Google OAuth Callback Handler
 * Processes successful Google authentication and creates JWT
 * @param {Object} req - Express request object containing authenticated user
 * @param {Object} res - Express response object
 */
exports.googleCallback = (req, res) => {
  const user = req.user;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET || !user) {
    console.error("JWT_SECRET or user data missing");
    return res.status(500).send("Internal Server Error");
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
  });

  res.redirect("/api/dashboard");
};

/**
 * Logout Handler
 * Invalidates JWT by adding to blacklist and clears cookie
 * @param {Object} req - Express request object containing JWT token
 * @param {Object} res - Express response object
 */
exports.logout = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(400).json({ message: "No token provided" });

  try {
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    await BlacklistedToken.create({ token, expiresAt });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
