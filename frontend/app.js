// ==========================================
// app.js - Frontend JavaScript
// ==========================================
// This file handles all communication between the UI and the backend API.
// It uses fetch() with async/await to call REST endpoints.
//
// Pattern used:
//   1. Send HTTP request to backend
//   2. Backend queries Supabase (PostgreSQL)
//   3. Response returned as JSON
//   4. We update the HTML table / form accordingly

// ---- Base URL of the backend API ----
// Change this if your backend runs on a different port
const API_URL = 'http://localhost:5000/api';

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * showStatus() - Display a success or error message to the user
 * @param {string} message - The message text
 * @param {string} type    - 'success' or 'error'
 */
function showStatus(message, type = 'success') {
  const el = document.getElementById('status-msg');
  el.textContent = message;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  // Auto-hide after 4 seconds
  setTimeout(() => el.classList.add('hidden'), 4000);
}

/**
 * showTab() - Show the selected tab and hide others
 * Called by the tab navigation buttons in index.html
 */
function showTab(tabName) {
  // Hide all tab content sections
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  // Remove 'active' class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  // Show the selected tab
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Mark the clicked button as active
  event.target.classList.add('active');

  // Load data for the activated tab
  if (tabName === 'products')   loadProducts();
  if (tabName === 'categories') loadCategories();
  if (tabName === 'users')      loadUsers();
  if (tabName === 'orders')     loadOrders();
  if (tabName === 'stats')      loadStats();
}

/**
 * formatDate() - Format ISO date string to readable format
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ==========================================
// PRODUCTS
// ==========================================

/**
 * loadProducts() - Fetch all products from the backend (GET with JOIN)
 * Updates the products table in the UI
 */
async function loadProducts() {
  try {
    // GET /api/products → returns products with their category name (JOIN)
    const response = await fetch(`${API_URL}/products`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const tbody = document.getElementById('tbody-products');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">No products found. Add one above.</td></tr>';
      return;
    }

    // Build table rows from the returned data
    tbody.innerHTML = result.data.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><strong>${p.name}</strong><br><small style="color:#888">${p.description || ''}</small></td>
        <td>${p.categories ? p.categories.name : '—'}</td>
        <td>₹${parseFloat(p.price).toFixed(2)}</td>
        <td>${p.stock_quantity}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="openEditModal(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Delete</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    document.getElementById('tbody-products').innerHTML =
      `<tr><td colspan="6" class="loading" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

/**
 * filterProducts() - Filter products by price range (uses FILTER API)
 */
async function filterProducts() {
  try {
    const minPrice   = document.getElementById('filter-min').value || 0;
    const maxPrice   = document.getElementById('filter-max').value || 9999999;
    const categoryId = document.getElementById('filter-category').value;

    // Build query string
    let url = `${API_URL}/products/filter?minPrice=${minPrice}&maxPrice=${maxPrice}`;
    if (categoryId) url += `&category_id=${categoryId}`;

    // GET /api/products/filter?minPrice=X&maxPrice=Y
    const response = await fetch(url);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const tbody = document.getElementById('tbody-products');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">No products match your filter.</td></tr>';
      showStatus(`Filter applied — 0 products found`, 'error');
      return;
    }

    tbody.innerHTML = result.data.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><strong>${p.name}</strong><br><small style="color:#888">${p.description || ''}</small></td>
        <td>${p.categories ? p.categories.name : '—'}</td>
        <td>₹${parseFloat(p.price).toFixed(2)}</td>
        <td>${p.stock_quantity}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="openEditModal(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Delete</button>
        </td>
      </tr>
    `).join('');

    showStatus(`Filter applied — ${result.data.length} product(s) found`);
  } catch (err) {
    showStatus(`Filter error: ${err.message}`, 'error');
  }
}

/**
 * Handle Add Product form submission (POST)
 */
document.getElementById('form-add-product').addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevent page reload

  const product = {
    name:           document.getElementById('prod-name').value.trim(),
    description:    document.getElementById('prod-desc').value.trim(),
    price:          parseFloat(document.getElementById('prod-price').value),
    stock_quantity: parseInt(document.getElementById('prod-stock').value) || 0,
    category_id:    parseInt(document.getElementById('prod-category').value)
  };

  try {
    // POST /api/products with product data in the request body
    const response = await fetch(`${API_URL}/products`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' }, // Tell server we're sending JSON
      body:    JSON.stringify(product)                   // Convert JS object to JSON string
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Product "${result.data.name}" added successfully!`);
    e.target.reset(); // Clear the form
    loadProducts();   // Refresh the table

  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
});

/**
 * deleteProduct() - Delete a product by ID (DELETE)
 */
async function deleteProduct(id, name) {
  // Confirm before deleting (good UX practice)
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    // DELETE /api/products/:id
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Product "${name}" deleted successfully.`);
    loadProducts(); // Refresh table

  } catch (err) {
    showStatus(`Error deleting product: ${err.message}`, 'error');
  }
}

