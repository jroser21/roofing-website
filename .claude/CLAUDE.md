# Premier Roofing Website

Business website for Premier Roofing Co. Features instant satellite-based roof estimates using Google Solar API and lead management.

## Commands

```bash
# Frontend (static files - use any local server)
npx serve .                    # Serve frontend on port 3000
python -m http.server 5500     # Alternative: serve on port 5500

# Backend
cd backend
npm install                    # Install dependencies
npm run dev                    # Start dev server with auto-reload (port 3000)
npm start                      # Start production server
```

## Tech Stack

- **Frontend**: Static HTML, CSS, JavaScript (no framework)
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **APIs**: Google Maps, Google Places Autocomplete, Google Solar API

## File Structure

```
roofing-website/
├── index.html          # Homepage with instant estimate tool
├── about.html          # About page
├── services.html       # Services page
├── gallery.html        # Project gallery
├── contact.html        # Contact form
├── admin.html          # Admin dashboard (lead management)
├── styles.css          # All styles
├── script.js           # Frontend JS (Google APIs, forms, estimate logic)
├── images/             # Static images
└── backend/
    ├── server.js       # Express API server
    ├── roofing.db      # SQLite database
    ├── package.json
    └── .env.example
```

## Database Schema

### leads
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| first_name | TEXT | Customer first name |
| last_name | TEXT | Customer last name |
| email | TEXT | Customer email |
| phone | TEXT | Customer phone |
| address | TEXT | Property address |
| service | TEXT | Service interested in |
| message | TEXT | Additional message |
| status | TEXT | Lead status (new, contacted, quoted, scheduled, completed, lost) |
| created_at | DATETIME | Submission timestamp |
| updated_at | DATETIME | Last update timestamp |

### estimates
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| address | TEXT | Property address |
| latitude | REAL | GPS latitude |
| longitude | REAL | GPS longitude |
| roof_area_sqft | INTEGER | Total roof area in sq ft |
| roof_squares | REAL | Roof squares (area / 100) |
| num_facets | INTEGER | Number of roof facets |
| predominant_pitch | TEXT | Main roof pitch |
| complexity | TEXT | Complexity rating |
| waste_factor | INTEGER | Material waste percentage |
| price_low | INTEGER | Low estimate (3-tab shingles) |
| price_mid | INTEGER | Mid estimate (architectural) |
| price_high | INTEGER | High estimate (premium) |
| created_at | DATETIME | Estimate timestamp |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/stats | Dashboard statistics |
| POST | /api/leads | Submit new lead |
| GET | /api/leads | Get all leads |
| GET | /api/leads/:id | Get single lead |
| PUT | /api/leads/:id | Update lead status |
| DELETE | /api/leads/:id | Delete lead |
| POST | /api/estimates | Save estimate |
| GET | /api/estimates | Get all estimates |

## Environment Variables

Required in `backend/.env`:
```
PORT=3000
FRONTEND_URL=http://localhost:5500
```

## Key Features

### Instant Roof Estimate
- User enters address via Google Places Autocomplete
- Google Solar API provides satellite roof measurements
- Calculates price estimates based on roof squares and complexity
- Three pricing tiers: 3-tab, architectural, premium shingles

### Pricing Configuration (script.js)
```javascript
PRICE_PER_SQUARE_LOW = 465   // 3-Tab shingles
PRICE_PER_SQUARE_MID = 550   // Architectural shingles
PRICE_PER_SQUARE_HIGH = 750  // Designer/Premium shingles
```

### Lead Management
- Contact form submissions stored in SQLite
- Admin dashboard for viewing/managing leads
- Status workflow: new → contacted → quoted → scheduled → completed/lost

## Development Notes

- Frontend expects backend on port 3000, frontend on port 5500 (configurable)
- Google API key is in script.js (line 6) - replace for production
- CORS configured to allow frontend URL specified in .env

## Known Issues / Learnings

(Add issues and solutions here as they arise)
