const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const dns = require('dns')
const { v4: uuidv4 } = require('uuid')
const { Pool } = require('pg')
const mail = require('./mail')
const cloudinary = require('cloudinary').v2
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || 'dlhujvgrp',
  api_key: process.env.CLOUD_API_KEY || '532689538597837',
  api_secret: process.env.CLOUD_API_SECRET || 'MD1S6e72HvUBapoqSqifZPWyeV4'
})

const stripe = process.env.STRIPE_SECRET ? require('stripe')(process.env.STRIPE_SECRET) : null

const app = express()
const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const JWT_SECRET = process.env.JWT_SECRET || 'onetoneone-booking-secret-2024'

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

/* ─── PostgreSQL connection ─── */
const DB_USER = process.env.DB_USER || 'postgres.hkxybruywbkpqisrtuww'
const DB_PASS = process.env.DB_PASS   // set this in Render env vars, not hardcoded
const DB_HOST = process.env.DB_HOST || 'aws-0-eu-west-2.pooler.supabase.com'
const DB_PORT = process.env.DB_PORT || 6543   // 6543 = transaction pooler, 5432 = session pooler
const DB_NAME = process.env.DB_NAME || 'postgres'
async function findDatabase() {
  const url = (host, port) => `postgresql://${DB_USER}:${DB_PASS}@${host}:${port}/${DB_NAME}`

  // Try direct IPv6 connection first (resolve hostname to IPv6 ourselves)
  try {
    const addrs = await dns.promises.resolve6(DIRECT_HOST)
    const ipv6 = addrs[0]
    console.log(`Trying direct IPv6 → [${ipv6}]:5432`)
    const pool = new Pool({ connectionString: url(`[${ipv6}]`, 5432), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 })
    await pool.query('SELECT 1')
    console.log('✓ Connected via direct IPv6')
    return pool
  } catch (e) { console.log('  Direct IPv6 failed:', e.message) }

  // Try pooler hosts with IPv4
  for (const host of POOLER_HOSTS) {
    try {
      console.log(`Trying pooler → ${host}:6543`)
      const pool = new Pool({ connectionString: url(host, 6543), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 })
      await pool.query('SELECT 1')
      console.log(`✓ Connected via pooler ${host}`)
      return pool
    } catch (e) { console.log(`  ${host} failed:`, e.message) }
  }

  // Fallback: try direct with hostname (might work if DNS has both A/AAAA)
  try {
    console.log('Fallback: trying direct hostname...')
    const pool = new Pool({ connectionString: url(DIRECT_HOST, 5432), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 })
    await pool.query('SELECT 1')
    console.log('✓ Connected via direct hostname')
    return pool
  } catch (e) { console.log('  Fallback failed:', e.message) }

  throw new Error('Could not connect to any database endpoint')
}

