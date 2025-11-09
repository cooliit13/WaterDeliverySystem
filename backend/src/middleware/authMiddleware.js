import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verify token properly
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Normalize ID for all token formats
    // Supports: { id }, { userId }
    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId
    };

    // ✅ Admin-only route protection (your existing logic)
    if (req.baseUrl.includes("/api/admin") && decoded.role !== "admin") {
      return res.status(401).json({ message: "Access denied: Admins only" });
    }

    next();
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);
    res.status(401).json({ message: "Unauthorized or expired token" });
  }
};
