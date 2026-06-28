<template>
  <div class="profile-page container">
    <div v-if="!user" class="empty-state">
      <div class="empty-icon">🔒</div>
      <h3>Sign in required</h3>
      <p>Please sign in to view your purchased agents.</p>
      <router-link to="/login" class="btn btn-primary">Sign In</router-link>
    </div>
    <template v-else>
      <div class="profile-header">
        <div>
          <h1 class="profile-title">My Agents</h1>
          <p class="profile-subtitle">{{ user.email }}</p>
        </div>
        <div class="profile-avatar">
          {{ initials }}
        </div>
      </div>

      <div v-if="loading" class="loading-wrap">
        <div v-for="i in 3" :key="i" class="skeleton skeleton-row"></div>
      </div>
      <div v-else-if="purchases.length === 0" class="empty-state">
        <div class="empty-icon">🛍️</div>
        <h3>No agents yet</h3>
        <p>Browse the marketplace and purchase your first AI agent.</p>
        <router-link to="/browse" class="btn btn-primary">Browse Marketplace</router-link>
      </div>
      <div v-else class="purchase-list">
        <div v-for="p in purchases" :key="p.id" class="purchase-card card">
          <div class="purchase-icon">{{ p.agentName?.charAt(0) || '?' }}</div>
          <div class="purchase-info">
            <div class="purchase-name">{{ p.agentName }}</div>
            <div class="purchase-date">Purchased {{ formatDate(p.purchasedAt) }}</div>
          </div>
          <div class="purchase-meta">
            <span class="purchase-price">${{ p.price }}</span>
            <span class="status-badge">{{ p.status }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuth } from '../shared/useAuth.js'
import { usePurchases } from '../catalog/usePurchases.js'
import { format } from 'date-fns'

const { user } = useAuth()
const { purchases, loading, fetchUserPurchases } = usePurchases()

const initials = computed(() =>
  (user.value?.email || '?').charAt(0).toUpperCase()
)

function formatDate(ts) {
  if (!ts) return 'N/A'
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return format(date, 'MMM d, yyyy')
}

onMounted(() => {
  if (user.value) {
    fetchUserPurchases(user.value.uid)
  }
})
</script>

<style scoped>
.profile-page {
  padding: 2rem 1.5rem 4rem;
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.profile-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.profile-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

.loading-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-row {
  height: 72px;
  border-radius: var(--radius-lg);
}

.purchase-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.purchase-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: border-color var(--transition);
}

.purchase-card:hover {
  border-color: var(--color-primary);
}

.purchase-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 700;
  flex-shrink: 0;
}

.purchase-info {
  flex: 1;
}

.purchase-name {
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.purchase-date {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.purchase-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.purchase-price {
  font-weight: 700;
  color: var(--color-primary);
}

.status-badge {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-success);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .purchase-card {
    flex-wrap: wrap;
  }

  .purchase-meta {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
