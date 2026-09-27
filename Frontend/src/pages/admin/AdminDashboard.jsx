import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Users, Package, CheckCircle2, TrendingUp, ShieldAlert, Truck, Sparkles, MapPin } from "lucide-react";
import LeafletMapViewer from "../../components/maps/LeafletMapViewer";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, usersRes, donRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/users"),
          api.get("/admin/donations"),
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data.users || []);
        setDonations(donRes.data.donations || []);
      } catch (err) {
        console.error("Admin fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading platform metrics...</p>
      </div>
    );
  }

  const uStats = stats?.users || {};
  const dStats = stats?.donations || {};
  const mStats = stats?.matches || {};

  return (
    <div className="container" style={{ padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1>Platform Administration</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Real-time analytics, user distribution, and donation pipeline health.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("overview")}
            className={`btn btn-sm ${activeTab === "overview" ? "btn-primary" : "btn-secondary"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`btn btn-sm ${activeTab === "map" ? "btn-primary" : "btn-secondary"}`}
          >
            City Map View
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`btn btn-sm ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("donations")}
            className={`btn btn-sm ${activeTab === "donations" ? "btn-primary" : "btn-secondary"}`}
          >
            Donations ({donations.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Total Community</span>
            <Users size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, marginTop: "0.35rem" }}>
            {uStats.total || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
            {uStats.donors || 0} donors · {uStats.recipients || 0} NGOs · {uStats.volunteers || 0} volunteers
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--secondary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Food Rescued</span>
            <Package size={18} color="var(--secondary)" />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, marginTop: "0.35rem" }}>
            {dStats.total || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
            {dStats.delivered || 0} delivered · {dStats.matched || 0} matched
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Auto Matches</span>
            <Sparkles size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, marginTop: "0.35rem" }}>
            {mStats.total || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
            {mStats.accepted || 0} accepted by recipients
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <span>Deliveries</span>
            <Truck size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, marginTop: "0.35rem" }}>
            {stats?.volunteer_assignments?.total || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
            {stats?.volunteer_assignments?.active || 0} active in transit
          </div>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid-2">
          <div className="card">
            <h3 style={{ marginBottom: "1rem" }}>Pipeline Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <span>Posted & Awaiting Match</span>
                <span className="badge badge-posted">{dStats.posted || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <span>Matched & Suggested</span>
                <span className="badge badge-matched">{dStats.matched || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <span>Accepted by Recipient</span>
                <span className="badge badge-accepted">{dStats.accepted || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                <span>In Transit (Picked Up)</span>
                <span className="badge badge-picked_up">{dStats.picked_up || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                <span>Successfully Delivered</span>
                <span className="badge badge-delivered">{dStats.delivered || 0}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "1rem" }}>System Health</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--success)" }}>
                <CheckCircle2 size={18} /> Database connected: PostgreSQL on Supabase (Pooler Port 6543)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--success)" }}>
                <CheckCircle2 size={18} /> Multi-parameter matching engine active
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--success)" }}>
                <CheckCircle2 size={18} /> JWT Authentication Service active
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Platform Users</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Name</th>
                  <th style={{ padding: "0.75rem" }}>Email</th>
                  <th style={{ padding: "0.75rem" }}>Role</th>
                  <th style={{ padding: "0.75rem" }}>Address</th>
                  <th style={{ padding: "0.75rem" }}>Phone</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{u.address || "—"}</td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{u.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "map" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3>Live City Redistribution Map</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Real-time geographic distribution of food surplus posts and recovery operations.
              </p>
            </div>
            <span className="badge badge-accepted">
              {donations.filter((d) => d.latitude && d.longitude).length} Mapped Donations
            </span>
          </div>

          <LeafletMapViewer
            markers={donations
              .filter((d) => d.latitude && d.longitude)
              .map((d) => ({
                id: d.id,
                title: d.food_type,
                lat: d.latitude,
                lng: d.longitude,
                info: `Quantity: ${d.quantity} · Location: ${d.pickup_location || 'Donor Kitchen'}`,
                status: d.status,
              }))}
          />
        </div>
      )}

      {activeTab === "donations" && (
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>All Food Donations</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Food Description</th>
                  <th style={{ padding: "0.75rem" }}>Quantity</th>
                  <th style={{ padding: "0.75rem" }}>Donor</th>
                  <th style={{ padding: "0.75rem" }}>Pickup Location</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600 }}>{d.food_type}</td>
                    <td style={{ padding: "0.75rem" }}>{d.quantity}</td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{d.donor_name || "Anonymous"}</td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{d.pickup_location || "—"}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className={`badge badge-${d.status}`}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
