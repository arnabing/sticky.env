# Sticky.env

**Stop manually commenting/uncommenting environment variables.**

Switch between dev, staging, and production with one command.

```bash
sticky use staging      # Switch to staging
sticky use production   # Switch to production
sticky use dev          # Switch to dev
```

---

## Install

```bash
npm install -g sticky-env
```

Or install from source:
```bash
git clone https://github.com/yourusername/sticky-env
cd sticky-env/cli
npm install && npm run build && npm link
```

---

## Quick Start

### 1. Set up your .env with commented variations

```bash
# .env
DATABASE_URL="postgresql://prod-server/myapp"
# DATABASE_URL="postgresql://staging-server/myapp"
# DATABASE_URL="postgresql://dev-server/myapp"

API_KEY="prod_key_123"
# Add your other env vars...
```

### 2. Initialize Sticky.env

```bash
sticky init
```

This will:
- Auto-detect your profiles (prod, staging, dev)
- Detect all .env files in your project (supports monorepos)
- Optionally sync with Vercel for team collaboration

### 3. Switch profiles

```bash
sticky use staging      # All .env files now use staging
npm run dev            # Your app uses staging environment

sticky use dev         # Switch to dev
sticky use production  # Switch to production (requires confirmation)
```

### 4. Check current profile

```bash
sticky status
# Current profile: staging
# Available profiles: dev, staging, production ⚠️
```

---

## Team Collaboration (Optional)

Share profiles with your team via Vercel:

```bash
# Set your Vercel token
export VERCEL_TOKEN=your_token_here

# Push profiles to team
sticky push --allow

# Team members pull profiles
sticky pull
sticky use staging
```

**Note:** Sticky only uses Vercel's **Development** environment. Your Production and Preview deployments are never touched.

---

## Why Sticky.env?

**Before:**
```bash
# Manually comment/uncomment every time
DATABASE_URL="postgresql://prod"
# DATABASE_URL="postgresql://staging"  ← tedious!
# DATABASE_URL="postgresql://dev"
```

**After:**
```bash
sticky use staging  # Done!
```

**Perfect for:**
- 👥 Teams that need to share env configs
- 🏢 Monorepos with multiple .env files
- 🚀 Quick switching between environments
- 🔒 Safe production access (requires confirmation)

---

## Commands

| Command | Description |
|---------|-------------|
| `sticky init` | Initialize in your project |
| `sticky use <profile>` | Switch to a profile |
| `sticky status` | Show current profile |
| `sticky pull` | Sync from Vercel |
| `sticky push --allow` | Push to Vercel |

---

## Features

✅ Auto-detects profiles from commented env vars
✅ Monorepo support (syncs multiple .env files)
✅ Team sync via Vercel (optional)
✅ Production safety (requires confirmation)
✅ Works with any language/framework
✅ Zero config needed

---

## Documentation

- **[Getting Started Guide](./GETTING_STARTED.md)** - Detailed setup instructions
- **[CLI README](./cli/README.md)** - Complete command reference
- **[Contributing](./cli/CONTRIBUTING.md)** - Development guide

---

## Requirements

- Node.js 18+
- `.env` file with commented variations
- Vercel account (optional, for team sync)

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./cli/CONTRIBUTING.md) for development setup.

---

## License

MIT - see [LICENSE](./cli/LICENSE)

---

## Support

- 🐛 [Report Issues](https://github.com/yourusername/sticky-env/issues)
- 💬 Questions? Open a discussion
- 📧 Email: your-email@example.com

---

**Made for developers tired of commenting/uncommenting env vars** ❤️
