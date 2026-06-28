<template>
  <div class="app">
    <div class="bg-glow"></div>

    <div class="todo-wrap">
      <header class="header">
        <h1 class="title">todos</h1>
        <p class="subtitle">{{ remaining }} item{{ remaining !== 1 ? 's' : '' }} remaining</p>
      </header>

      <div class="todo-card">
        <form class="input-wrap" @submit.prevent="addTodo">
          <button type="submit" class="add-btn" :disabled="!newTodo.trim()" title="Add todo">+</button>
          <input
            v-model="newTodo"
            placeholder="What needs to be done?"
            class="input"
            autofocus
            ref="inputRef"
          />
        </form>

        <TransitionGroup name="list" tag="ul" class="todo-list" v-if="filtered.length">
          <li v-for="todo in filtered" :key="todo.id" class="todo-item" :class="{ completed: todo.done }">
            <button
              class="check-btn"
              :class="{ checked: todo.done }"
              @click="toggle(todo.id)"
              :title="todo.done ? 'Mark as active' : 'Mark as done'"
            >
              <svg v-if="todo.done" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <input
              v-if="editingId === todo.id"
              v-model="editText"
              class="edit-input"
              @blur="saveEdit(todo)"
              @keydown.enter="saveEdit(todo)"
              @keydown.escape="cancelEdit"
              ref="editInputRef"
            />
            <span
              v-else
              class="todo-text"
              @dblclick="startEdit(todo)"
            >{{ todo.text }}</span>

            <button class="delete-btn" @click="remove(todo.id)" title="Delete">✕</button>
          </li>
        </TransitionGroup>

        <div v-else-if="!filtered.length && todos.length" class="empty-filter">
          <p>No {{ filter !== 'all' ? filter : '' }} todos</p>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No todos yet</h3>
          <p>Add your first todo above</p>
        </div>

        <footer class="footer" v-if="todos.length">
          <div class="filters">
            <button
              v-for="f in filters"
              :key="f.key"
              class="filter-btn"
              :class="{ active: filter === f.key }"
              @click="filter = f.key"
            >{{ f.label }}</button>
          </div>
          <button
            v-if="doneCount"
            class="clear-btn"
            @click="clearDone"
          >Clear {{ doneCount }} done</button>
        </footer>
      </div>

      <p class="hint">Double-click a todo to edit</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const STORAGE_KEY = 'todos'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
]

const newTodo = ref('')
const todos = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
const filter = ref('all')
const editingId = ref(null)
const editText = ref('')
const inputRef = ref(null)
const editInputRef = ref(null)

const remaining = computed(() => todos.value.filter(t => !t.done).length)
const doneCount = computed(() => todos.value.filter(t => t.done).length)
const filtered = computed(() => {
  if (filter.value === 'active') return todos.value.filter(t => !t.done)
  if (filter.value === 'completed') return todos.value.filter(t => t.done)
  return todos.value
})

watch(todos, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

function addTodo() {
  const text = newTodo.value.trim()
  if (!text) return
  todos.value.unshift({ id: Date.now(), text, done: false })
  newTodo.value = ''
  inputRef.value?.focus()
}

function toggle(id) {
  const t = todos.value.find(t => t.id === id)
  if (t) t.done = !t.done
}

function remove(id) {
  todos.value = todos.value.filter(t => t.id !== id)
}

function startEdit(todo) {
  editingId.value = todo.id
  editText.value = todo.text
  nextTick(() => {
    const el = editInputRef.value
    if (el) { el.focus(); el.select() }
  })
}

function saveEdit(todo) {
  const text = editText.value.trim()
  if (text) todo.text = text
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

function clearDone() {
  todos.value = todos.value.filter(t => !t.done)
}
</script>

<style>
@keyframes glow {
  0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
}

.app {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4rem 1.5rem;
  position: relative;
  overflow-x: hidden;
}

.bg-glow {
  position: fixed;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle at center, rgba(99, 102, 241, 0.12), transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: glow 6s ease-in-out infinite;
}

.todo-wrap {
  width: 100%;
  max-width: 540px;
  position: relative;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 4rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.todo-card {
  background: rgba(20, 27, 45, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* ── Input ── */
.input-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
}

.add-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.add-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px var(--primary-glow);
  transform: scale(1.05);
}

.add-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  padding: 0.25rem 0;
}

.input::placeholder {
  color: var(--text-muted);
}

/* ── List ── */
.todo-list {
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.todo-item.completed .todo-text {
  color: var(--text-muted);
  text-decoration: line-through;
}

.check-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  padding: 0;
  color: white;
}

.check-btn:hover {
  border-color: var(--primary);
}

.check-btn.checked {
  background: var(--success);
  border-color: var(--success);
}

.todo-text {
  flex: 1;
  font-size: 0.9375rem;
  cursor: default;
  padding: 0.125rem 0;
  word-break: break-word;
}

.edit-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--primary);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.9375rem;
  font-family: inherit;
  padding: 0.25rem 0.5rem;
  outline: none;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0.375rem;
  border-radius: 6px;
  transition: all var(--transition);
  opacity: 0;
  line-height: 1;
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--danger-light);
  color: var(--danger);
}

/* ── Empty ── */
.empty-filter {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.empty-state p {
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* ── Footer ── */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 0.25rem;
}

.filter-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  transition: all var(--transition);
}

.filter-btn:hover {
  color: var(--text);
}

.filter-btn.active {
  background: var(--primary-light);
  color: var(--primary);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all var(--transition);
}

.clear-btn:hover {
  color: var(--danger);
  background: var(--danger-light);
}

.hint {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ── Animations ── */
.list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.96);
}

.list-move {
  transition: transform 0.25s ease;
}

@media (max-width: 480px) {
  .app { padding: 2rem 1rem; }
  .title { font-size: 2.5rem; }
  .footer { flex-direction: column; align-items: stretch; }
  .filters { justify-content: center; }
}
</style>
