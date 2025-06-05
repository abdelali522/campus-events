
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const { body, validationResult, matchedData } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

const NODE_ENV = process.env.NODE_ENV;
const IS_PRODUCTION = NODE_ENV === 'production';
console.log(`[Server Init] Running in ${IS_PRODUCTION ? 'production' : 'development (default)'} mode.`);
const effectiveSecureFlag = IS_PRODUCTION; // For session cookie 'secure' flag
console.log(`[Server Init] Session cookie 'secure' flag set to: ${effectiveSecureFlag}`);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32 || sessionSecret === 'please_set_a_strong_secret_in_env_file' || sessionSecret === 'YourGeneratedStrongRandomSecretKey32CharsOrMore_REPLACE_ME') {
    console.error('FATAL ERROR: SESSION_SECRET is not defined in .env, is too short, or is a placeholder! Please set a strong, unique secret.');
    process.exit(1);
}
console.log('[Server Init] SESSION_SECRET loaded.');

// --- Database Connection Pool ---
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true // Important for consistent date handling
});

dbPool.getConnection().then(conn => {
    console.log('[DB Connection] Successfully connected to the MySQL database.');
    conn.release();
}).catch(err => {
    console.error('[DB Connection] FATAL ERROR: Could not connect to MySQL.', err);
    process.exit(1);
});

// --- View Engine Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Session Middleware
app.use(session({
    name: 'campus_hub.sid', // Custom session cookie name
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: effectiveSecureFlag, // True if HTTPS, false if HTTP (for development)
        httpOnly: true, // Prevent client-side JS access to the cookie
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'lax', // CSRF protection
        path: '/'
    }
}));

// Middleware to make user and login status available to all EJS templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isLoggedIn = !!req.session.user; // True if req.session.user exists, otherwise false
    // Optional: Log session state for debugging
    // console.log(`[Session Middleware] Path: ${req.path}, User: ${res.locals.user ? res.locals.user.email : 'Guest'}, LoggedIn: ${res.locals.isLoggedIn}, SessionID: ${req.sessionID}`);
    next();
});

// --- File Upload Setup (Multer) ---
const profilePhotosDir = path.join(__dirname, 'public/uploads/profile_photos');
const eventImagesDir = path.join(__dirname, 'public/uploads/event_images');
fs.mkdirSync(profilePhotosDir, { recursive: true }); // Create directories if they don't exist
fs.mkdirSync(eventImagesDir, { recursive: true });

const storageConfig = (destinationPath) => multer.diskStorage({
    destination: (req, file, cb) => cb(null, destinationPath),
    filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
});

const imageFileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        req.fileValidationError = 'Only image files (JPEG, PNG, GIF) are allowed!';
        return cb(null, false); // Reject file
    }
    cb(null, true); // Accept file
};

const uploadProfilePhoto = multer({
    storage: storageConfig(profilePhotosDir),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: imageFileFilter
});
const uploadEventImage = multer({
    storage: storageConfig(eventImagesDir),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: imageFileFilter
});

// --- Authentication Middleware ---
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user && req.session.user.user_id) {
        return next(); // User is authenticated, proceed
    }
    // For API requests, sending a JSON error is better than redirecting
    if (req.originalUrl.startsWith('/api/')) {
        console.log(`[Auth API] Denied access to ${req.originalUrl}. User not authenticated. SessionID: ${req.sessionID}.`);
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    console.log(`[Auth Page] Denied access to ${req.originalUrl}. User not authenticated. SessionID: ${req.sessionID}. Redirecting to /login.`);
    req.flash('error_msg', 'You need to be logged in to view that page.'); // Optional: flash message
    res.redirect('/login'); // For page requests, redirect to login
}

function isNotAuthenticated(req, res, next) {
    if (!req.session.user) {
        return next(); // User is not authenticated, proceed (e.g., to login/register page)
    }
    res.redirect('/'); // User is already authenticated, redirect to home
}

