CREATE DATABASE IF NOT EXISTS ems_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ems_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'Sparkles'
) ENGINE=InnoDB;

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    category_id INT NOT NULL,
    venue VARCHAR(150) NOT NULL,
    event_date DATE NOT NULL,
    event_time VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_tickets INT NOT NULL DEFAULT 100,
    available_tickets INT NOT NULL DEFAULT 100,
    organizer_name VARCHAR(120) DEFAULT 'Event Organizer',
    organizer_email VARCHAR(120),
    has_tickets TINYINT(1) NOT NULL DEFAULT 1,
    performers TEXT,
    food_details TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    buyer_name VARCHAR(120),
    buyer_email VARCHAR(120),
    buyer_phone VARCHAR(20),
    payment_method VARCHAR(30) DEFAULT 'cod',
    transaction_uuid VARCHAR(255),
    ref_id VARCHAR(255),
    payment_proof VARCHAR(255),
    proof_hash VARCHAR(64),
    checked_in_count INT NOT NULL DEFAULT 0,
    checked_in_at DATETIME,
    kind VARCHAR(10) NOT NULL DEFAULT 'ticket',
    paid_amount DECIMAL(10,2),
    payment_ref VARCHAR(60),
    delivery_address VARCHAR(255),
    delivery_city VARCHAR(80),
    delivery_landmark VARCHAR(120),
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB;
CREATE TABLE reviews (
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
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist_user_event (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Admin', 'admin@ems.com', '$2b$12$20qzx5Cpjc5PV4l48zBds.aMnC0uKFj.k8AxE/twZINc3BlDUdVCC', 'admin');
INSERT INTO categories (name, icon) VALUES
    ('Concerts', 'Music'),
    ('Conferences', 'Users'),
    ('Workshops', 'Wrench'),
    ('Sports', 'Trophy'),
    ('Festivals', 'PartyPopper'),
    ('Weddings', 'Heart');
INSERT INTO events (title, description, image_url, category_id, venue, event_date, event_time, price, total_tickets, available_tickets, organizer_name, organizer_email, has_tickets, performers, food_details) VALUES
('Rock Concert 2026', 'Get ready for an unforgettable evening with top bands performing live in Kathmandu. Food stalls and merch booths will be available.',
 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800', 1, 'Dashrath Stadium, Kathmandu', '2026-12-25', '6:00 PM', 1500.00, 500, 500, 'Eon Nepal', 'hello@eonnepal.com', 1,
 'Nepathya (Headliner)\nThe Edge Band\nAlbatross\nDJ Sanjay (After party)',
 'Momo & Chowmein stall\nBBQ chicken & buff sekuwa\nCoffee & soft drinks\nVeg snacks corner'),
('Tech Conference 2026', 'A full day of talks and networking with leading tech professionals covering AI, cloud, and modern software practices.',
 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 2, 'Hotel Yak & Yeti, Kathmandu', '2026-12-10', '9:00 AM', 2500.00, 300, 300, 'TechNepal Events', 'contact@technepal.com', 1,
 'Keynote: Head of AI, Leapfrog\nPanel: Cloud engineers of Nepal\nWorkshop: Modern web with React',
 'Breakfast & tea on arrival\nBuffet lunch (veg / non-veg)\nEvening snacks & coffee'),
('Art Workshop', 'A hands-on creative workshop for beginners and enthusiasts, guided by professional local artists.',
 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800', 3, 'Kathmandu Art Center', '2026-11-15', '11:00 AM', 800.00, 60, 60, 'Kathmandu Art Center', 'info@kacenter.com', 1,
 'Guided by local artists from Kathmandu Art Center',
 'Tea, coffee & light snacks'),
('Football Tournament', 'Local clubs battle it out in this exciting inter-city football tournament, open to the public.',
 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800', 4, 'ANFA Complex, Kathmandu', '2026-11-13', '8:00 AM', 1000.00, 200, 200, 'ANFA Nepal', 'event@anfa.org.np', 1,
 'Participating clubs: Machhindra FC, Church Boys United, Sankata Club, Three Star Club',
 'Canteen: samosa, chiya, momo and cold drinks'),
('Food Festival', 'Taste the best of Nepali and international cuisine from over 40 stalls, with live music and cultural performances.',
 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', 5, 'Bhrikuti Mandap, Kathmandu', '2026-12-05', '12:00 PM', 300.00, 100, 100, 'Kathmandu Foodies', 'hello@ktmfoodies.com', 1,
 'Live music: Kutumba (folk fusion)\nCultural dance by Nepal Art Council',
 'Newari khaja set\nThakali thali\nMomo (steam / jhol / fried)\nSekuwa & choila\nJuju dhau & sel roti\nContinental & Chinese stalls\nDesserts, tea & coffee'),
('Sharma-Thapa Wedding Ceremony', 'Join us in celebrating the wedding of Anil Sharma and Sita Thapa. No tickets are sold: RSVP and send your gift (Rs. 1000 per guest).',
 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', 6, 'Hotel Annapurna Banquet, Kathmandu', '2026-11-28', '11:00 AM', 1000.00, 0, 0, 'Sharma & Thapa Family', 'wedding@example.com', 0,
 'Groom: Anil Sharma\nBride: Sita Thapa\nMusic: Live Panche Baja & DJ Rabin',
 'Welcome drinks\nNepali bhoj (dal, bhat, tarkari, achar)\nVeg & non-veg starters\nSweets: lalmohan, jeri, rasbari');
