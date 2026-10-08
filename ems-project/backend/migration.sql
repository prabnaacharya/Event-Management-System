-- Run this ONLY if you already have data in ems_db and do not want to re-import schema.sql
-- (XAMPP uses MariaDB, which supports "IF NOT EXISTS" on ADD COLUMN)
USE ems_db;

ALTER TABLE events ADD COLUMN IF NOT EXISTS has_tickets TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS performers TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS food_details TEXT;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS proof_hash VARCHAR(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_count INT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at DATETIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'ticket';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(60);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(80);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_landmark VARCHAR(120);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_review_user_event (user_id, event_id),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (name, icon) VALUES ('Weddings', 'Heart');

-- Wedding events: no tickets (so they never show "Sold out" / "Book now")
UPDATE events e JOIN categories c ON c.id = e.category_id
SET e.has_tickets = 0, e.total_tickets = 0, e.available_tickets = 0
WHERE c.name = 'Weddings';

-- Wedding: no tickets, but an amount per guest (only where the amount was still 0)
UPDATE events e JOIN categories c ON c.id = e.category_id
SET e.price = 1000
WHERE c.name = 'Weddings' AND e.price = 0;

-- Food Festival: 100 tickets (keeps the already-sold count; available_tickets must be set BEFORE total_tickets)
UPDATE events
SET available_tickets = GREATEST(0, 100 - (total_tickets - available_tickets)),
    total_tickets = 100
WHERE title = 'Food Festival';

-- Wishlist (saved events)
CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist_user_event (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;
