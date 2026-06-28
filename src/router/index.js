import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../domains/home/HomePage.vue'),
  },
  {
    path: '/browse',
    name: 'browse',
    component: () => import('../domains/browse/BrowsePage.vue'),
  },
  {
    path: '/agents/:id',
    name: 'agent-detail',
    component: () => import('../domains/agents/AgentDetailPage.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../domains/auth/LoginPage.vue'),
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../domains/profile/ProfilePage.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
