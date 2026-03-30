// ==========================================
// admin.js - Admin Panel JavaScript
// ==========================================
// Handles all 4 CRUD operations for products:
//   CREATE → POST /api/products
//   READ   → GET  /api/products
//   UPDATE → PUT  /api/products/:id
//   DELETE → DELETE /api/products/:id

// ---- Backend API base URL ----
const API_URL = 'http://localhost:5000/api';

// ==========================================
// ROLE CHECK — Redirect if not admin
// ==========================================
(function () {
  if (localStorage.getItem('userRole') !== 'admin') {
    window.location.href = 'login.html';
  }
})();

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Show a success or error message at the top of the page
function showStatus(message, type = 'success') {
  const el = document.getElementById('status-msg');
  el.textContent = message;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// Return a colored badge based on stock level
// stock = 0  → "Out of Stock" (red)
// stock < 5  → "Low Stock"    (yellow)
// else       → "Available"    (green)
function getStockBadge(stock) {
  if (stock === 0) return '<span class="badge badge-out-of-stock">Out of Stock</span>';
  if (stock < 5)   return '<span class="badge badge-low-stock">Low Stock</span>';
  return '<span class="badge badge-in-stock">Available</span>';
}

// Clear localStorage and go back to login
function logout() {
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ==========================================
// READ — Load all products from the backend
// ==========================================
async function loadProducts() {
  console.log('[loadProducts] Fetching product list...');
  try {
    const response = await fetch(`${API_URL}/products`);
    const result   = await response.json();
    if (!result.success) throw new Error(result.error);

    const tbody = document.getElementById('tbody-products');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">No products found. Add one above!</td></tr>';
      return;
    }

    // Build one table row per product
    tbody.innerHTML = result.data.map(p => `
      <tr data-id="${p.id}">
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td class="cell-price">₹${parseFloat(p.price).toFixed(2)}</td>
        <td class="cell-stock">${p.stock}</td>
        <td>${getStockBadge(p.stock)}</td>
        <td class="cell-actions">
          <button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}', ${parseFloat(p.price)}, ${p.stock})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join('');

    console.log('[loadProducts] Loaded', result.data.length, 'products');
  } catch (err) {
    console.error('[loadProducts] Error:', err.message);
    document.getElementById('tbody-products').innerHTML =
      `<tr><td colspan="5" class="loading" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

// ==========================================
// CREATE — Add a new product
// ==========================================
document.getElementById('form-add-product').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name  = document.getElementById('prod-name').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value);

  // Validation
  if (!name)      { showStatus('Product name is required.', 'error'); return; }
  if (price <= 0) { showStatus('Price must be greater than 0.', 'error'); return; }
  if (stock < 0)  { showStatus('Stock cannot be negative.', 'error'); return; }

  try {
    // POST /api/products → INSERT into products table
    const response = await fetch(`${API_URL}/products`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, price, stock })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showStatus(`Product "${result.data.name}" added successfully!`);
    e.target.reset();    // Clear the form
    loadProducts();      // Refresh the table

  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
  }
});

// ==========================================
// DELETE — Remove a product
// ==========================================
window.deleteProduct = async function (id) {
  console.log('[deleteProduct] Called with id:', id);

  if (!confirm('Are you sure?')) return;

  try {
    const response = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    const result   = await response.json();
    if (!result.success) throw new Error(result.error);

    console.log('[deleteProduct] Product deleted, id:', id);
    showStatus('Product deleted successfully.');
    loadProducts();

  } catch (err) {
    console.error('[deleteProduct] Error:', err.message);
    showStatus(`Error: ${err.message}`, 'error');
  }
};

