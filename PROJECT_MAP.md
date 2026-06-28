# PROJECT_MAP — AI Agent Marketplace

## TECH_STACK

| Layer        | Technology       | Version   | Purpose                                    |
|-------------|------------------|-----------|---------------------------------------------|
| Runtime     | Node.js          | 24.13.0   | LTS runtime                                 |
| Frontend    | Vue.js           | 3.5.39    | SPA framework                               |
| Build       | Vite             | 8.1.0     | Dev server + bundler                        |
| Plugin      | @vitejs/plugin-vue| 6.0.7    | Vite Vue integration                        |
| BaaS        | Firebase Client  | 12.15.0   | Auth + Firestore SDK                        |
| Auth        | Firebase Auth    | —         | Email/password authentication               |
| DB          | Firestore        | —         | Agents, categories, purchases, users        |
| Router      | vue-router       | 5.1.0     | Client-side routing                         |
| Dates       | date-fns         | 4.4.0     | Date formatting                             |

## SYSTEM_FLOW

```
[User] → Vue SPA (index.html)
            ↓
        [Router] → /, /browse, /agents/:id, /login, /profile
            ↓
        [Firebase Auth] → login / register
            ↓
        [Firestore] → agents, categories, purchases
            ↓
        [Views] → Home (hero + featured), Browse (list + filter),
                   Detail (specs + purchase), Profile (library)
```

**Auth flow**:
1. User lands on public pages (home, browse, detail)
2. Signs in via /login (email/password)
3. Session persisted by Firebase Auth
4. Authenticated user can purchase agents and view library at /profile

**Data flow**:
- `agents/` — read by all users (public catalog)
- `categories/` — read by all users (filter options)
- `purchases/` — written on purchase, read by owner
- `users/` — auto-managed by Firebase Auth

## ARCHITECTURE

```
src/
├── main.js                    # Vue app bootstrap
├── App.vue                    # Root → NavBar + <router-view>
├── firebase.js                # Firebase init (config via env vars)
├── router/
│   └── index.js               # Route definitions (lazy-loaded)
├── domains/                   # DDD — Feature-based
│   ├── home/
│   │   └── HomePage.vue       # Landing: hero, featured agents, categories
│   ├── browse/
│   │   └── BrowsePage.vue     # Agent list with search + category filter
│   ├── agents/
│   │   ├── AgentCard.vue      # Reusable agent card component
│   │   └── AgentDetailPage.vue# Full detail + purchase sidebar
│   ├── auth/
│   │   └── LoginPage.vue      # Login / Register toggle form
│   ├── profile/
│   │   └── ProfilePage.vue    # User purchased agents library
│   ├── catalog/
│   │   ├── useAgents.js       # Agent fetching composable
│   │   └── usePurchases.js    # Purchase CRUD composable
│   └── shared/
│       ├── useAuth.js         # Auth state + login/register/logout
│       └── useLogger.js       # Async console logging
└── assets/
    └── styles.css             # Design system variables + base styles
```

### Design rules
- **No micro-files** : every file has a distinct responsibility
- **No premature abstraction** : shared/ only for logic used ≥ 2×
- **Domain = directory** : all files for a feature are co-located
- **Composable = state + logic** : `use*` patterns for reactive state
- **No TODOs / placeholders** : all code is production-ready, error-handled

## LOGGING

```
Levels  : INFO | WARN | ERROR
Method  : Async buffer with microtask flush (DEV: console.group)
Format  : { timestamp, level, message, data }
```

## ORPHANS & PENDING

- [ ] **Firebase config**: create `.env` from `.env.example` with real project credentials
- [ ] **Firestore seed**: run `node scripts/seed-firebase.js` after enabling Firestore + creating service account
- [ ] **Firestore indexes**: create composite index for `purchases` (userId + purchasedAt) if not auto-created
- [ ] **Deployment**: Firebase Hosting or static hosting for `dist/`
