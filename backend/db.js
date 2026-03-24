// ==========================================
// db.js - Supabase Database Connection
// ==========================================
// This file creates a single Supabase client instance
// and exports it so all route files can use the same connection.
// This pattern is called a "singleton" - one connection shared across the app.

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
require('dotenv').config();

// ---- Validate environment variables ----
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1); // Stop the server if credentials are missing
}

// ---- Create the Supabase client ----
// createClient(url, anonKey) initializes the connection to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('Supabase client initialized successfully.');

// Export so other files can use: const supabase = require('./db');
module.exports = supabase;
