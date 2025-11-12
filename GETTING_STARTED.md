# Getting Started with Sticky.env

Quick guide to test the CLI at your startup.

---

## Installation (Local Development)

Since we haven't published to npm yet, install from source:

```bash
cd cli
npm install
npm run build
npm link  # Makes 'sticky' command available globally
```

**Verify installation:**
```bash
sticky --help
```

---

## Test at Your Startup

### Step 1: Navigate to Your Project

```bash
cd /path/to/your/project
```

### Step 2: Make Sure You Have a .env File

Your .env should have commented variations (like you showed me):

```bash
# .env
CLERK_SECRET_KEY="sk_test_..."
# CLERK_SECRET_KEY="sk_live_..."

DATABASE_URL="postgresql://...tapp-prod"
# DATABASE_URL="postgresql://...preview"
# DATABASE_URL="postgresql://...test"
# DATABASE_URL="postgresql://...migrations"
# DATABASE_URL="postgresql://...tapp-ai"

# ... rest of your env vars
```

### Step 3: Initialize Sticky.env

```bash
sticky init
```

**What happens:**
1. Scans all .env files (finds your 6 files in monorepo)
2. Detects profiles from commented DATABASE_URLs
3. Asks if you want to manage files together (say yes)
4. Marks "production" as dangerous
5. Tries to connect to Vercel (optional)
6. Saves config to `.sticky/`

**Output:**
```
🚀 Initializing Sticky.env...

✓ Found 6 .env files
  • packages/database/.env
  • apps/api/.env.local
  • apps/app/.env.local
  • apps/tapp/.env.local
  • apps/dashboard/.env.local
  • packages/database/.env.local

✓ Found 2 profile-specific variables
  • DATABASE_URL (6 variations)
  • CLERK_SECRET_KEY (2 variations)

✓ Created 6 profiles:
  • tapp-prod ⚠️
  • preview
  • test-trolley
  • test-hopper
  • migrations
  • tapp-ai

✓ Configuration saved to .sticky/
```

### Step 4: Check Status

```bash
sticky status
```

See current profile and available profiles.

### Step 5: Switch Profiles

```bash
# Switch to migrations database
sticky use migrations

# ✓ Switched to migrations profile
# ✓ All 6 .env files updated
```

**Check your .env files - they should all have migrations DATABASE_URL now!**

### Step 6: Test Your App

```bash
npm run dev
# Your app should now be using migrations database
```

### Step 7: Switch Back

```bash
sticky use tapp-prod

# ⚠️ WARNING: You're using production database!
# Continue? (y/N): y

# ✓ Switched to tapp-prod profile
```

---

## Vercel Integration (Optional)

If you want to test team sync:

### Get Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create token
3. Export it:

```bash
export VERCEL_TOKEN=your_token_here
```

### Re-run Init

```bash
sticky init  # Will now connect to Vercel
```

### Push Profiles to Vercel

```bash
sticky push --allow

# ⚠️ You're about to push to Vercel Development
# Continue? (y/N): y
# Type profile name to confirm: migrations
# ✓ Pushed
```

### Pull from Vercel (on another machine)

```bash
cd your-project
export VERCEL_TOKEN=your_token_here
sticky pull

# ✓ Pulled 6 profiles from Vercel

sticky use staging
# ✓ Switched to staging
```

---

## Troubleshooting

### "No profiles detected"

Make sure you have commented variations in your .env:

```bash
DATABASE_URL="active"
# DATABASE_URL="commented-variation-1"
# DATABASE_URL="commented-variation-2"
```

### "No Vercel token found"

Export your token:

```bash
export VERCEL_TOKEN=your_token_here
```

Or run without Vercel (local only):

```bash
sticky init
# Will work without Vercel, just no team sync
```

### "Vercel project not found"

Make sure you've run `vercel link` in your project first:

```bash
vercel link
# Then run: sticky init
```

### Want to reset?

```bash
rm -rf .sticky
sticky init  # Start fresh
```

---

## What to Test

- [ ] `sticky init` detects all 6 profiles
- [ ] `sticky use migrations` switches all 6 .env files
- [ ] `sticky use tapp-prod` shows warning (dangerous)
- [ ] `sticky status` shows correct current profile
- [ ] App runs correctly after switching profiles
- [ ] `prisma generate` works with new DATABASE_URL
- [ ] `sticky push --allow` requires double confirmation
- [ ] `sticky pull` retrieves profiles from Vercel

---

## Next Steps

Once you've tested and it works:

1. **Gather feedback** from team
2. **Fix any bugs** you encounter
3. **Publish to npm**: `npm publish` (from cli/ directory)
4. **Install globally**: `npm install -g sticky-env`
5. **Open source it**: Make repo public on GitHub

---

## Feedback Wanted

Things to note while testing:

- Is the profile detection correct?
- Are the profile names intuitive?
- Is the "dangerous" warning helpful or annoying?
- Does monorepo support work with all 6 files?
- Is the output clear and understandable?
- Any edge cases or bugs?

Open issues or let me know what needs improvement!
