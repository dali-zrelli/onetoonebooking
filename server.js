const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const initSqlJs = require('sql.js')
const mail = require('./mail')
const cloudinary = require('cloudinary').v2
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

cloudinary.config({
  cloud_name: 'dlhujvgrp',
  api_key: '532689538597837',
  api_secret: 'MD1S6e72HvUBapoqSqifZPWyeV4'
})

const app = express()
const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`
const JWT_SECRET = 'onetoneone-booking-secret-2024'

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

const DB_PATH = path.join(__dirname, 'booking.db')
let db

function query(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const results = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function queryOne(sql, params = []) {
  const rows = query(sql, params)
  return rows.length ? rows[0] : null
}

let _batchMode = false

function run(sql, params = []) {
  db.run(sql, params)
  if (!_batchMode) saveDb()
}

function batch(fn) {
  _batchMode = true; fn(); _batchMode = false; saveDb()
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()))
}

async function initDb() {
  const SQL = await initSqlJs()
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH))
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, isHost INTEGER DEFAULT 0, hostSince TEXT,
      phone TEXT, verified INTEGER DEFAULT 0, verificationToken TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY, hostId TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, type TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'ville',
      city TEXT NOT NULL, country TEXT DEFAULT 'France', price REAL NOT NULL,
      images TEXT, guests INTEGER DEFAULT 2, bedrooms INTEGER DEFAULT 1,
      beds INTEGER DEFAULT 1, baths INTEGER DEFAULT 1, amenities TEXT,
      lat REAL, lng REAL, rating REAL DEFAULT 4.5,
      reviewCount INTEGER DEFAULT 0, superhost INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, listingId TEXT NOT NULL, userId TEXT NOT NULL,
      checkIn TEXT NOT NULL, checkOut TEXT NOT NULL, guests INTEGER DEFAULT 1,
      totalPrice REAL NOT NULL, nights INTEGER DEFAULT 1,
      status TEXT DEFAULT 'en_attente', message TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, listingId TEXT NOT NULL, userId TEXT NOT NULL,
      rating REAL NOT NULL, comment TEXT, createdAt TEXT DEFAULT (datetime('now'))
    );
  `)

  const userCount = queryOne('SELECT COUNT(*) as c FROM users')
  if (!userCount || userCount.c === 0) { seedHosts(); console.log('✓ Database ready — no fake listings (hosts create their own)') }
}

