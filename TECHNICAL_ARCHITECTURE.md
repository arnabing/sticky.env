# Sticky.env Technical Architecture

Complete technical specification for building the MVP.

---

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    DEVELOPER ECOSYSTEM                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   MacBook    │  │   Linux PC   │  │   Windows    │        │
│  │              │  │              │  │   Laptop     │        │
│  │  Sticky CLI  │  │  Sticky CLI  │  │  Sticky CLI  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    HTTPS (TLS 1.3)
                   E2E Encrypted Payloads
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    CLOUD INFRASTRUCTURE                          │
│                            ↓                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              API GATEWAY (Vercel Edge)                     │  │
│  │  • Rate limiting (100 req/min per IP)                     │  │
│  │  • DDoS protection                                         │  │
│  │  • JWT validation                                          │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                       │
│          ┌───────────────┼───────────────┐                      │
│          ↓               ↓               ↓                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  Auth API    │ │  Sync API    │ │ Projects API │           │
│  │  /auth/*     │ │  /sync/*     │ │ /projects/*  │           │
│  │              │ │              │ │              │           │
│  │ • Login      │ │ • Push       │ │ • Create     │           │
│  │ • Verify     │ │ • Pull       │ │ • List       │           │
│  │ • Refresh    │ │ • History    │ │ • Invite     │           │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘           │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         DATABASE (Neon Postgres - Serverless)             │  │
│  │                                                            │  │
│  │  Tables:                                                   │  │
│  │  • users            → User accounts                       │  │
│  │  • projects         → Project metadata + encrypted keys   │  │
│  │  • environments     → Encrypted env blobs                 │  │
│  │  • project_members  → Team access control                 │  │
│  │  • audit_logs       → Change history                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         BACKGROUND JOBS (Optional - Phase 2)              │  │
│  │  • Email notifications (new member joined)                │  │
│  │  • Slack webhooks (env changed in production)             │  │
│  │  • Cleanup old versions (retention policy)                │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component 1: CLI (Sticky Client)

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Language | TypeScript | Type safety, npm ecosystem |
| Runtime | Node.js 20+ | Cross-platform, ubiquitous |
| CLI Framework | Commander.js | Feature-rich, widely used |
| Crypto | libsodium-wrappers | Industry standard (Signal, WireGuard) |
| Key Derivation | argon2 | Best-in-class KDF |
| Config Storage | conf | Cross-platform config management |
| Keychain | keytar | Secure OS keychain access |
| HTTP Client | axios | Promise-based, interceptors |
| File Watching | chokidar | Reliable cross-platform watcher |
| Spinners/UI | ora, chalk, inquirer | Beautiful CLI UX |
| Testing | Jest, nock | Standard Node.js testing |

### Project Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── init.ts           # sticky init
│   │   ├── join.ts           # sticky join <code>
│   │   ├── push.ts           # sticky push
│   │   ├── pull.ts           # sticky pull
│   │   ├── run.ts            # sticky run <command>
│   │   ├── watch.ts          # sticky watch (background sync)
│   │   ├── diff.ts           # sticky diff
│   │   ├── history.ts        # sticky history
│   │   ├── status.ts         # sticky status
│   │   ├── invite.ts         # sticky invite <email>
│   │   ├── export.ts         # sticky export
│   │   └── rotate-key.ts     # sticky rotate-key
│   │
│   ├── crypto/
│   │   ├── encrypt.ts        # Encryption functions
│   │   ├── decrypt.ts        # Decryption functions
│   │   ├── kdf.ts            # Key derivation (Argon2id)
│   │   └── random.ts         # CSPRNG utilities
│   │
│   ├── api/
│   │   ├── client.ts         # HTTP client wrapper
│   │   ├── auth.ts           # Auth endpoints
│   │   ├── projects.ts       # Project endpoints
│   │   └── sync.ts           # Sync endpoints
│   │
│   ├── storage/
│   │   ├── config.ts         # Local config (.sticky/config.json)
│   │   ├── keychain.ts       # OS keychain integration
│   │   ├── cache.ts          # Local encrypted cache
│   │   └── dotenv.ts         # .env file parsing/writing
│   │
│   ├── sync/
│   │   ├── conflict.ts       # 3-way merge & conflict resolution
│   │   ├── watcher.ts        # File watching for auto-sync
│   │   └── state.ts          # Sync state management
│   │
│   ├── ui/
│   │   ├── prompts.ts        # Interactive prompts
│   │   ├── spinner.ts        # Loading spinners
│   │   ├── table.ts          # Table formatting
│   │   └── colors.ts         # Color utilities
│   │
│   ├── utils/
│   │   ├── validation.ts     # Input validation
│   │   ├── entropy.ts        # Passphrase strength
│   │   ├── errors.ts         # Custom error classes
│   │   └── logger.ts         # Logging utilities
│   │
│   └── index.ts              # CLI entry point
│
├── tests/
│   ├── commands/
│   ├── crypto/
│   ├── sync/
│   └── integration/
│
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── README.md
```

### Core APIs

#### crypto/encrypt.ts

```typescript
import sodium from 'libsodium-wrappers';

export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  nonce: string;       // Base64 encoded
  algorithm: 'XChaCha20-Poly1305';
  version: 1;
}

/**
 * Encrypt plaintext using XChaCha20-Poly1305
 */
