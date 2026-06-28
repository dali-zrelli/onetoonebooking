import { ref } from 'vue'
import { db, hasConfig } from '../../firebase.js'
import { useLogger } from '../shared/useLogger.js'

const MOCK_AGENTS = [
  { id: '1', name: 'SupportBot Pro', tagline: 'AI customer support agent that handles tickets 24/7.', description: 'SupportBot Pro resolves up to 80% of tickets without human intervention. Supports multilingual conversations, sentiment analysis, and seamless handoff.', category: 'customer-support', price: 49, rating: 4.8, reviews: 234, status: 'active', features: ['24/7 Automated Support', 'Multi-language (50+ languages)', 'Sentiment Analysis', 'Seamless Human Handoff', 'Ticket Analytics Dashboard'], specs: { integrations: 'Zendesk, Intercom, Freshdesk, HubSpot', languages: 'English, French, Spanish, German, Arabic', maxRequests: '10000/month', responseTime: '< 2s' } },
  { id: '2', name: 'ContentWriter AI', tagline: 'Generate high-quality blog posts and marketing copy in seconds.', description: 'ContentWriter AI produces SEO-optimized content across any niche. Includes brand voice training, plagiarism checker, and readability scoring.', category: 'content-writing', price: 29, rating: 4.6, reviews: 189, status: 'active', features: ['SEO Optimization', 'Brand Voice Training', 'Plagiarism Check', 'Multi-format Export', 'Bulk Generation'], specs: { integrations: 'WordPress, Shopify, Medium, Webflow', languages: 'English, French, Spanish', maxWords: '50000/month', responseTime: '< 5s' } },
  { id: '3', name: 'DataInsight', tagline: 'Turn raw data into actionable insights with natural language queries.', description: 'Ask questions in plain English and receive charts, summaries, and exportable reports. No SQL required.', category: 'data-analysis', price: 79, rating: 4.7, reviews: 156, status: 'active', features: ['Natural Language Queries', 'Auto-generated Charts', 'Scheduled Reports', 'Anomaly Detection', 'Export to PDF/Excel'], specs: { integrations: 'PostgreSQL, MySQL, BigQuery, Snowflake, CSV', languages: 'English', maxQueries: '5000/month', responseTime: '< 3s' } },
  { id: '4', name: 'CodeGenius', tagline: 'Your AI pair programmer that writes, reviews, and refactors code.', description: 'CodeGenius integrates with your IDE, writes functions, suggests optimizations, reviews PRs, generates tests, and explains complex code.', category: 'coding', price: 39, rating: 4.9, reviews: 412, status: 'active', features: ['Code Generation', 'PR Review', 'Test Generation', 'Code Explanation', 'Refactoring Suggestions'], specs: { integrations: 'VS Code, JetBrains, GitHub, GitLab', languages: 'Python, JavaScript, TypeScript, Rust, Go, Java', maxRequests: '15000/month', responseTime: '< 1s' } },
  { id: '5', name: 'EduTutor', tagline: 'Personalized AI tutor that adapts to each student learning style.', description: 'Creates personalized learning paths, generates quizzes, explains concepts, and tracks progress across STEM and humanities.', category: 'education', price: 19, rating: 4.5, reviews: 98, status: 'active', features: ['Adaptive Learning Paths', 'Quiz Generation', 'Progress Tracking', 'Multi-subject Support', 'Parent Dashboard'], specs: { integrations: 'Google Classroom, Canvas, Moodle', languages: 'English, French, Spanish, Arabic', maxStudents: '50', responseTime: '< 3s' } },
  { id: '6', name: 'MediAssist', tagline: 'AI healthcare assistant for clinical documentation and patient triage.', description: 'HIPAA-compliant assistant for clinical note-taking, symptom analysis, triage recommendations, and medical literature search.', category: 'healthcare', price: 99, rating: 4.4, reviews: 67, status: 'active', features: ['Clinical Note Generation', 'Symptom Analyzer', 'Literature Search', 'Triage Recommendations', 'EHR Integration'], specs: { integrations: 'Epic, Cerner, Practice Fusion', languages: 'English, French, Spanish', maxPatients: '500', responseTime: '< 4s', compliance: 'HIPAA' } },
  { id: '7', name: 'SupportBot Lite', tagline: 'Lightweight FAQ agent for small businesses.', description: 'Budget-friendly FAQ automation agent. Train it on your knowledge base and it answers customer questions instantly.', category: 'customer-support', price: 12, rating: 4.3, reviews: 876, status: 'active', features: ['Instant FAQ Replies', 'Website Widget', 'WhatsApp Integration', 'Knowledge Base Training', 'Basic Analytics'], specs: { integrations: 'WordPress, Shopify, WhatsApp', languages: 'English, French, Spanish', maxRequests: '2000/month', responseTime: '< 2s' } },
  { id: '8', name: 'WriteMate', tagline: 'AI copywriting assistant for social media and email marketing.', description: 'Specializes in short-form content: social media posts, email subject lines, ad copy, and product descriptions.', category: 'content-writing', price: 15, rating: 4.7, reviews: 543, status: 'active', features: ['Social Media Posts', 'Email Campaigns', 'Ad Copy', 'A/B Testing', 'Conversion Optimization'], specs: { integrations: 'Mailchimp, HubSpot, Twitter, LinkedIn', languages: 'English, French, German', maxPosts: '10000/month', responseTime: '< 2s' } },
]

export function useAgents() {
  const agents = ref([])
  const loading = ref(false)
  const log = useLogger()

  async function fetchAgents(opts = {}) {
    loading.value = true
    try {
      if (!hasConfig) {
        let result = [...MOCK_AGENTS]
        if (opts.category) result = result.filter(a => a.category === opts.category)
        if (opts.limit) result = result.slice(0, opts.limit)
        agents.value = result
        return
      }
      const { collection, query, where, orderBy, getDocs, limit } = await import('firebase/firestore')
      const constraints = [where('status', '==', 'active')]
      if (opts.category) constraints.push(where('category', '==', opts.category))
      if (opts.sortBy === 'price') constraints.push(orderBy('price', 'asc'))
      else constraints.push(orderBy('createdAt', 'desc'))
      if (opts.limit) constraints.push(limit(opts.limit))
      const snap = await getDocs(query(collection(db, 'agents'), ...constraints))
      agents.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
      log.error('Failed to fetch agents', err.message)
    } finally {
      loading.value = false
    }
  }

  async function getAgent(id) {
    try {
      if (!hasConfig) {
        return MOCK_AGENTS.find(a => a.id === id) || null
      }
      const { doc, getDoc } = await import('firebase/firestore')
      const snap = await getDoc(doc(db, 'agents', id))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() }
    } catch (err) {
      log.error('Failed to fetch agent', err.message)
      return null
    }
  }

  return { agents, loading, fetchAgents, getAgent }
}
