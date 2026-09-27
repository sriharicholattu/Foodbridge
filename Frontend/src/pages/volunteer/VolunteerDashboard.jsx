import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Truck, MapPin, Package, CheckCircle2, ArrowRight, Clock, AlertCircle, Navigation } from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "../../components/maps/GoogleMapViewer";

export default function VolunteerDashboard() {
  const [available, setAvailable] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchData = async () => {
    try {
      const [availRes, myRes] = await Promise.all([
        api.get("/volunteers/available-deliveries"),
        api.get("/volunteers/my-assignments"),
      ]);
      setAvailable(availRes.data.available_donations || []);
      setMyAssignments(myRes.data.assignments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClaim = async (donationId) => {
    try {
      await api.post("/volunteers/assign", { donation_id: donationId });
      setStatusMsg("Delivery claimed! You can now proceed to pickup.");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to claim delivery task");
    }
  };

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      await api.patch(`/volunteers/assignments/${assignmentId}/status`, { status: newStatus });
      setStatusMsg(`Status updated to ${newStatus.replace('_', ' ')}!`);
      fetchData();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="container" style={{ padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Volunteer Rescue Dashboard</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Pick up accepted surplus food from donors and transport it safely to recipient shelters.
        </p>
      </div>

      {statusMsg && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle2 size={18} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Active Tasks First */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Truck size={20} color="var(--primary)" />
          My Current Transport Assignments ({myAssignments.length})
        </h3>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading assignments...</p>
        ) : myAssignments.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>You have no active delivery assignments right now. Pick one below!</p>
          </div>
        ) : (
          <div className="grid-2">
            {myAssignments.map((a) => {
              const donation = a.donation || {};
              return (
                <div key={a.id} className="card" style={{
                  borderTop: `4px solid ${a.status === "delivered" ? "var(--success)" : "var(--primary)"}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <h4 style={{ fontSize: "1.1rem" }}>{donation.food_type}</h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Qty: <strong>{donation.quantity}</strong>
                      </p>
                    </div>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </div>

                  <div style={{
                    fontSize: "0.85rem",
                    background: "var(--bg-subtle)",
                    padding: "0.85rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem"
                  }}>
                    {/* Pickup details */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
                        <MapPin size={15} color="var(--primary)" />
                        <span>1. Pickup: {donation.donor_name || "Food Donor"}</span>
                      </div>
                      <div style={{ color: "var(--text-muted)", marginLeft: "1.35rem", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                        {donation.pickup_location || "Donor address"}
                        {donation.donor_phone && <span> · Phone: {donation.donor_phone}</span>}
                      </div>
                    </div>

                    {/* Delivery details */}
                    {a.recipient && (
                      <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
                          <MapPin size={15} color="#2563eb" />
                          <span>2. Deliver To: {a.recipient.name}</span>
                        </div>
                        <div style={{ color: "var(--text-muted)", marginLeft: "1.35rem", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                          {a.recipient.address || "Recipient shelter address"}
                          {a.recipient.phone && <span> · Phone: {a.recipient.phone}</span>}
                        </div>
                      </div>
                    )}

                    {/* Transport Distance */}
                    {donation.latitude && a.recipient?.latitude && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.35rem 0.6rem",
                        background: "var(--bg-card)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.775rem",
                        color: "var(--primary)",
                        fontWeight: 600,
                        marginTop: "0.2rem"
                      }}>
                        <Navigation size={12} />
                        Route Distance: {
                          (() => {
                            const r = 6371.0;
                            const dlat = ((Number(a.recipient.latitude) - Number(donation.latitude)) * Math.PI) / 180;
                            const dlon = ((Number(a.recipient.longitude) - Number(donation.longitude)) * Math.PI) / 180;
                            const x = Math.sin(dlat / 2) ** 2 + Math.cos((Number(donation.latitude) * Math.PI) / 180) * Math.cos((Number(a.recipient.latitude) * Math.PI) / 180) * Math.sin(dlon / 2) ** 2;
                            const dist = Math.round(r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
                            return `${dist} km (Pickup ➔ Dropoff)`;
                          })()
                        }
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "flex-end" }}>
                    <a
                      href={getGoogleMapsDirectionsUrl(donation.latitude, donation.longitude, donation.pickup_location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Navigate from your location to Donor Pickup"
                    >
                      <Navigation size={13} color="var(--primary)" />
                      <span>To Pickup</span>
                    </a>

                    {a.recipient && (
                      <a
                        href={getGoogleMapsDirectionsUrl(a.recipient.latitude, a.recipient.longitude, a.recipient.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Navigate from your location to Recipient Shelter"
                      >
                        <Navigation size={13} color="#2563eb" />
                        <span>To Shelter</span>
                      </a>
                    )}

                    {a.recipient && donation.latitude && a.recipient.latitude && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${donation.latitude},${donation.longitude}&destination=${a.recipient.latitude},${a.recipient.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="See exact route from Donor to Recipient"
                      >
                        <span>Full Route</span>
                      </a>
                    )}

                    {a.status === "assigned" && (
                      <button
                        onClick={() => handleUpdateStatus(a.id, "picked_up")}
                        className="btn btn-primary btn-sm"
                      >
                        Confirm Picked Up <ArrowRight size={14} />
                      </button>
                    )}
                    {a.status === "picked_up" && (
                      <button
                        onClick={() => handleUpdateStatus(a.id, "delivered")}
                        className="btn btn-primary btn-sm"
                        style={{ background: "var(--success)" }}
                      >
                        Confirm Delivered <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available for Pickup */}
      <div>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Package size={20} color="var(--secondary)" />
          Available Deliveries Needing Volunteers ({available.length})
        </h3>

        {available.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>All matched donations currently have volunteers assigned.</p>
          </div>
        ) : (
          <div className="grid-3">
            {available.map((d) => (
              <div key={d.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h4 style={{ fontSize: "1.05rem" }}>{d.food_type}</h4>
                    <span className="badge badge-posted">{d.status}</span>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.25rem" }}>
                    <div><strong>Quantity:</strong> {d.quantity}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <MapPin size={14} /> {d.pickup_location || "Central Kitchen"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleClaim(d.id)}
                  className="btn btn-primary btn-sm"
                  style={{ width: "100%" }}
                >
                  Claim Delivery
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