// ==========================================
// UPDATE — Inline editing inside the table
// ==========================================
window.editProduct = function (id, currentPrice, currentStock) {
  console.log('[editProduct] Inline edit for id:', id);

  // Find the row that contains this Edit button
  const rows = document.querySelectorAll('#tbody-products tr');
  let row = null;
  for (const r of rows) {
    const editBtn = r.querySelector('.btn-warning');
    if (editBtn && editBtn.getAttribute('onclick').includes(id)) {
      row = r;
      break;
    }
  }
  if (!row) return;

  const cells = row.querySelectorAll('td');

  // Save original HTML so Cancel can restore it
  const originalPrice  = cells[1].innerHTML;
  const originalStock  = cells[2].innerHTML;
  const originalStatus = cells[3].innerHTML;
  const originalActions = cells[4].innerHTML;

  // Replace Price cell with input
  cells[1].innerHTML = `<input type="number" class="inline-edit-input" id="inline-price-${id}" value="${currentPrice}" min="1" step="0.01">`;

  // Replace Stock cell with input
  cells[2].innerHTML = `<input type="number" class="inline-edit-input" id="inline-stock-${id}" value="${currentStock}" min="0">`;

  // Hide status badge while editing
  cells[3].innerHTML = '<span style="color:#999;font-style:italic">editing...</span>';

  // Replace action buttons with Save / Cancel
  cells[4].innerHTML =
    `<button class="btn btn-primary btn-sm" onclick="saveProduct('${id}')">Save</button> ` +
    `<button class="btn btn-outline btn-sm" onclick="cancelEdit('${id}')">Cancel</button>`;

  // Store original values on the row for cancel
  row.dataset.origPrice   = originalPrice;
  row.dataset.origStock   = originalStock;
  row.dataset.origStatus  = originalStatus;
  row.dataset.origActions = originalActions;

  // Auto-focus the price input
  document.getElementById(`inline-price-${id}`).focus();
};

// ==========================================
// SAVE — Read inline inputs and PUT to backend
// ==========================================
window.saveProduct = async function (id) {
  console.log('[saveProduct] Saving id:', id);

  const priceInput = document.getElementById(`inline-price-${id}`);
  const stockInput = document.getElementById(`inline-stock-${id}`);

  const price = parseFloat(priceInput.value);
  const stock = parseInt(stockInput.value);

  if (isNaN(price) || price <= 0) {
    showStatus('Price must be greater than 0.', 'error');
    priceInput.focus();
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showStatus('Stock cannot be negative.', 'error');
    stockInput.focus();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ price, stock })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    console.log('[saveProduct] Updated id:', id, 'price:', price, 'stock:', stock);
    showStatus('Product updated successfully!');
    loadProducts();

  } catch (err) {
    console.error('[saveProduct] Error:', err.message);
    showStatus(`Update error: ${err.message}`, 'error');
  }
};

// ==========================================
// CANCEL — Restore original cell content
// ==========================================
window.cancelEdit = function (id) {
  console.log('[cancelEdit] Cancelled edit for id:', id);

  const rows = document.querySelectorAll('#tbody-products tr');
  for (const row of rows) {
    if (row.dataset.origPrice !== undefined) {
      const cells = row.querySelectorAll('td');
      const saveBtn = cells[4] && cells[4].querySelector('.btn-primary');
      if (saveBtn && saveBtn.getAttribute('onclick').includes(id)) {
        cells[1].innerHTML = row.dataset.origPrice;
        cells[2].innerHTML = row.dataset.origStock;
        cells[3].innerHTML = row.dataset.origStatus;
        cells[4].innerHTML = row.dataset.origActions;
        delete row.dataset.origPrice;
        delete row.dataset.origStock;
        delete row.dataset.origStatus;
        delete row.dataset.origActions;
        break;
      }
    }
  }
};

// ==========================================
// FORM VALIDATION — Disable submit when fields are empty
// ==========================================
function setupFormValidation() {
  const btn    = document.getElementById('btn-add-product');
  const fields = ['prod-name', 'prod-price', 'prod-stock'];

  function check() {
    const allFilled = fields.every(id => document.getElementById(id).value.trim() !== '');
    btn.disabled = !allFilled;
  }

  fields.forEach(id => {
    document.getElementById(id).addEventListener('input', check);
  });
  check(); // Run once on page load
}

// ==========================================
// INITIALIZATION — Load data on page load
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupFormValidation();
});
