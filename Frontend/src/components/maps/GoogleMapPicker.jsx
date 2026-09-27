import React, { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import { MapPin, Navigation, AlertCircle } from "lucide-react";

const libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "260px",
  borderRadius: "var(--radius-md)",
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

export default function GoogleMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  initialAddress = "",
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const [detecting, setDetecting] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const currentPos = {
    lat: latitude ? Number(latitude) : defaultCenter.lat,
    lng: longitude ? Number(longitude) : defaultCenter.lng,
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const reverseGeocode = (lat, lng) => {
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            address: results[0].formatted_address,
          });
          return;
        }
        onLocationSelect({ latitude: lat, longitude: lng });
      });
    } else {
      onLocationSelect({ latitude: lat, longitude: lng });
    }
  };

  const handleMapClick = (e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    reverseGeocode(lat, lng);
  };

  const handleMarkerDragEnd = (e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    reverseGeocode(lat, lng);
  };

  const handlePlaceSelect = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (place && place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address || place.name || "";

      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(15);
      }

      onLocationSelect({
        latitude: lat,
        longitude: lng,
        address: formattedAddress,
      });
    }
  };

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

        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(16);
        }

        reverseGeocode(lat, lng);
      },
      (err) => {
        setDetecting(false);
        setGpsError("Unable to retrieve GPS coordinates: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <MapPin size={16} color="var(--primary)" />
          Pin Pickup / Facility Location
        </label>
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={detecting}
          className="btn btn-secondary btn-sm"
          style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
        >
          <Navigation size={13} color="var(--primary)" />
          {detecting ? "Locating..." : "Use Current GPS"}
        </button>
      </div>

      {gpsError && (
        <div style={{ color: "var(--danger)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <AlertCircle size={14} /> {gpsError}
        </div>
      )}

      {apiKey && isLoaded && !loadError ? (
        <div style={{ position: "relative" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <Autocomplete
              onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
              onPlaceChanged={handlePlaceSelect}
            >
              <input
                type="text"
                placeholder="Search location or landmark in Google Maps..."
                className="form-input"
                defaultValue={initialAddress}
                style={{ fontSize: "0.85rem", padding: "0.55rem 0.8rem" }}
              />
            </Autocomplete>
          </div>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentPos}
            zoom={14}
            onLoad={onMapLoad}
            onClick={handleMapClick}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            <Marker
              position={currentPos}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
              animation={window.google?.maps?.Animation?.DROP}
            />
          </GoogleMap>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem", textAlign: "right" }}>
            Tip: Click anywhere or drag the marker to adjust exact spot
          </div>
        </div>
      ) : (
        <div style={{
          background: "var(--bg-subtle)",
          border: "1px dashed var(--border)",
          padding: "1rem",
          borderRadius: "var(--radius-md)",
          fontSize: "0.825rem",
          color: "var(--text-muted)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <div>
            <strong>Interactive Map Status:</strong> {!apiKey ? (
              <span>Add your <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>Frontend/.env</code> to unlock visual Google Maps pin-dropping & Places search.</span>
            ) : loadError ? (
              <span style={{ color: "var(--danger)" }}>Failed to load Google Maps SDK. Please check your API key & billing restrictions in Google Cloud Console.</span>
            ) : (
              <span>Loading Google Maps...</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "1rem", color: "var(--text-main)", fontSize: "0.8rem" }}>
            <span>Lat: <strong>{currentPos.lat.toFixed(5)}</strong></span>
            <span>Lng: <strong>{currentPos.lng.toFixed(5)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
