// ==========================================
// routes/orders.js - Order Operations
// ==========================================
// Demonstrates: Multi-table INSERT (transaction-style), complex JOIN, AGGREGATION
//
// Tables involved:
//   orders      → one row per order (user_id FK, total_amount, status)
//   order_items → one row per product in the order (order_id FK, product_id FK)
//
// Relationship:
//   users 1──* orders 1──* order_items *──1 products

const express  = require('express');
const router   = express.Router();
const supabase = require('../db');

// ==========================================
// GET /api/orders/stats
// AGGREGATION: total revenue, number of orders, average order value
// NOTE: This route MUST be defined BEFORE /:id to avoid conflict
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    // Fetch all orders to perform aggregation in Node.js
    // Equivalent SQL:
    //   SELECT SUM(total_amount) AS total_revenue,
    //          COUNT(*) AS total_orders,
    //          AVG(total_amount) AS avg_order_value
    //   FROM orders;
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, status');

    if (error) throw error;

    // Perform aggregations
    const totalOrders   = data.length;
    const totalRevenue  = data.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Count by status
    const statusCount = data.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue:  totalRevenue.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        byStatus:      statusCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET /api/orders
// Fetch all orders with full details (complex multi-level JOIN)
// ==========================================
router.get('/', async (req, res) => {
  try {
    // MULTI-LEVEL JOIN:
    //   orders → users (get customer name/email)
    //   orders → order_items → products (get product name for each item)
    //
    // Equivalent SQL (simplified):
    //   SELECT o.*, u.name, u.email,
    //          oi.quantity, oi.unit_price, p.name AS product_name
    //   FROM orders o
    //   JOIN users u ON o.user_id = u.id
    //   JOIN order_items oi ON oi.order_id = o.id
    //   JOIN products p ON oi.product_id = p.id
    //   ORDER BY o.created_at DESC;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        users (
          id,
          name,
          email,
          phone
        ),
        order_items (
          id,
          quantity,
          unit_price,
          products (
            id,
            name,
            price
          )
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
// GET /api/orders/:id
// Get a single order by ID with full details
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, total_amount, status, created_at,
        users (id, name, email, phone),
        order_items (
          id, quantity, unit_price,
          products (id, name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Order not found' });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// POST /api/orders
// Place a new order (multi-step INSERT)
// ==========================================
// Request body:
// {
//   "user_id": 1,
//   "items": [
//     { "product_id": 1, "quantity": 2, "unit_price": 299.99 },
//     { "product_id": 3, "quantity": 1, "unit_price": 499.00 }
//   ]
// }
router.post('/', async (req, res) => {
  try {
    const { user_id, items } = req.body;

    // Validation
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required and must not be empty' });
    }
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.unit_price) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have product_id, quantity, and unit_price'
        });
      }
    }

    // STEP 1: Calculate total order amount (AGGREGATION before insert)
    const total_amount = items.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)),
      0
    );

    // STEP 2: INSERT into orders table
    // Equivalent SQL:
    //   INSERT INTO orders (user_id, total_amount, status)
    //   VALUES (:user_id, :total_amount, 'pending') RETURNING *;
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{ user_id: Number(user_id), total_amount, status: 'pending' }])
      .select();

    if (orderError) throw orderError;

    const order_id = orderData[0].id;

    // STEP 3: INSERT all order_items linked to the new order
    // Maps each item in the request to a row in order_items table
    // Equivalent SQL:
    //   INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    //   VALUES (:order_id, :product_id, :qty, :price), ...;
    const orderItems = items.map(item => ({
      order_id,
      product_id: Number(item.product_id),
      quantity:   Number(item.quantity),
      unit_price: Number(item.unit_price)
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) {
      // If items insert fails, ideally we'd rollback the order.
      // Supabase Edge Functions or RPC would handle true transactions.
      throw itemsError;
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order:        orderData[0],
        order_items:  itemsData,
        total_amount: total_amount.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// PUT /api/orders/:id/status
// Update order status (e.g., pending → completed)
// ==========================================
router.put('/:id/status', async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Equivalent SQL:
    //   UPDATE orders SET status = :status WHERE id = :id RETURNING *;
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, message: `Order status updated to "${status}"`, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
