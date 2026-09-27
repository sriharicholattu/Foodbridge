# 🍲 FoodBridge — Smart Food Surplus Redistribution Platform

> An end-to-end web platform connecting restaurants, hotels, and event organizers with local NGOs, shelters, and volunteer drivers to eliminate food waste and fight hunger.

---

## 🌟 Key Features

- **🏨 Donor Dashboard**: Post surplus food in seconds with interactive Leaflet map pin placement, live GPS auto-detect, photo attachments, and real-time delivery tracking.
- **🏢 Recipient / NGO Portal**: Set recurring dietary needs, view high-compatibility food matches ranked by our **AI Matching Engine**, and claim donations via Self-Pickup or Volunteer Delivery.
- **🛵 Volunteer Delivery Hub**: Browse pending delivery requests, claim active orders, view pickup & drop-off locations, and launch turn-by-turn GPS navigation in Google Maps.
- **📊 Admin Control Tower**: Real-time citywide metrics, platform user directory, donation lifecycle audit table, and interactive city map visualizing all community nodes.
- **🗺️ Zero-Cost Interactive Maps**: Built with Leaflet.js and OpenStreetMap (100% free, zero credit card / zero API key required) plus one-click external driving direction links.

---

## 🧠 AI Matching Algorithm & Scoring Criteria

When a donation is posted or an NGO registers food requirements, the platform's heuristic matching engine evaluates all possible pairs and computes a **Match Fit Score (0 – 100%)**.

$$\text{Total Score} = \min(100.0, \, \text{Distance Score} + \text{Food Match Score} + \text{Logistics Score})$$

### 1. Geographical Proximity (Up to 50 Points — 50% Weight)
Using the spherical **Haversine Formula**, the system computes the real-world great-circle distance $d$ (in kilometers) between donor and recipient coordinates:

$$d = 2r \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)} \right)$$

$$\text{Distance Score} = \max\left(0, \, 50.0 - (d \times 1.5)\right)$$

- **0 km (Immediate neighbor)**: 50.0 points
- **5 km**: 42.5 points
- **10 km**: 35.0 points
- **20 km**: 20.0 points
- **> 33.3 km**: 0.0 points *(Coordinate missing defaults to 25.0 neutral baseline)*

### 2. Food Type & Dietary Fit (Up to 30 Points — 30% Weight)
- **Direct / Substring Match** (e.g., recipient requested *"Veg Meals"* and donor posted *"Veg Biriyani"*): **30.0 points**
- **Generic / Unspecified Needs**: **10.0 points** baseline

### 3. Logistics & Self-Pickup Capability (Up to 20 Points — 20% Weight)
- **NGO has vehicle & staff ready (`pickup_available: True`)**: **20.0 points** (Immediate turnaround without waiting for volunteer dispatch)
- **Requires volunteer driver**: **10.0 points** baseline

Matches with high compatibility are labeled **"AI Suggested"** and automatically surfaced to NGOs in order of score.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router 6, Axios, Lucide Icons, Leaflet & React-Leaflet |
| **Backend** | Python 3.11+, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, Psycopg2 |
| **Database** | PostgreSQL hosted on Supabase (with transaction pooling on port 6543) |
| **Maps & Routing** | OpenStreetMap, Leaflet.js, OpenStreetMap Nominatim Geocoding, Google Maps Navigation URLs |
| **Deployment** | Render (Flask API) & Vercel (React Client) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Free Supabase PostgreSQL database (or local PostgreSQL)

---

### 1. Backend Setup

```bash
# Navigate to Backend folder
cd Backend

# Create & activate a Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Configure `Backend/.env`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-SUPABASE-HOST]:6543/postgres
JWT_SECRET_KEY=supersecretkey-replace-in-production
FRONTEND_URL=http://localhost:5173
```

Run the backend server:
```bash
python run.py
# Server starts on http://localhost:5000
```

---

### 2. Frontend Setup

```bash
# Navigate to Frontend folder
cd Frontend

# Install node dependencies
npm install

# Create your .env file
cp .env.example .env
```

Configure `Frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Run the development server:
```bash
npm run dev
# App starts on http://localhost:5173
```

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user (donor, recipient, volunteer, admin) |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/donations/my` | Retrieve logged-in donor's donations |
| `POST` | `/api/donations` | Post new food donation batch |
| `GET` | `/api/matching/recipient` | List AI-suggested donations for recipient |
| `POST` | `/api/matching/<id>/respond` | Accept or reject an AI match |
| `POST` | `/api/matching/requirements` | Set NGO food preferences & pickup availability |
| `GET` | `/api/volunteers/available-deliveries` | List available deliveries (excluding self-pickups) |
| `POST` | `/api/volunteers/claim/<donation_id>` | Claim delivery as a volunteer |
| `PATCH` | `/api/volunteers/assignment/<id>/status`| Update delivery status (`picked_up`, `delivered`) |
| `GET` | `/api/admin/metrics` | Retrieve citywide metrics and audit log |

---

## 🔒 Security & Privacy

- All sensitive credentials and database connection strings are managed via environment variables and excluded via `.gitignore`.
- Passwords are hash-encrypted using `werkzeug.security` (PBKDF2 SHA-256).
- Role-based route authorization enforced via JWT claims (`@jwt_required()`).

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
