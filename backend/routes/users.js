// ==========================================
// routes/users.js - User Operations
// ==========================================
// Demonstrates: SELECT, INSERT
//
// Users place orders. Each order has a user_id foreign key.

const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

// ==========================================
// GET /api/users
// Fetch all users
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Equivalent SQL:
    //   SELECT * FROM users ORDER BY created_at DESC;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/users/:id
// Get a single user with their orders
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // JOIN: user → their orders (and each order → its items → products)
    // Equivalent SQL:
    //   SELECT users.*, orders.*
    //   FROM users
    //   LEFT JOIN orders ON orders.user_id = users.id
    //   WHERE users.id = :id;
    const { data, error } = await supabase
      .from('users')
      .select('*, orders(id, total_amount, status, created_at)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// POST /api/users
// Register a new user (INSERT)
// ==========================================
// Request body: { name, email, phone, address }
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // INSERT new user
    // Equivalent SQL:
    //   INSERT INTO users (name, email, phone, address) VALUES (...) RETURNING *;
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, phone: phone || null, address: address || null }])
      .select();

    if (error) {
      // Handle duplicate email (unique constraint)
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }
      throw error;
    }

    res.status(201).json({ success: true, message: 'User registered successfully', data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
