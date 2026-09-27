import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Utensils, LogOut, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getDashboardPath = () => {
    switch (role) {
      case "donor": return "/donor";
      case "recipient": return "/recipient";
      case "volunteer": return "/volunteer";
      case "admin": return "/admin";
      default: return "/login";
    }
  };

  return (
    <header style={{
      background: "#ffffff",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px"
      }}>
        <Link to={user ? getDashboardPath() : "/login"} style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontWeight: 800,
          fontSize: "1.25rem",
          color: "var(--primary)"
        }}>
          <div style={{
            background: "var(--primary-light)",
            color: "var(--primary)",
            padding: "0.45rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center"
          }}>
            <Utensils size={20} />
          </div>
          <span style={{ fontFamily: "var(--font-heading)" }}>FoodBridge</span>
        </Link>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--radius-full)",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)"
              }}>
                <UserIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {user.name}
                </div>
                <span className={`badge badge-${role}`} style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem" }}>
                  {role}
                </span>
              </div>
            </div>

            <button 
              onClick={handleLogout} 
              className="btn btn-secondary btn-sm"
              title="Sign Out"
              style={{ padding: "0.4rem 0.75rem" }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
}
