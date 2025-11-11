# Sticky.env

**LastPass for your environment variables** — Make sharing app settings super easy and secure with your team.

---

## What is Sticky.env?

Sticky.env is a secure, team-first solution for managing and sharing environment variables. No more:
- 🔴 Sending .env files over Slack
- 🔴 "It works on my machine" bugs
- 🔴 Manually syncing API keys across the team
- 🔴 Accidentally committing secrets to git

With Sticky.env:
- ✅ End-to-end encrypted (server never sees your secrets)
- ✅ One command to sync: `sticky pull`
- ✅ Works with any language/framework
- ✅ Offline-first with conflict resolution
- ✅ Audit trail (who changed what, when)

---

## Quick Start

### Install

```bash
npm install -g sticky-env
# or
brew install sticky-env
```

### Setup (Project Creator)

```bash
cd your-project
sticky init

# Output:
# ✓ Project created and encrypted!
# 🔗 Share this link: https://sticky.env/join/happy-unicorn-7829
```

### Join (Team Members)

```bash
cd your-project
sticky join happy-unicorn-7829

# Enter passphrase when prompted
# ✓ .env file created!
```

### Daily Workflow

```bash
# Pull latest changes
sticky pull

# Run your app (auto-injects env vars)
sticky run npm start

# Push your changes
sticky push
```

---

## Project Status

**Current Phase:** MVP Research Complete ✅

This repository contains comprehensive research and planning for building Sticky.env.

### Research Documents

1. **[MVP_RESEARCH.md](./MVP_RESEARCH.md)** - Complete MVP strategy
   - Market analysis of existing solutions
   - Gaps and opportunities
   - Architecture overview
   - Competitive differentiation
   - Pricing model

2. **[SECURITY_MODEL.md](./SECURITY_MODEL.md)** - Security architecture
   - Zero-knowledge encryption design
   - Threat model
   - Cryptographic primitives (Argon2id, XChaCha20-Poly1305)
   - Key management and rotation
   - Audit logging

3. **[TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)** - Technical specification
   - CLI architecture (Node.js/TypeScript)
   - Backend API (Hono + Vercel)
   - Database schema (Postgres + Drizzle ORM)
   - Testing strategy
   - Performance considerations
   - Scalability plan

4. **[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)** - Week-by-week execution plan
   - Week 1: CLI + Local encryption
   - Week 2: Backend + Cloud sync
   - Week 3-4: Polish + Web dashboard
   - Launch checklist
   - Success metrics
   - Budget estimates

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Developers                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ MacBook    │  │ Linux PC   │  │ Windows    │            │
│  │ Sticky CLI │  │ Sticky CLI │  │ Sticky CLI │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
└────────┼────────────────┼────────────────┼──────────────────┘
         │                │                │
         │       HTTPS (E2E Encrypted)     │
         └────────────────┼────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Cloud (Vercel + Neon)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API (Serverless)                                     │   │
