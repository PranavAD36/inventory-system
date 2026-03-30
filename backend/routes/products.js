// ==========================================
// routes/products.js - Product CRUD Operations
// ==========================================
// Demonstrates all 4 CRUD operations:
//   CREATE → POST   /api/products
//   READ   → GET    /api/products
//   UPDATE → PUT    /api/products/:id
//   DELETE → DELETE /api/products/:id

const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

// ==========================================
// GET /api/products — Read all products
// ==========================================
// Equivalent SQL: SELECT * FROM products ORDER BY created_at DESC;
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, created_at')
      .order('created_at', { ascending: false });

    console.log('[GET /products] Fetched', data?.length, 'products');

    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/products/filter — Filter by price range
// ==========================================
// Example: GET /api/products/filter?minPrice=100&maxPrice=500
router.get('/filter', async (req, res) => {
  try {
    const { minPrice = 0, maxPrice = 9999999 } = req.query;

    // Equivalent SQL: SELECT * FROM products WHERE price >= X AND price <= Y;
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, created_at')
      .gte('price', Number(minPrice))
      .lte('price', Number(maxPrice))
      .order('price', { ascending: true });

    if (error) throw error;

    res.json({ success: true, filters: { minPrice, maxPrice }, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/products/:id — Get single product
// ==========================================
// Equivalent SQL: SELECT * FROM products WHERE id = :id LIMIT 1;
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Product not found' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// POST /api/products — Add new product (INSERT)
// ==========================================
// Request body: { name, price, stock }
router.post('/', async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    // Validate required fields
    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'name and price are required'
      });
    }

    console.log('[POST /products] Inserting product:', name);

    // Equivalent SQL: INSERT INTO products (name, price, stock) VALUES (...) RETURNING *;
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name,
        price: Number(price),
        stock: Number(stock) || 0
      }])
      .select('id, name, price, stock, created_at');

    if (error) throw error;

    res.status(201).json({ success: true, message: 'Product added successfully', data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// PUT /api/products/:id — Update product (UPDATE)
// ==========================================
// Request body: any fields to update (name, price, stock)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock } = req.body;

    // Build update object with only the fields that were provided
    const updates = {};
    if (name  !== undefined) updates.name  = name;
    if (price !== undefined) updates.price = Number(price);
    if (stock !== undefined) updates.stock = Number(stock);

    console.log('[PUT /products/:id] Updating product id:', id);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Equivalent SQL: UPDATE products SET name=..., price=... WHERE id = :id RETURNING *;
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('id, name, price, stock, created_at');

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
// POST /api/products/:id/buy — Buy a product (reduce stock)
// ==========================================
// Request body: { quantity }
// Validates stock availability before updating
router.post('/:id/buy', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    // Validate quantity
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be greater than 0' });
    }

    // First, fetch current stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    // Check if enough stock is available
    if (quantity > product.stock) {
      return res.status(400).json({ success: false, error: 'Not enough stock' });
    }

    // Calculate new stock and update
    const newStock = product.stock - quantity;

    // Equivalent SQL: UPDATE products SET stock = newStock WHERE id = :id RETURNING *;
    const { data, error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)
      .select('id, name, price, stock, created_at');

    if (error) throw error;

    console.log(`[BUY] ${product.name} x${quantity} — stock: ${product.stock} → ${newStock}`);

    res.json({ success: true, message: `Purchased ${quantity} x "${product.name}"`, data: data[0] });
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
