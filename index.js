const express = require('express')
const axios = require('axios')
const sgMail = require('@sendgrid/mail')
const cron = require('node-cron')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
app.use(express.json())

// In-memory database (replace with real DB for production)
const users = new Map()

const BACKEND_SECRET = process.env.BACKEND_SECRET || 'your-secret-key'
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const NOTION_API_KEY = process.env.NOTION_API_KEY

sgMail.setApiKey(SENDGRID_API_KEY)

// Middleware to verify API key
const verifyAuth = (req, res, next) => {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${BACKEND_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Save user credentials
app.post('/api/save-credentials', verifyAuth, (req, res) => {
  const { email, notionToken, workspaceId, optedIn } = req.body

  users.set(email, {
    email,
    notionToken,
    workspaceId,
    optedIn,
    createdAt: new Date(),
  })

  res.status(200).json({ success: true, message: 'Credentials saved' })
})

// Check user status
app.get('/api/user-status/:email', verifyAuth, (req, res) => {
  const { email } = req.params
  const user = users.get(email)

  if (!user) {
    return res.status(404).json({ opted: false, message: 'User not found' })
  }

  res.status(200).json({ opted: user.optedIn })
})

// Fetch a random note from 6 months ago
async function getRandomNoteFromNotionDatabase(notionToken) {
  try {
    // First, get list of databases
    const response = await axios.post(
      'https://api.notion.com/v1/search',
      {
        filter: { value: 'database', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
      },
      {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
        },
      }
    )

    if (response.data.results.length === 0) {
      throw new Error('No databases found')
    }

    const database = response.data.results[0]
    const databaseId = database.id

    // Query database for pages created ~6 months ago
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const queryResponse = await axios.post(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        filter: {
          property: 'created_time',
          date: {
            before: new Date(sixMonthsAgo.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            after: new Date(sixMonthsAgo.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
        },
      }
    )

    const pages = queryResponse.data.results
    if (pages.length === 0) {
      throw new Error('No pages found from 6 months ago')
    }

    // Return a random page
    const randomPage = pages[Math.floor(Math.random() * pages.length)]
    return randomPage
  } catch (error) {
    console.error('Error fetching from Notion:', error.message)
    throw error
  }
}

// Format note as markdown email
function formatEmailContent(note) {
  let title = 'Untitled Note'
  let content = ''

  // Extract title and content from Notion page
  const properties = note.properties || {}
  
  // Try to find title property
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === 'title' && prop.title && prop.title.length > 0) {
      title = prop.title.map(t => t.plain_text).join('')
      break
    }
  }

  const pageUrl = note.url

  return {
    subject: `🌱 Recall & Prune: "${title}"`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0;">🌱 Digital Weeder</h1>
            <p style="margin: 10px 0 0 0;">Your weekly Recall & Prune reminder</p>
          </div>

          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #667eea; margin-top: 0;">${title}</h2>
            <p style="color: #666; font-style: italic;">Found from 6 months ago</p>
          </div>

          <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin-bottom: 20px;">
            <p style="color: #555; line-height: 1.6;">
              This note resonated with you half a year ago. Take a moment to revisit it.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${pageUrl}" target="_blank" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">View Full Note</a>
          </div>

          <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>❓ What do you think?</strong></p>
            <ul style="list-style: none; padding: 0;">
              <li>✅ Still resonates - keep it</li>
              <li>📦 Archive it - no longer relevant</li>
              <li>🔄 Update it - evolve the idea</li>
            </ul>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Digital Weeder • Keeping your garden fresh
          </p>
        </body>
      </html>
    `,
  }
}

// Send weekly emails
async function sendWeeklyEmails() {
  console.log('Running weekly email task...')

  for (const [email, user] of users.entries()) {
    if (!user.optedIn) continue

    try {
      const note = await getRandomNoteFromNotionDatabase(user.notionToken)
      const emailContent = formatEmailContent(note)

      await sgMail.send({
        to: email,
        from: 'noreply@digitalweeder.app',
        subject: emailContent.subject,
        html: emailContent.html,
      })

      console.log(`Sent email to ${email}`)
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error.message)
    }
  }
}

// Schedule weekly task (every Sunday at 9 AM UTC)
cron.schedule('0 9 * * 0', sendWeeklyEmails)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Manual trigger for testing (requires auth)
app.post('/api/send-test-email', verifyAuth, async (req, res) => {
  const { email } = req.body
  const user = users.get(email)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    const note = await getRandomNoteFromNotionDatabase(user.notionToken)
    const emailContent = formatEmailContent(note)

    await sgMail.send({
      to: email,
      from: 'noreply@digitalweeder.app',
      subject: emailContent.subject,
      html: emailContent.html,
    })

    res.status(200).json({ success: true, message: 'Test email sent' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})
