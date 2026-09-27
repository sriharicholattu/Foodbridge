import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading session...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their respective dashboard
    if (role === "donor") return <Navigate to="/donor" replace />;
    if (role === "recipient") return <Navigate to="/recipient" replace />;
    if (role === "volunteer") return <Navigate to="/volunteer" replace />;
    if (role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