│  │  • Auth, Projects, Sync                              │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database (Postgres)                                  │   │
│  │  • Encrypted env blobs (server can't decrypt)        │   │
│  │  • Project metadata, audit logs                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

**Security:**
- End-to-end encryption (XChaCha20-Poly1305)
- Key derivation with Argon2id
- Zero-knowledge architecture
- OS keychain integration

**Developer Experience:**
- One-command setup
- Auto-sync in background
- Conflict resolution
- Works with any language

**Team Collaboration:**
- Easy invite links
- Role-based access control
- Audit trail
- Version history

---

## Why Sticky.env?

### vs. Existing Solutions

| Feature | Sticky.env | dotenv-vault | Doppler | Infisical |
|---------|------------|--------------|---------|-----------|
| **Price** | Free tier | Paid only | Expensive | Free (self-host) |
| **Setup** | < 5 min | ~ 10 min | ~ 15 min | ~ 30 min |
| **Offline** | ✅ Yes | ❌ No | ❌ No | ⚠️ Limited |
| **E2E Encrypted** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **CLI-first** | ✅ Yes | ✅ Yes | ⚠️ UI-first | ⚠️ Mixed |
| **Conflict Resolution** | ✅ 3-way merge | ❌ Basic | ❌ Last-write-wins | ❌ Basic |
| **Version History** | ✅ Unlimited | ⚠️ Limited | ✅ Unlimited | ⚠️ Limited |

### Unique Advantages

1. **Offline-first** - Works without internet, syncs when connected
2. **Zero ops** - No servers to maintain, serverless architecture
3. **Smart conflicts** - 3-way merge with user prompts
4. **Free for small teams** - Up to 5 members, 3 projects
5. **Universal** - Works with Node, Python, Go, Ruby, etc.

---

## Technology Stack

### CLI
- **Language:** TypeScript (Node.js 20+)
- **Framework:** Commander.js
- **Crypto:** libsodium-wrappers, argon2
- **Keychain:** keytar (OS integration)

### Backend
- **Runtime:** Node.js (Vercel Functions)
- **Framework:** Hono
- **Database:** Neon Postgres (serverless)
- **ORM:** Drizzle ORM
- **Auth:** JWT + magic links

### Future
- **Web Dashboard:** Next.js 15 + Tailwind CSS
- **VS Code Extension:** TypeScript + Webview

---

## Security

### Encryption Design

**Zero-knowledge architecture** - Server NEVER sees plaintext secrets.

```
User Passphrase
      ↓ (Argon2id - slow KDF)
Master Key
      ↓ (encrypts/decrypts)
Project Key
      ↓ (encrypts/decrypts)
.env Contents
```

**Cryptographic Primitives:**
- **KDF:** Argon2id (memory-hard, GPU-resistant)
- **Encryption:** XChaCha20-Poly1305 (authenticated)
- **Random:** OS CSPRNG (via libsodium)

**Threat Protection:**
- ✅ Server compromise → Only encrypted blobs exposed
- ✅ Man-in-the-middle → TLS + E2E encryption
- ✅ Malicious insider → Cannot decrypt without passphrase
- ⚠️ Weak passphrase → Enforced minimum entropy
- ⚠️ Team member compromise → Key rotation available

See [SECURITY_MODEL.md](./SECURITY_MODEL.md) for complete details.

---

## Development Roadmap

### ✅ Phase 0: Research (Current)
- Market analysis
- Architecture design
- Security model
- Implementation plan

### 🚧 Phase 1: MVP (Weeks 1-2)
- CLI with local encryption
- Backend API
- Cloud sync
- Basic team collaboration

**Target:** Usable at your startup immediately

### 📅 Phase 2: Polish (Weeks 3-4)
- Web dashboard
- Multi-environment support
- Audit log viewer
- Version history browser

**Target:** Beta launch ready

### 📅 Phase 3: Growth (Months 2-3)
- VS Code extension
- CI/CD integrations
- Advanced permissions
- Self-hosted option

**Target:** 500+ teams, product-market fit

### 📅 Phase 4: Scale (Months 4-6)
- Enterprise features (SSO, SAML)
- Compliance (SOC 2, HIPAA)
- Advanced integrations
- Mobile apps

**Target:** $10k+ MRR, break-even

See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for week-by-week plan.

---

## Success Metrics

### Week 2 (MVP Complete)
- ✅ 5+ team members using daily at startup
- ✅ 0 manual .env file sharing
- ✅ < 1 min to onboard new developer

### Month 1 (Beta Launch)
- 🎯 50+ teams signed up
- 🎯 80%+ 7-day retention
- 🎯 Featured on HN / r/programming

### Month 3 (Product-Market Fit)
- 🎯 500+ teams
- 🎯 90%+ 30-day retention
- 🎯 10%+ paid conversion

### Month 6 (Scale)
- 🎯 5,000+ teams
- 🎯 $10,000+ MRR
- 🎯 Break-even

---

## Business Model

### Free Tier
- Up to 5 team members
- Up to 3 projects
- 100 env variables per project
- 30-day version history
- Community support

### Pro Tier ($9/user/month)
- Unlimited team members
- Unlimited projects
- Unlimited env variables
- Unlimited version history
- Granular permissions
- Priority support

### Enterprise (Custom pricing)
- SSO / SAML
- Self-hosted option
- SLA guarantees
- Dedicated support
- Compliance reports

---

## Contributing

This project is currently in the research phase. Contributions welcome once MVP is complete!

**Interested in helping?**
1. Star this repo
2. Watch for updates
3. Join our Discord (coming soon)

---

## License

TBD (Will be determined before MVP launch)

Options:
- MIT (fully open source)
- AGPL (open source, requires share-alike)
- Source-available with commercial license

---

## Contact

**Email:** your-email@example.com (update this!)

**Twitter:** @yourusername (update this!)

**Website:** https://sticky.env (coming soon)

---

## Acknowledgments

Inspired by:
- **dotenv** - Original .env file standard
- **LastPass** - Password manager UX model
- **Signal** - End-to-end encryption design
- **Vercel** - Serverless deployment simplicity

Built with:
- **libsodium** - Cryptography library
- **Argon2** - Key derivation function
- **Vercel** - Serverless hosting
- **Neon** - Serverless Postgres

---

**Ready to make .env files secure and effortless? Let's build this! 🚀**
