# Mr. BIRIYANI — Web Frontend (React + Vite)

A modern, high-performance web application for **Mr. BIRIYANI (House of Andhra Flavours)**. It delivers a royal, immersive customer dining and ordering experience paired with a unified role-based staff operations suite (Receptionist, Captain, Cashier, Kitchen, and Manager/Admin).

---

## 1. Stack & Architecture

* **Framework:** React 19 + Vite 8 (ESM, ultra-fast HMR and production bundling)
* **Routing:** React Router DOM v7 (Declarative routing, protected workspaces, dynamic redirects)
* **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) + Custom Andhra Royal palette
* **Icons:** Lucide React + Simple Icons
* **API Client:** Native fetch abstraction (`src/api/client.js`) with automatic error mapping, HTTP-only session cookies (`credentials: 'include'`), and idempotency keys
* **State & Authentication:** React Context API (`AuthContext.jsx`) with real-time permissions check (`hasPermission`) and localStorage-synchronized shopping cart

---

## 2. Andhra Royal Design System

The visual identity reflects the rich culinary heritage of Andhra Pradesh:
* **Background Surfaces:** Rich obsidian blacks (`#080808`, `#111010`, `#141210`)
* **Accents & Highlights:** Royal Andhra gold gradients (`#D4A63A`, `#E0B246`, `#E8BD57`)
* **Status Tones:** Emerald Green (`#10B981` / `#34D399`) for Available/Seated, Amber (`#F59E0B`) for Occupied/Pending, Rose Red (`#EF4444`) for Cleaning/Turnaround
* **Typography:** Elegant serif titles for brand authenticity, clean geometric sans-serif for UI clarity and dashboard metrics

---

## 3. Project Structure

```
mr-biryani/
├── public/                 # Favicons and static assets
├── src/
│   ├── api/
│   │   ├── client.js       # Core API fetch client, ApiError, idempotency generator
│   │   └── staff.js        # Staff API helpers (reception, floor, orders, bills, menu)
│   ├── auth/
│   │   └── AuthContext.jsx # User session, token refresh, login/logout, RBAC permissions
│   ├── components/
│   │   ├── Brand.jsx       # Royal logo & crown crest
│   │   ├── Button.jsx      # Reusable styled buttons
│   │   ├── Footer.jsx      # Customer portal footer with Andhra brand info
│   │   ├── Motion.jsx      # Safe image loading and reveal transitions
│   │   ├── Navbar.jsx      # Top customer navigation with cart & auth links
│   │   ├── ProtectedRoute.jsx # Role-based route guard
│   │   ├── ScrollToTop.jsx # Route change window scroll reset
│   │   └── Sidebar.jsx     # Staff responsive drawer navigation
│   ├── data/
│   │   ├── branches.js     # Default fallback branch definitions
│   │   ├── menuData.js     # Default fallback menu catalog
│   │   └── orderData.js    # Default sample order data
│   ├── pages/
│   │   ├── dashboards/     # Staff operational dashboards
│   │   │   ├── AdminDashboard.jsx        # Branch management & analytics
│   │   │   ├── CaptainDashboard.jsx      # Floor table occupancy & 3-way status toggles
│   │   │   ├── CashierDashboard.jsx      # POS billing & payment settlements
│   │   │   ├── KitchenDashboard.jsx      # Live KDS (Kitchen Display System)
│   │   │   ├── ManagerDashboard.jsx      # Inventory, low-stock & expenses
│   │   │   ├── ReceptionistDashboard.jsx # Front desk bookings & table board
│   │   │   ├── shared.js                 # Shared UI helpers, status tags, formatters
│   │   │   └── ui.jsx                    # Shared dashboard shell, KPI cards, messages
│   │   ├── About.jsx       # Royal story & Andhra culinary heritage
│   │   ├── Admin.jsx       # Staff administration wrapper
│   │   ├── Branches.jsx    # Branch locations and contact details
│   │   ├── Contact.jsx     # Inquiries and customer support
│   │   ├── Dashboard.jsx   # Role-based dashboard dispatcher
│   │   ├── Gallery.jsx     # Food photography & kitchen showcase
│   │   ├── Home.jsx        # Landing page (Hero, Specialties, Story, Menu, Cart Bar)
│   │   ├── Login.jsx       # Customer & staff authentication
│   │   ├── Order.jsx       # Cart checkout & order confirmation
│   │   ├── OrderHistory.jsx# Order status tracking for customers
│   │   ├── Profile.jsx     # Customer account profile management
│   │   ├── Register.jsx    # Public customer sign-up
│   │   ├── Reservations.jsx# Table reservations with 45-min buffer allocation
│   │   └── Reviews.jsx     # Customer testimonials and ratings
│   ├── utils/
│   │   └── cart.js         # Cart operations (add, remove, quantity stepper, persistence)
│   ├── App.css
│   ├── App.jsx             # Route definitions and layout wrapper
│   ├── index.css           # Tailwind CSS imports and custom utility styles
│   └── main.jsx            # Application mount point
├── package.json
└── vite.config.js
```