// --- Category Caching ---
let categoriesCache = null;
async function getCategories() {
    if (categoriesCache && categoriesCache.length > 0) {
        return categoriesCache;
    }
    try {
        const [rows] = await dbPool.query('SELECT category_id as id, name, color, description FROM categories ORDER BY name');
        categoriesCache = rows;
        console.log(`[Categories] Fetched ${rows.length} categories from DB and cached.`);
        return rows;
    } catch (error) {
        console.error("[Categories] Error fetching categories:", error);
        return [];
    }
}
getCategories(); // Initial fetch

// --- Page Routes ---
app.get('/', (req, res) => {
    res.render('index', { pageTitle: 'Home | Campus Events Hub' });
});

app.get('/register', isNotAuthenticated, (req, res) => {
    res.render('register', { pageTitle: 'Register', errors: [], oldInput: {} });
});

app.get('/login', isNotAuthenticated, (req, res) => {
    res.render('login', { pageTitle: 'Login', errors: [], oldInput: {} });
});

app.get('/logout', isAuthenticated, (req, res, next) => {
    const userName = req.session.user ? req.session.user.email : 'User (session error)';
    req.session.destroy(err => {
        if (err) {
            console.error(`[Logout] Error destroying session for ${userName}:`, err);
            return next(err);
        }
        res.clearCookie('campus_hub.sid');
        console.log(`[Logout] User ${userName} logged out successfully.`);
        res.redirect('/login');
    });
});

app.get('/my-events', isAuthenticated, async (req, res, next) => {
    const userId = req.session.user.user_id;
    try {
        const [registeredEvents] = await dbPool.query(`
            SELECT e.*, c.name as category_name, c.color as category_color, org.first_name as organizer_first_name, org.last_name as organizer_last_name 
            FROM events e 
            LEFT JOIN categories c ON e.category_id = c.category_id 
            LEFT JOIN users org ON e.organizer_id = org.user_id 
            JOIN event_registrations er ON e.event_id = er.event_id 
            WHERE er.user_id = ? AND er.status = 'registered' ORDER BY e.start_datetime ASC`, [userId]);
        const [createdEventsFromDB] = await dbPool.query(`
            SELECT e.*, c.name as category_name, c.color as category_color, (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.event_id AND status = 'registered') as registrations_count 
            FROM events e 
            LEFT JOIN categories c ON e.category_id = c.category_id 
            WHERE e.organizer_id = ? ORDER BY e.created_at DESC`, [userId]);

        const createdEventsMapped = createdEventsFromDB.map(event => ({ id: event.event_id, title: event.title, description: event.description, date: event.start_datetime, time: new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), location: event.location, category: event.category_name || 'Uncategorized', category_color: event.category_color, registrations: event.registrations_count || 0, event_image_url: event.event_image_url }));
        const registeredEventsMapped = registeredEvents.map(event => ({ id: event.event_id, title: event.title, description: event.description, date: event.start_datetime, time: new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), location: event.location, category: event.category_name || 'Uncategorized', category_color: event.category_color, organizer: `${event.organizer_first_name || ''} ${event.organizer_last_name || 'Unknown'}`, event_image_url: event.event_image_url }));
        
        res.render('my-events', { pageTitle: 'My Events', registeredEvents: registeredEventsMapped, createdEvents: createdEventsMapped });
    } catch (error) { console.error(`[GET /my-events] Error for user ${userId}:`, error); next(error); }
});

app.get('/profile', isAuthenticated, async (req, res, next) => {
    const userIdToView = req.session.user.user_id;
    try {
        const [users] = await dbPool.query('SELECT user_id, email, first_name, last_name, role, profile_photo_url, DATE_FORMAT(created_at, "%Y-%m-%dT%H:%i:%sZ") as created_at, DATE_FORMAT(updated_at, "%Y-%m-%dT%H:%i:%sZ") as updated_at FROM users WHERE user_id = ?', [userIdToView]);
        if (users.length === 0) return res.status(404).render('404', { pageTitle: "User Not Found"});
        const userProfileData = users[0];
        const [createdResult] = await dbPool.query('SELECT COUNT(*) as count FROM events WHERE organizer_id = ?', [userIdToView]);
        const [attendedResult] = await dbPool.query('SELECT COUNT(*) as count FROM event_registrations WHERE user_id = ? AND status = "registered"', [userIdToView]);
        userProfileData.stats = { eventsCreated: createdResult[0].count, eventsAttended: attendedResult[0].count };
        res.render('user-profile', { pageTitle: 'User Profile', profileUser: userProfileData });
    } catch (error) { console.error(`[GET /profile] Error for user ${userIdToView}:`, error); next(error); }
});

