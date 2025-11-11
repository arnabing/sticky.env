# Sticky.env Security Model

## Zero-Knowledge Architecture

**Core Principle:** The server NEVER has access to plaintext secrets. All encryption/decryption happens on the client.

---

## Threat Model

### What We Protect Against

1. **Server Compromise** ✅
   - Attacker gains access to database
   - Result: Only encrypted blobs exposed (useless without passphrase)

2. **Man-in-the-Middle Attack** ✅
   - Attacker intercepts network traffic
   - Result: Only encrypted data in transit (TLS + E2E encryption)

3. **Malicious Insider** ✅
   - Sticky.env employee tries to read secrets
   - Result: Cannot decrypt without user's passphrase

4. **Compromised Team Member** ⚠️
   - Team member's machine is compromised
   - Result: Attacker can read that member's local .env
   - Mitigation: Key rotation when member leaves team

5. **Weak Passphrase** ⚠️
   - User chooses "password123"
   - Result: Brute force attack possible on encrypted blobs
   - Mitigation: Enforce minimum entropy, suggest generated passphrases

6. **Phishing Attack** ⚠️
   - User enters passphrase on fake site
   - Result: Attacker gets passphrase, can decrypt secrets
   - Mitigation: CLI-first approach (no web login for secrets), passphrase warnings

### What We DON'T Protect Against

1. **Local Machine Compromise** ❌
   - If attacker has access to your machine, they can read .env files
   - This is out of scope (OS-level security problem)

2. **Social Engineering** ❌
   - User voluntarily shares passphrase with attacker
   - This is out of scope (user education problem)

3. **Malicious Code Execution** ❌
   - Attacker runs code that reads process.env
   - This is out of scope (application security problem)

---

## Encryption Design

### Key Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PASSPHRASE                           │
│                  (never leaves device)                       │
│                                                              │
│  "my-secret-passphrase-with-good-entropy-xyz123"            │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ Argon2id(passphrase, salt, params)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     MASTER KEY                               │
│                  (derived, not stored)                       │
│                                                              │
│  32 bytes of cryptographically secure key material          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ Encrypts/Decrypts ↓
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROJECT KEY                                │
│            (random, encrypted, stored in DB)                 │
│                                                              │
│  32 bytes random key, generated once per project            │
│  Stored as: XChaCha20(project_key, master_key, nonce)       │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ Encrypts/Decrypts ↓
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  ENV FILE CONTENTS                           │
│            (encrypted, stored in DB)                         │
│                                                              │
│  XChaCha20-Poly1305(env_contents, project_key, nonce)       │
│  Authenticated encryption with integrity check              │
└─────────────────────────────────────────────────────────────┘
```

### Why This Design?

1. **User Passphrase** → Human-memorable, shared among team
2. **Master Key** → Derived from passphrase using slow KDF (Argon2id)
   - Makes brute-force attacks expensive
   - Not stored anywhere, only derived when needed
3. **Project Key** → Random, unique per project
   - Allows key rotation without changing passphrase
   - Encrypted with master key before storage
4. **ENV Contents** → Actual secrets
   - Encrypted with project key
   - Authenticated (tamper-proof) using Poly1305 MAC

---

## Cryptographic Primitives

### Key Derivation: Argon2id

**Purpose:** Convert human passphrase into cryptographic key

**Algorithm:** Argon2id (winner of Password Hashing Competition)

**Parameters:**
```javascript
const argon2Params = {
  time: 3,           // Iterations (higher = slower = more secure)
  memory: 65536,     // 64 MB memory usage (resistant to GPU attacks)
  parallelism: 1,    // Single thread (for CLI consistency)
  hashLength: 32,    // 256 bits output
  saltLength: 16     // 128 bits salt (unique per project)
};
```

**Why Argon2id:**
- Resistant to GPU/ASIC attacks (memory-hard)
- Balanced design (time-memory tradeoff resistant)
- Modern standard (better than bcrypt/scrypt)

**Implementation:**
```typescript
import argon2 from 'argon2';

async function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return await argon2.hash(passphrase, {
    type: argon2.argon2id,
    memoryCost: 65536,     // 64 MB
    timeCost: 3,           // 3 iterations
    parallelism: 1,
    raw: true,             // Return raw bytes, not encoded string
    salt: salt,
    hashLength: 32
  });
}
```

### Encryption: XChaCha20-Poly1305

**Purpose:** Encrypt env file contents and project keys

**Algorithm:** XChaCha20-Poly1305 (authenticated encryption)

**Why XChaCha20-Poly1305:**
- Fast (software-based, no hardware required)
- Secure (used by Signal, WireGuard, TLS 1.3)
- Large nonce space (192-bit, virtually no collision risk)
- Authenticated (Poly1305 MAC prevents tampering)
- Constant-time (resistant to timing attacks)

**Nonce Strategy:**
- Generate random 192-bit nonce for each encryption
- Store nonce alongside ciphertext (not secret)
- Never reuse nonce with same key (XChaCha20 makes this easy)

**Implementation:**
```typescript
import sodium from 'libsodium-wrappers';

