// src/components/admin-view/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole") || "";

  if (!token || !allowedRoles.includes(userRole.toLowerCase())) {
    return <Navigate to="/unauth-page" replace />;
  }

  return children;
}
