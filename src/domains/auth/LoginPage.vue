<template>
  <div class="auth-page">
    <div class="auth-bg">
      <div class="auth-glow"></div>
    </div>
    <div class="auth-card glass">
      <div class="auth-header">
        <div class="auth-logo">◆</div>
        <h1 class="auth-title">{{ isLogin ? 'Welcome back' : 'Create account' }}</h1>
        <p class="auth-subtitle">
          {{ isLogin ? 'Sign in to access your agents' : 'Start building your AI toolkit' }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="error" class="auth-error">{{ error }}</div>
        <div v-if="success" class="auth-success">{{ success }}</div>

        <label class="field">
          <span class="field-label">Email</span>
          <input v-model="email" type="email" class="input" required autocomplete="email" placeholder="you@example.com" />
        </label>

        <label class="field">
          <span class="field-label">Password</span>
          <input v-model="password" type="password" class="input" required minlength="6" autocomplete="current-password" placeholder="••••••••" />
        </label>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="submitting">
          {{ submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account' }}
        </button>
      </form>

      <div class="auth-divider">
        <span>or</span>
      </div>

      <div class="auth-toggle">
        {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
        <button class="link-btn" @click="toggleMode">
          {{ isLogin ? 'Create one' : 'Sign in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../shared/useAuth.js'

const router = useRouter()
const { login, register } = useAuth()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const error = ref('')
const success = ref('')
const submitting = ref(false)

function toggleMode() {
  isLogin.value = !isLogin.value
  error.value = ''
  success.value = ''
}

async function handleSubmit() {
  error.value = ''
  success.value = ''
  submitting.value = true
  try {
    if (isLogin.value) {
      await login(email.value, password.value)
    } else {
      await register(email.value, password.value)
      success.value = 'Account created! Redirecting...'
    }
    setTimeout(() => router.push('/'), 1000)
  } catch (err) {
    error.value = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential'
      ? 'Invalid email or password.'
      : err.code === 'auth/email-already-in-use'
        ? 'Email already registered.'
        : err.message || 'An error occurred. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px);
  padding: 2rem 1.5rem;
  position: relative;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%);
  top: -10%;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50%;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
  border-radius: var(--radius-xl);
  position: relative;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-logo {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  margin: 0 auto 1rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.375rem;
}

.auth-subtitle {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.input {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color var(--transition);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.input::placeholder {
  color: var(--color-text-muted);
}

.submit-btn {
  width: 100%;
  justify-content: center;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.auth-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--color-danger);
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius);
  font-size: 0.8125rem;
  text-align: center;
}

.auth-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: var(--color-success);
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius);
  font-size: 0.8125rem;
  text-align: center;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.25rem 0;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.auth-toggle {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  font-weight: 600;
  transition: color var(--transition);
}

.link-btn:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}
</style>