app.get('/create-event', isAuthenticated, async (req, res, next) => {
    try {
        const categoriesData = await getCategories();
        res.render('create-event', { pageTitle: 'Create New Event', categories: categoriesData, errors: [] });
    } catch (error) { console.error('[GET /create-event] Error:', error); next(error); }
});

app.get('/edit-event/:eventId', isAuthenticated, async (req, res, next) => {
    const eventId = req.params.eventId; const userId = req.session.user.user_id;
    try {
        const [events] = await dbPool.query('SELECT * FROM events WHERE event_id = ?', [eventId]);
        if (events.length === 0) return res.status(404).render('404', { pageTitle: 'Event Not Found' });
        const event = events[0];
        if (event.organizer_id !== userId && req.session.user.role !== 'admin') {
            return res.status(403).render('500', { pageTitle: 'Forbidden', errorMsg: 'You are not authorized to edit this event.'});
        }
        const categoriesData = await getCategories();
        if (event.start_datetime) event.start_datetime_local = new Date(new Date(event.start_datetime).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        if (event.end_datetime) event.end_datetime_local = new Date(new Date(event.end_datetime).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        res.render('edit-event', { pageTitle: `Edit: ${event.title}`, event, categories: categoriesData, errors: [] });
    } catch (error) { console.error(`[GET /edit-event/${eventId}] Error:`, error); next(error); }
});

app.get('/event/:eventId/registrations', isAuthenticated, async (req, res, next) => {
    const eventId = req.params.eventId; const currentUserId = req.session.user.user_id; const currentUserRole = req.session.user.role;
    try {
        const [eventResult] = await dbPool.query('SELECT event_id, title, organizer_id FROM events WHERE event_id = ?', [eventId]);
        if (eventResult.length === 0) return res.status(404).render('404', { pageTitle: 'Event Not Found' });
        const event = eventResult[0];
        if (event.organizer_id !== currentUserId && currentUserRole !== 'admin') {
            return res.status(403).render('500', { pageTitle: 'Forbidden', errorMsg: 'Not authorized to view registrations.'});
        }
        const [registrations] = await dbPool.query(`SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, DATE_FORMAT(er.registration_date, "%Y-%m-%d %H:%i") as registration_date, er.status FROM event_registrations er JOIN users u ON er.user_id = u.user_id WHERE er.event_id = ? ORDER BY er.registration_date DESC`, [eventId]);
        res.render('event-registrations', { pageTitle: `Registrations for ${event.title}`, event, registrations });
    } catch (error) { console.error(`[GET /event/${eventId}/registrations] Error:`, error); next(error); }
});

// --- API Routes ---
app.get('/api/events', async (req, res, next) => {
    try {
        const nowForQuery = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [events] = await dbPool.query(`
            SELECT e.event_id as id, e.title, e.description, e.location, e.start_datetime as date, e.event_image_url,
                   c.name as category, c.color as category_color,
                   u.first_name as organizer_first_name, u.last_name as organizer_last_name,
                   (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.event_id AND status = 'registered') as attendees
            FROM events e LEFT JOIN categories c ON e.category_id = c.category_id LEFT JOIN users u ON e.organizer_id = u.user_id
            WHERE e.start_datetime >= ? AND e.is_public = TRUE ORDER BY e.start_datetime ASC LIMIT 50`, [nowForQuery]);
        res.json({ success: true, events });
    } catch (error) { console.error("[API GET /api/events] Error:", error); next(error); }
});

app.post('/register', isNotAuthenticated, [
    body('firstName', 'First name is required (2-50 characters).').notEmpty().trim().isLength({min:2, max:50}).escape(),
    body('lastName', 'Last name is required (2-50 characters).').notEmpty().trim().isLength({min:2, max:50}).escape(),
    body('email', 'Valid university email is required.').isEmail().normalizeEmail().isLength({max:100}).custom(v => { if (!v.endsWith('.edu')&&!v.includes('.ac.')) throw new Error('Please use a university email address (e.g., name@university.edu or name@uni.ac.uk).'); return true; }),
    body('password', 'Password must be 8-100 characters, include letters and numbers.').isLength({ min: 8, max: 100 }).matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\S]{8,}$/, "i").withMessage("Password needs at least one letter and one number."),
    body('confirmPassword').custom((v, { req }) => { if (v !== req.body.password) throw new Error('Passwords do not match'); return true; }),
    body('role').isIn(['student', 'faculty']).withMessage('Invalid role selected')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { firstName, lastName, email, password, role } = matchedData(req);
    try {
        const [existing] = await dbPool.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ success: false, errors: [{ param: 'email', msg: 'Email already registered.' }] });
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await dbPool.query('INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [firstName, lastName, email, hashedPassword, role]);
        console.log('[POST /register] User registered in DB:', { id: result.insertId, email });
        res.status(201).json({ success: true, message: 'Registration successful! Please log in.' });
    } catch (error) { console.error('[POST /register] Error:', error); next(error); }
});

