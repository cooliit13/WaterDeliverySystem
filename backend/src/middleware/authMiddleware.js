import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Always verify using your actual secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // decoded contains { id, role }

    // ✅ Admin route check (kept as you intended)
    if (req.baseUrl.includes("/api/admin") && decoded.role !== "admin") {
      return res.status(401).json({ message: "Access denied: Admins only" });
    }

    // ✅ No need for the customer/shop logic you had.
    // Your routes don't use /api/shop or /api/customers auth branching.
    // So we simply continue.

    next();
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);
    res.status(401).json({ message: "Unauthorized or expired token" });
  }
};
