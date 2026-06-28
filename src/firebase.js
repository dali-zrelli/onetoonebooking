const hasConfig = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID

let app = null
let db = null
let auth = null

if (hasConfig) {
  const { initializeApp } = await import('firebase/app')
  const { getFirestore } = await import('firebase/firestore')
  const { getAuth } = await import('firebase/auth')

  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  db = getFirestore(app)
  auth = getAuth(app)
}

export { db, auth, hasConfig }
