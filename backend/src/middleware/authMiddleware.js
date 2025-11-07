import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "yourSecretKey");

    req.user = decoded; // decoded contains { userId, role }

    // ✅ If it's an admin route, require admin role
    if (req.baseUrl.includes("/api/admin") && decoded.role !== "admin") {
      return res.status(401).json({ message: "Access denied: Admins only" });
    }

    // ✅ Allow both admin & customer for other routes
    if (req.baseUrl.includes("/api/shop") || req.baseUrl.includes("/api/customers")) {
      return next();
    }

    next();
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);
    res.status(401).json({ message: "Unauthorized or expired token" });
  }
};
