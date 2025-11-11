# Sticky.env MVP Research & Architecture

**LastPass for Environment Variables - Make sharing app settings secure and effortless**

## Executive Summary

Based on extensive research of existing solutions (dotenv-vault, Infisical, Doppler, Phase) and startup needs, I recommend a **CLI-first hybrid architecture** that you can deploy and use immediately.

**Key Differentiators:**
- Zero-setup local sync (no manual pull/push needed)
- Offline-first with conflict resolution
- Per-environment granular permissions (dev/staging/prod)
- Built-in versioning and audit trail
- Works with ANY language/framework
- Free tier optimized for small teams

---

## Research Findings: Gaps in Existing Solutions

### What Exists Today

| Tool | Strengths | Weaknesses |
|------|-----------|------------|
| **dotenv-vault** | Good sync, encryption | Now paid-only (May 2025), cloud-dependent |
| **Infisical** | E2E encrypted, modern | Requires self-hosting or paid cloud |
| **Doppler** | Great UI, integrations | Expensive for small teams, complex setup |
| **HashiCorp Vault** | Enterprise-grade | Heavy setup, ops overhead, not dev-friendly |
| **AWS Secrets Manager** | Integrated with AWS | Locked to AWS, not local-dev focused |
| **Phase.dev** | Open source, E2E encrypted | Requires backend setup |

### Critical Gaps (Your Opportunity)

1. **Seamless local sync** - Most tools require manual `pull` or `fetch` commands
2. **Offline-first** - No good solution for working offline with conflicts
3. **Zero ops** - Self-hosted solutions need maintenance; cloud solutions cost money
4. **Audit trail for .env** - Who changed what, when, and why
5. **Conflict resolution** - Two devs change same var, how to merge?
6. **Cross-platform + language agnostic** - Works everywhere
7. **Free tier for small teams** - Most tools charge early

---

## MVP Architecture: CLI-First Hybrid

### Design Philosophy