/**
 * openEditModal() - Fetch product data and show the edit modal
 */
async function openEditModal(id) {
  try {
    // GET /api/products/:id to pre-fill the form
    const response = await fetch(`${API_URL}/products/${id}`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const p = result.data;

    // Fill in the modal form fields
    document.getElementById('edit-prod-id').value       = p.id;
    document.getElementById('edit-prod-name').value     = p.name;
    document.getElementById('edit-prod-desc').value     = p.description || '';
    document.getElementById('edit-prod-price').value    = p.price;
    document.getElementById('edit-prod-stock').value    = p.stock_quantity;

    // Populate category dropdown and select current
    await populateCategoryDropdown('edit-prod-category');
    document.getElementById('edit-prod-category').value = p.categories ? p.categories.id : '';

    // Show the modal
    document.getElementById('modal-edit').classList.remove('hidden');

  } catch (err) {
    showStatus(`Error loading product: ${err.message}`, 'error');
  }
}

/**
 * Handle Edit Product form submission (PUT)
 */
document.getElementById('form-edit-product').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('edit-prod-id').value;

  const updates = {
    name:           document.getElementById('edit-prod-name').value.trim(),
    description:    document.getElementById('edit-prod-desc').value.trim(),
    price:          parseFloat(document.getElementById('edit-prod-price').value),
    stock_quantity: parseInt(document.getElementById('edit-prod-stock').value),
    category_id:    parseInt(document.getElementById('edit-prod-category').value)
  };

  try {
    // PUT /api/products/:id with updated data
    const response = await fetch(`${API_URL}/products/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates)
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Product updated successfully!`);
    closeModal();
    loadProducts(); // Refresh table

  } catch (err) {
    showStatus(`Update error: ${err.message}`, 'error');
  }
});

/**
 * closeModal() - Hide the edit product modal
 */
function closeModal() {
  document.getElementById('modal-edit').classList.add('hidden');
}

// Close modal when clicking outside the modal box
document.getElementById('modal-edit').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ==========================================
// CATEGORIES
// ==========================================

/**
 * loadCategories() - Fetch all categories (GET)
 */
async function loadCategories() {
  try {
    // GET /api/categories
    const response = await fetch(`${API_URL}/categories`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const tbody = document.getElementById('tbody-categories');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="loading">No categories found. Add one!</td></tr>';
      return;
    }

    tbody.innerHTML = result.data.map(c => `
      <tr>
        <td>${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.description || '—'}</td>
      </tr>
    `).join('');

    // Also update the category dropdowns in product forms
    await populateCategoryDropdown('prod-category');
    await populateCategoryDropdown('filter-category', true);

  } catch (err) {
    document.getElementById('tbody-categories').innerHTML =
      `<tr><td colspan="3" class="loading" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

/**
 * populateCategoryDropdown() - Fill a <select> with category options
 * @param {string} selectId   - The id of the <select> element
 * @param {boolean} addAll    - Whether to add an "All Categories" option at the top
 */
async function populateCategoryDropdown(selectId, addAll = false) {
  try {
    const response = await fetch(`${API_URL}/categories`);
    const result   = await response.json();

    if (!result.success) return;

    const select = document.getElementById(selectId);
    const current = select.value; // Preserve current selection

    select.innerHTML = addAll
      ? '<option value="">All Categories</option>'
      : '<option value="">-- Select Category --</option>';

    result.data.forEach(cat => {
      const opt = document.createElement('option');
      opt.value       = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });

    if (current) select.value = current; // Restore selection

  } catch (err) {
    console.error('Could not load categories:', err.message);
  }
}

/**
 * Handle Add Category form submission (POST)
 */
document.getElementById('form-add-category').addEventListener('submit', async (e) => {
  e.preventDefault();

  const category = {
    name:        document.getElementById('cat-name').value.trim(),
    description: document.getElementById('cat-desc').value.trim()
  };

  try {
    // POST /api/categories
    const response = await fetch(`${API_URL}/categories`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(category)
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Category "${result.data.name}" added!`);
    e.target.reset();
    loadCategories(); // Refresh table and dropdowns

  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
});

// ==========================================
// USERS
// ==========================================

