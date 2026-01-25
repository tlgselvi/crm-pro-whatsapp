# CRM Pro - Free-Tier WhatsApp CRM

A modern, free-tier CRM system with WhatsApp integration, built with Next.js 14, Ant Design Pro, and Supabase.

## ✨ Features

- 💬 **Real-time Chat Interface** - Beautiful messaging UI with instant updates
- 📱 **WhatsApp Integration** - Receive and send WhatsApp messages via Meta Cloud API
- 📊 **Analytics Dashboard** - Track contacts, conversations, and response times
- 🔄 **Real-time Sync** - All data syncs instantly using Supabase real-time
- 🎨 **Modern UI** - Professional design with Ant Design components
- 🚀 **Serverless Architecture** - Runs on Vercel free tier

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **UI Framework:** Ant Design Pro, chatscope/chat-ui-kit-react
- **Database:** Supabase (PostgreSQL + Real-time)
- **Deployment:** Vercel
- **WhatsApp:** Meta Cloud API

## 📦 Installation

### 1. Clone & Install

```bash
npm install
```

### 2. Setup Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL in `supabase/schema.sql` in the SQL Editor
4. Get your credentials from Settings > API

### 3. Setup Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# WhatsApp (optional for local testing)
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token

# App URL (update after Vercel deploy)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment to Vercel

### 1. Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel
```

Or use the Vercel dashboard:
1. Import your GitHub repository
2. Add environment variables
3. Deploy

### 2. Setup WhatsApp Cloud API

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Create a new app (Business type)
3. Add WhatsApp product
4. In WhatsApp > Configuration:
   - Copy **Phone Number ID** and **Access Token**
   - Set Webhook URL: `https://your-app.vercel.app/api/whatsapp-webhook`
   - Set Verify Token (must match your `.env` value)
   - Subscribe to `messages` webhook field

### 3. Test WhatsApp

1. Send a test message to your WhatsApp Business number
2. Message should appear in CRM inbox
3. Reply from inbox - customer receives on WhatsApp

## 📋 Database Schema

```sql
contacts (id, name, phone, email, created_at, updated_at)
conversations (id, contact_id, status, last_message_at, unread_count)
messages (id, conversation_id, sender, content, timestamp, is_read, platform)
```

## 🎯 Usage

### Dashboard
- View total contacts, active conversations, message count
- See recent message activity
- Monitor response times

### Inbox
- Left panel: Conversation list with unread badges
- Right panel: Message thread with real-time updates
- Send messages instantly
- WhatsApp messages appear automatically

### Adding Test Data

Use Supabase Table Editor or SQL Editor:

```sql
INSERT INTO contacts (name, phone, email) 
VALUES ('Test User', '+905551234567', 'test@example.com');
```

## 🆓 Free Tier Limits

| Service | Free Limit | Sufficient For |  
|---------|-----------|----------------|
| Vercel | 100GB bandwidth/month | ✅ Solo business |
| Supabase | 500MB DB, 2GB bandwidth | ✅ Thousands of messages |
| WhatsApp | 1000 conversations/month | ✅ Starting phase |

## 🔧 Troubleshooting

### Messages not appearing?
1. Check Supabase connection in browser console
2. Verify real-time is enabled in Supabase dashboard
3. Check environment variables are set

### WhatsApp webhook not working?
1. Verify URL is publicly accessible
2. Check webhook verification token matches
3. Review Vercel function logs

### Build errors?
```bash
rm -rf .next node_modules
npm install
npm run build
```

## 📝 Next Steps

- [ ] Add authentication (Supabase Auth)
- [ ] Implement message templates
- [ ] Add file/image support
- [ ] Create contact management page
- [ ] Add conversation tags/labels
- [ ] Export conversation history
- [ ] Multi-agent support

## 🤝 Contributing

This is an open-source project. Feel free to fork and customize for your needs.

## 📄 License

MIT License - Free to use for commercial and personal projects.

## 🙏 Credits

- [Ant Design](https://ant.design)
- [Supabase](https://supabase.com)
- [chatscope](https://chatscope.io/)
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp)