export async function encrypt(
  plaintext: string,
  key: Uint8Array
): Promise<EncryptedData> {
  await sodium.ready;

  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(`Key must be ${sodium.crypto_secretbox_KEYBYTES} bytes`);
  }

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const message = sodium.from_string(plaintext);
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
    algorithm: 'XChaCha20-Poly1305',
    version: 1
  };
}

/**
 * Decrypt ciphertext using XChaCha20-Poly1305
 */
export async function decrypt(
  encrypted: EncryptedData,
  key: Uint8Array
): Promise<string> {
  await sodium.ready;

  if (encrypted.version !== 1) {
    throw new Error(`Unsupported version: ${encrypted.version}`);
  }

  const ciphertextBytes = sodium.from_base64(encrypted.ciphertext);
  const nonceBytes = sodium.from_base64(encrypted.nonce);

  const plaintext = sodium.crypto_secretbox_open_easy(
    ciphertextBytes,
    nonceBytes,
    key
  );

  if (!plaintext) {
    throw new Error('Decryption failed - wrong key or tampered data');
  }

  return sodium.to_string(plaintext);
}
```

#### crypto/kdf.ts

```typescript
import argon2 from 'argon2';
import sodium from 'libsodium-wrappers';

export interface KDFParams {
  memoryCost: number;   // KB
  timeCost: number;     // Iterations
  parallelism: number;  // Threads
  hashLength: number;   // Bytes
}

export const DEFAULT_KDF_PARAMS: KDFParams = {
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 1,       // Single thread
  hashLength: 32        // 256 bits
};

/**
 * Derive encryption key from passphrase using Argon2id
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  params: KDFParams = DEFAULT_KDF_PARAMS
): Promise<Uint8Array> {
  const key = await argon2.hash(passphrase, {
    type: argon2.argon2id,
    memoryCost: params.memoryCost,
    timeCost: params.timeCost,
    parallelism: params.parallelism,
    raw: true,              // Return raw bytes
    salt: Buffer.from(salt),
    hashLength: params.hashLength
  });

  return new Uint8Array(key);
}

/**
 * Generate cryptographically secure salt
 */
export async function generateSalt(): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.randombytes_buf(16);  // 128 bits
}

/**
 * Generate random project key
 */
export async function generateProjectKey(): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
}
```

#### commands/init.ts

```typescript
import { Command } from 'commander';
import { prompt } from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { encrypt, deriveKey, generateSalt, generateProjectKey } from '../crypto';
import { createProject } from '../api/projects';
import { saveConfig, savePassphrase } from '../storage';
import { validatePassphrase } from '../utils/validation';

