CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  isHost INTEGER DEFAULT 0,
  hostSince TIMESTAMPTZ,
  phone TEXT,
  verified INTEGER DEFAULT 0,
  verificationToken TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  hostId TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ville',
  city TEXT NOT NULL,
  country TEXT DEFAULT 'France',
  price REAL NOT NULL,
  images TEXT,
  guests INTEGER DEFAULT 2,
  bedrooms INTEGER DEFAULT 1,
  beds INTEGER DEFAULT 1,
  baths INTEGER DEFAULT 1,
  amenities TEXT,
  lat REAL,
  lng REAL,
  rating REAL DEFAULT 4.5,
  reviewCount INTEGER DEFAULT 0,
  superhost INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL REFERENCES listings(id),
  userId TEXT NOT NULL REFERENCES users(id),
  checkIn TEXT NOT NULL,
  checkOut TEXT NOT NULL,
  guests INTEGER DEFAULT 1,
  totalPrice REAL NOT NULL,
  nights INTEGER DEFAULT 1,
  status TEXT DEFAULT 'en_attente',
  message TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  listingId TEXT NOT NULL REFERENCES listings(id),
  userId TEXT NOT NULL REFERENCES users(id),
  rating REAL NOT NULL,
  comment TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paymentMethod TEXT DEFAULT 'carte';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paymentStatus TEXT DEFAULT 'en_attente';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paymentIntentId TEXT;

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  listingId TEXT REFERENCES listings(id),
  senderId TEXT REFERENCES users(id),
  receiverId TEXT REFERENCES users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  userId TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  relatedId TEXT,
  read BOOLEAN DEFAULT false,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
