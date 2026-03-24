// ==========================================
// routes/categories.js - Category Operations
// ==========================================
// Demonstrates: SELECT (basic), INSERT
//
// Categories are the "parent" table.
// Products have a category_id foreign key pointing here.

const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

// ==========================================
// GET /api/categories
// Fetch all categories
// ==========================================
router.get('/', async (req, res) => {
  try {
    // Simple SELECT: fetch all rows from categories table
    // Equivalent SQL:
    //   SELECT * FROM categories ORDER BY name ASC;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/categories/:id
// Fetch a single category along with its products
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // JOIN in reverse: category → its products
    // Equivalent SQL:
    //   SELECT categories.*, products.*
    //   FROM categories
    //   LEFT JOIN products ON products.category_id = categories.id
    //   WHERE categories.id = :id;
    const { data, error } = await supabase
      .from('categories')
      .select('*, products(id, name, price, stock_quantity)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Category not found' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// POST /api/categories
// Add a new category (INSERT)
// ==========================================
// Request body: { name, description }
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required field
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // INSERT into categories table
    // Equivalent SQL:
    //   INSERT INTO categories (name, description) VALUES (...) RETURNING *;
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: name.trim(), description: description || '' }])
      .select();

    if (error) {
      // Handle duplicate category name (unique constraint violation)
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Category name already exists' });
      }
      throw error;
    }

    res.status(201).json({ success: true, message: 'Category added successfully', data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