**For immediate startup use, prioritize:**
1. **Install & use in < 5 minutes** - npm/brew install, one command to start
2. **Works with existing workflow** - No need to change how you code
3. **Secure by default** - E2E encryption, never trust the server
4. **Team-ready from day 1** - Easy to invite teammates
5. **Observable** - Always know what's synced, what changed

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Machine(s)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sticky CLI                                           │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  • sticky init        → Initialize project           │  │
│  │  • sticky pull        → Sync from cloud              │  │
│  │  • sticky push        → Push local changes           │  │
│  │  • sticky watch       → Auto-sync in background      │  │
│  │  • sticky run <cmd>   → Inject env vars              │  │
│  │  • sticky diff        → Show what changed            │  │
│  │  • sticky history     → View version history         │  │
│  │  • sticky invite      → Add team member              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓↑                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Local Storage (.sticky/)                            │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  • Encrypted env cache                               │  │
│  │  • Sync state & conflict detection                   │  │
│  │  • Version history (local)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓↑ HTTPS + E2E Encryption
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Sync Service                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API (Serverless - Vercel/Cloudflare Workers)        │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  • POST /sync          → Sync encrypted blobs        │  │
│  │  • GET /projects/:id   → Get project metadata        │  │
│  │  • POST /projects      → Create project              │  │
│  │  • GET /history        → Version history             │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓↑                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database (PostgreSQL or MongoDB)                    │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  • Encrypted env blobs (server can't decrypt)        │  │
│  │  • Project metadata                                  │  │
│  │  • Team/user associations                            │  │
│  │  • Audit logs (who synced when)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↑ (Optional - Phase 2)
┌─────────────────────────────────────────────────────────────┐
│              Web Dashboard (Next.js/React)                   │
│  • Project management                                        │
│  • Team invites & permissions                                │
│  • Audit log viewer                                          │
│  • Version history browser                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: MVP (Week 1-2) - CLI + Cloud Sync

### Core Features

#### 1. CLI Tool (Node.js/TypeScript)

**Installation:**
```bash
npm install -g sticky-env
# or
brew install sticky-env
```

**First-time setup:**
```bash
cd my-project
sticky init

# Output:
# ✓ Creating project "my-project"
# ✓ Generating encryption keys
# ✓ Reading .env file
# ✓ Encrypting and syncing to cloud
#
# 🔗 Share this link with your team:
# https://sticky.env/invite/abc123xyz
#
# ✓ Setup complete! Your .env is now synced.
```

**Team member joins:**
```bash
sticky join abc123xyz
# Output:
# ✓ Joined project "my-project"
# ✓ Downloading encrypted env vars
# ✓ Created .env file
# ✓ Setup complete!
```

**Daily workflow:**
```bash
# Option 1: Manual sync
sticky pull   # Get latest changes
sticky push   # Push your changes

# Option 2: Auto-sync (recommended)
sticky watch  # Runs in background, auto-syncs every 30s

# Run commands with synced env
sticky run npm start
sticky run python app.py

# Check sync status
sticky status
# Output:
# ✓ Synced 2 minutes ago
# ↑ Local changes: API_KEY, DATABASE_URL
# ↓ Remote changes: None

# View what changed
sticky diff
# Output:
# API_KEY: "old_key_***" → "new_key_***"
# DATABASE_URL: (added)

# View history
sticky history
# Output:
# 2 min ago  @alice  Updated API_KEY
# 1 hr ago   @bob    Added DATABASE_URL
# 2 hrs ago  @alice  Initial sync
```

#### 2. Security Model: E2E Encryption

**Key Design Principles:**
- Server **NEVER** sees plaintext secrets
- Client-side encryption/decryption only
- Zero-knowledge architecture

**Encryption Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Developer Machine)                                  │
│                                                              │
│  1. User creates/joins project with passphrase              │
│     passphrase: "my-secret-passphrase-123"                  │
│                                                              │
│  2. Derive master key using Argon2id                        │
│     master_key = Argon2id(passphrase, salt)                 │
│                                                              │
│  3. Generate project encryption key                          │
│     project_key = random(32 bytes)                          │
│                                                              │
│  4. Encrypt .env contents                                    │
│     encrypted_env = ChaCha20-Poly1305(env_contents,         │
│                                       project_key)          │
│                                                              │
│  5. Encrypt project key with master key                     │
│     encrypted_project_key = XChaCha20(project_key,          │
│                                       master_key)           │
│                                                              │
│  6. Send to server                                          │
│     {                                                        │
│       encrypted_env,          // Server can't decrypt       │
│       encrypted_project_key,  // Server can't decrypt       │
│       metadata: { project_id, user_id, timestamp }          │
│     }                                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Server (Cloud)                                              │
│                                                              │
│  • Stores encrypted blobs                                   │
│  • CANNOT decrypt (no master key, no project key)           │
│  • Only sees metadata (timestamps, user IDs)                │
│  • Returns encrypted data on sync                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Client (Another Team Member)                                │
│                                                              │
│  1. Join with same passphrase                               │
│  2. Derive same master_key                                  │
│  3. Download encrypted_env + encrypted_project_key          │
│  4. Decrypt project_key with master_key                     │
│  5. Decrypt env_contents with project_key                   │
│  6. Write to .env file                                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Rotation:**
- When team member leaves: rotate project key, re-encrypt all envs
- Master key stays with authorized team members

**Library Choice:**
- Use `libsodium` (via `libsodium-wrappers`) - battle-tested, used by Signal
- Argon2id for key derivation (resistant to GPU attacks)
- XChaCha20-Poly1305 for encryption (modern, secure)

#### 3. Cloud Backend (Minimal - Vercel/Cloudflare Workers)

**Tech Stack:**
- **Runtime:** Node.js serverless (Vercel Functions or Cloudflare Workers)
- **Database:** PostgreSQL (Neon/Supabase for free tier) or MongoDB Atlas
- **Auth:** JWT tokens, magic link email for initial signup
- **Storage:** Database only (no S3 needed for MVP)