export const initCommand = new Command('init')
  .description('Initialize a new Sticky.env project')
  .option('-e, --env-file <path>', '.env file path', '.env')
  .option('--no-keychain', 'Don\'t save passphrase to keychain')
  .action(async (options) => {
    try {
      // 1. Check if project already initialized
      const configExists = await fs.access('.sticky/config.json')
        .then(() => true)
        .catch(() => false);

      if (configExists) {
        console.log(chalk.yellow('⚠ Project already initialized. Use `sticky push` to sync changes.'));
        return;
      }

      // 2. Check if .env file exists
      const envExists = await fs.access(options.envFile)
        .then(() => true)
        .catch(() => false);

      if (!envExists) {
        console.log(chalk.red(`✗ ${options.envFile} not found.`));
        console.log(chalk.gray(`  Create a .env file first, or specify path with --env-file`));
        process.exit(1);
      }

      // 3. Prompt for project name
      const { projectName } = await prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: path.basename(process.cwd())
        }
      ]);

      // 4. Prompt for passphrase
      const { passphrase } = await prompt([
        {
          type: 'password',
          name: 'passphrase',
          message: 'Create a passphrase for this project:',
          validate: (input) => {
            const result = validatePassphrase(input);
            return result.valid || result.error!;
          }
        }
      ]);

      const { passphraseConfirm } = await prompt([
        {
          type: 'password',
          name: 'passphraseConfirm',
          message: 'Confirm passphrase:',
          validate: (input) => input === passphrase || 'Passphrases do not match'
        }
      ]);

      const spinner = ora('Initializing project...').start();

      // 5. Generate salt and derive master key
      const salt = await generateSalt();
      const masterKey = await deriveKey(passphrase, salt);

      // 6. Generate project key
      const projectKey = await generateProjectKey();

      // 7. Encrypt project key with master key
      const encryptedProjectKey = await encrypt(
        Buffer.from(projectKey).toString('base64'),
        masterKey
      );

      // 8. Read and encrypt .env file
      const envContents = await fs.readFile(options.envFile, 'utf8');
      const encryptedEnv = await encrypt(envContents, projectKey);

      spinner.text = 'Creating project on server...';

      // 9. Create project on server
      const project = await createProject({
        name: projectName,
        salt: Buffer.from(salt).toString('base64'),
        encryptedProjectKey,
        environments: [
          {
            name: 'development',
            encryptedBlob: encryptedEnv
          }
        ]
      });

      spinner.text = 'Saving configuration...';

      // 10. Save config locally
      await fs.mkdir('.sticky', { recursive: true });
      await saveConfig({
        projectId: project.id,
        projectName,
        salt: Buffer.from(salt).toString('base64'),
        version: 1,
        lastSyncedAt: new Date().toISOString()
      });

      // 11. Save passphrase to keychain (if enabled)
      if (options.keychain) {
        await savePassphrase(project.id, passphrase);
      }

      // 12. Add .sticky to .gitignore
      await addToGitignore('.sticky/');

      spinner.succeed('Project initialized!');

      console.log();
      console.log(chalk.green('✓'), `Project "${projectName}" created`);
      console.log(chalk.green('✓'), 'Environment variables encrypted and synced');
      console.log();
      console.log(chalk.bold('Share this invite link with your team:'));
      console.log(chalk.cyan(`  https://sticky.env/join/${project.inviteCode}`));
      console.log();
      console.log(chalk.gray('Or use:'), chalk.white(`sticky invite <email>`));
      console.log();
      console.log(chalk.yellow('⚠ Important:'), 'Save your passphrase securely!');
      console.log(chalk.gray('  If you lose it, you cannot recover your secrets.'));

    } catch (error) {
      console.error(chalk.red('✗'), error.message);
      process.exit(1);
    }
  });

