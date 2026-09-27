import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Navigation, ExternalLink, Package } from "lucide-react";
import { defaultPinIcon, recipientPinIcon, volunteerPinIcon } from "./leafletIcons";

const DEFAULT_CENTER = [12.9716, 77.5946];

export const getGoogleMapsDirectionsUrl = (destLat, destLng, destAddress = "") => {
  if (destLat && destLng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destAddress)}`;
};

export default function LeafletMapViewer({
  markers = [],
  center = DEFAULT_CENTER,
  zoom = 13,
}) {
  const mapCenter = markers.length > 0 && markers[0].lat && markers[0].lng
    ? [Number(markers[0].lat), Number(markers[0].lng)]
    : center;

  const getMarkerIcon = (type) => {
    switch (type) {
      case "recipient": return recipientPinIcon;
      case "volunteer": return volunteerPinIcon;
      default: return defaultPinIcon;
    }
  };

  return (
    <div style={{ height: "450px", width: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((m) => {
          if (!m.lat || !m.lng) return null;
          return (
            <Marker
              key={m.id}
              position={[Number(m.lat), Number(m.lng)]}
              icon={getMarkerIcon(m.type)}
            >
              <Popup>
                <div style={{ padding: "0.3rem", minWidth: "180px", color: "var(--text-main)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem" }}>
                    <Package size={14} color="var(--primary)" />
                    <strong style={{ fontSize: "0.95rem" }}>{m.title}</strong>
                  </div>

                  {m.info && (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0 0.5rem" }}>
                      {m.info}
                    </p>
                  )}

                  {m.status && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span className={`badge badge-${m.status}`} style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem" }}>
                        {m.status}
                      </span>
                    </div>
                  )}

                  <a
                    href={getGoogleMapsDirectionsUrl(m.lat, m.lng, m.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--primary)",
                      textDecoration: "none"
                    }}
                  >
                    <Navigation size={12} />
                    Open in Google Maps
                    <ExternalLink size={10} />
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
