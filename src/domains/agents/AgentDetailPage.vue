<template>
  <div class="detail-page container">
    <router-link to="/browse" class="back-link">← Back to Browse</router-link>

    <div v-if="loading" class="loading-wrap">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-desc"></div>
    </div>
    <div v-else-if="!agent" class="error-state">
      <div class="empty-icon">⚠️</div>
      <h3>Agent not found</h3>
    </div>
    <template v-else>
      <div class="detail-header glass">
        <div class="detail-thumb">{{ initials }}</div>
        <div class="detail-header-info">
          <div class="detail-meta-top">
            <span class="category-badge">{{ agent.category.replace('-', ' ') }}</span>
            <div class="stars">
              <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.floor(agent.rating) }">★</span>
              <span class="rating-text">{{ agent.rating }} ({{ agent.reviews }} reviews)</span>
            </div>
          </div>
          <h1 class="detail-title">{{ agent.name }}</h1>
          <p class="detail-tagline">{{ agent.tagline }}</p>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">
          <section class="detail-section card">
            <h2>About</h2>
            <p class="detail-description">{{ agent.description }}</p>
          </section>

          <section class="detail-section card">
            <h2>Features</h2>
            <ul class="feature-list">
              <li v-for="(feature, i) in agent.features" :key="i">{{ feature }}</li>
            </ul>
          </section>

          <section class="detail-section card">
            <h2>Specifications</h2>
            <div class="specs-grid">
              <div v-for="(val, key) in agent.specs" :key="key" class="spec-item">
                <span class="spec-key">{{ key }}</span>
                <span class="spec-val">{{ Array.isArray(val) ? val.join(', ') : val }}</span>
              </div>
            </div>
          </section>
        </div>

        <aside class="detail-sidebar">
          <div class="sidebar-card glass">
            <div class="sidebar-price">${{ agent.price }}</div>
            <div class="sidebar-label">One-time purchase</div>
            <button
              class="btn btn-primary purchase-btn"
              :disabled="purchasing || !user"
              @click="handlePurchase"
            >
              {{ purchasing ? 'Processing...' : user ? 'Purchase Now' : 'Sign in to Purchase' }}
            </button>
            <transition name="fade">
              <p v-if="purchaseSuccess" class="success-msg">✓ Purchase successful!</p>
              <p v-if="purchaseError" class="error-msg">{{ purchaseError }}</p>
            </transition>
            <p v-if="!user" class="sidebar-hint">
              <router-link to="/login">Sign in</router-link> to purchase this agent.
            </p>
            <div class="sidebar-divider"></div>
            <div class="sidebar-features">
              <div class="sidebar-feature">✓ Instant access</div>
              <div class="sidebar-feature">✓ Lifetime updates</div>
              <div class="sidebar-feature">✓ 24h support</div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAgents } from '../catalog/useAgents.js'
import { usePurchases } from '../catalog/usePurchases.js'
import { useAuth } from '../shared/useAuth.js'
import { useLogger } from '../shared/useLogger.js'

const route = useRoute()
const { getAgent } = useAgents()
const { purchaseAgent } = usePurchases()
const { user } = useAuth()
const log = useLogger()

const agent = ref(null)
const loading = ref(true)
const purchasing = ref(false)
const purchaseSuccess = ref(false)
const purchaseError = ref('')

const initials = computed(() =>
  (agent.value?.name || '').split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
)

async function handlePurchase() {
  if (!user.value || !agent.value) return
  purchasing.value = true
  purchaseError.value = ''
  purchaseSuccess.value = false
  try {
    await purchaseAgent(user.value.uid, agent.value)
    purchaseSuccess.value = true
  } catch (err) {
    purchaseError.value = 'Purchase failed. Please try again.'
    log.error('Purchase error', err.message)
  } finally {
    purchasing.value = false
  }
}

onMounted(async () => {
  agent.value = await getAgent(route.params.id)
  loading.value = false
})
</script>

<style scoped>
.detail-page {
  padding: 2rem 1.5rem 4rem;
  max-width: 1100px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  transition: color var(--transition);
}

.back-link:hover {
  color: var(--color-primary);
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
}

.skeleton-title {
  height: 32px;
  width: 60%;
}

.skeleton-desc {
  height: 16px;
  width: 80%;
}

.error-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
}

.detail-header {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  padding: 1.5rem;
  border-radius: var(--radius-xl);
  margin-bottom: 2rem;
}

.detail-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.detail-header-info {
  flex: 1;
}

.detail-meta-top {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.category-badge {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.stars {
  display: flex;
  align-items: center;
  gap: 1px;
}

.star {
  font-size: 0.875rem;
  color: var(--color-surface-hover);
}

.star.filled {
  color: var(--color-warning);
}

.rating-text {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin-left: 0.375rem;
}

.detail-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}

.detail-tagline {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
  align-items: start;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.detail-description {
  color: var(--color-text-secondary);
  line-height: 1.75;
  font-size: 0.9375rem;
}

.feature-list {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}

.feature-list li {
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  position: relative;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-bg);
  border-radius: var(--radius);
}

.feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0.75rem;
  color: var(--color-success);
  font-weight: 700;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.75rem;
  background: var(--color-bg);
  border-radius: var(--radius);
}

.spec-key {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.spec-val {
  font-size: 0.875rem;
  font-weight: 500;
  word-break: break-word;
}

.sidebar-card {
  padding: 1.5rem;
  border-radius: var(--radius-xl);
  position: sticky;
  top: 5rem;
}

.sidebar-price {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.sidebar-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
}

.purchase-btn {
  width: 100%;
  justify-content: center;
  margin-bottom: 0.75rem;
  padding: 0.875rem;
  font-size: 1rem;
}

.purchase-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-msg {
  color: var(--color-success);
  font-size: 0.875rem;
  text-align: center;
  font-weight: 600;
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.875rem;
  text-align: center;
}

.sidebar-hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  text-align: center;
}

.sidebar-divider {
  height: 1px;
  background: var(--color-border);
  margin: 1rem 0;
}

.sidebar-features {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-feature {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .detail-body {
    grid-template-columns: 1fr;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .specs-grid {
    grid-template-columns: 1fr;
  }

  .detail-thumb {
    width: 56px;
    height: 56px;
    font-size: 1.125rem;
  }
}
</style>