async function addToGitignore(entry: string) {
  const gitignorePath = '.gitignore';
  let content = '';

  try {
    content = await fs.readFile(gitignorePath, 'utf8');
  } catch {
    // .gitignore doesn't exist, create it
  }

  if (!content.includes(entry)) {
    content += content.endsWith('\n') ? '' : '\n';
    content += `${entry}\n`;
    await fs.writeFile(gitignorePath, content);
  }
}
```

### Distribution

#### npm Package

```json
{
  "name": "sticky-env",
  "version": "1.0.0",
  "description": "LastPass for environment variables",
  "bin": {
    "sticky": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "argon2": "^0.31.2",
    "axios": "^1.6.2",
    "chalk": "^4.1.2",
    "chokidar": "^3.5.3",
    "commander": "^11.1.0",
    "conf": "^11.0.2",
    "dotenv": "^16.3.1",
    "inquirer": "^9.2.12",
    "keytar": "^7.9.0",
    "libsodium-wrappers": "^0.7.13",
    "ora": "^5.4.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "nock": "^13.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Homebrew (macOS/Linux)

```ruby
# Formula/sticky-env.rb
class StickyEnv < Formula
  desc "LastPass for environment variables"
  homepage "https://sticky.env"
  url "https://github.com/yourusername/sticky-env/archive/v1.0.0.tar.gz"
  sha256 "..."

  depends_on "node"

  def install
    system "npm", "install", "--production", "--prefix", libexec
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/sticky", "--version"
  end
end
```

---

## Component 2: Backend API

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Runtime | Node.js 20+ (Serverless) | Fast cold starts, familiar |
| Framework | Hono | Lightweight, edge-compatible |
| Hosting | Vercel Functions | Zero config, auto-scaling |
| Database | Neon Postgres | Serverless, generous free tier |
| ORM | Drizzle ORM | Type-safe, lightweight |
| Auth | Custom JWT | Simple, stateless |
| Email | Resend | Modern, developer-friendly |
| Validation | Zod | TypeScript-first schemas |
| Testing | Vitest | Fast, modern |

### Project Structure

```
backend/
├── api/
│   ├── auth/
│   │   ├── signup.ts
│   │   ├── login.ts
│   │   └── verify.ts
│   │
│   ├── projects/
│   │   ├── create.ts
│   │   ├── list.ts
│   │   ├── get.ts
│   │   ├── invite.ts
│   │   └── join.ts
│   │
│   ├── sync/
│   │   ├── push.ts
│   │   ├── pull.ts
│   │   └── history.ts
│   │
│   └── middleware/
│       ├── auth.ts
│       ├── ratelimit.ts
│       └── cors.ts
│
├── db/
│   ├── schema.ts          # Drizzle schema
│   ├── migrations/        # SQL migrations
│   └── client.ts          # DB connection
│
├── lib/
│   ├── jwt.ts             # JWT utilities
│   ├── email.ts           # Email sending
│   └── validation.ts      # Zod schemas
│
├── index.ts               # API entry point
├── vercel.json            # Vercel config
├── package.json
└── tsconfig.json
```

### Database Schema (Drizzle ORM)

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  salt: text('salt').notNull(),  // Base64 encoded
  encryptedProjectKey: text('encrypted_project_key').notNull(),
  encryptedProjectKeyNonce: text('encrypted_project_key_nonce').notNull(),
  inviteCode: text('invite_code').unique().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  rotatedAt: timestamp('rotated_at')  // Last key rotation
});

export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').references(() => projects.id),
  userId: uuid('user_id').references(() => users.id),
  role: text('role').default('member'),  // 'admin' | 'member' | 'readonly'
  joinedAt: timestamp('joined_at').defaultNow()
}, (table) => ({
  pk: uniqueIndex('project_members_pk').on(table.projectId, table.userId)
}));

export const environments = pgTable('environments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  name: text('name').notNull(),  // 'development', 'staging', 'production'
  encryptedBlob: text('encrypted_blob').notNull(),
  encryptedBlobNonce: text('encrypted_blob_nonce').notNull(),
  version: integer('version').notNull().default(1),
  hash: text('hash').notNull(),  // SHA256 of plaintext (for conflict detection)
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  uniqueVersion: uniqueIndex('env_version_idx').on(
    table.projectId,
    table.name,
    table.version
  )
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),  // 'sync_push', 'sync_pull', 'member_added', etc.
  environment: text('environment'),
  metadata: text('metadata'),  // JSON string
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});
```

### API Endpoints

#### POST /api/auth/signup

```typescript
// api/auth/signup.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import { sendMagicLink } from '../../lib/email';
import { generateToken } from '../../lib/jwt';

const signupSchema = z.object({
  email: z.string().email()
});

const app = new Hono();

app.post('/', async (c) => {
  const body = await c.req.json();
  const { email } = signupSchema.parse(body);

  // Check if user exists
  let user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email)
  });

  // Create user if doesn't exist
  if (!user) {
    const [newUser] = await db.insert(users).values({ email }).returning();
    user = newUser;
  }

  // Generate magic link token
  const token = generateToken({ userId: user.id }, '15m');

  // Send magic link email
  await sendMagicLink(email, token);

  return c.json({
    message: 'Magic link sent! Check your email.',
    email
  });
});

export default app;
```

#### POST /api/sync/push

```typescript
// api/sync/push.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { db } from '../../db/client';
import { environments, auditLogs } from '../../db/schema';

const pushSchema = z.object({
  projectId: z.string().uuid(),
  environment: z.string().default('development'),
  encryptedBlob: z.string(),
  encryptedBlobNonce: z.string(),
  hash: z.string(),  // SHA256 of plaintext (for conflict detection)
  previousVersion: z.number().optional()
});

const app = new Hono();

app.use('*', authMiddleware);