app.post('/login', isNotAuthenticated, [
    body('email', 'Valid email required.').isEmail().normalizeEmail(), body('password', 'Password required.').notEmpty()
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { email, password } = matchedData(req);
    try {
        const [users] = await dbPool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ success: false, errors: [{ msg: 'Invalid email or password.' }] });
        const user = users[0];
        if (await bcrypt.compare(password, user.password_hash)) {
            req.session.regenerate(err => {
                if (err) return next(err);
                req.session.user = { user_id: user.user_id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, profileImageUrl: user.profile_photo_url };
                req.session.save(err => {
                    if (err) return next(err);
                    console.log(`[POST /login] Session saved for ${user.email}. SID: ${req.sessionID}`);
                    res.json({ success: true, message: 'Login successful!', redirectTo: '/' });
                });
            });
        } else { res.status(401).json({ success: false, errors: [{ msg: 'Invalid email or password.' }] }); }
    } catch (error) { console.error('[POST /login] Error:', error); next(error); }
});

app.post('/api/events', isAuthenticated, uploadEventImage.single('event_logo_file'), [
    body('title', 'Title is required (max 100 chars).').notEmpty().trim().isLength({ max: 100 }).escape(),
    body('description', 'Description (max 5000 chars).').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }).escape(),
    body('location', 'Location is required (max 100 chars).').notEmpty().trim().isLength({ max: 100 }).escape(),
    body('start_datetime', 'Valid start date/time is required.').isISO8601().toDate().custom(v => { if (v <= new Date()) throw new Error('Start date must be in the future.'); return true; }),
    body('end_datetime', 'Valid end date/time is required.').isISO8601().toDate().custom((v, { req }) => { if (v <= new Date(req.body.start_datetime)) throw new Error('End date must be after start date.'); return true; }),
    body('category_id', 'Category is required.').notEmpty().isInt({ gt: 0 }).withMessage('Invalid category ID.'),
    body('max_attendees', 'Max attendees must be a number between 1 and 100,000.').optional({ checkFalsy: true }).isInt({ min: 1, max: 100000 }),
    body('is_public').toBoolean()
], async (req, res, next) => {
    const errors = validationResult(req);
    if (req.fileValidationError) errors.errors.push({ param: 'event_logo_file', msg: req.fileValidationError, location: 'file' });
    if (!errors.isEmpty()) { if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting uploaded file:", err)}); return res.status(400).json({ success: false, errors: errors.array() }); }
    const eventData = matchedData(req);
    const organizer_id = req.session.user.user_id;
    const event_image_url = req.file ? `/uploads/event_images/${req.file.filename}` : null;
    try {
        const [result] = await dbPool.query('INSERT INTO events (title, description, location, start_datetime, end_datetime, category_id, organizer_id, max_attendees, is_public, event_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [eventData.title, eventData.description || null, eventData.location, eventData.start_datetime, eventData.end_datetime, eventData.category_id, organizer_id, eventData.max_attendees || null, eventData.is_public, event_image_url]);
        res.status(201).json({ success: true, message: 'Event created successfully!', eventId: result.insertId });
    } catch (error) { console.error('[API POST /api/events] Error:', error); if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file after DB error:", err)}); next(error); }
});

app.put('/api/events/:eventId', isAuthenticated, uploadEventImage.single('event_logo_file'), [
    body('title', 'Title is required (max 100 chars).').notEmpty().trim().isLength({ max: 100 }).escape(),
    body('description').optional({checkFalsy: true}).trim().isLength({max: 5000}).escape(),
    body('location', 'Location is required (max 100 chars).').notEmpty().trim().isLength({max: 100}).escape(),
    body('start_datetime', 'Valid start date/time is required.').isISO8601().toDate(),
    body('end_datetime', 'Valid end date/time is required.').isISO8601().toDate().custom((value, {req}) => { if (new Date(value) <= new Date(req.body.start_datetime)) throw new Error('End date must be after start date.'); return true; }),
    body('category_id', 'Category is required.').notEmpty().isInt({gt: 0}).withMessage('Invalid category ID.'),
    body('max_attendees').optional({checkFalsy: true}).isInt({min:1, max:100000}).withMessage('Max attendees between 1-100000.'),
    body('is_public').toBoolean()
], async (req, res, next) => {
    const eventId = req.params.eventId; const userId = req.session.user.user_id; const userRole = req.session.user.role;
    const errors = validationResult(req);
    if (req.fileValidationError) errors.errors.push({ param: 'event_logo_file', msg: req.fileValidationError, location: 'file' });
    if (!errors.isEmpty()) { if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)}); return res.status(400).json({ success: false, errors: errors.array() }); }
    const eventData = matchedData(req); let new_event_image_url;
    try {
        const [existingEvents] = await dbPool.query('SELECT organizer_id, event_image_url FROM events WHERE event_id = ?', [eventId]);
        if (existingEvents.length === 0) { if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)}); return res.status(404).json({ success: false, errors: [{ msg: 'Event not found.' }] }); }
        const existingEvent = existingEvents[0];
        if (existingEvent.organizer_id !== userId && userRole !== 'admin') { if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)}); return res.status(403).json({ success: false, errors: [{ msg: 'Not authorized.' }] }); }
        new_event_image_url = existingEvent.event_image_url;
        if (req.file) {
            new_event_image_url = `/uploads/event_images/${req.file.filename}`;
            if (existingEvent.event_image_url && existingEvent.event_image_url !== new_event_image_url && !existingEvent.event_image_url.includes('placehold.co')) {
                fs.unlink(path.join(__dirname, 'public', existingEvent.event_image_url), err => { if (err && err.code !== 'ENOENT') console.error("Error deleting old event image:", err); });
            }
        }
        const sql = `UPDATE events SET title = ?, description = ?, location = ?, start_datetime = ?, end_datetime = ?, category_id = ?, max_attendees = ?, is_public = ?, event_image_url = ?, updated_at = NOW() WHERE event_id = ?`;
        const params = [ eventData.title, eventData.description || null, eventData.location, eventData.start_datetime, eventData.end_datetime, eventData.category_id, eventData.max_attendees || null, eventData.is_public, new_event_image_url, eventId ];
        const [result] = await dbPool.query(sql, params);
        if (result.affectedRows > 0) res.json({ success: true, message: 'Event updated successfully!', eventId: eventId });
        else res.status(404).json({ success: false, errors: [{ msg: 'Event not found or no changes made.' }] });
    } catch (error) { console.error(`[API PUT /api/events/${eventId}] Error:`, error); if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)}); next(error); }
});

