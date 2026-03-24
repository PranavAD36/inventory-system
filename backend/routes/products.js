// ==========================================
// routes/products.js - Product CRUD Operations
// ==========================================
// Demonstrates: INSERT, SELECT (with JOIN), UPDATE, DELETE, FILTER
//
// Database concept: JOIN
//   products table has category_id (foreign key) → categories table
//   Supabase auto-resolves FK joins using the select() syntax below.

const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

// ==========================================
// GET /api/products
// Fetch all products with their category name (JOIN)
// ==========================================
router.get('/', async (req, res) => {
  try {
    // JOIN: Select all product fields + the related category's id and name
    // Supabase uses the FK relationship to perform this join internally
    // Equivalent SQL:
    //   SELECT products.*, categories.id, categories.name
    //   FROM products
    //   LEFT JOIN categories ON products.category_id = categories.id
    //   ORDER BY products.created_at DESC;
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        stock_quantity,
        created_at,
        categories (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/products/filter
// Filter products by price range and optional category
// ==========================================
// Example: GET /api/products/filter?minPrice=100&maxPrice=500
// Example: GET /api/products/filter?minPrice=100&category=2
router.get('/filter', async (req, res) => {
  try {
    // Destructure query parameters, set sensible defaults
    const { minPrice = 0, maxPrice = 9999999, category_id } = req.query;

    // FILTER using .gte() → >= and .lte() → <=
    // Equivalent SQL:
    //   SELECT * FROM products
    //   WHERE price >= minPrice AND price <= maxPrice;
    let query = supabase
      .from('products')
      .select('*, categories(id, name)')
      .gte('price', Number(minPrice))   // WHERE price >= minPrice
      .lte('price', Number(maxPrice))   // AND price <= maxPrice
      .order('price', { ascending: true });

    // Optionally filter by category_id if provided
    if (category_id) {
      query = query.eq('category_id', Number(category_id)); // AND category_id = X
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, filters: { minPrice, maxPrice, category_id }, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/products/:id
// Get a single product by ID
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // .single() tells Supabase to return one object instead of an array
    // Equivalent SQL:
    //   SELECT products.*, categories.name
    //   FROM products LEFT JOIN categories ...
    //   WHERE products.id = :id LIMIT 1;
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('id', id)     // WHERE id = :id
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Product not found' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// POST /api/products
// Add a new product (INSERT)
// ==========================================
// Request body: { name, description, price, stock_quantity, category_id }
router.post('/', async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category_id } = req.body;

    // Validate required fields
    if (!name || price === undefined || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'name, price, and category_id are required'
      });
    }

    // INSERT new product into the database
    // .select() returns the newly created row (with auto-generated id, created_at)
    // Equivalent SQL:
    //   INSERT INTO products (name, description, price, stock_quantity, category_id)
    //   VALUES (...) RETURNING *;
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name,
        description: description || '',
        price: Number(price),
        stock_quantity: Number(stock_quantity) || 0,
        category_id: Number(category_id)
      }])
      .select('*, categories(id, name)');

    if (error) throw error;

    res.status(201).json({ success: true, message: 'Product added successfully', data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// PUT /api/products/:id
// Update an existing product (UPDATE)
// ==========================================
// Request body: any fields to update (name, description, price, stock_quantity, category_id)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category_id } = req.body;

    // Build update object with only the fields that were provided
    const updates = {};
    if (name          !== undefined) updates.name           = name;
    if (description   !== undefined) updates.description    = description;
    if (price         !== undefined) updates.price          = Number(price);
    if (stock_quantity !== undefined) updates.stock_quantity = Number(stock_quantity);
    if (category_id   !== undefined) updates.category_id   = Number(category_id);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // UPDATE the product WHERE id = :id
    // Equivalent SQL:
    //   UPDATE products SET name=..., price=... WHERE id = :id RETURNING *;
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)   // WHERE id = :id
      .select('*, categories(id, name)');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully', data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DELETE /api/products/:id
// Delete a product (DELETE)
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // DELETE product WHERE id = :id
    // Equivalent SQL:
    //   DELETE FROM products WHERE id = :id;
    const { error, count } = await supabase
      .from('products')
      .delete()
      .eq('id', id);   // WHERE id = :id

    if (error) throw error;

    res.json({ success: true, message: `Product with id=${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
