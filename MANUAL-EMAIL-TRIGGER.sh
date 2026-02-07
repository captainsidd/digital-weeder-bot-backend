#!/bin/bash
# Manual Email Trigger Guide for Local Development

echo "🌱 Digital Weeder Bot - Local Email Testing"
echo "==========================================="
echo ""
echo "When you run the backend locally with:"
echo "  node index.js"
echo ""
echo "You can manually trigger emails using:"
echo ""
echo "  curl -X POST http://localhost:3001/api/send-emails-now"
echo ""
echo "This will:"
echo "  ✓ Fetch all opted-in users"
echo "  ✓ Get a random note from 6 months ago for each user"
echo "  ✓ Send emails via SendGrid immediately"
echo "  ✓ Return count of sent/failed emails"
echo ""
echo "Example response:"
echo '  {
    "success": true,
    "message": "Sent 1 emails, 0 failed",
    "result": {
      "sent": 1,
      "failed": 0,
      "total": 1
    }
  }'
echo ""
echo "Notes:"
echo "  • NO authentication required (great for local testing)"
echo "  • Returns immediately with results"
echo "  • Check backend logs for detailed output"
echo ""