app.post('/', async (c) => {
  const body = await c.req.json();
  const data = pushSchema.parse(body);
  const userId = c.get('userId');

  // Get latest version
  const latest = await db.query.environments.findFirst({
    where: (env, { and, eq }) => and(
      eq(env.projectId, data.projectId),
      eq(env.name, data.environment)
    ),
    orderBy: (env, { desc }) => [desc(env.version)]
  });

  // Conflict detection
  if (latest && data.previousVersion && latest.version !== data.previousVersion) {
    return c.json({
      error: 'Conflict detected',
      message: 'Another user has pushed changes. Please pull and merge.',
      latestVersion: latest.version,
      yourVersion: data.previousVersion
    }, 409);
  }

  const newVersion = (latest?.version || 0) + 1;

  // Insert new version
  const [env] = await db.insert(environments).values({
    projectId: data.projectId,
    name: data.environment,
    encryptedBlob: data.encryptedBlob,
    encryptedBlobNonce: data.encryptedBlobNonce,
    version: newVersion,
    hash: data.hash,
    updatedBy: userId
  }).returning();

  // Audit log
  await db.insert(auditLogs).values({
    projectId: data.projectId,
    userId,
    action: 'sync_push',
    environment: data.environment,
    metadata: JSON.stringify({ version: newVersion }),
    ipAddress: c.req.header('x-forwarded-for'),
    userAgent: c.req.header('user-agent')
  });

  return c.json({
    success: true,
    version: newVersion,
    syncedAt: env.updatedAt
  });
});

export default app;
```

### Deployment (Vercel)

#### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/index.ts"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "JWT_SECRET": "@jwt-secret",
    "RESEND_API_KEY": "@resend-api-key"
  }
}
```

#### Environment Variables (Vercel Dashboard)

```bash
DATABASE_URL=postgresql://user:pass@host/db  # Neon connection string
JWT_SECRET=<random-256-bit-secret>
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## Component 3: Database

### Neon Postgres Setup

1. **Create account:** https://neon.tech
2. **Create project:** "sticky-env-prod"
3. **Copy connection string:** `postgresql://...`

### Initial Migration

```sql
-- db/migrations/001_init.sql

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  salt TEXT NOT NULL,
  encrypted_project_key TEXT NOT NULL,
  encrypted_project_key_nonce TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP
);

-- Project members
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Environments
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  encrypted_blob TEXT NOT NULL,
  encrypted_blob_nonce TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  hash TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (project_id, name, version)
);

CREATE INDEX idx_env_latest ON environments (project_id, name, version DESC);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  environment TEXT,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_project ON audit_logs (project_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);
```

### Run Migration

```bash
# Install Drizzle CLI
npm install -g drizzle-kit

# Generate migration
drizzle-kit generate:pg --schema=./db/schema.ts

# Run migration
drizzle-kit push:pg --connection-string=$DATABASE_URL
```

---

## Testing Strategy

### Unit Tests (CLI)

```typescript
// tests/crypto/encrypt.test.ts
import { encrypt, decrypt } from '../../src/crypto/encrypt';
import { generateProjectKey } from '../../src/crypto/kdf';

describe('Encryption', () => {
  it('should encrypt and decrypt successfully', async () => {
    const plaintext = 'API_KEY=secret123\nDB_URL=postgres://...';
    const key = await generateProjectKey();

    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });

  it('should fail with wrong key', async () => {
    const plaintext = 'API_KEY=secret123';
    const key1 = await generateProjectKey();
    const key2 = await generateProjectKey();

    const encrypted = await encrypt(plaintext, key1);

    await expect(decrypt(encrypted, key2)).rejects.toThrow();
  });
});
```

### Integration Tests (API)

```typescript
// tests/api/sync.test.ts
import { testClient } from 'hono/testing';
import app from '../../api/sync/push';

describe('POST /api/sync/push', () => {
  it('should push encrypted env successfully', async () => {
    const res = await testClient(app).post('/', {
      json: {
        projectId: 'test-project-id',
        environment: 'development',
        encryptedBlob: 'base64...',
        encryptedBlobNonce: 'base64...',
        hash: 'sha256...'
      },
      headers: {
        Authorization: 'Bearer test-token'
      }
    });

    expect(res.status).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      version: 1
    });
  });
});
```

### E2E Tests

```bash
# tests/e2e/workflow.test.sh

# Setup
cd /tmp/test-project
echo "API_KEY=test123" > .env

# Test: Init
sticky init --passphrase="test-passphrase-xyz"
test -d .sticky || exit 1

# Test: Push
sticky push
test $? -eq 0 || exit 1

# Test: Pull (different directory)
cd /tmp/test-project-2
sticky join <invite-code> --passphrase="test-passphrase-xyz"
test -f .env || exit 1
grep "API_KEY=test123" .env || exit 1

echo "✓ All E2E tests passed"
```

---