/**
 * loadUsers() - Fetch all users (GET)
 */
async function loadUsers() {
  try {
    // GET /api/users
    const response = await fetch(`${API_URL}/users`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const tbody = document.getElementById('tbody-users');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">No users found. Register one!</td></tr>';
      return;
    }

    tbody.innerHTML = result.data.map(u => `
      <tr>
        <td>${u.id}</td>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${u.phone || '—'}</td>
      </tr>
    `).join('');

    // Also populate the user dropdown in the Orders tab
    await populateUserDropdown();

  } catch (err) {
    document.getElementById('tbody-users').innerHTML =
      `<tr><td colspan="4" class="loading" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

/**
 * populateUserDropdown() - Fill the order user <select>
 */
async function populateUserDropdown() {
  try {
    const response = await fetch(`${API_URL}/users`);
    const result   = await response.json();
    if (!result.success) return;

    const select = document.getElementById('order-user');
    select.innerHTML = '<option value="">-- Select User --</option>';
    result.data.forEach(u => {
      const opt = document.createElement('option');
      opt.value       = u.id;
      opt.textContent = `${u.name} (${u.email})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Could not load users:', err);
  }
}

/**
 * Handle Add User form submission (POST)
 */
document.getElementById('form-add-user').addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = {
    name:    document.getElementById('user-name').value.trim(),
    email:   document.getElementById('user-email').value.trim(),
    phone:   document.getElementById('user-phone').value.trim(),
    address: document.getElementById('user-address').value.trim()
  };

  try {
    // POST /api/users
    const response = await fetch(`${API_URL}/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(user)
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`User "${result.data.name}" registered!`);
    e.target.reset();
    loadUsers();

  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
});

// ==========================================
// ORDERS
// ==========================================

// Store products data for order item dropdowns
let productsCache = [];

/**
 * loadProductsCache() - Load products into memory for the order form dropdowns
 */
async function loadProductsCache() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const result   = await response.json();
    if (result.success) productsCache = result.data;
  } catch (err) {
    console.error('Could not cache products:', err);
  }
}

/**
 * addOrderItemRow() - Add a new product row to the order form
 */
function addOrderItemRow() {
  const container = document.getElementById('order-items-list');

  const rowDiv = document.createElement('div');
  rowDiv.className = 'order-item-row';

  // Build product options from cache
  const options = productsCache.map(p =>
    `<option value="${p.id}" data-price="${p.price}">${p.name} — ₹${parseFloat(p.price).toFixed(2)}</option>`
  ).join('');

  rowDiv.innerHTML = `
    <select onchange="updateOrderTotal()" class="order-product-select">
      <option value="">-- Product --</option>
      ${options}
    </select>
    <input type="number" placeholder="Qty" min="1" value="1" class="order-qty" onchange="updateOrderTotal()" />
    <input type="number" placeholder="Unit Price" min="0" step="0.01" class="order-price" readonly />
    <button class="remove-btn" onclick="this.parentElement.remove(); updateOrderTotal()">✕</button>
  `;

  // Auto-fill unit price when a product is selected
  rowDiv.querySelector('.order-product-select').addEventListener('change', function() {
    const selected = this.options[this.selectedIndex];
    const price    = selected.getAttribute('data-price') || '';
    rowDiv.querySelector('.order-price').value = price ? parseFloat(price).toFixed(2) : '';
    updateOrderTotal();
  });

  container.appendChild(rowDiv);
}

/**
 * updateOrderTotal() - Recalculate and display the order total
 */
function updateOrderTotal() {
  const rows  = document.querySelectorAll('.order-item-row');
  let   total = 0;

  rows.forEach(row => {
    const qty   = parseFloat(row.querySelector('.order-qty').value)   || 0;
    const price = parseFloat(row.querySelector('.order-price').value) || 0;
    total += qty * price;
  });

  document.getElementById('order-total').textContent = total.toFixed(2);
}

/**
 * placeOrder() - Collect order form data and POST to backend
 */
async function placeOrder() {
  const userId = document.getElementById('order-user').value;

  if (!userId) {
    showStatus('Please select a user for the order.', 'error');
    return;
  }

  // Collect all item rows
  const rows = document.querySelectorAll('.order-item-row');
  const items = [];

  for (const row of rows) {
    const productId = row.querySelector('.order-product-select').value;
    const quantity  = parseInt(row.querySelector('.order-qty').value);
    const unitPrice = parseFloat(row.querySelector('.order-price').value);

    if (!productId || !quantity || !unitPrice) {
      showStatus('Please fill in all order item fields.', 'error');
      return;
    }

    items.push({ product_id: productId, quantity, unit_price: unitPrice });
  }

  if (items.length === 0) {
    showStatus('Please add at least one item to the order.', 'error');
    return;
  }

  try {
    // POST /api/orders → backend inserts into orders + order_items tables
    const response = await fetch(`${API_URL}/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, items })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Order #${result.data.order.id} placed! Total: ₹${result.data.total_amount}`);

    // Clear order form
    document.getElementById('order-items-list').innerHTML = '';
    document.getElementById('order-total').textContent = '0.00';
    document.getElementById('order-user').value = '';

    loadOrders(); // Refresh orders table

  } catch (err) {
    showStatus(`Order error: ${err.message}`, 'error');
  }
}