**API Endpoints:**

```typescript
// Authentication
POST /auth/signup         → Create account (email + magic link)
POST /auth/login          → Login (magic link)
GET  /auth/verify/:token  → Verify magic link token

// Projects
POST /projects            → Create new project
GET  /projects            → List user's projects
GET  /projects/:id        → Get project details
POST /projects/:id/invite → Generate invite link
POST /projects/join/:code → Join project via invite

// Sync (core feature)
POST /sync                → Upload encrypted env blob
GET  /sync/:project_id    → Download latest encrypted blob
GET  /sync/:project_id/history → Get version history

// Team management
GET  /projects/:id/members    → List team members
POST /projects/:id/members    → Add team member
DELETE /projects/:id/members/:user_id → Remove member
```

**Database Schema:**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  encrypted_project_key TEXT NOT NULL,  -- Encrypted, only clients can decrypt
  invite_code TEXT UNIQUE,               -- For easy team joins
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project members
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  role TEXT DEFAULT 'member',  -- 'admin' | 'member' | 'readonly'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Environments (dev, staging, prod)
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,  -- 'development', 'staging', 'production'
  encrypted_blob TEXT NOT NULL,  -- The actual encrypted .env content
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name, version)
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,  -- 'sync_push', 'sync_pull', 'member_added', etc.
  environment TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Offline Support & Conflict Resolution

**Problem:**
Two developers change the same env var while offline. How to merge?

**Solution: 3-Way Merge with User Prompts**

```
Local state:    API_KEY=key_local_123
Remote state:   API_KEY=key_remote_456
Base state:     API_KEY=key_original_789

Conflict detected! Both changed since last sync.

  Variable: API_KEY
  Your value:    key_local_123
  Their value:   key_remote_456
  Last synced:   2 hours ago by @bob

Choose:
  1. Keep yours (key_local_123)
  2. Use theirs (key_remote_456)
  3. Edit manually

Choice: _
```

**Implementation:**
- Store last-synced hash locally (`.sticky/state.json`)
- On pull, compare 3 states: local, remote, base
- Auto-merge if no conflicts (additive changes)
- Prompt user for conflicts

#### 5. Version History & Rollback

```bash
sticky history

# Output:
# Version  When          Who      Changes
# ───────────────────────────────────────────────
# v12      2 min ago     @alice   Updated API_KEY
# v11      1 hr ago      @bob     Added DATABASE_URL
# v10      2 hrs ago     @alice   Removed OLD_VAR
# v9       1 day ago     @alice   Updated API_KEY
# ...

sticky rollback v10
# Output:
# ⚠ This will restore your .env to version 10 (2 hrs ago)
# Continue? (y/N): y
# ✓ Restored to v10
# ✓ Current .env now matches version from 2 hrs ago
```

---

## Phase 2: Web Dashboard (Week 3-4)

### Minimal Web UI for Team Management

**Features:**
- Project overview (list of env vars, last sync time)
- Team member management (invite, remove, change roles)
- Audit log viewer (who changed what, when)
- Version history browser (visual diff)

**Tech Stack:**
- Next.js 15 (App Router)
- Tailwind CSS for styling
- Same backend API from Phase 1

**Why separate from CLI:**
- CLI users can work without ever using the web
- Web is for admin/management tasks, not daily dev work
- Reduces complexity for MVP

---

## Phase 3: VS Code Extension (Month 2+)

### Enhanced Developer Experience

**Features:**
1. **Sync status indicator** in status bar
   ```
   🟢 Sticky.env: Synced 2m ago
   ```

2. **Auto-sync on .env file save**
   ```
   User saves .env → Extension detects change → Auto-push to cloud
   ```

3. **Visual diff in editor**
   ```
   .env file shows inline diffs:
   - API_KEY=old_value_123
   + API_KEY=new_value_456  ← Changed by @bob 5m ago
   ```

