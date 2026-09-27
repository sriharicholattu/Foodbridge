import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Utensils, AlertCircle, ArrowRight } from "lucide-react";
import LeafletMapPicker from "../../components/maps/LeafletMapPicker";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
    phone: "",
    address: "",
    latitude: 12.9716,
    longitude: 77.5946,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "latitude" || name === "longitude" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await register(formData);
      switch (user.role) {
        case "donor": navigate("/donor"); break;
        case "recipient": navigate("/recipient"); break;
        case "volunteer": navigate("/volunteer"); break;
        case "admin": navigate("/admin"); break;
        default: navigate("/");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Registration failed. Please check the details entered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem"
    }}>
      <div className="card" style={{ width: "100%", maxWidth: "520px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            display: "inline-flex",
            background: "var(--primary-light)",
            color: "var(--primary)",
            padding: "0.75rem",
            borderRadius: "var(--radius-lg)",
            marginBottom: "0.75rem"
          }}>
            <Utensils size={28} />
          </div>
          <h2>Join FoodBridge</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Register as a donor, recipient NGO, or volunteer
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div className="form-group">
              <label className="form-label">Full Name / Org</label>
              <input
                type="text"
                name="name"
                required
                className="form-input"
                placeholder="Green Hotel / Shelter NGO"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                required
                className="form-input"
                placeholder="contact@org.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="donor">Food Donor (Restaurant / Hotel)</option>
                <option value="recipient">Recipient (NGO / Shelter)</option>
                <option value="volunteer">Volunteer Driver</option>
                <option value="admin">Platform Admin</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: "0.75rem", marginBottom: "0.25rem" }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Address</label>
              <input
                type="text"
                name="address"
                className="form-input"
                placeholder="Koramangala, Bangalore"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <LeafletMapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationSelect={({ latitude, longitude, address }) => {
                setFormData((prev) => ({
                  ...prev,
                  latitude,
                  longitude,
                  address: address || prev.address,
                }));
              }}
              initialAddress={formData.address}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
