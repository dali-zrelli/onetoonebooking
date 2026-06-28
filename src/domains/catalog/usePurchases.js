import { ref } from 'vue'
import { db, hasConfig } from '../../firebase.js'
import { useLogger } from '../shared/useLogger.js'

export function usePurchases() {
  const purchases = ref([])
  const loading = ref(false)
  const log = useLogger()

  async function purchaseAgent(userId, agent) {
    if (!userId) throw new Error('User not authenticated')
    if (!hasConfig) {
      log.info('Mock purchase (Firebase not configured)', { agentId: agent.id })
      return 'mock-purchase-id'
    }
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
      const docRef = await addDoc(collection(db, 'purchases'), {
        userId, agentId: agent.id, agentName: agent.name,
        price: agent.price, status: 'completed', purchasedAt: serverTimestamp(),
      })
      log.info('Agent purchased', { purchaseId: docRef.id, agentId: agent.id })
      return docRef.id
    } catch (err) {
      log.error('Purchase failed', err.message)
      throw err
    }
  }

  async function fetchUserPurchases(userId) {
    if (!hasConfig) {
      purchases.value = []
      return
    }
    loading.value = true
    try {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore')
      const q = query(collection(db, 'purchases'), where('userId', '==', userId), orderBy('purchasedAt', 'desc'))
      const snap = await getDocs(q)
      purchases.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
      log.error('Failed to fetch purchases', err.message)
    } finally {
      loading.value = false
    }
  }

  return { purchases, loading, purchaseAgent, fetchUserPurchases }
}
