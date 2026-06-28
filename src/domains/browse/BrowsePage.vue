<template>
  <div class="browse-page container">
    <div class="browse-header">
      <div>
        <h1 class="browse-title">AI Agents</h1>
        <p class="browse-subtitle">{{ filteredAgents.length }} agents available</p>
      </div>
      <div class="browse-controls">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search agents..."
            class="search-input"
          />
        </div>
        <select v-model="filterCategory" class="select">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat.replace('-', ' ') }}</option>
        </select>
      </div>
    </div>

    <div class="active-filters" v-if="filterCategory">
      <button class="filter-tag" @click="filterCategory = ''">
        {{ filterCategory.replace('-', ' ') }} ×
      </button>
    </div>

    <div v-if="loading" class="agent-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="skeleton skeleton-thumb"></div>
        <div class="skeleton skeleton-line w-70"></div>
        <div class="skeleton skeleton-line w-90"></div>
        <div class="skeleton skeleton-line w-50"></div>
      </div>
    </div>
    <div v-else-if="filteredAgents.length === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No agents found</h3>
      <p>Try adjusting your search or filter to find what you're looking for.</p>
      <button class="btn btn-primary" @click="resetFilters">Reset Filters</button>
    </div>
    <div v-else class="agent-grid">
      <AgentCard v-for="agent in filteredAgents" :key="agent.id" :agent="agent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAgents } from '../catalog/useAgents.js'
import AgentCard from '../agents/AgentCard.vue'

const route = useRoute()
const { agents, loading, fetchAgents } = useAgents()
const searchQuery = ref('')
const filterCategory = ref(route.query.category || '')
const categories = ref(['customer-support', 'content-writing', 'data-analysis', 'coding', 'education', 'healthcare'])

const filteredAgents = computed(() => {
  let result = agents.value
  if (filterCategory.value) {
    result = result.filter(a => a.category === filterCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      a => a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q)
    )
  }
  return result
})

function resetFilters() {
  searchQuery.value = ''
  filterCategory.value = ''
}

onMounted(async () => {
  await fetchAgents()
})
</script>

<style scoped>
.browse-page {
  padding: 2rem 1.5rem 4rem;
}

.browse-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.browse-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.browse-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

.browse-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  font-size: 0.875rem;
  pointer-events: none;
}

.search-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.625rem 0.875rem 0.625rem 2.5rem;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: inherit;
  min-width: 240px;
  transition: border-color var(--transition);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.625rem 2rem 0.625rem 0.875rem;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: inherit;
  min-width: 180px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 12px;
}

.select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.active-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter-tag {
  background: var(--color-primary-light);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 999px;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  color: var(--color-primary);
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all var(--transition);
}

.filter-tag:hover {
  background: rgba(99, 102, 241, 0.25);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.skeleton-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-thumb {
  width: 44px;
  height: 44px;
}

.skeleton-line {
  height: 14px;
}

.w-70 { width: 70%; }
.w-90 { width: 90%; }
.w-50 { width: 50%; }

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
  .browse-header {
    flex-direction: column;
  }

  .search-input {
    min-width: 200px;
  }
}
</style>
