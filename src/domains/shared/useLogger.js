const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' }

let logBuffer = []
let flushTimer = null

function flush() {
  if (logBuffer.length === 0) return
  const batch = logBuffer.splice(0)
  if (import.meta.env.DEV) {
    batch.forEach(({ level, message, data }) => {
      const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log
      fn(`[${level}] ${message}`, data || '')
    })
  }
}

function enqueue(level, message, data) {
  logBuffer.push({ timestamp: Date.now(), level, message, data })
  if (!flushTimer) {
    flushTimer = setTimeout(() => { flushTimer = null; flush() }, 0)
  }
}

export function useLogger() {
  return {
    info: (msg, data) => enqueue(LOG_LEVELS.INFO, msg, data),
    warn: (msg, data) => enqueue(LOG_LEVELS.WARN, msg, data),
    error: (msg, data) => enqueue(LOG_LEVELS.ERROR, msg, data),
  }
}
