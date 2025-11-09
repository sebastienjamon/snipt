# Snipt - Code Snippets That Remember

The first snippet manager built for AI coding assistants. Snipt enables Claude Code to learn from your solutions and never make the same mistake twice.

## 🎉 Current Status: Phase 1 Complete!

**Full-featured web application with authentication and snippet management is now functional.**

## ✨ Features Implemented

### Authentication
- ✅ Email/password signup and login
- ✅ Session management with Supabase Auth
- ✅ Protected routes with middleware
- ✅ Secure logout functionality

### Dashboard
- ✅ Clean sidebar navigation
- ✅ User profile menu
- ✅ Stats overview (snippets, teams, API keys, usage)
- ✅ Getting started guide

### Snippet Management
- ✅ Create, read, update, delete snippets
- ✅ Rich code editor with syntax highlighting support
- ✅ Tag management (add/remove tags)
- ✅ Category organization
- ✅ Context-rich metadata:
  - When to use
  - Common mistakes to avoid
  - Prerequisites
- ✅ Full-text search capability (PostgreSQL)
- ✅ Filter by language and tags

### Technical Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **Validation:** Zod
- **State:** React Query + Zustand (ready)

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm
- Supabase account

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Follow the guide in `docs/SUPABASE_SETUP.md`
   - Create a Supabase project
   - Run the schema from `supabase/schema.sql`

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

### First Steps

1. **Sign up** for an account at `/signup`
2. **Create your first snippet** at `/dashboard/snippets/new`
3. **Add context** to help Claude Code learn when to use it
4. **Explore** the dashboard and snippet management features

## 📁 Project Structure

```
snipt.it/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/           # Protected dashboard pages
│   │   ├── snippets/
│   │   │   ├── [id]/       # Edit snippet
│   │   │   ├── new/        # Create snippet
│   │   │   └── page.tsx    # List snippets
│   │   └── page.tsx        # Dashboard home
│   ├── api/
│   │   └── snippets/       # API routes for CRUD
│   ├── auth/callback/      # OAuth callback
│   ├── layout.tsx
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── dashboard/          # Dashboard-specific components
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── types/              # TypeScript types
│   ├── validations/        # Zod schemas
│   └── utils.ts
├── supabase/
│   └── schema.sql          # Database schema
└── docs/
    ├── IMPLEMENTATION_PLAN.md
    ├── SUPABASE_SETUP.md
    └── PROGRESS.md
```

## 🗄️ Database Schema

- **users** - User profiles and plan tiers
- **api_keys** - API keys for MCP authentication (Phase 5)
- **teams** - Team workspaces (Phase 3)
- **team_members** - Team membership and roles
- **snippets** - Core snippet storage with rich context
- **snippet_usage** - Usage analytics and tracking

All tables have Row Level Security (RLS) enabled for maximum security.

## 🔒 Security

- ✅ Row Level Security on all tables
- ✅ Server-side authentication checks
- ✅ Protected API routes
- ✅ Validated inputs (Zod)
- ✅ Secure session management
- ✅ Environment variables for secrets

## 📊 API Endpoints

### Snippets
- `GET /api/snippets` - List user's snippets (with filters)
- `POST /api/snippets` - Create new snippet
- `GET /api/snippets/[id]` - Get single snippet
- `PATCH /api/snippets/[id]` - Update snippet
- `DELETE /api/snippets/[id]` - Delete snippet

### Query Parameters (GET /api/snippets)
- `query` - Full-text search
- `language` - Filter by programming language
- `tags` - Filter by tags (comma-separated)

## 🛠️ Available Scripts

```bash
# Development
npm run dev           # Start dev server (http://localhost:3000)

# Production
npm run build         # Build for production
npm run start         # Start production server

# Code Quality
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript compiler check
```

## 🎯 Next Steps (Roadmap)

### Phase 2: Search & Organization (Week 3)
- [ ] Advanced search UI
- [ ] Filter and sort options
- [ ] Categories management
- [ ] Favorites/bookmarks

### Phase 3: Team Collaboration (Week 4)
- [ ] Create teams
- [ ] Invite members
- [ ] Share snippets with teams
- [ ] Team permissions

### Phase 4: Analytics (Week 5)
- [ ] Usage tracking
- [ ] Success/failure rates
- [ ] Most-used snippets
- [ ] Team analytics

### Phase 5: MCP Server (Week 6) 🌟
- [ ] Build MCP server npm package
- [ ] Implement tools (search, get, create, update)
- [ ] API key generation UI
- [ ] Claude Code integration guide
- [ ] Test with Claude Code

### Phase 6: Polish (Week 7-8)
- [ ] Dark mode
- [ ] Mobile responsive
- [ ] Code syntax highlighting
- [ ] Export/import snippets

### Phase 7: Billing (Week 9)
- [ ] Stripe integration
- [ ] Plan limits enforcement
- [ ] Upgrade/downgrade flows

## 📝 Documentation

- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - Full technical specification
- **[Supabase Setup](docs/SUPABASE_SETUP.md)** - Database configuration guide
- **[Progress Tracker](docs/PROGRESS.md)** - Development progress and notes

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

## 📄 License

Private project - All rights reserved

## 🔗 Links

- **Documentation:** See `/docs` directory
- **Supabase:** [supabase.com](https://supabase.com)
- **Next.js:** [nextjs.org](https://nextjs.org)

---

**Built with ❤️ using Claude Code**

🤖 This project demonstrates the power of AI-assisted development with bidirectional learning capabilities.