// EVENT REGISTRATION ROUTE
app.post('/api/events/:eventId/register', isAuthenticated, async (req, res, next) => {
    const eventId = req.params.eventId;
    const userId = req.session.user.user_id;
    console.log(`[API POST /api/events/${eventId}/register] User ${userId} attempting to register for event ${eventId}`);
    try {
        const [events] = await dbPool.query('SELECT event_id, title, max_attendees, start_datetime FROM events WHERE event_id = ? AND is_public = TRUE', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found or not available for registration.' });
        }
        const event = events[0];
        if (new Date(event.start_datetime) < new Date()) {
            return res.status(400).json({ success: false, message: 'This event has already started and registrations are closed.' });
        }
        const [existingRegistrations] = await dbPool.query('SELECT registration_id FROM event_registrations WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        if (existingRegistrations.length > 0) {
            return res.status(409).json({ success: false, message: 'You are already registered for this event.' });
        }
        if (event.max_attendees !== null && event.max_attendees > 0) {
            const [currentRegistrationCount] = await dbPool.query("SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND status = 'registered'", [eventId]);
            if (currentRegistrationCount[0].count >= event.max_attendees) {
                return res.status(400).json({ success: false, message: 'Sorry, this event is currently full.' });
            }
        }
        const [insertResult] = await dbPool.query('INSERT INTO event_registrations (event_id, user_id, status, registration_date) VALUES (?, ?, ?, NOW())', [eventId, userId, 'registered']);
        if (insertResult.affectedRows > 0) {
            console.log(`[API POST /api/events/${eventId}/register] User ${userId} successfully registered for event '${event.title}'.`);
            res.status(201).json({ success: true, message: 'Successfully registered for the event!' });
        } else {
            res.status(500).json({ success: false, message: 'Could not process your registration.' });
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ success: false, message: 'You appear to be already registered (DB constraint).' });
        }
        console.error(`[API POST /api/events/${eventId}/register] Error registering user ${userId}:`, error);
        next(error);
    }
});

