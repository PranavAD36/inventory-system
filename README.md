# Inventory Management System (E-Commerce Style)

**DBMS College Project** | Stack: Node.js + Express + Supabase (PostgreSQL) + HTML/CSS/Vanilla JS

---

## Project Structure

```
db-project/
├── backend/
│   ├── server.js              ← Express server entry point
│   ├── db.js                  ← Supabase client connection
│   ├── .env                   ← Environment variables (your credentials)
│   ├── .env.example           ← Template for .env
│   ├── package.json
│   └── routes/
│       ├── products.js        ← CRUD + JOIN + FILTER
│       ├── categories.js      ← CRUD
│       ├── users.js           ← CRUD
│       └── orders.js          ← Multi-table INSERT + JOIN + AGGREGATION
└── frontend/
    ├── index.html             ← Main UI (tabs: Products, Categories, Users, Orders, Stats)
    ├── style.css              ← Simple clean styles
    └── app.js                 ← fetch() API calls with async/await
```

---

## Database Schema (Supabase / PostgreSQL)

Run these SQL statements in your Supabase project's **SQL Editor**:

```sql
-- ============================
-- 1. CATEGORIES TABLE
-- ============================
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- 2. PRODUCTS TABLE
-- FK: category_id → categories(id)
-- ============================
CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  description    TEXT,
  price          DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- 3. USERS TABLE
-- ============================
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  phone      VARCHAR(15),
  address    TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- 4. ORDERS TABLE
-- FK: user_id → users(id)
-- ============================
CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending','processing','shipped','completed','cancelled')),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- 5. ORDER_ITEMS TABLE
-- FK: order_id → orders(id), product_id → products(id)
-- ============================
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
);
```

### Entity-Relationship Summary

```
categories  1──*  products
users       1──*  orders
orders      1──*  order_items  *──1  products
```

---

## Supabase Setup

