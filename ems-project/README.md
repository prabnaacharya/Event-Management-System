# EMS - Event Management System

4th semester project. Full-stack web app for browsing, searching and booking events.

**Stack:** React.js (frontend) + Python Flask (backend) + MySQL (database)

```
ems-project/
├── backend/     -> Flask REST API + MySQL models
└── frontend/    -> React (Vite) UI, matches the reference design
```

---

## 0. XAMPP quick start (Windows)

1. XAMPP Control Panel -> **Start MySQL** (Apache chahidaina).
2. Browser ma `http://localhost/phpmyadmin` -> **Import** -> `backend/schema.sql` choose -> **Go**.
   (database `ems_db` aafai banchha; XAMPP ko root password khali hunchha, `.env` ma `DB_PASSWORD=` khali nai rakhnus)
3. Backend: `cd backend` -> `python -m venv venv` -> `venv\Scripts\activate` -> `pip install -r requirements.txt` -> `python app.py`
4. Frontend: `cd frontend` -> `npm install` -> `npm run dev` -> `http://localhost:5173`
5. **Sabai photo `frontend/src/assets/` ma rakhnus** (dev server restart garnu pardaina):
   - eSewa / Fonepay ko **scan photo**: file ko naam ma `esewa` / `fonepay` (ya `phonepay`) hunu parcha
     (jastai `esewa.jpg`, `my-fonepay-qr.png`). Wallet ko ek matra photo bhaye tyo nai scan photo hunchha.
     Alag logo chahiye bhane naam ma `logo` halnus (`esewa-logo.png`).
   - Photo kalo-seto (plain QR) bhaye app le aafai **eSewa = green, Fonepay = blue** banaidincha.
     Tapai ko photo pahilai rangin bhaye jastai ko tastai dekhincha.
   - Wallet ko photo nabhaye `payment-qr.jpg` duitai ko lagi (green / blue ma) dekhincha.
   - Naam milena bhane `src/config/payment.js` ma exact file naam lekhnus.
   - Event photo: phpMyAdmin ma `events.image_url` ma file ko naam matra lekhnus, jastai
     `UPDATE events SET image_url='rock.jpg' WHERE id=1;`  (https:// link pani chalcha).
   - File nabhetiye pani broken image dekhidaina - placeholder / rangin badge dekhincha.
6. Admin: `admin@ems.com` / `Admin@123` -> **Dashboard** -> "Pending Payments" ma screenshot **View** garera **Confirm / Reject**.
7. Checkout ma **mobile number (10 digit, 96/97/98 bata suru)** anibarya chha; screenshot upload nagaresamma "Not paid yet" dekhincha.

## 1. Database setup (MySQL)

1. Make sure MySQL server is running.
2. Create the database and seed sample events/categories:
   ```bash
   mysql -u root -p < backend/schema.sql
   ```
   (or phpMyAdmin -> Import -> `backend/schema.sql`). This **drops and recreates**
   `ems_db` tables `users`, `categories`, `events`, `bookings`, adds the admin user
   (`admin@ems.com` / `Admin@123`), 5 categories and 5 sample events.

## 2. Backend setup (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# edit .env -> set DB_PASSWORD to your MySQL password
python app.py                   # runs on http://localhost:5000
```

Test it: open `http://localhost:5000/api/health` — should return `{"status": "ok"}`.

### Key API endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/events?search=rock&category=Music&page=1` | List/search/filter events |
| GET | `/api/events/featured` | Featured events (home page) |
| GET | `/api/events/<id>` | Single event details |
| GET | `/api/categories` | List categories |
| POST | `/api/payments/checkout` | Create a booking (multipart: event_id, quantity, method, buyer_*, payment_proof) |
| GET | `/api/payments/proof/<file>` | View an uploaded payment screenshot |
| PUT | `/api/admin/bookings/<id>/status` | Admin approves / rejects a pending booking |
| GET | `/api/bookings/my` | Logged-in user's bookings |
| GET | `/api/admin/stats` | Dashboard stats — admin only |
| POST/PUT/DELETE | `/api/admin/events` | Manage events — admin only |

Search works by event **title** and **venue** — e.g. `/api/events?search=Rock` returns
"Rock Concert 2024" with its image, price, date etc., same as the Events page filters.

## 3. Frontend setup (React)

```bash
cd frontend
npm install
npm run dev                     # runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

## 4. Login

- **Admin:** `admin@ems.com` / `Admin@123` → redirects to `/admin` dashboard
- **User:** Register a new account from the Register page

## Pages included
- Home (hero + search, popular categories, featured events)
- Events listing (sidebar filters: search / category / date range, pagination)
- Event details (ticket sidebar, quantity selector, book now)
- Checkout (buyer info, order summary) -> **Pay** opens a popup:
  eSewa / Fonepay -> scan QR (`frontend/src/assets/payment-qr.jpg`) -> upload screenshot from gallery,
  or Cash on Delivery. QR/COD bookings stay *pending* until the admin approves them on the dashboard.
- Login / Register
- Admin dashboard (stat cards, recent bookings table, upcoming events)

## Notes for your report / viva
- Passwords are hashed with **bcrypt**, never stored in plain text.
- Auth uses **JWT** (`Flask-JWT-Extended`); token is stored in `localStorage` on the frontend
  and sent as `Authorization: Bearer <token>` on protected requests.
- Ticket availability is decremented on the server when a booking is confirmed, to prevent
  overselling.
- CORS is enabled on the Flask side so the React dev server (port 5173) can call the API
  (port 5000).