4. **Hover tooltips**
   ```
   Hover over env var → Show:
   • Last changed by @alice
   • 2 days ago
   • Click to view history
   ```

5. **Command palette integration**
   ```
   Cmd+Shift+P → "Sticky: Pull latest env vars"
   Cmd+Shift+P → "Sticky: Push my changes"
   Cmd+Shift+P → "Sticky: View history"
   ```

**Why later:**
- CLI covers 80% of use cases
- Extension is UX enhancement, not core functionality
- Allows time to gather user feedback on CLI first

---

## Technical Stack Recommendation

### CLI
- **Language:** TypeScript (Node.js)
- **Why:** Cross-platform, npm ecosystem, easy to distribute
- **Framework:** Commander.js for CLI parsing, Ora for spinners
- **Encryption:** `libsodium-wrappers` (NaCl/Sodium)
- **File watching:** `chokidar` for auto-sync
- **Distribution:** npm + standalone binaries (pkg or bun)

### Backend API
- **Runtime:** Node.js on Vercel Functions or Cloudflare Workers
- **Why:** Serverless = zero ops, auto-scaling, cheap/free tier
- **Framework:** Express.js (Vercel) or Hono (Cloudflare Workers)
- **Database:** Neon (serverless Postgres) or Supabase
- **Auth:** JWT + magic links (Supabase Auth or custom)

### Web Dashboard (Phase 2)
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Hosting:** Vercel (free tier)

### VS Code Extension (Phase 3)
- **API:** VS Code Extension API
- **Language:** TypeScript
- **UI:** Webview for complex UIs (React)

---

## Immediate Next Steps: What to Build First

### Week 1: Core CLI + Local Encryption

**Day 1-2: Project Setup**
```bash
# File structure
sticky.env/
├── cli/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── push.ts
│   │   │   ├── pull.ts
│   │   │   └── run.ts
│   │   ├── crypto/
│   │   │   ├── encrypt.ts
│   │   │   └── decrypt.ts
│   │   ├── storage/
│   │   │   └── local.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   └── (Week 2)
└── README.md
```

**Goals:**
- [ ] Setup TypeScript project with Commander.js
- [ ] Implement `sticky init` (local only)
- [ ] Implement encryption/decryption with libsodium
- [ ] Store encrypted .env in `.sticky/` directory
- [ ] Implement `sticky run <command>` to inject env vars

**Test at your startup:**
```bash
cd your-app
sticky init
sticky run npm start  # Should work with encrypted env vars
```

### Week 2: Backend API + Cloud Sync

**Day 3-5: Backend Setup**
```bash
backend/
├── api/
│   ├── auth.ts
│   ├── projects.ts
│   └── sync.ts
├── db/
│   └── schema.sql
├── package.json
└── vercel.json
```

**Goals:**
- [ ] Deploy serverless API on Vercel
- [ ] Setup Neon Postgres database
- [ ] Implement auth (magic links)
- [ ] Implement sync endpoints
- [ ] Test end-to-end: CLI → API → Database

**Day 6-7: CLI Cloud Sync**
- [ ] Add API client to CLI
- [ ] Implement `sticky push` (upload encrypted env)
- [ ] Implement `sticky pull` (download encrypted env)
- [ ] Implement `sticky join <invite-code>`

**Test at your startup:**
```bash
# Developer 1
cd your-app
sticky init
sticky push

# Developer 2 (different machine)
cd your-app
sticky join <invite-code>  # Should download encrypted env
npm start  # Should work!
```

---

## Competitive Differentiation

### vs. dotenv-vault
- **Free tier** (dotenv-vault is paid-only now)
- **Offline-first** (vault requires connection)
- **Better conflict resolution**

### vs. Infisical
- **Zero setup** (no self-hosting required)
- **Simpler UX** (less enterprise complexity)
- **CLI-first** (not UI-first)