// EVENT DELETION ROUTE
app.delete('/api/events/:eventId', isAuthenticated, async (req, res, next) => {
    const eventId = req.params.eventId;
    const userId = req.session.user.user_id;
    const userRole = req.session.user.role;
    console.log(`[API DELETE /api/events/${eventId}] Attempting delete by User ID: ${userId}, Role: ${userRole}`);
    try {
        const [events] = await dbPool.query('SELECT organizer_id, event_image_url FROM events WHERE event_id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }
        const event = events[0];
        if (event.organizer_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this event.' });
        }
        const [result] = await dbPool.query('DELETE FROM events WHERE event_id = ?', [eventId]);
        if (result.affectedRows > 0) {
            console.log(`[API DELETE /api/events/${eventId}] Event deleted from DB.`);
            if (event.event_image_url && !event.event_image_url.includes('placehold.co')) {
                const imagePath = path.join(__dirname, 'public', event.event_image_url);
                fs.unlink(imagePath, (err) => {
                    if (err && err.code !== 'ENOENT') console.error(`Error deleting image ${imagePath}:`, err);
                    else if (!err) console.log(`Image ${imagePath} deleted.`);
                });
            }
            res.json({ success: true, message: 'Event deleted successfully.' });
        } else {
            res.status(404).json({ success: false, message: 'Event not deleted or already deleted.' });
        }
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(409).json({ success: false, message: 'Cannot delete event: it has existing registrations. Please remove registrations first.' });
        }
        console.error(`[API DELETE /api/events/${eventId}] Error:`, error);
        next(error);
    }
});

