import { ref } from 'vue'
import { auth, hasConfig } from '../../firebase.js'
import { useLogger } from './useLogger.js'

const user = ref(null)
const loading = ref(false)

export function useAuth() {
  const log = useLogger()

  async function login(email, password) {
    if (!hasConfig) {
      log.warn('Firebase not configured — login unavailable')
      throw new Error('Firebase not configured. Set VITE_FIREBASE_* env vars.')
    }
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const cred = await signInWithEmailAndPassword(auth, email, password)
      log.info('User logged in', { uid: cred.user.uid })
      return cred.user
    } catch (err) {
      log.error('Login failed', err.code)
      throw err
    }
  }

  async function register(email, password) {
    if (!hasConfig) {
      log.warn('Firebase not configured — register unavailable')
      throw new Error('Firebase not configured. Set VITE_FIREBASE_* env vars.')
    }
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      log.info('User registered', { uid: cred.user.uid })
      return cred.user
    } catch (err) {
      log.error('Registration failed', err.code)
      throw err
    }
  }

  async function logout() {
    if (!hasConfig) return
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
    log.info('User logged out')
  }

  return { user, loading, login, register, logout }
}
