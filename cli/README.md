# Sticky.env

**Dead simple environment variable management with profile switching**

Stop manually commenting/uncommenting env vars. Switch between dev, staging, and production databases with one command.

```bash
sticky use staging    # Switch to staging DB
sticky use production # Switch to production DB (with safety checks)
sticky use migrations # Switch to migrations DB
```

---

## Why Sticky.env?

**The Problem:**
```bash
# Your current .env file:
DATABASE_URL="postgresql://prod-db/..."
# DATABASE_URL="postgresql://staging-db/..."  ← manually comment/uncomment
# DATABASE_URL="postgresql://migrations-db/..." ← tedious and error-prone
```

**The Solution:**
```bash
sticky use staging    # Boom! Switched to staging
npm run dev          # App now uses staging DB
```

**Perfect for:**
- 🏢 **Monorepos** - Syncs all .env files together
- 👥 **Teams** - Share profiles via Vercel (encrypted)
- 🔒 **Safety** - Production profiles require confirmation
- ⚡ **Fast** - No manual editing, no mistakes

---

## Quick Start

### Install

```bash
npm install -g sticky-env
```

### Initialize

```bash
cd your-project

# Make sure you have a .env with multiple commented variations:
# DATABASE_URL="postgresql://prod"
# # DATABASE_URL="postgresql://staging"
# # DATABASE_URL="postgresql://dev"

sticky init

# ✓ Found 3 profiles: prod, staging, dev
# ✓ Pushed to Vercel Development environment
```

### Use

```bash
sticky use staging   # Switch to staging profile
npm run dev         # Run your app with staging env vars

sticky use prod     # Switch to production (requires confirmation)
```

### Team Sync

```bash
# Team member joins:
cd your-project
sticky pull         # Gets all profiles from Vercel
sticky use staging  # Start working
```

---

## How It Works

### 1. Profiles Auto-Detected

Sticky.env scans your .env files and creates profiles from commented variations:

```bash
# Your .env:
STRIPE_KEY=sk_test_123
DATABASE_URL="postgresql://mainline.../tapp-prod"
# DATABASE_URL="postgresql://hopper.../preview"
# DATABASE_URL="postgresql://trolley.../migrations"

# Sticky creates 3 profiles:
# - tapp-prod (currently active)
# - preview
# - migrations
```

### 2. One Command to Switch

```bash
sticky use migrations

# Updates ALL .env files in your monorepo to use migrations profile
# ✓ packages/database/.env
# ✓ apps/api/.env.local
# ✓ apps/app/.env.local
# ✓ apps/dashboard/.env.local
```

### 3. Team Sync via Vercel

Profiles are stored in Vercel's **Development** environment (not Production!):

```bash
# Developer A:
sticky push --allow   # Pushes profiles to Vercel Development

# Developer B:
sticky pull          # Gets latest profiles
sticky use staging   # Ready to code!
```

**Safety:** Sticky ONLY touches Vercel's Development environment. Your Production and Preview environments are completely isolated and safe.

---

## Commands

### `sticky init`
Initialize Sticky.env in your project. Auto-detects profiles from .env files.

```bash
sticky init
```

### `sticky use <profile>`
Switch to a different profile. Updates all .env files in your project.

```bash
sticky use staging
sticky use production  # Requires confirmation (dangerous profile)
```

### `sticky status`
Show current profile and configuration.

```bash
sticky status
# Current profile: staging
# Available profiles: preview, staging, migrations, production ⚠️
```

### `sticky pull`
Pull latest profiles from Vercel Development environment.

```bash
sticky pull
# ✓ Pulled 4 profiles from Vercel
```

### `sticky push [profile] --allow`
Push profiles to Vercel Development environment (disabled by default for safety).

```bash
# Push all profiles:
sticky push --allow

# Push specific profile:
sticky push staging --allow
```

---

## Configuration

Sticky.env stores configuration in `.sticky/`:

```
.sticky/
├── config.json       # Project configuration
└── profiles/         # Cached profiles
    ├── staging.env
    ├── production.env
    └── migrations.env
```

