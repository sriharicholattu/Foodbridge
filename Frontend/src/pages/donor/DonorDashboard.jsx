import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { PlusCircle, Clock, MapPin, Package, CheckCircle2, AlertCircle, Trash2, Navigation } from "lucide-react";
import LeafletMapPicker from "../../components/maps/LeafletMapPicker";

export default function DonorDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    food_type: "",
    quantity: "",
    pickup_location: "",
    latitude: null,
    longitude: null,
    preparation_time: new Date().toISOString().slice(0, 16),
    availability_start: new Date().toISOString().slice(0, 16),
    availability_end: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
  });

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
      setMessage("Donation posted successfully! Our matching algorithm is finding recipients.");
      setForm({
        food_type: "",
        quantity: "",
        pickup_location: "",
        latitude: null,
        longitude: null,
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
    <div className="container" style={{ padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Donor Dashboard</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Share your surplus prepared or packaged food to prevent waste and feed local communities.
        </p>
      </div>

      {message && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.9fr", gap: "2rem", alignItems: "start" }}>
        {/* Post Food Form */}
        <div className="card">
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <PlusCircle size={20} color="var(--primary)" />
            Post Surplus Food
          </h3>

          <form onSubmit={handlePostDonation}>
            <div className="form-group">
              <label className="form-label">Food Description / Type</label>
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
              <label className="form-label">Quantity</label>
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

            <div className="form-group">
              <label className="form-label">Pickup Address</label>
              <input
                type="text"
                name="pickup_location"
                className="form-input"
                placeholder="Leave blank to use profile address"
                value={form.pickup_location}
                onChange={handleChange}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <LeafletMapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationSelect={handleLocationPicked}
                initialAddress={form.pickup_location}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Preparation Time</label>
              <input
                type="datetime-local"
                name="preparation_time"
                className="form-input"
                value={form.preparation_time}
                onChange={handleChange}
              />
            </div>

            <div className="grid-2" style={{ gap: "0.75rem" }}>
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
                <label className="form-label">Available Until</label>
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
              style={{ width: "100%", marginTop: "0.5rem" }}
              disabled={submitting}
            >
              {submitting ? "Posting..." : "Publish Food Donation"}
            </button>
          </form>
        </div>

        {/* My Donations List */}
        <div>
          <h3 style={{ marginBottom: "1.25rem" }}>My Donations Tracking</h3>

          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Loading donations...</p>
          ) : donations.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <Package size={40} color="var(--text-dim)" style={{ marginBottom: "0.75rem" }} />
              <h4>No food posted yet</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                Use the form to list your first surplus food donation.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {donations.map((d) => (
                <div key={d.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                      <h4 style={{ fontSize: "1.1rem" }}>{d.food_type}</h4>
                      <span className={`badge badge-${d.status}`}>{d.status}</span>
                      {d.is_self_pickup && (
                        <span className="badge badge-accepted" style={{ fontSize: "0.65rem" }}>
                          Self-Pickup by NGO
                        </span>
                      )}
                    </div>

                    {d.accepted_recipient && (
                      <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginBottom: "0.35rem" }}>
                        Accepted by: {d.accepted_recipient.name} {d.accepted_recipient.phone ? `(${d.accepted_recipient.phone})` : ""}
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Package size={14} /> {d.quantity}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <MapPin size={14} /> {d.pickup_location || "Default address"}
                      </span>
                      {d.availability_end && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Clock size={14} /> Expires: {new Date(d.availability_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="btn btn-secondary btn-sm"
                      title="Delete donation"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