app.put('/api/user/profile', isAuthenticated, uploadProfilePhoto.single('profile_photo_file'), [
    body('first_name', 'First name is required (max 50 chars).').notEmpty().trim().isLength({max: 50}).escape(),
    body('last_name', 'Last name is required (max 50 chars).').notEmpty().trim().isLength({max: 50}).escape(),
    body('email', 'Valid email is required (max 100 chars).').isEmail().normalizeEmail().isLength({max: 100}),
    body('role').optional().isIn(['student', 'faculty', 'admin']).withMessage('Invalid role selected.')
], async (req, res, next) => {
    const errors = validationResult(req);
    if (req.fileValidationError) errors.errors.push({ param: 'profile_photo_file', msg: req.fileValidationError, location: 'file' });
    if (!errors.isEmpty()) { if (req.file) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)}); return res.status(400).json({ success: false, errors: errors.array() }); }
    const { first_name, last_name, email } = matchedData(req);
    let role = req.body.role;
    if (!role || (req.session.user.role !== 'admin' && role !== req.session.user.role)) { role = req.session.user.role; }
    const currentUserId = req.session.user.user_id;
    let new_profile_photo_url = req.session.user.profileImageUrl;
    try {
        const [currentUserDataFromDB] = await dbPool.query('SELECT profile_photo_url FROM users WHERE user_id = ?', [currentUserId]);
        const oldDbProfilePhotoUrl = currentUserDataFromDB.length ? currentUserDataFromDB[0].profile_photo_url : null;
        if (req.file) {
            new_profile_photo_url = `/uploads/profile_photos/${req.file.filename}`;
            if (oldDbProfilePhotoUrl && oldDbProfilePhotoUrl !== new_profile_photo_url && !oldDbProfilePhotoUrl.includes('default-avatar.png')) {
                fs.unlink(path.join(__dirname, 'public', oldDbProfilePhotoUrl), err => { if (err && err.code !== 'ENOENT') console.error("Error deleting old profile photo:", err); });
            }
        }
        if (email !== req.session.user.email) {
            const [existingUserWithNewEmail] = await dbPool.query('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [email, currentUserId]);
            if (existingUserWithNewEmail.length > 0) {
                if (req.file && new_profile_photo_url !== oldDbProfilePhotoUrl) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)});
                return res.status(400).json({ success: false, errors: [{param: 'email', msg: 'Email is already in use.' }]});
            }
        }
        await dbPool.query('UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, profile_photo_url = ?, updated_at = NOW() WHERE user_id = ?',
            [first_name, last_name, email, role, new_profile_photo_url, currentUserId]);
        req.session.user = {...req.session.user, firstName: first_name, lastName: last_name, email, role, profileImageUrl: new_profile_photo_url };
        req.session.save(err => {
            if(err) return next(err);
            res.json({ success: true, message: 'Profile updated successfully!', updatedUser: req.session.user });
        });
    } catch (error) { console.error('[API PUT /api/user/profile] Error:', error); if (req.file && new_profile_photo_url !== (currentUserDataFromDB.length ? currentUserDataFromDB[0].profile_photo_url : null) ) fs.unlink(req.file.path, err => { if(err) console.error("Error deleting file:", err)}); next(error); }
});

// --- Error Handling ---
app.use((req, res, next) => { // 404 Handler
    res.status(404).render('404', { pageTitle: 'Page Not Found' });
});

app.use((err, req, res, next) => { // Global Error Handler
    console.error("[Global Error Handler] Status:", err.status || 500, "Message:", err.message, "URL:", req.originalUrl);
    if (!IS_PRODUCTION) console.error("[Global Error Handler] Stack:", err.stack);
    const status = err.status || 500;
    const errMessage = IS_PRODUCTION && status === 500 ? 'An unexpected server error occurred.' : err.message;
    if (req.originalUrl.startsWith('/api/')) return res.status(status).json({ success:false, errors: [{ msg: errMessage }] });
    res.status(status).render('500', { pageTitle: `Error ${status}`, errorMsg: errMessage, errorStack: IS_PRODUCTION ? null : err.stack });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`[Server Start] Server running on http://localhost:${PORT}`);
});