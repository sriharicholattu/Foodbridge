import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DonorDashboard from "./pages/donor/DonorDashboard";
import RecipientDashboard from "./pages/recipient/RecipientDashboard";
import VolunteerDashboard from "./pages/volunteer/VolunteerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function HomeRedirect() {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <p style={{ color: "var(--text-muted)" }}>Checking session...</p>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  if (role === "donor") return <Navigate to="/donor" replace />;
  if (role === "recipient") return <Navigate to="/recipient" replace />;
  if (role === "volunteer") return <Navigate to="/volunteer" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Role-Based Routes */}
              <Route
                path="/donor"
                element={
                  <ProtectedRoute allowedRoles={["donor", "admin"]}>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recipient"
                element={
                  <ProtectedRoute allowedRoles={["recipient", "admin"]}>
                    <RecipientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/volunteer"
                element={
                  <ProtectedRoute allowedRoles={["volunteer", "admin"]}>
                    <VolunteerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