---

## 4. Key Workspaces & Capabilities

### A. Customer Portal
1. **Home & Brand Experience (`Home.jsx`):**
   * Andhra Royal Hero banner with quick actions (*Order Online*, *Book Table*).
   * Royal Specialties carousel featuring signature biryanis (Dum, Fry-Piece, Mutton, Special).
   * Brand promises (*Authentic Taste*, *Quality Food*, *Happy Customers*).
   * Live interactive menu with category filtering, search, veg/non-veg tags, and item counters.
   * Floating bottom cart bar that displays active items and subtotal.
2. **Table Reservations (`Reservations.jsx`):**
   * Slot-based table booking within a 120-day horizon.
   * **45-minute collision check:** Prevents duplicate bookings on the same table within 45 minutes.
   * Preferred table selection (`Any Available Table` or specific table number).
   * Customer tracking view (*My Reservations*) with status indicators (`Requested`, `Confirmed`, `Seated & Checked In`, `Cancelled`).
3. **Cart & Checkout (`Order.jsx`):**
   * Line-item quantity adjustment and item deletion.
   * GST (5%) breakdown and dynamic subtotal calculations.
   * Idempotent order submission via `Idempotency-Key` header.
   * Table dine-in POS ordering support for staff/waiters via query params.

### B. Staff Operations Suite
1. **Reception Desk (`ReceptionistDashboard.jsx`):**
   * Live date switcher (`Today`, `Tomorrow`, Date Picker) and instant refresh.
   * 5 KPI cards: Total Bookings, To Confirm, Checked In, Available Tables, Turnaround/Cleaning.
   * Split view or dedicated tabs for Bookings and Live Table Board.
   * Status filter tabs: `All`, `Pending`, `Confirmed`, `Seated`, `Cancelled`.
   * Fast actions: One-click `Confirm` and `Check in` (marks guest seated).
   * Table Board with **"⚡ Make Available for Remaining Time"** override button.
2. **Captain Floor Dashboard (`CaptainDashboard.jsx`):**
   * Real-time floor table grid.
   * Direct 3-way status toggles: `✓ Available`, `🍽️ Occupied`, and `🧹 Cleaning`.
   * Upcoming reservation banners showing guest name, time, and remaining buffer.
3. **Cashier POS Terminal (`CashierDashboard.jsx`):**
   * Unbilled orders queue and table bill generator.
   * Multi-tender payment recording: Cash, UPI / QR Scan, Debit / Credit Card.
   * Walk-in quick order placement modal.
4. **Kitchen Display System (`KitchenDashboard.jsx`):**
   * Order tickets with timer badges and dish checklists.
   * One-click ticket lifecycle transitions: `ACCEPTED` → `PREPARING` → `READY` → `SERVED`.
5. **Manager & Admin (`ManagerDashboard.jsx`, `AdminDashboard.jsx`):**
   * Inventory tracking, low-stock warnings, and stock adjustments.
   * Expense logging and daily sales summaries.
   * Staff permissions, roles, and branch configuration.

---

## 5. Development & Build

### Prerequisites
* Node.js 18+ (tested with Node 20 & Node 22)
* Spring Boot backend running on port 8081 (or configured in `vite.config.js`)

### Getting Started
```bash
# Navigate to web frontend
cd mr-biryani

# Install dependencies
npm install

# Start development server
npm run dev
# Server starts on http://localhost:5173
```

### Production Build
```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 6. Security & Authorization Model

* **HTTP-Only Cookies:** Browser sessions use secure HTTP-only cookies for authentication tokens; tokens are never accessible via client scripts.
* **Granular RBAC:** Permissions (e.g. `reservations.confirm`, `tables.allocate`, `billing.generate`) drive UI visibility, while the Spring Boot backend strictly enforces authorization on every endpoint.
* **Idempotency:** Payment recordings and order submissions transmit UUID idempotency keys to prevent accidental double-billing or duplicate ticket creation.