/**
 * loadOrders() - Fetch all orders with user and product JOIN
 */
async function loadOrders() {
  try {
    // GET /api/orders → returns orders with users and order_items with products (multi JOIN)
    const response = await fetch(`${API_URL}/orders`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    // Also refresh user dropdown
    await populateUserDropdown();
    await loadProductsCache();

    // Ensure at least one item row exists in order form
    if (document.getElementById('order-items-list').children.length === 0) {
      addOrderItemRow();
    }

    const tbody = document.getElementById('tbody-orders');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">No orders yet. Place one above.</td></tr>';
      return;
    }

    tbody.innerHTML = result.data.map(o => {
      // Build item list display
      const itemsHtml = o.order_items && o.order_items.length > 0
        ? `<ul class="items-list">${o.order_items.map(i =>
            `<li>${i.products ? i.products.name : `Product #${i.product_id}`} × ${i.quantity} @ ₹${parseFloat(i.unit_price).toFixed(2)}</li>`
          ).join('')}</ul>`
        : '—';

      const statusBadge = `<span class="badge badge-${o.status}">${o.status}</span>`;

      return `
        <tr>
          <td><strong>#${o.id}</strong></td>
          <td>${o.users ? o.users.name : '—'}<br><small style="color:#888">${o.users ? o.users.email : ''}</small></td>
          <td>${itemsHtml}</td>
          <td><strong>₹${parseFloat(o.total_amount).toFixed(2)}</strong></td>
          <td>${statusBadge}</td>
          <td>${formatDate(o.created_at)}</td>
          <td>
            <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:5px;font-size:0.82rem;border:1px solid #ddd;border-radius:4px">
              ${['pending','processing','shipped','completed','cancelled']
                  .map(s => `<option ${o.status === s ? 'selected' : ''} value="${s}">${s}</option>`)
                  .join('')}
            </select>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    document.getElementById('tbody-orders').innerHTML =
      `<tr><td colspan="7" class="loading" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

/**
 * updateOrderStatus() - Change the status of an order (PUT)
 */
async function updateOrderStatus(orderId, newStatus) {
  try {
    // PUT /api/orders/:id/status
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Order #${orderId} status updated to "${newStatus}"`);
    loadOrders();

  } catch (err) {
    showStatus(`Error updating status: ${err.message}`, 'error');
  }
}

// ==========================================
// STATISTICS (AGGREGATION)
// ==========================================

/**
 * loadStats() - Fetch aggregated order statistics
 */
async function loadStats() {
  try {
    // GET /api/orders/stats → returns SUM, COUNT, AVG aggregations
    const response = await fetch(`${API_URL}/orders/stats`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const d = result.data;

    document.getElementById('stat-orders').textContent  = d.totalOrders;
    document.getElementById('stat-revenue').textContent = `₹${d.totalRevenue}`;
    document.getElementById('stat-avg').textContent     = `₹${d.avgOrderValue}`;

    // Display status breakdown
    const statusBreakdown = Object.entries(d.byStatus || {})
      .map(([status, count]) => `${status}: <strong>${count}</strong>`)
      .join(' &nbsp;|&nbsp; ') || '—';

    document.getElementById('stat-status').innerHTML = statusBreakdown;

  } catch (err) {
    showStatus(`Error loading stats: ${err.message}`, 'error');
  }
}

// ==========================================
// INITIALIZATION
// ==========================================
// When the page loads, fetch initial data for the Products tab
// (which is the default active tab)

window.addEventListener('DOMContentLoaded', async () => {
  // Load data for the default visible tab (Products)
  await loadProducts();

  // Load categories to populate the dropdown in the Add Product form
  await loadCategories();

  // Cache products and populate user dropdown for the Orders form
  await loadProductsCache();
  await populateUserDropdown();

  // Add the first order item row by default
  addOrderItemRow();
});
