import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userRole = user?.role?.toLowerCase() || "";

  console.log("🔐 ProtectedRoute Debug ->", { isAuthenticated, userRole, allowedRoles });

  // ✅ Block if not authenticated
  if (!isAuthenticated) {
    console.log("🚫 Not authenticated, redirecting to login...");
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // ✅ Block if role is not allowed
  if (!allowedRoles.includes(userRole)) {
    console.log("🚫 Role not allowed, redirecting to unauth-page...");
    return <Navigate to="/unauth-page" replace />;
  }

  return children;
}