/* ─── Seeded host accounts ─── */
function seedHosts() {
  const hostPw = bcrypt.hashSync('password123', 10)
  const hosts = [
    { name:'Marie Dupont', email:'marie@example.com' },
    { name:'Jean Martin', email:'jean@example.com' },
    { name:'Sophie Bernard', email:'sophie@example.com' },
    { name:'Pierre Dubois', email:'pierre@example.com' },
    { name:'Camille Petit', email:'camille@example.com' },
    { name:'Lucas Moreau', email:'lucas@example.com' },
  ]
  hosts.forEach(h => run('INSERT OR IGNORE INTO users (id,name,email,password,isHost,hostSince,verified) VALUES (?,?,?,?,?,datetime("now"),1)', [uuidv4(), h.name, h.email, hostPw]))
  const guestId = uuidv4()
  run('INSERT OR IGNORE INTO users (id,name,email,password,verified) VALUES (?,?,?,?,1)', [guestId,'Test Guest','guest@example.com',hostPw])
  console.log('✓ Host accounts ready (marie@example.com / password123)')
}

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Non authentifié' })
  try { req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

function formatListing(l) {
  if (!l) return null
  l.images = l.images ? l.images.split('|') : []
  l.amenities = l.amenities ? l.amenities.split(', ') : []
  return l
}

/* ─── Auth ─── */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs requis' })
    if (password !== confirmPassword) return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' })
    if (password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' })
    if (queryOne('SELECT id FROM users WHERE email = ?', [email])) return res.status(409).json({ error: 'Email déjà utilisé' })
    const id = uuidv4()
    const token = jwt.sign({ id, name, email, isHost:0, verified:1 }, JWT_SECRET, { expiresIn:'7d' })
    run('INSERT INTO users (id,name,email,password,verified) VALUES (?,?,?,?,1)', [id, name, email, bcrypt.hashSync(password, 10)])
    try {
      await mail.sendWelcomeEmail(email, name)
    } catch (mailErr) { console.error('Mail error:', mailErr.message) }
    res.json({ token, user:{ id, name, email, isHost:0, verified:1 }, message: 'Compte créé avec succès !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body
    const user = queryOne('SELECT * FROM users WHERE email = ?', [email])
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    const token = jwt.sign({ id:user.id, name:user.name, email:user.email, isHost:user.isHost, verified:user.verified }, JWT_SECRET, { expiresIn:'7d' })
    res.json({ token, user:{ id:user.id, name:user.name, email:user.email, isHost:user.isHost, verified:user.verified } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/auth/me', auth, (req, res) => {
  const u = queryOne('SELECT id,name,email,isHost,hostSince,phone,verified FROM users WHERE id = ?', [req.user.id])
  if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' })
  res.json(u)
})

app.get('/api/auth/verify-email', (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).send('Token manquant')
    const user = queryOne('SELECT id FROM users WHERE verificationToken = ?', [token])
    if (!user) return res.status(400).send('Token invalide ou expiré')
    run('UPDATE users SET verified = 1, verificationToken = NULL WHERE id = ?', [user.id])
    res.send(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f4f4f4">
      <div style="background:#fff;padding:40px;border-radius:16px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <div style="font-size:48px;margin-bottom:12px">&#9989;</div>
        <h1 style="color:#222;font-size:22px;margin:0 0 8px">Email confirmé !</h1>
        <p style="color:#555;margin:0 0 20px">Votre adresse email a été vérifiée avec succès.</p>
        <a href="${BASE_URL}" style="background:#ff385c;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Retourner sur ONETOONE.booking</a>
      </div></body></html>`)
  } catch (e) { res.status(500).send('Erreur de vérification') }
})

app.post('/api/auth/resend-verification', auth, async (req, res) => {
  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    if (user.verified) return res.json({ message: 'Email déjà vérifié' })
    const verificationToken = user.verificationToken || uuidv4()
    if (!user.verificationToken) run('UPDATE users SET verificationToken = ? WHERE id = ?', [verificationToken, user.id])
    await mail.sendVerificationEmail(user.email, user.name, verificationToken)
    res.json({ message: 'Email de vérification renvoyé !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/host', auth, (req, res) => {
  try {
    const { phone } = req.body
    const user = queryOne('SELECT verified FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    if (!user.verified) return res.status(403).json({ error: 'Vous devez confirmer votre email avant de devenir hôte', needsVerification: true })
    run('UPDATE users SET isHost = 1, hostSince = datetime("now"), phone = ? WHERE id = ?', [phone || '', req.user.id])
    const token = jwt.sign({ id:req.user.id, name:req.user.name, email:req.user.email, isHost:1, verified:1 }, JWT_SECRET, { expiresIn:'7d' })
    res.json({ token, user:{ id:req.user.id, name:req.user.name, email:req.user.email, isHost:1, phone:phone||'', verified:1 } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Listings (public) ─── */
app.get('/api/listings', (req, res) => {
  try {
    let sql = 'SELECT l.*, u.name as hostName FROM listings l JOIN users u ON l.hostId = u.id WHERE l.active = 1'
    const params = []
    if (req.query.city) { sql += ' AND LOWER(l.city) LIKE ?'; params.push(`%${req.query.city.toLowerCase()}%`) }
    if (req.query.category) { sql += ' AND l.category = ?'; params.push(req.query.category) }
    if (req.query.minPrice) { sql += ' AND l.price >= ?'; params.push(Number(req.query.minPrice)) }
    if (req.query.maxPrice) { sql += ' AND l.price <= ?'; params.push(Number(req.query.maxPrice)) }
    if (req.query.type) { sql += ' AND l.type = ?'; params.push(req.query.type) }
    if (req.query.guests) { sql += ' AND l.guests >= ?'; params.push(Number(req.query.guests)) }
    if (req.query.bedrooms) { sql += ' AND l.bedrooms >= ?'; params.push(Number(req.query.bedrooms)) }
    if (req.query.search) {
      sql += ' AND (LOWER(l.title) LIKE ? OR LOWER(l.description) LIKE ? OR LOWER(l.city) LIKE ?)'
      const q = `%${req.query.search.toLowerCase()}%`; params.push(q, q, q)
    }
    const sort = req.query.sort || 'rating'
    const allowedSort = { rating:'l.rating', price:'l.price', reviews:'l.reviewCount', newest:'l.createdAt' }
    sql += ` ORDER BY ${allowedSort[sort] || 'l.rating'} ${req.query.order === 'ASC' ? 'ASC' : 'DESC'}`
    sql += ' LIMIT ? OFFSET ?'; params.push(Math.min(Number(req.query.limit) || 50, 100), Number(req.query.offset) || 0)
    res.json(query(sql, params).map(formatListing))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/listings/:id', (req, res) => {
  const l = queryOne('SELECT l.*, u.name as hostName, u.hostSince, u.isHost FROM listings l JOIN users u ON l.hostId = u.id WHERE l.id = ?', [req.params.id])
  if (!l) return res.status(404).json({ error: 'Logement non trouvé' })
  l.reviews = query('SELECT r.*, u.name as userName FROM reviews r JOIN users u ON r.userId = u.id WHERE r.listingId = ? ORDER BY r.createdAt DESC LIMIT 10', [req.params.id])
  res.json(formatListing(l))
})

app.get('/api/categories', (req, res) => {
  res.json(query('SELECT category, COUNT(*) as count, ROUND(AVG(price),0) as avgPrice, ROUND(AVG(rating),2) as avgRating FROM listings WHERE active = 1 GROUP BY category ORDER BY count DESC'))
})

/* ─── Host Listings CRUD ─── */
app.get('/api/host/listings', auth, (req, res) => {
  const rows = query('SELECT * FROM listings WHERE hostId = ? ORDER BY createdAt DESC', [req.user.id])
  res.json(rows.map(formatListing))
})

app.post('/api/listings', auth, (req, res) => {
  try {
    const { title, description, type, category, city, country, price, images, guests, bedrooms, beds, baths, amenities, lat, lng } = req.body
    if (!title || !type || !city || !price) return res.status(400).json({ error: 'Titre, type, ville et prix requis' })
    if (!req.user.isHost) return res.status(403).json({ error: 'Vous devez être hôte pour publier' })
    const id = uuidv4()
    const imgStr = Array.isArray(images) ? images.join('|') : (images || '')
    const amenStr = Array.isArray(amenities) ? amenities.join(', ') : (amenities || '')
    run('INSERT INTO listings (id,hostId,title,description,type,category,city,country,price,images,guests,bedrooms,beds,baths,amenities,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, req.user.id, title, description || '', type, category || 'ville', city, country || 'France', Number(price), imgStr, Number(guests)||2, Number(bedrooms)||1, Number(beds)||1, Number(baths)||1, amenStr, lat||null, lng||null])
    res.json({ id, message: 'Logement créé !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/listings/:id', auth, (req, res) => {
  try {
    const listing = queryOne('SELECT * FROM listings WHERE id = ? AND hostId = ?', [req.params.id, req.user.id])
    if (!listing) return res.status(404).json({ error: 'Logement non trouvé ou non autorisé' })
    const { title, description, type, category, city, country, price, images, guests, bedrooms, beds, baths, amenities, lat, lng, active } = req.body
    const imgStr = Array.isArray(images) ? images.join('|') : (images !== undefined ? images : listing.images)
    const amenStr = Array.isArray(amenities) ? amenities.join(', ') : (amenities !== undefined ? amenities : listing.amenities)
    run('UPDATE listings SET title=?,description=?,type=?,category=?,city=?,country=?,price=?,images=?,guests=?,bedrooms=?,beds=?,baths=?,amenities=?,lat=?,lng=?,active=? WHERE id=?',
      [title||listing.title, description!==undefined?description:listing.description, type||listing.type, category||listing.category, city||listing.city, country||listing.country,
       price!==undefined?Number(price):listing.price, imgStr, guests!==undefined?Number(guests):listing.guests, bedrooms!==undefined?Number(bedrooms):listing.bedrooms,
       beds!==undefined?Number(beds):listing.beds, baths!==undefined?Number(baths):listing.baths, amenStr, lat!==undefined?lat:listing.lat, lng!==undefined?lng:listing.lng,
       active!==undefined?active:listing.active, req.params.id])
    res.json({ message: 'Logement mis à jour !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/listings/:id', auth, (req, res) => {
  const listing = queryOne('SELECT * FROM listings WHERE id = ? AND hostId = ?', [req.params.id, req.user.id])
  if (!listing) return res.status(404).json({ error: 'Logement non trouvé ou non autorisé' })
  run('DELETE FROM listings WHERE id = ?', [req.params.id])
  res.json({ message: 'Logement supprimé' })
})

/* ─── Bookings ─── */
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { listingId, checkIn, checkOut, guests, message } = req.body
    const listing = queryOne('SELECT l.*, u.name as hostName, u.email as hostEmail FROM listings l JOIN users u ON l.hostId = u.id WHERE l.id = ? AND l.active = 1', [listingId])
    if (!listing) return res.status(404).json({ error: 'Logement non trouvé' })
    if (listing.hostId === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre propre logement' })
    const existing = queryOne('SELECT id FROM bookings WHERE listingId = ? AND status != "annulé" AND ((checkIn BETWEEN ? AND ?) OR (checkOut BETWEEN ? AND ?) OR (? BETWEEN checkIn AND checkOut))',
      [listingId, checkIn, checkOut, checkIn, checkOut, checkIn])
    if (existing) return res.status(409).json({ error: 'Ces dates sont déjà réservées' })
    const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    const id = uuidv4()
    run('INSERT INTO bookings (id,listingId,userId,checkIn,checkOut,guests,totalPrice,nights,status,message) VALUES (?,?,?,?,?,?,?,?,"en_attente",?)',
      [id, listingId, req.user.id, checkIn, checkOut, guests || 1, listing.price * nights, nights, message || ''])
    try {
      const fd = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
      await mail.sendBookingRequestEmail(listing.hostEmail, listing.hostName, req.user.name, listing.title, fd(checkIn), fd(checkOut), nights, listing.price * nights, message)
    } catch (mailErr) { console.error('Mail error:', mailErr.message) }
    res.json({ id, totalPrice: listing.price * nights, nights, status: 'en_attente', message: 'Demande envoyée ! En attente de confirmation.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/bookings', auth, (req, res) => {
  res.json(query(`SELECT b.*, l.title, l.images, l.price as listingPrice, l.city, u.name as hostName
    FROM bookings b JOIN listings l ON b.listingId = l.id JOIN users u ON l.hostId = u.id
    WHERE b.userId = ? ORDER BY b.createdAt DESC`, [req.user.id])
    .map(b => ({ ...b, images: b.images ? b.images.split('|')[0] : '' })))
})

app.put('/api/bookings/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body
    if (!['confirmé','annulé','terminé'].includes(status)) return res.status(400).json({ error: 'Statut invalide' })
    const booking = queryOne('SELECT b.*, l.hostId, l.title as listingTitle FROM bookings b JOIN listings l ON b.listingId = l.id WHERE b.id = ?', [req.params.id])
    if (!booking) return res.status(404).json({ error: 'Réservation non trouvée' })
    if (booking.hostId !== req.user.id && booking.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    if (status === 'annulé' && booking.userId !== req.user.id && booking.hostId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    run('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id])
    try {
      const guest = queryOne('SELECT name, email FROM users WHERE id = ?', [booking.userId])
      const fd = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
      await mail.sendBookingStatusEmail(guest.email, guest.name, booking.listingTitle, status, fd(booking.checkIn), fd(booking.checkOut), booking.totalPrice)
    } catch (mailErr) { console.error('Mail error:', mailErr.message) }
    res.json({ message: `Réservation ${status}` })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/bookings/:id', auth, (req, res) => {
  const booking = queryOne('SELECT b.*, l.hostId FROM bookings b JOIN listings l ON b.listingId = l.id WHERE b.id = ?', [req.params.id])
  if (!booking) return res.status(404).json({ error: 'Réservation non trouvée' })
  if (booking.userId !== req.user.id && booking.hostId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
  run('DELETE FROM bookings WHERE id = ?', [req.params.id])
  res.json({ message: 'Réservation supprimée' })
})

/* ─── Host Bookings ─── */
app.get('/api/host/bookings', auth, (req, res) => {
  const bookings = query(`SELECT b.*, l.title, l.images, l.price as listingPrice, l.city, u.name as guestName, u.email as guestEmail
    FROM bookings b JOIN listings l ON b.listingId = l.id JOIN users u ON b.userId = u.id
    WHERE l.hostId = ? ORDER BY b.createdAt DESC`, [req.user.id])
  res.json(bookings.map(b => ({ ...b, images: b.images ? b.images.split('|')[0] : '' })))
})

/* ─── Reviews ─── */
app.post('/api/reviews', auth, (req, res) => {
  try {
    const { listingId, rating, comment } = req.body
    const booking = queryOne('SELECT id FROM bookings WHERE listingId = ? AND userId = ? AND status = "terminé"', [listingId, req.user.id])
    if (!booking) return res.status(400).json({ error: 'Vous devez avoir séjourné pour laisser un avis' })
    run('INSERT INTO reviews (id,listingId,userId,rating,comment) VALUES (?,?,?,?,?)', [uuidv4(), listingId, req.user.id, rating, comment || ''])
    const s = queryOne('SELECT ROUND(AVG(rating),2) as a, COUNT(*) as c FROM reviews WHERE listingId = ?', [listingId])
    run('UPDATE listings SET rating = ?, reviewCount = ? WHERE id = ?', [s.a, s.c, listingId])
    res.json({ message: 'Avis ajouté !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Stats ─── */
app.get('/api/host/stats', auth, (req, res) => {
  const listingCount = queryOne('SELECT COUNT(*) as c FROM listings WHERE hostId = ?', [req.user.id]).c
  const bookingCount = queryOne('SELECT COUNT(*) as c FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ?', [req.user.id]).c
  const confirmedCount = queryOne('SELECT COUNT(*) as c FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ? AND b.status = "confirmé"', [req.user.id]).c
  const totalRevenue = queryOne('SELECT COALESCE(SUM(b.totalPrice),0) as s FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ? AND b.status = "confirmé"', [req.user.id]).s
  const pendingCount = queryOne('SELECT COUNT(*) as c FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ? AND b.status = "en_attente"', [req.user.id]).c
  res.json({ listingCount, bookingCount, confirmedCount, totalRevenue, pendingCount })
})

/* ─── Cloudinary Upload ─── */
app.post('/api/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' })
    const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    const result = await cloudinary.uploader.upload(b64, { folder: 'onetoneone', resource_type: 'image' })
    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/upload-multiple', auth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'Aucune image fournie' })
    const results = await Promise.all(
      req.files.map(f => {
        const b64 = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
        return cloudinary.uploader.upload(b64, { folder: 'onetoneone', resource_type: 'image' })
      })
    )
    res.json(results.map(r => ({ url: r.secure_url, publicId: r.public_id })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Serve ─── */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))

async function start() {
  await initDb()
  app.listen(PORT, () => console.log(`\n  🏡 ONETOONE.booking lancé sur http://localhost:${PORT}\n`))
}
start()
