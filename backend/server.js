// ==========================================
// server.js - Main Express Server Entry Point
// ==========================================
// This is the starting point of the backend application.
// It sets up Express, registers middleware, and mounts route handlers.

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// ---- Import route modules ----
// Each route file handles a specific resource (products, categories, etc.)
const productRoutes  = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const userRoutes     = require('./routes/users');
const orderRoutes    = require('./routes/orders');

// ---- Initialize Express application ----
const app  = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

// cors() allows the frontend (running on a different port) to call this API
app.use(cors());

// express.json() parses incoming JSON request bodies (req.body)
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================
// All product-related endpoints: /api/products
app.use('/api/products',   productRoutes);

// All category-related endpoints: /api/categories
app.use('/api/categories', categoryRoutes);

// All user-related endpoints: /api/users
app.use('/api/users',      userRoutes);

// All order-related endpoints: /api/orders
app.use('/api/orders',     orderRoutes);

// ---- Health check route ----
app.get('/', (req, res) => {
  res.json({
    message: 'Inventory Management System API is running!',
    version: '1.0.0',
    endpoints: [
      'GET  /api/products',
      'POST /api/products',
      'PUT  /api/products/:id',
      'DELETE /api/products/:id',
      'GET  /api/products/filter?minPrice=X&maxPrice=Y',
      'GET  /api/categories',
      'POST /api/categories',
      'GET  /api/users',
      'POST /api/users',
      'GET  /api/orders',
      'POST /api/orders',
      'GET  /api/orders/stats'
    ]
  });
});

// ---- 404 handler for unknown routes ----
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.url} not found` });
});

// ---- Start the server ----
app.listen(PORT, () => {
  console.log(`\n==========================================`);
  console.log(` Inventory Management System - Backend`);
  console.log(`==========================================`);
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` API base URL:      http://localhost:${PORT}/api`);
  console.log(`==========================================\n`);
});
