import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { PlusCircle, Clock, MapPin, Package, CheckCircle2, AlertCircle, Trash2, Navigation, ExternalLink } from "lucide-react";
import LeafletMapPicker from "../../components/maps/LeafletMapPicker";
import { getGoogleMapsDirectionsUrl } from "../../components/maps/GoogleMapViewer";

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    food_type: "",
    quantity: "",
    pickup_location: user?.address || "",
    latitude: user?.latitude ?? null,
    longitude: user?.longitude ?? null,
    preparation_time: new Date().toISOString().slice(0, 16),
    availability_start: new Date().toISOString().slice(0, 16),
    availability_end: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
  });

  // Pre-fill with user's verified location when auth loads
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        pickup_location: prev.pickup_location || user.address || "",
        latitude: prev.latitude !== null ? prev.latitude : (user.latitude ?? null),
        longitude: prev.longitude !== null ? prev.longitude : (user.longitude ?? null),
      }));
    }
  }, [user]);

  const fetchMyDonations = async () => {
    try {
      const res = await api.get("/donations/my");
      setDonations(res.data.donations || []);
    } catch (err) {
      console.error("Error fetching my donations:", err);
      try {
        const fallbackRes = await api.get("/donations?my=true");
        setDonations(fallbackRes.data.donations || []);
      } catch (e) {
        console.error("Fallback fetch error:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLocationPicked = ({ latitude, longitude, address }) => {
    setForm((prev) => ({
      ...prev,
      latitude,
      longitude,
      pickup_location: address || prev.pickup_location,
    }));
  };

  const handlePostDonation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await api.post("/donations", form);
      setMessage("Donation posted successfully! Our matching algorithm is connecting with nearby recipients.");
      setForm({
        food_type: "",
        quantity: "",
        pickup_location: user?.address || "",
        latitude: user?.latitude ?? null,
        longitude: user?.longitude ?? null,
        preparation_time: new Date().toISOString().slice(0, 16),
        availability_start: new Date().toISOString().slice(0, 16),
        availability_end: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
      });
      fetchMyDonations();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to post donation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this donation?")) return;
    try {
      await api.delete(`/donations/${id}`);
      fetchMyDonations();
    } catch (err) {
      alert("Failed to delete donation");
    }
  };

  return (
    <div className="container" style={{ padding: "2rem 1.5rem", maxWidth: "1200px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Donor Dashboard</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Share your surplus prepared or packaged food to prevent waste and feed local communities.
        </p>
      </div>

      {message && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: Post Surplus Food Form (Placed First, Centered, Cleanly Aligned) */}
      <div className="card" style={{ maxWidth: "860px", margin: "0 auto 3rem", boxShadow: "var(--shadow-md)" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <PlusCircle size={22} color="var(--primary)" />
          Post Surplus Food
        </h3>

        <form onSubmit={handlePostDonation}>
          <div className="grid-2" style={{ gap: "1rem", marginBottom: "0.5rem" }}>
            <div className="form-group">
              <label className="form-label">Food Description / Type *</label>
              <input
                type="text"
                name="food_type"
                required
                className="form-input"
                placeholder="e.g. 50 Packs Veg Biryani, Fresh Apples"
                value={form.food_type}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity Available *</label>
              <input
                type="text"
                name="quantity"
                required
                className="form-input"
                placeholder="e.g. 50 Meals / 20 kg"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Pickup Address / Landmark</label>
            <input
              type="text"
              name="pickup_location"
              className="form-input"
              placeholder="e.g. MG Road, Near Metro Station, Central Kitchen"
              value={form.pickup_location}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <LeafletMapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onLocationSelect={handleLocationPicked}
              initialAddress={form.pickup_location}
            />
          </div>

          <div className="grid-3" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Cooked / Prepared At</label>
              <input
                type="datetime-local"
                name="preparation_time"
                className="form-input"
                value={form.preparation_time}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Available From</label>
              <input
                type="datetime-local"
                name="availability_start"
                className="form-input"
                value={form.availability_start}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Available Until (Expiry)</label>
              <input
                type="datetime-local"
                name="availability_end"
                className="form-input"
                value={form.availability_end}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", fontSize: "1rem" }}
            disabled={submitting}
          >
            {submitting ? "Publishing Donation..." : "Publish Food Donation"}
          </button>
        </form>
      </div>

      {/* SECTION 2: My Donations Tracking (Given at the Last for Perfect Mobile & PC Alignment) */}
      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem" }}>My Donations Tracking</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Live lifecycle, recipient claims, and pickup status of all your posted batches
            </p>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Total: {donations.length} {donations.length === 1 ? "batch" : "batches"}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-muted)" }}>Loading your donations...</p>
          </div>
        ) : donations.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
            <Package size={48} color="var(--text-dim)" style={{ marginBottom: "0.75rem" }} />
            <h4>No food posted yet</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.35rem" }}>
              Use the form above to list your first surplus food donation batch.
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem"
          }}>
            {donations.map((d) => (
              <div
                key={d.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderLeft: `4px solid ${
                    d.status === "delivered" || d.status === "completed"
                      ? "var(--success)"
                      : d.status === "accepted" || d.status === "matched"
                      ? "var(--primary)"
                      : "var(--warning)"
                  }`,
                  position: "relative"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "0.5rem" }}>
                    <div>
                      <h4 style={{ fontSize: "1.15rem", marginBottom: "0.2rem" }}>{d.food_type}</h4>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Posted: {d.created_at ? new Date(d.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
                      <span className={`badge badge-${d.status}`}>{d.status}</span>
                      {d.is_self_pickup && (
                        <span className="badge badge-accepted" style={{ fontSize: "0.65rem" }}>
                          Self-Pickup by NGO
                        </span>
                      )}
                    </div>
                  </div>

                  {d.accepted_recipient && (
                    <div style={{
                      fontSize: "0.825rem",
                      background: "var(--bg-subtle)",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "0.75rem",
                      border: "1px solid var(--border)"
                    }}>
                      <div style={{ color: "var(--primary)", fontWeight: 700, marginBottom: "0.2rem" }}>
                        Accepted by: {d.accepted_recipient.name}
                      </div>
                      {d.accepted_recipient.phone && (
                        <div style={{ color: "var(--text-muted)" }}>
                          Phone: {d.accepted_recipient.phone}
                        </div>
                      )}
                      {d.accepted_recipient.address && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.775rem" }}>
                          Shelter: {d.accepted_recipient.address}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Package size={15} color="var(--primary)" />
                      <strong>Quantity:</strong> {d.quantity}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                      <MapPin size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{d.pickup_location || "Default profile address"}</span>
                    </div>
                    {d.availability_end && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Clock size={15} color="var(--primary)" />
                        <span>Valid until: {new Date(d.availability_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                  {d.latitude && d.longitude ? (
                    <a
                      href={getGoogleMapsDirectionsUrl(d.latitude, d.longitude, d.pickup_location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <Navigation size={12} color="var(--primary)" />
                      View on Map
                      <ExternalLink size={10} />
                    </a>
                  ) : <span />}

                  <button
                    onClick={() => handleDelete(d.id)}
                    className="btn btn-secondary btn-sm"
                    title="Delete donation"
                    style={{ color: "var(--danger)" }}
                  >
                    <Trash2 size={15} />
                    <span style={{ fontSize: "0.75rem" }}>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
