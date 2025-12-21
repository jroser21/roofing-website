// Premier Roofing - Backend API Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// Database Setup (SQLite)
// =============================================

const db = new Database(path.join(__dirname, 'roofing.db'));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    service TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    roof_area_sqft INTEGER,
    roof_squares REAL,
    num_facets INTEGER,
    predominant_pitch TEXT,
    complexity TEXT,
    waste_factor INTEGER,
    price_low INTEGER,
    price_mid INTEGER,
    price_high INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('Database initialized');

// =============================================
// Middleware
// =============================================

// CORS - Allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =============================================
// API Routes - Leads
// =============================================

// Submit a new lead (contact form)
app.post('/api/leads', (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, service, message } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and phone are required'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO leads (first_name, last_name, email, phone, address, service, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(first_name, last_name, email, phone, address || null, service || null, message || null);

    console.log(`New lead created: ID ${result.lastInsertRowid} - ${first_name} ${last_name}`);

    res.status(201).json({
      success: true,
      message: 'Lead submitted successfully',
      leadId: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit lead'
    });
  }
});

// Get all leads (for admin dashboard)
app.get('/api/leads', (req, res) => {
  try {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();

    res.json({
      success: true,
      count: leads.length,
      leads
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
});

// Get a single lead by ID
app.get('/api/leads/:id', (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead'
    });
  }
});

// Update lead status
app.put('/api/leads/:id', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'quoted', 'scheduled', 'completed', 'lost'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const stmt = db.prepare(`
      UPDATE leads
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead updated successfully'
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
});

// Delete a lead
app.delete('/api/leads/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead'
    });
  }
});

// =============================================
// API Routes - Estimates
// =============================================

// Save a roof estimate
app.post('/api/estimates', (req, res) => {
  try {
    const {
      address,
      latitude,
      longitude,
      roof_area_sqft,
      roof_squares,
      num_facets,
      predominant_pitch,
      complexity,
      waste_factor,
      price_low,
      price_mid,
      price_high
    } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const stmt = db.prepare(`
      INSERT INTO estimates (
        address, latitude, longitude, roof_area_sqft, roof_squares,
        num_facets, predominant_pitch, complexity, waste_factor,
        price_low, price_mid, price_high
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      address, latitude, longitude, roof_area_sqft, roof_squares,
      num_facets, predominant_pitch, complexity, waste_factor,
      price_low, price_mid, price_high
    );

    console.log(`New estimate saved: ID ${result.lastInsertRowid}`);

    res.status(201).json({
      success: true,
      message: 'Estimate saved successfully',
      estimateId: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Error saving estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save estimate'
    });
  }
});

// Get all estimates
app.get('/api/estimates', (req, res) => {
  try {
    const estimates = db.prepare('SELECT * FROM estimates ORDER BY created_at DESC').all();

    res.json({
      success: true,
      count: estimates.length,
      estimates
    });

  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch estimates'
    });
  }
});

// =============================================
// Dashboard Stats
// =============================================

app.get('/api/stats', (req, res) => {
  try {
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const newLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new'").get().count;
    const totalEstimates = db.prepare('SELECT COUNT(*) as count FROM estimates').get().count;

    const leadsByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
    `).all();

    const recentLeads = db.prepare(`
      SELECT id, name, email, service, status, created_at
      FROM leads
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      stats: {
        totalLeads,
        newLeads,
        totalEstimates,
        leadsByStatus,
        recentLeads
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

// =============================================
// Health Check
// =============================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// =============================================
// Start Server
// =============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Premier Roofing API Server              ║
║   Running on http://localhost:${PORT}        ║
╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close();
  process.exit(0);
});