## Performance Considerations

### CLI

**Target:** < 500ms for common operations

| Operation | Target Latency | Optimization |
|-----------|----------------|--------------|
| sticky status | < 100ms | Local only, no API calls |
| sticky push | < 500ms | Parallel: encrypt + upload |
| sticky pull | < 500ms | Parallel: download + decrypt |
| sticky run | < 200ms | Cached passphrase, local decrypt |

**Optimization: Passphrase Caching**
- Store in OS keychain → no re-prompt
- Reduces latency from ~3s (Argon2id) to ~50ms

### API

**Target:** < 200ms p99 latency

| Endpoint | Target | Optimization |
|----------|--------|--------------|
| POST /sync | < 200ms | Indexed queries, connection pooling |
| GET /projects | < 100ms | Cache with Vercel Edge |
| POST /auth | < 500ms | Async email sending |

**Database Optimization:**
- **Connection pooling:** Neon serverless driver (no cold start)
- **Indexes:** On `(project_id, name, version)`
- **Pagination:** Limit history queries to 100 entries

---

## Monitoring & Observability

### Metrics to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| API latency | Vercel Analytics | p99 > 1s |
| Error rate | Sentry | > 1% |
| DB connections | Neon dashboard | > 80% of limit |
| CLI crashes | Sentry (CLI SDK) | > 10/day |

### Logging

**API logs (JSON format):**
```json
{
  "timestamp": "2025-11-11T10:30:00Z",
  "level": "info",
  "userId": "user_abc",
  "projectId": "proj_xyz",
  "action": "sync_push",
  "latency_ms": 142,
  "status": 200
}
```

**CLI logs (local file):**
```
~/.sticky/logs/2025-11-11.log
```

---

## Security Hardening

### Rate Limiting

```typescript
// middleware/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 req/min
  analytics: true
});

export async function rateLimitMiddleware(c, next) {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await next();
}
```

### Input Validation

```typescript
// Validate all inputs with Zod
const syncPushSchema = z.object({
  projectId: z.string().uuid(),
  environment: z.string().regex(/^[a-z0-9-]+$/),  // Alphanumeric + hyphens only
  encryptedBlob: z.string().max(1_000_000),  // 1MB limit
  hash: z.string().length(64)  // SHA256 hex
});
```

### SQL Injection Prevention

- **Use ORM (Drizzle):** Never construct raw SQL from user input
- **Parameterized queries:** All user data as params, not concatenated

---

## Scalability Plan

### MVP (0-100 teams)
- **Backend:** Vercel Functions (serverless, auto-scaling)
- **Database:** Neon free tier (10GB storage, 100GB bandwidth)
- **Cost:** $0-20/month

### Growth (100-1,000 teams)
- **Backend:** Same (Vercel scales automatically)
- **Database:** Neon Pro ($69/month, 50GB storage, 500GB bandwidth)
- **CDN:** Vercel Edge for static assets
- **Cost:** ~$100-200/month

### Scale (1,000-10,000 teams)
- **Backend:** Vercel Enterprise (dedicated resources)
- **Database:** Neon Enterprise or AWS RDS Postgres
- **Caching:** Redis (Upstash) for hot data
- **Monitoring:** Datadog or New Relic
- **Cost:** ~$1,000-5,000/month

---

## Disaster Recovery

### Backup Strategy

1. **Database backups:** Neon automatic daily backups (7-day retention)
2. **Point-in-time recovery:** Neon supports PITR (paid plan)
3. **Encrypted backup export:**
   ```bash
   sticky export-all --output=backup-2025-11-11.enc
   ```

### Incident Response Plan

| Scenario | Response | RTO | RPO |
|----------|----------|-----|-----|
| API down | Vercel auto-failover | < 5 min | 0 |
| Database corruption | Restore from backup | < 1 hr | < 24 hrs |
| Data breach | Rotate all keys, notify users | < 4 hrs | N/A |

---

## Launch Checklist

- [ ] CLI: All core commands implemented
- [ ] CLI: Published to npm
- [ ] CLI: Homebrew formula created
- [ ] Backend: Deployed to Vercel
- [ ] Database: Migrated and indexed
- [ ] Security: E2E encryption audited
- [ ] Testing: 80%+ code coverage
- [ ] Docs: README with quickstart
- [ ] Monitoring: Sentry + Vercel Analytics
- [ ] Legal: Privacy policy + Terms of Service

---

**Next:** See `IMPLEMENTATION_ROADMAP.md` for week-by-week execution plan.
