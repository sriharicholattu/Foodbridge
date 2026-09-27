import React, { useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { MapPin, Navigation, ExternalLink } from "lucide-react";

const mapContainerStyle = {
  width: "100%",
  height: "450px",
  borderRadius: "var(--radius-lg)",
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

export const getGoogleMapsDirectionsUrl = (destLat, destLng, destAddress = "") => {
  if (destLat && destLng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destAddress)}`;
};

export default function GoogleMapViewer({
  markers = [], // [{ id, title, lat, lng, type: 'donation' | 'recipient' | 'volunteer', info, status }]
  center = defaultCenter,
  zoom = 13,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const [selectedMarker, setSelectedMarker] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  if (!apiKey) {
    return (
      <div className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <MapPin size={36} color="var(--primary)" style={{ marginBottom: "0.75rem" }} />
        <h4>Interactive City Map Preview</h4>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "480px", margin: "0.25rem auto 1rem" }}>
          To view active donations and shelters on an interactive Google Map, add your <code>VITE_GOOGLE_MAPS_API_KEY</code> into <code>Frontend/.env</code>.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
          <span className="badge badge-posted">Active Pins: {markers.length}</span>
          {markers.slice(0, 3).map((m) => (
            <a
              key={m.id}
              href={getGoogleMapsDirectionsUrl(m.lat, m.lng, m.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <span>{m.title}</span>
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="alert alert-error">
        Error loading Google Maps. Please check your API key in Google Cloud Console.
      </div>
    );
  }

  if (!isLoaded) {
    return <div style={{ color: "var(--text-muted)", padding: "1rem" }}>Loading Google Maps...</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={markers.length > 0 && markers[0].lat ? { lat: markers[0].lat, lng: markers[0].lng } : center}
        zoom={zoom}
        options={{
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {markers.map((marker) => {
          if (!marker.lat || !marker.lng) return null;
          return (
            <Marker
              key={marker.id}
              position={{ lat: Number(marker.lat), lng: Number(marker.lng) }}
              onClick={() => setSelectedMarker(marker)}
              title={marker.title}
            />
          );
        })}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: Number(selectedMarker.lat), lng: Number(selectedMarker.lng) }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ padding: "0.4rem 0.2rem", maxWidth: "220px", color: "#0f172a" }}>
              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "0.25rem" }}>
                {selectedMarker.title}
              </strong>
              {selectedMarker.info && (
                <p style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "0.5rem" }}>
                  {selectedMarker.info}
                </p>
              )}
              {selectedMarker.status && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <span className={`badge badge-${selectedMarker.status}`} style={{ fontSize: "0.65rem" }}>
                    {selectedMarker.status}
                  </span>
                </div>
              )}
              <a
                href={getGoogleMapsDirectionsUrl(selectedMarker.lat, selectedMarker.lng, selectedMarker.title)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#059669"
                }}
              >
                <Navigation size={13} />
                Get Driving Directions
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
