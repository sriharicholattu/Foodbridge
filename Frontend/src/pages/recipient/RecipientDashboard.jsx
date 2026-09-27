import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Check, X, Sparkles, MapPin, Package, Clock, ShieldCheck, ListPlus } from "lucide-react";

export default function RecipientDashboard() {
  const [matches, setMatches] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [reqForm, setReqForm] = useState({
    food_type: "",
    quantity_needed: "",
    pickup_available: false,
  });

  const fetchData = async () => {
    try {
      const [matchesRes, reqsRes] = await Promise.all([
        api.get("/matching/recipient"),
        api.get("/matching/requirements"),
      ]);
      setMatches(matchesRes.data.matches || []);
      setRequirements(reqsRes.data.requirements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRequirement = async (e) => {
    e.preventDefault();
    setSubmittingReq(true);
    setFeedback("");
    try {
      await api.post("/matching/requirements", reqForm);
      setFeedback("Food requirement created! Matches will be scored automatically.");
      setReqForm({ food_type: "", quantity_needed: "", pickup_available: false });
      fetchData();
    } catch (err) {
      alert("Failed to save requirement");
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleRespond = async (matchId, decision) => {
    try {
      await api.post(`/matching/${matchId}/respond`, { status: decision });
      setFeedback(`Match ${decision === "accepted" ? "accepted! Volunteers can now be assigned for pickup." : "declined."}`);
      fetchData();
    } catch (err) {
      alert("Error responding to match");
    }
  };

  return (
    <div className="container" style={{ padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Recipient (NGO / Shelter) Dashboard</h1>
        <p style={{ color: "var(--text-muted)" }}>
          View auto-matched surplus food donations ranked by proximity and nutritional requirements.
        </p>
      </div>

      {feedback && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <ShieldCheck size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "2rem", alignItems: "start" }}>
        {/* Requirements Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <ListPlus size={20} color="var(--primary)" />
              Add Food Requirement
            </h3>
            <form onSubmit={handleCreateRequirement}>
              <div className="form-group">
                <label className="form-label">Food Type Needed</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Cooked Meals, Rice, Grains"
                  value={reqForm.food_type}
                  onChange={(e) => setReqForm({ ...reqForm, food_type: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity Needed</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. 50 Meals / 15 kgs"
                  value={reqForm.quantity_needed}
                  onChange={(e) => setReqForm({ ...reqForm, quantity_needed: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.6rem" }}>
                <input
                  type="checkbox"
                  id="pickup_avail"
                  checked={reqForm.pickup_available}
                  onChange={(e) => setReqForm({ ...reqForm, pickup_available: e.target.checked })}
                />
                <label htmlFor="pickup_avail" style={{ fontSize: "0.875rem", cursor: "pointer" }}>
                  We have transport to pick up directly
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "0.5rem" }}
                disabled={submittingReq}
              >
                {submittingReq ? "Saving..." : "Save Requirement"}
              </button>
            </form>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: "0.75rem" }}>Active Requirements</h4>
            {requirements.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No active requirements registered.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {requirements.map((r) => (
                  <div key={r.id} style={{
                    padding: "0.65rem 0.85rem",
                    background: "var(--bg-subtle)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between"
                  }}>
                    <div>
                      <strong>{r.food_type}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>({r.quantity_needed})</span>
                    </div>
                    {r.pickup_available && (
                      <span className="badge badge-accepted" style={{ fontSize: "0.65rem" }}>Self-pickup</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Matched Donations */}
        <div>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <Sparkles size={20} color="var(--secondary)" />
            AI-Suggested Surplus Food Matches
          </h3>

          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Analyzing and loading matches...</p>
          ) : matches.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <Package size={40} color="var(--text-dim)" style={{ marginBottom: "0.75rem" }} />
              <h4>No matches suggested yet</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                When food donors post surplus items matching your location and requirements, they will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {matches.map((m) => {
                const donation = m.donation || {};
                const scorePercent = Math.round(m.match_score || 0);

                return (
                  <div key={m.id} className="card" style={{
                    borderLeft: `4px solid ${m.status === "accepted" ? "var(--success)" : m.status === "rejected" ? "var(--danger)" : "var(--primary)"}`
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <h4 style={{ fontSize: "1.15rem" }}>{donation.food_type || "Surplus Food"}</h4>
                          <span className={`badge badge-${m.status}`}>{m.status}</span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                          Donor: <strong>{donation.donor_name || "Food Partner"}</strong>
                        </p>
                      </div>

                      <div style={{
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        padding: "0.35rem 0.75rem",
                        borderRadius: "var(--radius-full)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem"
                      }}>
                        <Sparkles size={14} />
                        {scorePercent}% Fit Score
                      </div>
                    </div>

                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1.25rem",
                      padding: "0.75rem",
                      background: "var(--bg-subtle)",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "1rem",
                      fontSize: "0.85rem"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Package size={15} color="var(--primary)" /> <strong>Qty:</strong> {donation.quantity}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <MapPin size={15} color="var(--primary)" /> <strong>Location:</strong> {donation.pickup_location || "Verified address"}
                      </span>
                      {donation.availability_end && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <Clock size={15} color="var(--primary)" /> <strong>Valid until:</strong> {new Date(donation.availability_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {m.status === "suggested" && (
                      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleRespond(m.id, "rejected")}
                          className="btn btn-secondary btn-sm"
                          style={{ color: "var(--danger)" }}
                        >
                          <X size={16} /> Decline
                        </button>
                        <button
                          onClick={() => handleRespond(m.id, "accepted")}
                          className="btn btn-primary btn-sm"
                        >
                          <Check size={16} /> Accept Donation
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
