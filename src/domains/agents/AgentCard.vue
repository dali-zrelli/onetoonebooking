<template>
  <router-link :to="`/agents/${agent.id}`" class="agent-card">
    <div class="card-top">
      <div class="agent-thumb">{{ initials }}</div>
      <div class="agent-price-pill">${{ agent.price }}</div>
    </div>
    <div class="card-body">
      <div class="agent-name">{{ agent.name }}</div>
      <div class="agent-category">{{ agent.category.replace('-', ' ') }}</div>
      <p class="agent-tagline">{{ agent.tagline }}</p>
    </div>
    <div class="card-footer">
      <div class="stars">
        <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.floor(agent.rating) }">★</span>
        <span class="rating-text">{{ agent.rating }}</span>
      </div>
      <span class="review-count">({{ agent.reviews }})</span>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  agent: { type: Object, required: true },
})

const initials = computed(() =>
  (props.agent.name || '').split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)
)
</script>

<style scoped>
.agent-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
  text-decoration: none;
  color: inherit;
  animation: fadeUp 0.4s ease-out;
}

.agent-card:hover {
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  text-decoration: none;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.agent-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.agent-price-pill {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 700;
}

.card-body {
  flex: 1;
}

.agent-name {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.125rem;
}

.agent-category {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: capitalize;
  margin-bottom: 0.625rem;
}

.agent-tagline {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--color-border);
}

.stars {
  display: flex;
  align-items: center;
  gap: 1px;
}

.star {
  font-size: 0.8125rem;
  color: var(--color-surface-hover);
}

.star.filled {
  color: var(--color-warning);
}

.rating-text {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-left: 0.25rem;
  color: var(--color-text);
}

.review-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: auto;
}
</style>
