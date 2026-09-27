import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { MapPin, Navigation, Search, AlertCircle, Loader2 } from "lucide-react";
import { defaultPinIcon } from "./leafletIcons";

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore default

// Helper component to handle map clicks & panning
function MapController({ position, onPositionChange }) {
  const map = useMap();

  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.flyTo(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return null;
}

export default function LeafletMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  initialAddress = "",
}) {
  const [position, setPosition] = useState(() => {
    if (latitude && longitude) {
      return [Number(latitude), Number(longitude)];
    }
    return DEFAULT_CENTER;
  });

  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    if (latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude))) {
      const newPos = [Number(latitude), Number(longitude)];
      if (Math.abs(position[0] - newPos[0]) > 0.0001 || Math.abs(position[1] - newPos[1]) > 0.0001) {
        setPosition(newPos);
      }
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (initialAddress && initialAddress !== searchQuery) {
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  // Attempt current position on first mount if coordinates not supplied
  useEffect(() => {
    if ((latitude == null || longitude == null) && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          reverseGeocode(lat, lng);
        },
        () => {},
        { timeout: 6000, maximumAge: 120000 }
      );
    }
  }, []);

  // Reverse geocoding via OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const addr = data.display_name || "";
      if (addr) setSearchQuery(addr);
      onLocationSelect({ latitude: lat, longitude: lng, address: addr });
    } catch (err) {
      onLocationSelect({ latitude: lat, longitude: lng });
    }
  };

  const handlePositionChange = (newPos) => {
    setPosition(newPos);
    reverseGeocode(newPos[0], newPos[1]);
  };

  // Search address via Nominatim
  const handleAddressSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setGpsError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        onLocationSelect({ latitude: lat, longitude: lng, address: data[0].display_name });
      } else {
        setGpsError("Address not found. Please click on the map to pin directly.");
      }
    } catch (err) {
      setGpsError("Failed to search address. Please pick on the map.");
    } finally {
      setSearching(false);
    }
  };

  // Device GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handlePositionChange([lat, lng]);
      },
      (err) => {
        setDetecting(false);
        setGpsError("Could not retrieve GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const markerEventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null) {
          const latlng = marker.getLatLng();
          handlePositionChange([latlng.lat, latlng.lng]);
        }
      },
    }),
    []
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <MapPin size={16} color="var(--primary)" />
          Pin Location on Map
        </label>
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={detecting}
          className="btn btn-secondary btn-sm"
          style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
        >
          <Navigation size={13} color="var(--primary)" />
          {detecting ? "Locating GPS..." : "Use Current GPS"}
        </button>
      </div>

      {/* Address Search Bar */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <input
          type="text"
          placeholder="Search street, area, or landmark..."
          className="form-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddressSearch(e)}
          style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
        />
        <button
          type="button"
          onClick={handleAddressSearch}
          disabled={searching}
          className="btn btn-secondary btn-sm"
          style={{ padding: "0 0.85rem" }}
          title="Search address"
        >
          {searching ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
        </button>
      </div>

      {gpsError && (
        <div style={{ color: "var(--danger)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <AlertCircle size={14} /> {gpsError}
        </div>
      )}

      {/* Leaflet Map */}
      <div style={{ height: "260px", width: "100%", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={position}
            draggable={true}
            eventHandlers={markerEventHandlers}
            icon={defaultPinIcon}
          />
          <MapController position={position} onPositionChange={handlePositionChange} />
        </MapContainer>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <span>Click map or drag the pin to adjust position</span>
        <span>Lat: <strong>{position[0].toFixed(4)}</strong>, Lng: <strong>{position[1].toFixed(4)}</strong></span>
      </div>
    </div>
  );
}
