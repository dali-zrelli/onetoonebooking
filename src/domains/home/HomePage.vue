<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-glow hero-glow-1"></div>
        <div class="hero-glow hero-glow-2"></div>
        <div class="hero-glow hero-glow-3"></div>
      </div>
      <div class="container hero-inner">
        <div class="hero-badge">AI Agent Marketplace</div>
        <h1 class="hero-title">
          Discover & Deploy<br />
          <span class="hero-gradient">Intelligent Agents</span>
        </h1>
        <p class="hero-subtitle">
          Browse a curated marketplace of specialized AI agents. Find the perfect
          agent for your workflow, buy once with a single payment, and deploy instantly.
        </p>
        <div class="hero-actions">
          <router-link to="/browse" class="btn btn-primary btn-lg">Explore Marketplace</router-link>
          <router-link to="/browse" class="btn btn-lg btn-ghost">View Categories →</router-link>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-value">50+</span>
            <span class="stat-label">AI Agents</span>
          </div>
          <div class="stat">
            <span class="stat-value">6</span>
            <span class="stat-label">Categories</span>
          </div>
          <div class="stat">
            <span class="stat-value">4.8</span>
            <span class="stat-label">Avg Rating</span>
          </div>
        </div>
      </div>
    </section>

    <section class="container how-section">
      <div class="section-label">How It Works</div>
      <h2 class="section-title">Three steps to get started</h2>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-number">1</div>
          <div class="step-icon">🔍</div>
          <h3 class="step-title">Browse</h3>
          <p class="step-desc">Explore our curated catalog of specialized AI agents across multiple categories.</p>
        </div>
        <div class="step-connector"></div>
        <div class="step-card">
          <div class="step-number">2</div>
          <div class="step-icon">🛒</div>
          <h3 class="step-title">Purchase</h3>
          <p class="step-desc">One-time payment, no hidden fees or subscriptions. Own the agent forever.</p>
        </div>
        <div class="step-connector"></div>
        <div class="step-card">
          <div class="step-number">3</div>
          <div class="step-icon">🚀</div>
          <h3 class="step-title">Deploy</h3>
          <p class="step-desc">Integrate instantly with your existing tools and workflows. Start using right away.</p>
        </div>
      </div>
    </section>

    <section class="container featured-section">
      <div class="section-label">Featured</div>
      <h2 class="section-title">Popular AI Agents</h2>
      <div v-if="loading" class="agent-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <div class="skeleton skeleton-thumb"></div>
          <div class="skeleton skeleton-line w-60"></div>
          <div class="skeleton skeleton-line w-80"></div>
          <div class="skeleton skeleton-line w-40"></div>
        </div>
      </div>
      <div v-else class="agent-grid">
        <AgentCard v-for="agent in featured" :key="agent.id" :agent="agent" />
      </div>
    </section>

    <section class="container categories-section">
      <div class="section-label">Categories</div>
      <h2 class="section-title">Browse by category</h2>
      <div class="category-grid">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="category-card"
          :style="{ '--cat-color': cat.color }"
          @click="goToCategory(cat.id)"
        >
          <div class="cat-icon-wrap">{{ cat.icon }}</div>
          <div class="cat-name">{{ cat.name }}</div>
          <div class="cat-count">{{ cat.agentCount }} agents</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAgents } from '../catalog/useAgents.js'
import AgentCard from '../agents/AgentCard.vue'

const router = useRouter()
const { agents, loading, fetchAgents } = useAgents()
const featured = ref([])

const categories = ref([
  { id: 'customer-support', name: 'Customer Support', icon: '🎧', color: '#6366f1', agentCount: 12 },
  { id: 'content-writing', name: 'Content Writing', icon: '✍️', color: '#a855f7', agentCount: 8 },
  { id: 'data-analysis', name: 'Data Analysis', icon: '📊', color: '#06b6d4', agentCount: 15 },
  { id: 'coding', name: 'Coding & Dev', icon: '💻', color: '#22c55e', agentCount: 20 },
  { id: 'education', name: 'Education', icon: '🎓', color: '#f59e0b', agentCount: 6 },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: '#ef4444', agentCount: 9 },
])

function goToCategory(id) {
  router.push({ path: '/browse', query: { category: id } })
}

onMounted(async () => {
  await fetchAgents({ limit: 4 })
  featured.value = agents.value
})
</script>

<style scoped>
.hero {
  position: relative;
  padding: 6rem 0 4rem;
  text-align: center;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border);
}

.hero-bg {
  position: absolute;
  inset: -50%;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.hero-glow-1 {
  width: 600px;
  height: 600px;
  background: var(--color-primary);
  top: -20%;
  left: -10%;
}

.hero-glow-2 {
  width: 500px;
  height: 500px;
  background: var(--color-secondary);
  bottom: -30%;
  right: -10%;
}

.hero-glow-3 {
  width: 400px;
  height: 400px;
  background: var(--color-accent);
  top: 10%;
  right: 30%;
  opacity: 0.2;
}

.hero-inner {
  position: relative;
  max-width: 720px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  background: var(--color-primary-light);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
  animation: fadeUp 0.6s ease-out;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 1.25rem;
  letter-spacing: -0.03em;
  animation: fadeUp 0.6s ease-out 0.1s both;
}

.hero-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  line-height: 1.7;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  animation: fadeUp 0.6s ease-out 0.2s both;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeUp 0.6s ease-out 0.3s both;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 3.5rem;
  animation: fadeUp 0.6s ease-out 0.4s both;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-text), var(--color-text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.section-label {
  color: var(--color-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.how-section {
  padding: 5rem 0;
}

.steps-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: start;
  gap: 0;
}

.step-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 2rem;
  text-align: center;
  position: relative;
  transition: border-color var(--transition), transform var(--transition);
}

.step-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
}

.step-number {
  position: absolute;
  top: -0.75rem;
  left: 50%;
  transform: translateX(-50%);
  width: 1.5rem;
  height: 1.5rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.step-connector {
  width: 2rem;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  margin-top: 3rem;
}

.featured-section {
  padding-bottom: 2rem;
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
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
}

.skeleton-line {
  height: 14px;
}

.w-60 { width: 60%; }
.w-80 { width: 80%; }
.w-40 { width: 40%; }

.categories-section {
  padding: 3rem 0 5rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.category-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
}

.category-card:hover {
  border-color: var(--cat-color);
  transform: translateY(-3px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.cat-icon-wrap {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.cat-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.cat-count {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-stats {
    gap: 1.5rem;
  }

  .steps-grid {
    grid-template-columns: 1fr;
  }

  .step-connector {
    width: 2px;
    height: 2rem;
    margin: 0 auto;
  }
}
</style>