### vs. Doppler
- **Cheaper** (free for small teams)
- **No vendor lock-in** (E2E encryption, export anytime)
- **Lightweight** (no complex integrations needed for MVP)

### vs. HashiCorp Vault
- **Zero ops** (no servers to maintain)
- **Developer-friendly** (not ops-focused)
- **5-minute setup** (not 5-hour setup)

---

## Pricing Model (Future)

### Free Tier (Target: Small Teams)
- Up to 5 team members
- Up to 3 projects
- Up to 100 env variables per project
- 30-day version history
- Community support

### Pro Tier ($9/user/month)
- Unlimited team members
- Unlimited projects
- Unlimited env variables
- Unlimited version history
- Granular permissions (per-environment)
- Audit logs
- Priority support

### Enterprise Tier (Custom pricing)
- SSO / SAML integration
- Self-hosted option
- SLA guarantees
- Dedicated support
- Custom integrations

---

## Success Metrics

### Week 2 (MVP Launch at Your Startup)
- [ ] 5+ team members using sticky.env daily
- [ ] 0 manual .env file sharing via Slack/email
- [ ] < 1 minute to onboard new developer
- [ ] 0 "my env doesn't work" complaints

### Month 3 (Beta Launch)
- [ ] 50+ teams signed up
- [ ] 90% weekly retention
- [ ] NPS > 50
- [ ] < 2% support ticket rate

### Month 6 (Product-Market Fit)
- [ ] 500+ teams signed up
- [ ] 20% paid conversion
- [ ] Featured on HN / r/programming
- [ ] Integration requests from users

---

## Risk Mitigation

### Security Risks
**Risk:** Server compromise exposes encrypted data
**Mitigation:** E2E encryption means server breach only exposes encrypted blobs (useless without passphrase)

**Risk:** Weak passphrases
**Mitigation:** Enforce minimum entropy, suggest generated passphrases, support hardware keys (YubiKey) later

**Risk:** Accidental plaintext exposure
**Mitigation:**
- Never log plaintext env vars
- Add `.sticky/` to `.gitignore` automatically
- Warn if .env is committed to git

### Adoption Risks
**Risk:** Too complex to set up
**Mitigation:** 1-command setup (`sticky init`), automatic detection of .env files

**Risk:** Doesn't fit existing workflow
**Mitigation:** Works with ANY language/framework, no code changes needed

**Risk:** Trust concerns (storing secrets in cloud)
**Mitigation:**
- Open source the crypto code
- Security audit (before launch)
- Publish threat model documentation
- Offer self-hosted option (later)

---

## Conclusion & Recommendation

### For Immediate Startup Use: Start with CLI

**Week 1 Plan:**
1. Build CLI with local encryption (`sticky init`, `sticky run`)
2. Test at your startup with 2-3 developers
3. Iterate on UX based on team feedback

**Week 2 Plan:**
1. Build minimal backend (Vercel + Postgres)
2. Add cloud sync to CLI (`sticky push`, `sticky pull`)
3. Invite entire startup team to use it
4. Dogfood for 1-2 weeks

**Week 3-4 Plan (if successful):**
1. Add web dashboard for team management
2. Polish CLI based on dogfooding feedback
3. Prepare for beta launch to friends/network

**This approach lets you:**
- ✅ Use it at your startup in ~1 week
- ✅ Validate product-market fit quickly
- ✅ Build only what's needed (no over-engineering)
- ✅ Pivot easily if assumptions are wrong

---

## Next Steps: Implementation Plan

Would you like me to:

1. **Start building the CLI** (Week 1 implementation)
   - Setup TypeScript project
   - Implement core commands (init, run, push, pull)
   - Implement encryption/decryption

2. **Design the detailed API spec** (for Week 2 backend)
   - API endpoint contracts
   - Database migrations
   - Auth flow

3. **Create a detailed feature breakdown** (for project management)
   - Jira/Linear tickets
   - Time estimates
   - Dependencies

Let me know which direction you'd like to go first!
