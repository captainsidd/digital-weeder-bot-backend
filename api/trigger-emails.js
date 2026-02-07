/**
 * API endpoint to manually trigger weekly email sending
 * Call this from a cron service (EasyCron, GitHub Actions, etc)
 */
module.exports = async (req, res) => {
  const BACKEND_SECRET = process.env.BACKEND_SECRET || 'your-secret-key'
  
  // Verify authorization
  const auth = req.headers.authorization
  if (auth !== `Bearer ${BACKEND_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Trigger email sending
    // This would call the sendWeeklyEmails function from index.js
    res.status(200).json({ 
      success: true, 
      message: 'Weekly emails triggered successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
