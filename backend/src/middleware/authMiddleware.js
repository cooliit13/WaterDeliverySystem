import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normalize user object
    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId,
      role: decoded.role || null,
    };

    // ✅ FIXED ADMIN CHECK — THIS IS THE ONLY CHANGE YOU NEED
    if (req.originalUrl.startsWith("/api/admin") && req.user.role !== "admin") {
      return res.status(401).json({ message: "Access denied: Admins only" });
    }

    next();
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);
    res.status(401).json({ message: "Unauthorized or expired token" });
  }
};