const pool = new Pool({
  connectionString: `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

async function initDb() {
  await pool.query('SELECT 1')
  console.log('✓ Connected to Supabase via pooler')
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    try { await pool.query(stmt) } catch (e) { console.error('  Schema statement error:', e.message) }
  }
  console.log('✓ Database ready')
}

function q(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

async function query(sql, params = []) {
  const res = await pool.query(q(sql), params)
  return res.rows
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows.length ? rows[0] : null
}

async function run(sql, params = []) {
  await pool.query(q(sql), params)
}

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Non authentifié' })
  try { req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Token invalide' }) }
}

// PostgreSQL folds unquoted identifiers to lowercase.
// This helper renames common lowered keys to their camelCase form
// so the frontend always receives the correct property names.
const CASE_MAP = {
  hostid:'hostId', hostname:'hostName', hostsince:'hostSince',
  listingid:'listingId', userid:'userId',
  checkin:'checkIn', checkout:'checkOut',
  totalprice:'totalPrice', createdat:'createdAt',
  reviewcount:'reviewCount', guestname:'guestName',
  guestemail:'guestEmail', listingprice:'listingPrice',
  bookingcount:'bookingCount',
  verificationtoken:'verificationToken',
  senderid:'senderId', receiverid:'receiverId',
  sendername:'senderName', listingtitle:'listingTitle',
  otherid:'otherId', othername:'otherName',
  lastmessage:'lastMessage',
  paymentmethod:'paymentMethod', paymentstatus:'paymentStatus',
  relatedid:'relatedId',
  paymentintentid:'paymentIntentId',
}

function fixCase(obj) {
  if (!obj) return obj
  for (const [k, v] of Object.entries(CASE_MAP)) {
    if (obj[k] !== undefined && k !== v) {
      obj[v] = obj[k]
      delete obj[k]
    }
  }
  return obj
}

function formatListing(l) {
  if (!l) return null
  l.images = l.images ? l.images.split('|').filter(Boolean) : []
  l.amenities = l.amenities ? l.amenities.split(', ').filter(Boolean) : []
  return fixCase(l)
}

/* ─── Auth ─── */
// Test endpoint - works without DB
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs requis' })
    if (password !== confirmPassword) return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' })
    if (password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' })
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' })
    const id = uuidv4()
    const token = jwt.sign({ id, name, email, isHost:0, verified:1 }, JWT_SECRET, { expiresIn:'7d' })
    await run('INSERT INTO users (id,name,email,password,verified) VALUES (?,?,?,?,1)', [id, name, email, bcrypt.hashSync(password, 10)])
    res.json({ token, user:{ id, name, email, isHost:0, verified:1 }, message: 'Compte créé avec succès !' })
    mail.sendWelcomeEmail(email, name).catch(e => console.error('Mail error:', e.message))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = fixCase(await queryOne('SELECT * FROM users WHERE email = ?', [email]))
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    const token = jwt.sign({ id:user.id, name:user.name, email:user.email, isHost:user.isHost||0, verified:user.verified }, JWT_SECRET, { expiresIn:'7d' })
    res.json({ token, user:{ id:user.id, name:user.name, email:user.email, isHost:user.isHost||0, verified:user.verified } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const u = await queryOne('SELECT id,name,email,isHost,hostSince,phone,verified FROM users WHERE id = ?', [req.user.id])
    if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    res.json(fixCase(u))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).send('Token manquant')
    const user = await queryOne('SELECT id FROM users WHERE verificationToken = ?', [token])
    if (!user) return res.status(400).send('Token invalide ou expiré')
    await run('UPDATE users SET verified = 1, verificationToken = NULL WHERE id = ?', [user.id])
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
    const user = fixCase(await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]))
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    if (user.verified) return res.json({ message: 'Email déjà vérifié' })
    const verificationToken = user.verificationToken || uuidv4()
    if (!user.verificationToken) await run('UPDATE users SET verificationToken = ? WHERE id = ?', [verificationToken, user.id])
    mail.sendVerificationEmail(user.email, user.name, verificationToken).catch(e => console.error('Mail error:', e.message))
    res.json({ message: 'Email de vérification renvoyé !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/host', auth, async (req, res) => {
  try {
    const { phone } = req.body
    const user = await queryOne('SELECT verified FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    if (!user.verified) return res.status(403).json({ error: 'Vous devez confirmer votre email avant de devenir hôte', needsVerification: true })
    await run('UPDATE users SET isHost = 1, hostSince = NOW(), phone = ? WHERE id = ?', [phone || '', req.user.id])
    const token = jwt.sign({ id:req.user.id, name:req.user.name, email:req.user.email, isHost:1, verified:1 }, JWT_SECRET, { expiresIn:'7d' })
    res.json({ token, user:{ id:req.user.id, name:req.user.name, email:req.user.email, isHost:1, phone:phone||'', verified:1 } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Listings (public) ─── */
app.get('/api/listings', async (req, res) => {
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
    const rows = await query(sql, params)
    res.json(rows.map(formatListing))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/listings/:id', async (req, res) => {
  try {
    const l = await queryOne('SELECT l.*, u.name as hostName, u.hostSince, u.isHost FROM listings l JOIN users u ON l.hostId = u.id WHERE l.id = ?', [req.params.id])
    if (!l) return res.status(404).json({ error: 'Logement non trouvé' })
    l.reviews = await query('SELECT r.*, u.name as userName FROM reviews r JOIN users u ON r.userId = u.id WHERE r.listingId = ? ORDER BY r.createdAt DESC LIMIT 10', [req.params.id])
    res.json(formatListing(l))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const DEFAULT_CATEGORIES = ['ville','maisons','sejour-nature','montagne','plage','camping','piscine','vignobles','insolite','arctique']

app.get('/api/categories', async (req, res) => {
  try {
    const rows = await query('SELECT category, COUNT(*)::int as count, ROUND(AVG(price),0)::int as avgPrice, ROUND(AVG(rating),2)::numeric as avgRating FROM listings WHERE active = 1 GROUP BY category ORDER BY count DESC')
    const catMap = {}
    rows.forEach(r => catMap[r.category] = r)
    const merged = DEFAULT_CATEGORIES.map(cat =>
      catMap[cat] || { category: cat, count: 0, avgPrice: 0, avgRating: 0 }
    )
    res.json(merged)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Host Listings CRUD ─── */
app.get('/api/host/listings', auth, async (req, res) => {
  try {
    const rows = await query('SELECT l.*, (SELECT COUNT(*)::int FROM bookings WHERE listingId = l.id) as bookingCount FROM listings l WHERE l.hostId = ? ORDER BY l.createdAt DESC', [req.user.id])
    res.json(rows.map(formatListing))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/listings', auth, async (req, res) => {
  try {
    const { title, description, type, category, city, country, price, images, guests, bedrooms, beds, baths, amenities, lat, lng } = req.body
    if (!title || !type || !city || !price) return res.status(400).json({ error: 'Titre, type, ville et prix requis' })
    if (!req.user.isHost) return res.status(403).json({ error: 'Vous devez être hôte pour publier' })
    const id = uuidv4()
    const imgStr = Array.isArray(images) ? images.join('|') : (images || '')
    const amenStr = Array.isArray(amenities) ? amenities.join(', ') : (amenities || '')
    console.log(`  Create listing: images count=${Array.isArray(images) ? images.length : typeof images}, imgStr="${imgStr.slice(0,80)}..."`)
    await run('INSERT INTO listings (id,hostId,title,description,type,category,city,country,price,images,guests,bedrooms,beds,baths,amenities,lat,lng,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, req.user.id, title, description || '', type, category || 'ville', city, country || 'France', Number(price), imgStr, Number(guests)||2, Number(bedrooms)||1, Number(beds)||1, Number(baths)||1, amenStr, lat||null, lng||null, 1])
    res.json({ id, message: 'Logement créé !' })
  } catch (e) { console.error('  Create listing error:', e.message); res.status(500).json({ error: e.message }) }
})

app.put('/api/listings/:id', auth, async (req, res) => {
  try {
    const listing = await queryOne('SELECT * FROM listings WHERE id = ? AND hostId = ?', [req.params.id, req.user.id])
    if (!listing) return res.status(404).json({ error: 'Logement non trouvé ou non autorisé' })
    const { title, description, type, category, city, country, price, images, guests, bedrooms, beds, baths, amenities, lat, lng, active } = req.body
    const imgStr = Array.isArray(images) ? images.join('|') : (images !== undefined ? images : listing.images)
    console.log(`  Update listing ${req.params.id}: images type=${typeof images}, isArray=${Array.isArray(images)}, imgStr="${(imgStr||'').slice(0,80)}"`)
    const amenStr = Array.isArray(amenities) ? amenities.join(', ') : (amenities !== undefined ? amenities : listing.amenities)
    await run('UPDATE listings SET title=?,description=?,type=?,category=?,city=?,country=?,price=?,images=?,guests=?,bedrooms=?,beds=?,baths=?,amenities=?,lat=?,lng=?,active=? WHERE id=?',
      [title||listing.title, description!==undefined?description:listing.description, type||listing.type, category||listing.category, city||listing.city, country||listing.country,
       price!==undefined?Number(price):listing.price, imgStr, guests!==undefined?Number(guests):listing.guests, bedrooms!==undefined?Number(bedrooms):listing.bedrooms,
       beds!==undefined?Number(beds):listing.beds, baths!==undefined?Number(baths):listing.baths, amenStr, lat!==undefined?lat:listing.lat, lng!==undefined?lng:listing.lng,
       active!==undefined?active:listing.active, req.params.id])
    res.json({ message: 'Logement mis à jour !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/listings/:id', auth, async (req, res) => {
  try {
    const listing = await queryOne('SELECT * FROM listings WHERE id = ? AND hostId = ?', [req.params.id, req.user.id])
    if (!listing) return res.status(404).json({ error: 'Logement non trouvé ou non autorisé' })
    await run('DELETE FROM listings WHERE id = ?', [req.params.id])
    res.json({ message: 'Logement supprimé' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Bookings ─── */
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { listingId, checkIn, checkOut, guests, message, paymentMethod, paymentIntentId } = req.body
    const raw = await queryOne('SELECT l.*, u.name as hostName, u.email as hostEmail FROM listings l JOIN users u ON l.hostId = u.id WHERE l.id = ? AND l.active = 1', [listingId])
    if (!raw) return res.status(404).json({ error: 'Logement non trouvé' })
    const listing = fixCase(raw)
    if (listing.hostId === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre logement' })
    const existing = await queryOne('SELECT id FROM bookings WHERE listingId = ? AND status != \'annulé\' AND ((checkIn BETWEEN ? AND ?) OR (checkOut BETWEEN ? AND ?) OR (? BETWEEN checkIn AND checkOut))',
      [listingId, checkIn, checkOut, checkIn, checkOut, checkIn])
    if (existing) return res.status(409).json({ error: 'Ces dates sont déjà réservées' })
    const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    const id = uuidv4()
    const pm = paymentMethod || 'carte'
    await run('INSERT INTO bookings (id,listingId,userId,checkIn,checkOut,guests,totalPrice,nights,status,message,paymentMethod,paymentStatus,paymentIntentId) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, listingId, req.user.id, checkIn, checkOut, guests || 1, listing.price * nights, nights, 'en_attente', message || '', pm, pm === 'carte' ? 'autorisé' : pm === 'onsite' ? 'sur_place' : 'en_attente', paymentIntentId || null])
    await run('INSERT INTO notifications (userId, type, title, message, relatedId) VALUES (?,?,?,?,?)',
      [listing.hostId, 'booking', 'Nouvelle réservation', `${req.user.name} souhaite réserver ${listing.title}`, id])
    const fd = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    mail.sendBookingRequestEmail(listing.hostEmail, listing.hostName, req.user.name, listing.title, fd(checkIn), fd(checkOut), nights, listing.price * nights, message).catch(e => console.error('Mail error:', e.message))
    res.json({ id, totalPrice: listing.price * nights, nights, status: 'en_attente', paymentMethod: pm, message: 'Demande envoyée ! En attente de confirmation.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/bookings', auth, async (req, res) => {
  try {
    const rows = await query('SELECT b.*, l.title, l.images, l.price as listingPrice, l.city, u.name as hostName FROM bookings b JOIN listings l ON b.listingId = l.id JOIN users u ON l.hostId = u.id WHERE b.userId = ? ORDER BY b.createdAt DESC', [req.user.id])
    res.json(rows.map(b => fixCase({ ...b, images: b.images ? b.images.split('|')[0] : '' })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/bookings/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body
    if (!['confirmé','annulé','terminé'].includes(status)) return res.status(400).json({ error: 'Statut invalide' })
    const raw = await queryOne('SELECT b.*, l.hostId, l.title as listingTitle FROM bookings b JOIN listings l ON b.listingId = l.id WHERE b.id = ?', [req.params.id])
    if (!raw) return res.status(404).json({ error: 'Réservation non trouvée' })
    const booking = fixCase(raw)
    if (booking.hostId !== req.user.id && booking.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    await run('UPDATE bookings SET status = ?, paymentStatus = CASE WHEN ? = \'confirmé\' THEN \'payé\' ELSE paymentStatus END WHERE id = ?', [status, status, req.params.id])
    await run('INSERT INTO notifications (userId, type, title, message, relatedId) VALUES (?,?,?,?,?)',
      [booking.userId, 'booking', 'Réservation ' + status, `Votre réservation pour ${booking.listingTitle} a été ${status}`, req.params.id])
    if (status === 'confirmé' && booking.paymentIntentId && stripe) {
      stripe.paymentIntents.capture(booking.paymentIntentId).then(() => {}).catch(e => console.error('Capture error:', e.message))
    }
    queryOne('SELECT name, email FROM users WHERE id = ?', [booking.userId]).then(guest => {
      const fd = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
      mail.sendBookingStatusEmail(guest.email, guest.name, booking.listingTitle, status, fd(booking.checkIn), fd(booking.checkOut), booking.totalPrice).catch(e => console.error('Mail error:', e.message))
    }).catch(e => console.error('DB error fetching guest:', e.message))
    res.json({ message: `Réservation ${status}` })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/bookings/:id', auth, async (req, res) => {
  try {
    const raw = await queryOne('SELECT b.*, l.hostId FROM bookings b JOIN listings l ON b.listingId = l.id WHERE b.id = ?', [req.params.id])
    if (!raw) return res.status(404).json({ error: 'Réservation non trouvée' })
    const booking = fixCase(raw)
    if (booking.userId !== req.user.id && booking.hostId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })
    await run('DELETE FROM bookings WHERE id = ?', [req.params.id])
    res.json({ message: 'Réservation supprimée' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Host Bookings ─── */
app.get('/api/host/bookings', auth, async (req, res) => {
  try {
    const bookings = await query('SELECT b.*, l.title, l.images, l.price as listingPrice, l.city, u.name as guestName, u.email as guestEmail FROM bookings b JOIN listings l ON b.listingId = l.id JOIN users u ON b.userId = u.id WHERE l.hostId = ? ORDER BY b.createdAt DESC', [req.user.id])
    res.json(bookings.map(b => fixCase({ ...b, images: b.images ? b.images.split('|')[0] : '' })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Reviews ─── */
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { listingId, rating, comment } = req.body
    const booking = await queryOne('SELECT id FROM bookings WHERE listingId = ? AND userId = ? AND status = \'terminé\'', [listingId, req.user.id])
    if (!booking) return res.status(400).json({ error: 'Vous devez avoir séjourné pour laisser un avis' })
    await run('INSERT INTO reviews (id,listingId,userId,rating,comment) VALUES (?,?,?,?,?)', [uuidv4(), listingId, req.user.id, rating, comment || ''])
    const s = await queryOne('SELECT ROUND(AVG(rating),2)::numeric as a, COUNT(*)::int as c FROM reviews WHERE listingId = ?', [listingId])
    await run('UPDATE listings SET rating = ?, reviewCount = ? WHERE id = ?', [s.a, s.c, listingId])
    res.json({ message: 'Avis ajouté !' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Stats ─── */
app.get('/api/host/stats', auth, async (req, res) => {
  try {
    const listingCount = (await queryOne('SELECT COUNT(*)::int as c FROM listings WHERE hostId = ?', [req.user.id])).c
    const bookingCount = (await queryOne('SELECT COUNT(*)::int as c FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ?', [req.user.id])).c
    const confirmedCount = (await queryOne('SELECT COUNT(*)::int as c FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ? AND b.status = \'confirmé\'', [req.user.id])).c
    const totalRevenue = (await queryOne('SELECT COALESCE(SUM(b.totalPrice),0) as s FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ? AND b.status = \'confirmé\'', [req.user.id])).s
    const pendingCount = (await queryOne('SELECT COUNT(*)::int as c FROM bookings b JOIN listings l ON b.listingId = l.id WHERE l.hostId = ? AND b.status = \'en_attente\'', [req.user.id])).c
    res.json({ listingCount, bookingCount, confirmedCount, totalRevenue: Number(totalRevenue), pendingCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Messages / Chat ─── */
app.post('/api/messages', auth, async (req, res) => {
  try {
    const { listingId, receiverId, content } = req.body
    if (!listingId || !receiverId || !content) return res.status(400).json({ error: 'Champs requis' })
    await run('INSERT INTO messages (listingId, senderId, receiverId, content) VALUES (?,?,?,?)', [listingId, req.user.id, receiverId, content])
    await run('INSERT INTO notifications (userId, type, title, message, relatedId) VALUES (?,?,?,?,?)',
      [receiverId, 'message', 'Nouveau message', `${req.user.name} vous a envoyé un message`, listingId])
    res.json({ message: 'Message envoyé' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/messages/:listingId/:otherId', auth, async (req, res) => {
  try {
    const rows = await query(
      'SELECT m.*, u.name as senderName FROM messages m JOIN users u ON m.senderId = u.id WHERE m.listingId = ? AND ((m.senderId = ? AND m.receiverId = ?) OR (m.senderId = ? AND m.receiverId = ?)) ORDER BY m.createdAt ASC',
      [req.params.listingId, req.user.id, req.params.otherId, req.params.otherId, req.user.id])
    await run('UPDATE messages SET read = true WHERE listingId = ? AND receiverId = ? AND read = false', [req.params.listingId, req.user.id])
    res.json(rows.map(fixCase))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/conversations', auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT ON (m.listingId, LEAST(m.senderId, m.receiverId), GREATEST(m.senderId, m.receiverId))
        m.listingId, l.title as listingTitle, l.images,
        CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END as otherId,
        CASE WHEN m.senderId = ? THEN u2.name ELSE u1.name END as otherName,
        (SELECT content FROM messages m2 WHERE m2.listingId = m.listingId AND ((m2.senderId = ? AND m2.receiverId = ?) OR (m2.senderId = ? AND m2.receiverId = ?)) ORDER BY m2.createdAt DESC LIMIT 1) as lastMessage,
        (SELECT COUNT(*)::int FROM messages WHERE listingId = m.listingId AND receiverId = ? AND read = false) as unread
       FROM messages m
       JOIN users u1 ON m.senderId = u1.id
       JOIN users u2 ON m.receiverId = u2.id
       JOIN listings l ON m.listingId = l.id
       WHERE m.senderId = ? OR m.receiverId = ?
       ORDER BY m.listingId, LEAST(m.senderId, m.receiverId), GREATEST(m.senderId, m.receiverId), m.createdAt DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id])
    res.json(rows.map(r => fixCase({ ...r, images: r.images ? r.images.split('|')[0] : '' })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Notifications ─── */
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', [req.user.id])
    res.json(rows.map(fixCase))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const r = await queryOne('SELECT COUNT(*)::int as c FROM notifications WHERE userId = ? AND read = false', [req.user.id])
    res.json({ count: r.c })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/notifications/read', auth, async (req, res) => {
  try {
    const { id } = req.body
    if (id) { await run('UPDATE notifications SET read = true WHERE id = ? AND userId = ?', [id, req.user.id]) }
    else { await run('UPDATE notifications SET read = true WHERE userId = ?', [req.user.id]) }
    res.json({ message: 'Notifications marquées comme lues' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Stripe Payment ─── */
app.post('/api/create-payment-intent', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Paiement par carte non disponible' })
    const { amount, paymentMethodId, description } = req.body
    if (!amount || !paymentMethodId) return res.status(400).json({ error: 'Montant et méthode requis' })
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'eur',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      description: description || 'Réservation ONETOONE.booking',
      metadata: { userId: req.user.id }
    })
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/capture-payment', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Paiement par carte non disponible' })
    const { paymentIntentId } = req.body
    if (!paymentIntentId) return res.status(400).json({ error: 'ID requis' })
    const intent = await stripe.paymentIntents.capture(paymentIntentId)
    res.json({ status: intent.status, message: 'Paiement capturé' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ─── Cloudinary Upload ─── */
app.post('/api/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' })
    const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    const result = await cloudinary.uploader.upload(b64, { folder: 'onetoneone', resource_type: 'image' })
    console.log(`  Upload OK: ${result.public_id} → ${result.secure_url}`)
    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (e) { console.error('  Upload error:', e.message); res.status(500).json({ error: e.message }) }
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
