import L from "leaflet";

export const createCustomIcon = (color = "#059669") => {
  return L.divIcon({
    className: "custom-leaflet-pin",
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        border: 2px solid #ffffff;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

export const defaultPinIcon = createCustomIcon("#059669");
export const recipientPinIcon = createCustomIcon("#2563eb");
export const volunteerPinIcon = createCustomIcon("#f59e0b");
