// ==========================================
// customer.js - Customer Page JavaScript
// ==========================================
// Customers can browse products and buy them.
// Buying reduces stock in the database via the backend API.
//
// READ → GET  /api/products
// BUY  → POST /api/products/:id/buy

// ---- Backend API base URL ----
const API_URL = 'http://localhost:5000/api';

// ==========================================
// ROLE CHECK — Redirect if not customer
// ==========================================
(function () {
  if (localStorage.getItem('userRole') !== 'customer') {
    window.location.href = 'login.html';
  }
})();

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showStatus(message, type = 'success') {
  const el = document.getElementById('status-msg');
  el.textContent = message;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function getStockBadge(stock) {
  if (stock === 0) return '<span class="badge badge-out-of-stock">Out of Stock</span>';
  if (stock < 5)   return '<span class="badge badge-low-stock">Low Stock</span>';
  return '<span class="badge badge-in-stock">Available</span>';
}

function logout() {
  localStorage.removeItem('userRole');
  window.location.href = 'login.html';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ==========================================
// READ — Load all products into a table
// ==========================================
async function loadProducts() {
  console.log('[loadProducts] Fetching product list...');
  try {
    const response = await fetch(`${API_URL}/products`);
    const result   = await response.json();
    if (!result.success) throw new Error(result.error);

    const tbody = document.getElementById('tbody-products');

    if (result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading">No products available.</td></tr>';
      return;
    }

    tbody.innerHTML = result.data.map(p => {
      const outOfStock = p.stock === 0;
      return `
        <tr>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>₹${parseFloat(p.price).toFixed(2)}</td>
          <td>${getStockBadge(p.stock)}</td>
          <td>
            <button class="btn btn-primary btn-sm" ${outOfStock ? 'disabled' : ''} onclick="buyNow('${p.id}', ${parseFloat(p.price)}, ${p.stock})">Buy Now</button>
          </td>
        </tr>
      `;
    }).join('');

    console.log('[loadProducts] Loaded', result.data.length, 'products');
  } catch (err) {
    console.error('[loadProducts] Error:', err.message);
    document.getElementById('tbody-products').innerHTML =
      `<tr><td colspan="4" class="loading" style="color:red">Error: ${err.message}</td></tr>`;
  }
}

// ==========================================
// BUY — Ask quantity, calculate total, update stock via PUT
// ==========================================
window.buyNow = async function (id, price, stock) {
  console.log('[buyNow] Called with id:', id, 'price:', price, 'stock:', stock);

  const qty = prompt("Enter quantity:");
  if (qty === null) return;

  const quantity = parseInt(qty);

  // Validate
  if (isNaN(quantity) || quantity <= 0) {
    showStatus('Please enter a valid quantity greater than 0.', 'error');
    return;
  }
  if (quantity > stock) {
    showStatus('Not enough stock. Only ' + stock + ' available.', 'error');
    return;
  }

  // Calculate total bill
  const total = quantity * price;

  // Update stock via PUT /api/products/:id
  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stock: stock - quantity })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    console.log('[buyNow] Stock updated successfully. New stock:', stock - quantity);
    showStatus(`Purchase successful! Total: ₹${total}`);
    loadProducts();

  } catch (err) {
    console.error('[buyNow] Error:', err.message);
    showStatus(`Purchase failed: ${err.message}`, 'error');
  }
};

// ==========================================
// INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});
