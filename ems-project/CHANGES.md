# Naya kura haru (What's new)

1. Event details: "Who is coming" (performers) + "Food & Drinks" - admin le event banauda halne, user le event page ma herna milcha.
2. Reviews: rating (1-5 star) + comment event page ma tala. Login user le post/edit/delete, admin le kunai pani delete garna milcha.
3. Wedding / invitation event: "Sell tickets" untick garne -> ticket, price, booking, QR kehi dekhaudaina.
4. Validation: aja ko ra past date block (kam ti kam bholi ko date), time/price/tickets/email/title/venue/review sabai frontend + backend ma check.
5. My Bookings: "View event details" -> date/time, venue, who's coming, food, organizer/admin, ra afno review+comment.
6. Admin Dashboard: Reviews & Comments section (delete garna milcha), edit form ma naya fields.

## Database
- Naya DB: backend/schema.sql import garnus (seed.py pani chalauna milcha).
- Purano DB (data nafalne): backend/migration.sql chalaunus.

## Payment screenshot (naya)
- Same screenshot duplicate halyo bhane (arko user le pani) reject hunchha: "This screenshot has already been used".
- Nakali file (image haina) ra 5MB bhanda thulo file pani reject hunchha.
- Admin dashboard: "All Bookings & Payments" ma sabai user ko booking, email/phone, screenshot, status herna milcha; search + status filter chha.
- Pending ma Approve / Reject chha; duplicate screenshot ma "Duplicate!" dekhincha, ra arko confirmed booking ko screenshot bhaye approve block hunchha.
- Limit: exact same file matra pakadinchha. Crop/re-save gareko photo naya file ho, tyo admin le afai herera reject garnu parcha.
- DB: bookings.proof_hash column thapiyo (schema.sql / migration.sql ma).

## Update 3
- Wedding event: Sold out / Book now / ticket kehi dekhaudaina ("Invitation" matra). Purano wedding event ko lagi migration.sql ko last UPDATE chalaunus.
- Admin chart: blue bar chart (Sold / Pending / Available, % ma) hamesha dekhincha; tala "12 / 100 sold" list; "Tickets Sold" stat card.

## Dhyan dinus
- Yo pura folder (ems-project) nai use garnus. Kehi file matra replace garyo bhane (jastai Dashboard.jsx) naya components (EventFormModal.jsx, StarRating.jsx, Reviews.jsx, EventInfo.jsx) nabhaye page blank hunchha.
- Online payment (QR) ma screenshot nahali submit hudaina; server le pani reject garchha.

## Update 4 - Payment & COD
- QR payment: user ley "Amount paid" (pura total hunuparcha, 5/10 rupay halera hudaina) ra "Transaction ID" dinuparcha. Same Txn ID duplicate reject.
- Admin dashboard ma Paid amount + Txn ID dekhincha; amount milena bhane Approve block.
- Cash on Delivery: address + city (landmark optional) + phone anivarya. Admin ra My Bookings ma dekhincha.
- DB: migration.sql / schema.sql ma bookings ko naya columns (paid_amount, payment_ref, delivery_address, delivery_city, delivery_landmark).

## Update 5 - Wedding RSVP (ticket chaina, pay option chha)
- Wedding / no-ticket event ma ticket hudaina. Tyo ko satta "RSVP" button: guests (1-10) + optional pay.
- Admin le "Amount per guest" rakhna sakcha (fixed). 0 rakhyo bhane guest le afai gift amount lekhcha, ya RSVP matra (paisa bina) garcha.
- Paisa halyo bhane eSewa/Fonepay QR + screenshot + amount + Txn ID, admin le Approve garcha. Paisa nabhaye RSVP turuntai Confirmed.
- DB: bookings.kind column (migration.sql / schema.sql).

## Final
- Wedding: ticket chaina, amount per guest (sample: Rs. 1000) -> RSVP & Pay.
- Food Festival: 100 tickets.
- My Bookings: date, time, venue (+ Get directions), countdown, who is coming, food, organizer, review - sabai default dekhincha.
- Database: purano DB bhaye migration.sql, naya bhaye schema.sql (ek matra).

## Update 6 - Wishlist, Calendar, QR, date filter
- Wishlist: event card ra event page ma heart icon. My Bookings > Wishlist tab ma saved events (login garnu parcha).
- Add to Calendar: Google Calendar link + .ics download (event page ra My Bookings).
- Ticket QR: My Bookings ma Confirmed booking ko QR + ticket code (gate ma dekhauna), thichera thulo garna milcha. Pending ma QR hudaina.
- Events page: Sort by date (soonest / latest / recently added) + quick date (This week / month / 3 months) + From/To date.
- DB: wishlist table (migration.sql / schema.sql ma).

## Update 7 - Gate QR check-in
- User: My Bookings ma Confirmed booking ma "Show QR" button + QR ticket (har QR alag, nakali banauna mildaina). Event ko din gate ma dekhaune.
- Admin: Dashboard > "Gate Check-in": camera le QR scan / ticket code type / USB scanner. Valid bhaye holder, event, guests dekhincha ra "Admit" thichepachi entry mark hunchha.
- Euta QR dui palta kaam gardaina (Already checked in). Kehi jana matra aaye "Admit 1 of 2" garna milcha.
- DB: bookings.checked_in_count, checked_in_at (migration.sql / schema.sql).
- Camera: localhost ya https ma matra chalcha. `npm install` feri chalaunu parcha (jsqr thapiyo).

## Final (cart nahune)
- Add to Cart hataiyo. Add to Wishlist (heart) rakhiyo: event card, event page, My Bookings > Wishlist tab.
- Date, time, venue/location sabai thau ma bold (card, event page, My Bookings, checkout).
- Add to Calendar, ticket QR (My Bookings), Gate Check-in (admin sidebar) sabai chha.
- Database: purano DB bhaye backend/migration.sql, naya bhaye backend/schema.sql (ek matra). Tespachi `npm install` feri chalaunus.