1. Go to [https://supabase.com](https://supabase.com) and sign in / create a free account.
2. Click **New Project**, fill in name and database password.
3. Once created, go to **Settings → API**.
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
5. In the **SQL Editor**, paste and run the schema above.
6. (Optional) Run the sample data inserts below.

---

## Sample Data Inserts

```sql
-- Insert categories
INSERT INTO categories (name, description) VALUES
  ('Electronics',  'Gadgets, devices, and accessories'),
  ('Clothing',     'Shirts, pants, shoes, and more'),
  ('Books',        'Textbooks, fiction, and non-fiction'),
  ('Home & Kitchen', 'Appliances and home essentials'),
  ('Sports',       'Equipment and sportswear');

-- Insert products
INSERT INTO products (name, description, price, stock_quantity, category_id) VALUES
  ('Wireless Mouse',        'Ergonomic 2.4GHz wireless mouse',    499.00,  120, 1),
  ('Mechanical Keyboard',   'RGB backlit mechanical keyboard',    1299.00,  60, 1),
  ('Cotton T-Shirt',        'Soft 100% cotton round-neck tee',    299.00,  250, 2),
  ('Denim Jeans',           'Slim fit blue denim jeans',          899.00,  150, 2),
  ('DBMS Textbook',         'Database Management Systems by Ramakrishnan', 650.00, 80, 3),
  ('Data Structures Book',  'DSA in C++ by Mark Allen Weiss',    745.00,  65, 3),
  ('Electric Kettle',       '1500W fast boil electric kettle',    799.00,  90, 4),
  ('Yoga Mat',              '6mm thick anti-slip yoga mat',       549.00,  200, 5),
  ('Badminton Racket',      'Lightweight carbon fibre racket',   1199.00,  45, 5),
  ('USB-C Hub',             '7-in-1 USB-C multiport adapter',    1499.00,  35, 1);

-- Insert users
INSERT INTO users (name, email, phone, address) VALUES
  ('Rahul Sharma',   'rahul.sharma@example.com',   '9876543210', 'Mumbai, Maharashtra'),
  ('Priya Patel',    'priya.patel@example.com',    '9823456789', 'Ahmedabad, Gujarat'),
  ('Arjun Verma',    'arjun.verma@example.com',    '9812345678', 'Delhi, India'),
  ('Sneha Reddy',    'sneha.reddy@example.com',    '9745678901', 'Hyderabad, Telangana'),
  ('Amit Joshi',     'amit.joshi@example.com',     '9867890123', 'Pune, Maharashtra');

-- Insert a sample order for user 1
INSERT INTO orders (user_id, total_amount, status) VALUES (1, 1798.00, 'completed');
-- order_items for order 1 (get order id — usually 1)
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 2, 499.00),   -- 2x Wireless Mouse
  (1, 5, 1, 800.00);   -- 1x DBMS Textbook (demo price difference)

-- Insert another order for user 2
INSERT INTO orders (user_id, total_amount, status) VALUES (2, 1299.00, 'shipped');
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (2, 2, 1, 1299.00);  -- 1x Mechanical Keyboard
```

---

## Step-by-Step: How to Run the Project

### Prerequisites

- **Node.js** v18 or higher: [https://nodejs.org](https://nodejs.org)
- A Supabase account (free tier is enough)

### Step 1 — Configure environment variables

```bash
cd db-project/backend
```

Open `.env` and replace the placeholder values:

```
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
PORT=5000
```

### Step 2 — Install backend dependencies

```bash
cd db-project/backend
npm install
```

This installs: `express`, `@supabase/supabase-js`, `cors`, `dotenv`.

### Step 3 — Start the backend server

```bash
npm start
```

You should see:

```
==========================================
 Inventory Management System - Backend
==========================================
 Server running at: http://localhost:5000
 API base URL:      http://localhost:5000/api
==========================================
```

> For development with auto-reload: `npm run dev` (uses nodemon)

### Step 4 — Open the frontend

Open `db-project/frontend/index.html` directly in your browser.

> Tip: Use the **Live Server** VS Code extension for a better experience.

---

## API Endpoints Reference

### Products

| Method | Endpoint                                     | Description                       | DB Operation           |
| ------ | -------------------------------------------- | --------------------------------- | ---------------------- |
| GET    | `/api/products`                              | All products with category (JOIN) | SELECT + JOIN          |
| GET    | `/api/products/:id`                          | Single product                    | SELECT WHERE           |
| GET    | `/api/products/filter?minPrice=X&maxPrice=Y` | Filter by price range             | SELECT WHERE + BETWEEN |
| POST   | `/api/products`                              | Add new product                   | INSERT                 |
| PUT    | `/api/products/:id`                          | Update product                    | UPDATE WHERE           |
| DELETE | `/api/products/:id`                          | Delete product                    | DELETE WHERE           |

### Categories

| Method | Endpoint              | Description                       |
| ------ | --------------------- | --------------------------------- |
| GET    | `/api/categories`     | All categories                    |
| GET    | `/api/categories/:id` | Category with its products (JOIN) |
| POST   | `/api/categories`     | Add category                      |

### Users

| Method | Endpoint         | Description                   |
| ------ | ---------------- | ----------------------------- |
| GET    | `/api/users`     | All users                     |
| GET    | `/api/users/:id` | User with their orders (JOIN) |
| POST   | `/api/users`     | Register user                 |

### Orders

| Method | Endpoint                 | Description                             | DB Operation       |
| ------ | ------------------------ | --------------------------------------- | ------------------ |
| GET    | `/api/orders`            | All orders with user + items + products | Multi-level JOIN   |
| GET    | `/api/orders/stats`      | Total revenue, count, average           | AGGREGATION        |
| GET    | `/api/orders/:id`        | Single order with details               | JOIN               |
| POST   | `/api/orders`            | Place new order                         | Multi-table INSERT |
| PUT    | `/api/orders/:id/status` | Update order status                     | UPDATE             |

---

## Example API Requests (using curl or Postman)

```bash
# Get all products
curl http://localhost:5000/api/products

# Get products filtered by price (₹100 - ₹800)
curl "http://localhost:5000/api/products/filter?minPrice=100&maxPrice=800"

# Add a new category
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Toys", "description": "Toys and games"}'

# Add a new product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"USB Cable","description":"Type-C 3m cable","price":199,"stock_quantity":200,"category_id":1}'

# Register a new user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Vikram Singh","email":"vikram@test.com","phone":"9000011111"}'

# Place an order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2, "unit_price": 499.00},
      {"product_id": 5, "quantity": 1, "unit_price": 650.00}
    ]
  }'

# Get order statistics (aggregation)
curl http://localhost:5000/api/orders/stats

# Update order status
curl -X PUT http://localhost:5000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Update a product
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 449, "stock_quantity": 100}'

# Delete a product
curl -X DELETE http://localhost:5000/api/products/10
```

---

## Key DBMS Concepts Demonstrated

| Concept                | Where Used                                                     | Example                                 |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------- |
| **PRIMARY KEY**        | All tables                                                     | `id SERIAL PRIMARY KEY`                 |
| **FOREIGN KEY**        | products→categories, orders→users, order_items→orders/products | `REFERENCES categories(id)`             |
| **JOIN**               | GET /api/products                                              | products + categories joined            |
| **Multi-level JOIN**   | GET /api/orders                                                | orders → users → order_items → products |
| **FILTER / WHERE**     | GET /api/products/filter                                       | `price >= X AND price <= Y`             |
| **INSERT**             | POST all routes                                                | Add products, categories, users         |
| **UPDATE**             | PUT /api/products/:id                                          | Partial update using `.update()`        |
| **DELETE**             | DELETE /api/products/:id                                       | Remove record by id                     |
| **AGGREGATION**        | GET /api/orders/stats                                          | SUM, COUNT, AVG on total_amount         |
| **Constraint (CHECK)** | products, order_items                                          | `price >= 0`, `quantity > 0`            |
| **UNIQUE constraint**  | users.email, categories.name                                   | Prevents duplicates                     |
| **CASCADE DELETE**     | orders → order_items                                           | Deleting order removes its items        |

---

## Viva Questions & Answers

**Q: What is a foreign key?**  
A: A column that references the primary key of another table. Example: `products.category_id` references `categories.id`. It enforces referential integrity.

**Q: What is a JOIN?**  
A: JOIN combines rows from two or more tables based on a related column. We use it to get product with its category name instead of just the `category_id` number.

**Q: What is AGGREGATION?**  
A: Functions like `SUM()`, `COUNT()`, `AVG()` that operate on a group of rows to return a single summary value. Used in `/api/orders/stats`.

**Q: Why separate `orders` and `order_items` tables?**  
A: One order can have many products. The `order_items` table handles this many-to-many relationship between orders and products (normalisation — 3NF).

**Q: What is `SERIAL`?**  
A: Auto-increment integer in PostgreSQL. Each new row gets the next id automatically.

**Q: What does `ON DELETE CASCADE` mean?**  
A: When a parent row is deleted, all child rows referencing it are automatically deleted too. We use this for `order_items` — if an order is deleted, its items are deleted too.
