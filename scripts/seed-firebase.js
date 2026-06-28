/**
 * Seed script: populates Firestore with sample AI agents and categories.
 *
 * Usage: node scripts/seed-firebase.js
 * Requires serviceAccountKey.json in project root.
 * Requires: npm install firebase-admin
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const agents = [
  {
    name: 'SupportBot Pro',
    tagline: 'AI customer support agent that handles tickets 24/7 with human-like responses.',
    description: 'SupportBot Pro is an intelligent customer service agent that integrates with your helpdesk, understands context, and resolves up to 80% of tickets without human intervention. Supports multilingual conversations, sentiment analysis, and seamless handoff to human agents.',
    category: 'customer-support',
    price: 49,
    rating: 4.8,
    reviews: 234,
    status: 'active',
    features: ['24/7 Automated Support', 'Multi-language (50+ languages)', 'Sentiment Analysis', 'Seamless Human Handoff', 'Ticket Analytics Dashboard'],
    specs: { integrations: ['Zendesk', 'Intercom', 'Freshdesk', 'HubSpot'], languages: ['English', 'French', 'Spanish', 'German', 'Arabic'], maxRequests: '10000/month', responseTime: '< 2s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'ContentWriter AI',
    tagline: 'Generate high-quality blog posts, articles, and marketing copy in seconds.',
    description: 'ContentWriter AI produces SEO-optimized content across any niche. Train it on your brand voice, generate outlines, full articles, social media posts, and email campaigns. Includes plagiarism checker and readability scoring.',
    category: 'content-writing',
    price: 29,
    rating: 4.6,
    reviews: 189,
    status: 'active',
    features: ['SEO Optimization', 'Brand Voice Training', 'Plagiarism Check', 'Multi-format Export', 'Bulk Generation'],
    specs: { integrations: ['WordPress', 'Shopify', 'Medium', 'Webflow'], languages: ['English', 'French', 'Spanish'], maxWords: '50000/month', responseTime: '< 5s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'DataInsight',
    tagline: 'Turn raw data into actionable insights with natural language queries.',
    description: 'DataInsight connects to your databases and APIs, allowing you to ask questions in plain English and receive charts, summaries, and exportable reports. No SQL required. Supports real-time dashboards and scheduled reporting.',
    category: 'data-analysis',
    price: 79,
    rating: 4.7,
    reviews: 156,
    status: 'active',
    features: ['Natural Language Queries', 'Auto-generated Charts', 'Scheduled Reports', 'Anomaly Detection', 'Export to PDF/Excel'],
    specs: { integrations: ['PostgreSQL', 'MySQL', 'BigQuery', 'Snowflake', 'CSV'], languages: ['English'], maxQueries: '5000/month', responseTime: '< 3s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'CodeGenius',
    tagline: 'Your AI pair programmer that writes, reviews, and refactors code.',
    description: 'CodeGenius is an advanced coding assistant that integrates with your IDE. It writes functions, suggests optimizations, reviews pull requests, generates unit tests, and explains complex code in simple terms. Supports all major programming languages.',
    category: 'coding',
    price: 39,
    rating: 4.9,
    reviews: 412,
    status: 'active',
    features: ['Code Generation', 'PR Review', 'Test Generation', 'Code Explanation', 'Refactoring Suggestions'],
    specs: { integrations: ['VS Code', 'JetBrains', 'GitHub', 'GitLab'], languages: ['Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'Java'], maxRequests: '15000/month', responseTime: '< 1s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'EduTutor',
    tagline: 'Personalized AI tutor that adapts to each student\'s learning style.',
    description: 'EduTutor creates personalized learning paths, generates quizzes, explains concepts with examples, and tracks progress. Covers K-12 and university-level subjects in STEM, languages, and humanities.',
    category: 'education',
    price: 19,
    rating: 4.5,
    reviews: 98,
    status: 'active',
    features: ['Adaptive Learning Paths', 'Quiz Generation', 'Progress Tracking', 'Multi-subject Support', 'Parent Dashboard'],
    specs: { integrations: ['Google Classroom', 'Canvas', 'Moodle'], languages: ['English', 'French', 'Spanish', 'Arabic'], maxStudents: '50', responseTime: '< 3s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'MediAssist',
    tagline: 'AI healthcare assistant for clinical documentation and patient triage.',
    description: 'MediAssist helps healthcare professionals with clinical note-taking, symptom analysis, patient triage recommendations, and medical literature search. HIPAA-compliant and integrates with major EHR systems.',
    category: 'healthcare',
    price: 99,
    rating: 4.4,
    reviews: 67,
    status: 'active',
    features: ['Clinical Note Generation', 'Symptom Analyzer', 'Literature Search', 'Triage Recommendations', 'EHR Integration'],
    specs: { integrations: ['Epic', 'Cerner', 'Practice Fusion'], languages: ['English', 'French', 'Spanish'], maxPatients: '500', responseTime: '< 4s', compliance: 'HIPAA' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'SupportBot Lite',
    tagline: 'Lightweight FAQ agent for small businesses. Answers common questions instantly.',
    description: 'SupportBot Lite is a budget-friendly FAQ automation agent. Train it on your knowledge base and it answers customer questions instantly on your website, Messenger, or WhatsApp. Perfect for small e-commerce stores.',
    category: 'customer-support',
    price: 12,
    rating: 4.3,
    reviews: 876,
    status: 'active',
    features: ['Instant FAQ Replies', 'Website Widget', 'WhatsApp Integration', 'Knowledge Base Training', 'Basic Analytics'],
    specs: { integrations: ['WordPress', 'Shopify', 'WhatsApp'], languages: ['English', 'French', 'Spanish'], maxRequests: '2000/month', responseTime: '< 2s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    name: 'WriteMate',
    tagline: 'AI copywriting assistant for social media and email marketing.',
    description: 'WriteMate specializes in short-form content: social media posts, email subject lines, ad copy, and product descriptions. It understands brand voice, A/B tests variations, and optimizes for conversion.',
    category: 'content-writing',
    price: 15,
    rating: 4.7,
    reviews: 543,
    status: 'active',
    features: ['Social Media Posts', 'Email Campaigns', 'Ad Copy', 'A/B Testing', 'Conversion Optimization'],
    specs: { integrations: ['Mailchimp', 'HubSpot', 'Twitter', 'LinkedIn'], languages: ['English', 'French', 'German'], maxPosts: '10000/month', responseTime: '< 2s' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  },
]

const categories = [
  { id: 'customer-support', name: 'Customer Support', icon: '🎧', agentCount: 2 },
  { id: 'content-writing', name: 'Content Writing', icon: '✍️', agentCount: 2 },
  { id: 'data-analysis', name: 'Data Analysis', icon: '📊', agentCount: 1 },
  { id: 'coding', name: 'Coding & Dev', icon: '💻', agentCount: 1 },
  { id: 'education', name: 'Education', icon: '🎓', agentCount: 1 },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', agentCount: 1 },
]

async function seed() {
  console.log('Seeding agents...')
  const batch = db.batch()
  for (const agent of agents) {
    const ref = db.collection('agents').doc()
    batch.set(ref, agent)
  }
  await batch.commit()
  console.log(`Seeded ${agents.length} agents.`)

  console.log('Seeding categories...')
  for (const cat of categories) {
    await db.collection('categories').doc(cat.id).set(cat)
  }
  console.log(`Seeded ${categories.length} categories.`)

  console.log('Done!')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
