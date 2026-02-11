// frontend/src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * ProtectedRoute
 * - Uses localStorage token presence as authoritative.
 * - Listens for 'authChanged' and 'storage' (cross-tab) to re-evaluate immediately.
 * - Cleanup correctly removes the same handlers (no dangling listeners).
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const auth = useSelector((state) => state.auth) || {};
  const reduxUserRole = auth?.user?.role ?? auth?.userRole ?? null;

  // local tick to force re-render when auth changes
  const [, setTick] = useState(0);

  useEffect(() => {
    const onAuthChanged = () => {
      setTick((t) => t + 1);
    };

    const onStorage = (e) => {
      // when token/user/role changes in another tab, re-evaluate
      if (e.key === "token" || e.key === "user" || e.key === "role") {
        onAuthChanged();
      }
    };

    window.addEventListener("authChanged", onAuthChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("authChanged", onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authoritative check: token presence in localStorage
  const hasToken = Boolean(localStorage.getItem("token"));

  // If no token, redirect immediately
  if (!hasToken) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Determine user role (redux preferred, fallback to localStorage)
  const userRoleRaw = reduxUserRole ?? localStorage.getItem("role") ?? "";
  const userRole = userRoleRaw ? String(userRoleRaw).toLowerCase() : "";

  // If allowedRoles specified, ensure role is allowed
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const allowedLower = allowedRoles.map((r) => String(r).toLowerCase());
    if (!userRole || !allowedLower.includes(userRole)) {
      return <Navigate to="/unauth-page" replace />;
    }
  }

  return children;
}
