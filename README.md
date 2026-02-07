# Digital Weeder Bot - Backend

Express API backend for the Digital Weeder Bot. Handles Notion OAuth, scheduling, and email delivery via SendGrid.

## Setup

```bash
npm install
node index.js
```

Server runs on port 3001

## Environment Variables

Create `.env`:

```
PORT=3001
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
SENDGRID_API_KEY=your_sendgrid_api_key
DATABASE_URL=your_database_url
NODE_ENV=production
```

## Deployment

Deploy to Railway or Vercel:

```bash
vercel deploy --prod
```