async function encrypt(
  plaintext: string,
  key: Uint8Array
): Promise<{ ciphertext: string, nonce: string }> {
  await sodium.ready;

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const message = sodium.from_string(plaintext);
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce)
  };
}

async function decrypt(
  ciphertext: string,
  nonce: string,
  key: Uint8Array
): Promise<string> {
  await sodium.ready;

  const ciphertextBytes = sodium.from_base64(ciphertext);
  const nonceBytes = sodium.from_base64(nonce);
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

### Random Number Generation

**Purpose:** Generate project keys, nonces, salts

**Source:** `libsodium.randombytes_buf()`
- Uses OS-level CSPRNG (e.g., /dev/urandom on Linux)
- Cryptographically secure
- No seed needed (entropy from kernel)

---

## Encryption Flow (Step by Step)

### Initial Setup: Creating a Project

```typescript
// 1. User runs: sticky init
const passphrase = await promptSecretly('Create passphrase for this project:');

// 2. Validate passphrase strength
const entropy = calculateEntropy(passphrase);
if (entropy < 50) {
  throw new Error('Passphrase too weak. Need at least 50 bits entropy.');
}

// 3. Generate unique salt for this project
const salt = sodium.randombytes_buf(16);  // 128 bits

// 4. Derive master key from passphrase
const masterKey = await deriveKey(passphrase, salt);

// 5. Generate random project key
const projectKey = sodium.randombytes_buf(32);  // 256 bits

// 6. Encrypt project key with master key
const { ciphertext: encryptedProjectKey, nonce: projectKeyNonce } =
  await encrypt(projectKey, masterKey);

// 7. Read .env file contents
const envContents = fs.readFileSync('.env', 'utf8');

// 8. Encrypt env contents with project key
const { ciphertext: encryptedEnv, nonce: envNonce } =
  await encrypt(envContents, projectKey);

// 9. Send to server (no plaintext!)
await api.post('/projects', {
  name: 'my-project',
  salt: sodium.to_base64(salt),
  encryptedProjectKey,
  projectKeyNonce,
  encryptedEnv,
  envNonce
});

// 10. Save metadata locally (for future syncs)
fs.writeFileSync('.sticky/config.json', JSON.stringify({
  projectId: response.projectId,
  salt: sodium.to_base64(salt)
}));

console.log('✓ Project created and synced securely!');
```

### Joining a Project

```typescript
// 1. User runs: sticky join abc123xyz
const inviteCode = 'abc123xyz';

// 2. User enters passphrase (must match what creator used)
const passphrase = await promptSecretly('Enter project passphrase:');

// 3. Fetch encrypted data from server
const project = await api.get(`/projects/join/${inviteCode}`);
const { salt, encryptedProjectKey, projectKeyNonce, encryptedEnv, envNonce } = project;

// 4. Derive master key (same as creator if passphrase matches)
const masterKey = await deriveKey(passphrase, sodium.from_base64(salt));

// 5. Decrypt project key
const projectKey = await decrypt(
  encryptedProjectKey,
  projectKeyNonce,
  masterKey
);
// ⚠️ If passphrase is wrong, this will throw error

// 6. Decrypt env contents
const envContents = await decrypt(encryptedEnv, envNonce, projectKey);

// 7. Write to .env file
fs.writeFileSync('.env', envContents);

console.log('✓ Project joined! .env file created.');
```

### Pushing Changes

```typescript
// 1. User edits .env file and runs: sticky push

// 2. Read passphrase from keychain (or prompt)
const passphrase = await getPassphraseFromKeychain(projectId);

// 3. Load project metadata
const config = JSON.parse(fs.readFileSync('.sticky/config.json'));
const { salt, projectId } = config;

// 4. Derive master key
const masterKey = await deriveKey(passphrase, sodium.from_base64(salt));

// 5. Fetch encrypted project key from server
const { encryptedProjectKey, projectKeyNonce } =
  await api.get(`/projects/${projectId}`);

// 6. Decrypt project key
const projectKey = await decrypt(
  encryptedProjectKey,
  projectKeyNonce,
  masterKey
);

// 7. Read modified .env file
const envContents = fs.readFileSync('.env', 'utf8');

// 8. Encrypt with project key
const { ciphertext: encryptedEnv, nonce: envNonce } =
  await encrypt(envContents, projectKey);

// 9. Push to server
await api.post('/sync', {
  projectId,
  encryptedEnv,
  envNonce,
  version: config.version + 1
});

console.log('✓ Changes pushed securely!');
```

---

## Passphrase Management

### Passphrase Requirements

**Minimum Entropy:** 50 bits
- ~12 random characters, or
- 4-5 random words (diceware-style), or
- 20+ characters mixed case + numbers

**Examples:**
- ❌ "password123" (too weak, dictionary word)
- ❌ "MyProject2024" (too weak, guessable)
- ✅ "correct-horse-battery-staple-7829" (strong, memorable)
- ✅ "Xk9#mP2$vL4@nQ8!" (strong, random)

**Validation:**
```typescript
function calculateEntropy(passphrase: string): number {
  // Simplified entropy calculation
  const charsetSize = estimateCharsetSize(passphrase);
  return Math.log2(charsetSize ** passphrase.length);
}

function estimateCharsetSize(passphrase: string): number {
  let size = 0;
  if (/[a-z]/.test(passphrase)) size += 26;
  if (/[A-Z]/.test(passphrase)) size += 26;
  if (/[0-9]/.test(passphrase)) size += 10;
  if (/[^a-zA-Z0-9]/.test(passphrase)) size += 32;
  return size;
}
```

### Passphrase Storage (Local Machine)

**Problem:** Typing passphrase on every command is annoying

**Solutions (in order of preference):**

1. **OS Keychain (Recommended)**
   - macOS: Keychain Access
   - Linux: gnome-keyring / kwallet / secret-service
   - Windows: Windows Credential Manager
   - Library: `keytar` (Electron's secure storage)

2. **Encrypted local cache**
   - Store passphrase encrypted with machine-specific key
   - Derived from hardware UUID + user home directory
   - Auto-expire after 24 hours

3. **Environment variable (Least secure)**
   - `STICKY_PASSPHRASE=...` in shell
   - Only for CI/CD environments (not local dev)

**Implementation:**
```typescript
import keytar from 'keytar';

const SERVICE_NAME = 'sticky-env';

async function savePassphrase(projectId: string, passphrase: string) {
  await keytar.setPassword(SERVICE_NAME, projectId, passphrase);
}

async function getPassphrase(projectId: string): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, projectId);
}

async function deletePassphrase(projectId: string) {
  await keytar.deletePassword(SERVICE_NAME, projectId);
}
```

---

## Key Rotation

### When to Rotate Keys

1. **Team member leaves** → Rotate project key
2. **Suspected compromise** → Rotate project key
3. **Periodic rotation** → Every 90 days (recommended)
4. **Passphrase change** → Rotate master key (re-encrypt project key)

### Rotation Process

```typescript
// 1. Admin runs: sticky rotate-key
console.log('⚠ This will re-encrypt all env vars with a new key.');
console.log('All team members will need to re-authenticate.');

const confirm = await prompt('Continue? (y/N)');
if (confirm !== 'y') return;

// 2. Authenticate admin
const passphrase = await promptSecretly('Enter current passphrase:');
const masterKey = await deriveKey(passphrase, salt);

// 3. Fetch current encrypted data
const { encryptedProjectKey, projectKeyNonce, encryptedEnv, envNonce } =
  await api.get(`/projects/${projectId}`);

// 4. Decrypt with old project key
const oldProjectKey = await decrypt(encryptedProjectKey, projectKeyNonce, masterKey);
const envContents = await decrypt(encryptedEnv, envNonce, oldProjectKey);

// 5. Generate NEW project key
const newProjectKey = sodium.randombytes_buf(32);

// 6. Encrypt project key with master key (same passphrase)
const { ciphertext: newEncryptedProjectKey, nonce: newProjectKeyNonce } =
  await encrypt(newProjectKey, masterKey);

// 7. Re-encrypt env contents with NEW project key
const { ciphertext: newEncryptedEnv, nonce: newEnvNonce } =
  await encrypt(envContents, newProjectKey);

// 8. Update server (atomic operation)
await api.post(`/projects/${projectId}/rotate-key`, {
  encryptedProjectKey: newEncryptedProjectKey,
  projectKeyNonce: newProjectKeyNonce,
  encryptedEnv: newEncryptedEnv,
  envNonce: newEnvNonce,
  rotatedAt: new Date().toISOString()
});

// 9. Invalidate all team members' sessions
await api.post(`/projects/${projectId}/invalidate-sessions`);

console.log('✓ Key rotated successfully!');
console.log('✓ Team members will be prompted to re-authenticate on next sync.');
```

---

## Transport Security

### HTTPS Only

- All API requests MUST use HTTPS (TLS 1.3 preferred)
- Certificate pinning (optional, for paranoid users)
- HSTS header enforced

### Request Authentication

**JWT tokens** for API authentication:
```typescript
const token = jwt.sign(
  { userId, projectId, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

**No passphrase in JWT!** Only user/project IDs.

---

## Audit Logging

### What to Log (Server-Side)

✅ Log these (safe, no secrets):
- User ID who made the request
- Timestamp
- Action (push, pull, join, etc.)
- Project ID
- Version number
- IP address (optional, for security analysis)

❌ NEVER log these:
- Passphrases
- Decrypted env contents
- Project keys (even encrypted)
- Plaintext variable names or values

### Example Audit Log Entry

```json
{
  "id": "log_abc123",
  "userId": "user_xyz789",
  "projectId": "proj_foo456",
  "action": "sync_push",
  "environment": "production",
  "version": 42,
  "timestamp": "2025-11-11T10:30:00Z",
  "ipAddress": "192.0.2.1",
  "userAgent": "sticky-cli/1.0.0"
}
```

---

## Multi-Environment Support

### Problem

Dev, staging, and prod should have different secrets, but same team.

### Solution

**Separate encryption per environment:**

```
Project: my-app
├── Environment: development
│   ├── Encrypted blob (DEV_API_KEY=dev_key_123)
│   └── Accessible by: all team members
├── Environment: staging
│   ├── Encrypted blob (STAGING_API_KEY=staging_key_456)
│   └── Accessible by: all team members
└── Environment: production
    ├── Encrypted blob (PROD_API_KEY=prod_key_789)
    └── Accessible by: only admins (role-based)
```

**CLI Usage:**
```bash
sticky pull --env=development   # Default
sticky pull --env=staging
sticky pull --env=production    # Requires admin role

sticky push --env=production    # Push to prod (admin only)
```

**Permissions Matrix:**

| Role | Development | Staging | Production |
|------|-------------|---------|------------|
| Member | Read/Write | Read/Write | Read-only |
| Admin | Read/Write | Read/Write | Read/Write |
| Readonly | Read-only | Read-only | No access |

---

## Backup & Recovery

### What if I forget my passphrase?

**Short answer:** You can't recover it. That's the point of E2E encryption.

**Options:**

1. **Prevention: Backup Passphrase**
   ```bash
   sticky init
   # Output:
   # ⚠ IMPORTANT: Save this passphrase somewhere safe!
   # If you lose it, you CANNOT recover your secrets.
   #
   # Passphrase: correct-horse-battery-staple-7829
   #
   # Suggestions:
   # • Store in password manager (1Password, Bitwarden)
   # • Write on paper, keep in safe
   # • Share with trusted team member
   ```

2. **Recovery: Team Member Shares**
   - Any team member with passphrase can share it securely
   - Use `sticky export` to generate encrypted backup

3. **Last Resort: Create New Project**
   - If ALL team members lose passphrase: start over
   - Import from old .env files (if available locally)

### Encrypted Backups

```bash
sticky export --output=backup.sticky.enc

# Creates encrypted backup file (can decrypt with passphrase)
# Store this in Google Drive / Dropbox / etc.
```

**Import backup:**
```bash
sticky import backup.sticky.enc
# Prompts for passphrase, restores project
```

---

## Security Checklist (Before Launch)

- [ ] Conduct security audit (hire external firm or use HackerOne)
- [ ] Publish threat model publicly
- [ ] Open source crypto code (for community review)
- [ ] Set up bug bounty program
- [ ] Add rate limiting to API (prevent brute force)
- [ ] Add anomaly detection (alert on unusual sync patterns)
- [ ] Implement 2FA for web dashboard (optional for CLI)
- [ ] Add security.txt file (RFC 9116)
- [ ] Create incident response plan
- [ ] Document security practices in user guide

---

## Future Enhancements

### Hardware Security Keys (YubiKey)

Replace passphrase with hardware token:
```bash
sticky init --yubikey
# Touch YubiKey to generate cryptographic key
# No passphrase to remember!
```

### Shamir Secret Sharing

Split passphrase into N parts, require K to decrypt:
```bash
sticky init --shamir --threshold=3 --shares=5
# Generates 5 key shares
# Need any 3 to decrypt
# Good for teams: no single point of failure
```

### Blockchain-Based Audit Log (Extreme)

Immutable audit trail on public blockchain:
- Prove "API_KEY was changed at 10:30 AM on Nov 11, 2025"
- Detect retroactive log tampering
- (Very overkill for MVP, but cool!)

---

## Conclusion

This security model provides:
- ✅ **Zero-knowledge architecture** (server can't read secrets)
- ✅ **Strong encryption** (industry-standard algorithms)
- ✅ **Defense in depth** (passphrase + project key + env encryption)
- ✅ **Auditability** (logs without exposing secrets)
- ✅ **Team collaboration** (shared passphrase model)
- ✅ **Compliance-friendly** (GDPR, SOC 2 ready)

**Trade-offs:**
- ⚠️ Passphrase loss = data loss (no recovery)
- ⚠️ Shared passphrase = trust among team (social problem)
- ⚠️ Performance cost (encryption/decryption overhead)

**Overall:** This is a secure, practical design suitable for a production SaaS product.