**Add to `.gitignore`:**
```bash
.env
.env.local
.sticky/
```

---

## Monorepo Support

Sticky.env automatically detects multiple .env files:

```bash
your-monorepo/
├── packages/database/.env
├── apps/api/.env.local
├── apps/app/.env.local
└── apps/dashboard/.env.local

# When you run: sticky use staging
# → All 4 files are updated to use staging profile
```

---

## Safety Features

### 1. Production Protection

Profiles with "prod" or "live" in the name are marked as dangerous:

```bash
sticky use production

# ⚠️  WARNING: You're using production database!
# ⚠️  This is read-only mode for local testing only
# Continue? (y/N):
```

### 2. Push Requires Confirmation

```bash
sticky push

# ❌ Error: Pushing disabled by default
# Run: sticky push --allow

sticky push --allow

# ⚠️  You're about to update Vercel Development for the whole team
# Type profile name to confirm: staging
# ✓ Pushed
```

### 3. Vercel Isolation

Sticky ONLY touches the Development environment:

```javascript
const ALLOWED_TARGET = 'development';  // ✅ Safe for team sync
const BLOCKED_TARGETS = ['production', 'preview'];  // ❌ Never touched
```

Your actual Vercel deployments (Production/Preview) are completely isolated.

---

## Vercel Setup

### Get Your Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Export it:

```bash
export VERCEL_TOKEN=your_token_here
```

Or add to `~/.bashrc` / `~/.zshrc`:

```bash
echo 'export VERCEL_TOKEN=your_token_here' >> ~/.zshrc
```

### Link Your Project

```bash
# Option 1: If you already ran `vercel link`:
sticky init  # Auto-detects project

# Option 2: Sticky will prompt you to select project
sticky init
# ? Select Vercel project: your-app
```

---

## Requirements

- Node.js 18+
- A Vercel project (optional, for team sync)
- `.env` file with commented variations

---

## FAQ

### Q: Does this work without Vercel?

Yes! You can use `sticky use <profile>` locally without any Vercel connection. You just won't have team sync.

### Q: Will this mess up my Vercel deployments?

No! Sticky ONLY touches the Development environment. Your Production and Preview deployments are completely safe.

### Q: What if I don't have commented variations in my .env?

Sticky.env works best when you have multiple variations commented out. If you don't have any, you'll need to add them first:

```bash
DATABASE_URL="postgresql://prod"
# DATABASE_URL="postgresql://staging"  ← Add these
# DATABASE_URL="postgresql://dev"      ← manually first
```

### Q: Can I use this with GitHub Actions / CI?

Yes! Set `VERCEL_TOKEN` as a secret and run `sticky pull` in your CI:

```yaml
- name: Pull env vars
  run: |
    npm install -g sticky-env
    sticky pull
    sticky use staging
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### Q: What about sensitive keys?

All env vars are encrypted by Vercel (encrypted at rest). Sticky never sees or modifies the encryption - it just uses Vercel's API.

For extra security, you can avoid pushing production keys:

```bash
sticky push staging --allow  # Only push staging profile
```

---

## Roadmap

- [ ] VS Code extension (inline profile switcher)
- [ ] Support for other platforms (Railway, Render, Netlify)
- [ ] Per-variable overrides (e.g., use staging DB but production Stripe)
- [ ] Auto-run commands after switching (e.g., `prisma generate`)
- [ ] Encrypted local storage (optional passphrase)

---

## Contributing

Sticky.env is open source! Contributions welcome.

```bash
git clone https://github.com/yourusername/sticky-env
cd sticky-env/cli
npm install
npm run dev -- init  # Run locally
```

---

## License

MIT License - see [LICENSE](./LICENSE)

---

## Support

- 🐛 **Issues:** https://github.com/yourusername/sticky-env/issues
- 💬 **Discord:** (coming soon)
- 📧 **Email:** your-email@example.com

---

**Made with ❤️ for developers who are tired of commenting/uncommenting env vars**
