import * as fs from 'fs/promises';
import * as path from 'path';
import { Profile, ProfileVariable, EnvFile } from '../types';

/**
 * Parse .env file content into key-value pairs
 * Handles commented lines and extracts profile variations
 */
export function parseEnvFile(content: string): {
  active: Record<string, string>;
  commented: Record<string, string>[];
} {
  const lines = content.split('\n');
  const active: Record<string, string> = {};
  const commented: Record<string, string>[] = [];
  let currentCommentedBlock: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      if (Object.keys(currentCommentedBlock).length > 0) {
        commented.push(currentCommentedBlock);
        currentCommentedBlock = {};
      }
      continue;
    }

    // Skip comments that aren't env vars
    if (trimmed.startsWith('#') && !trimmed.includes('=')) {
      continue;
    }

    // Commented env var
    if (trimmed.startsWith('#')) {
      const uncommented = trimmed.substring(1).trim();
      const [key, ...valueParts] = uncommented.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        currentCommentedBlock[key.trim()] = value;
      }
      continue;
    }

    // Active env var
    if (trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        active[key.trim()] = value;

        // If we were building a commented block, save it first
        if (Object.keys(currentCommentedBlock).length > 0) {
          commented.push(currentCommentedBlock);
          currentCommentedBlock = {};
        }
      }
    }
  }

  // Save any remaining commented block
  if (Object.keys(currentCommentedBlock).length > 0) {
    commented.push(currentCommentedBlock);
  }

  return { active, commented };
}

/**
 * Detect profile-specific variables (keys that have multiple values)
 */
export function detectProfileVariables(
  active: Record<string, string>,
  commented: Record<string, string>[]
): ProfileVariable[] {
  const profileVars: Map<string, ProfileVariable> = new Map();

  // Collect all values for each key
  const allVariables = [active, ...commented];

  for (const vars of allVariables) {
    for (const [key, value] of Object.entries(vars)) {
      if (!profileVars.has(key)) {
        profileVars.set(key, {
          key,
          values: new Map(),
        });
      }

      // Generate profile name from value (for DATABASE_URL, extract database name)
      const profileName = guessProfileName(key, value, allVariables);
      profileVars.get(key)!.values.set(profileName, value);
    }
  }

  // Return only variables that have multiple values (profile-specific)
  return Array.from(profileVars.values()).filter((pv) => pv.values.size > 1);
}

/**
 * Guess profile name from variable value
 */
function guessProfileName(
  key: string,
  value: string,
  allVars: Record<string, string>[]
): string {
  // For DATABASE_URL, try to extract database name
  if (key === 'DATABASE_URL' && value.includes('postgresql://')) {
    const match = value.match(/\/([^/?]+)(\?|$)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // For CLERK keys with test/live
  if (key.includes('CLERK')) {
    if (value.includes('_test_')) return 'test';
    if (value.includes('_live_')) return 'live';
  }

  // For other keys, try to find distinguishing features
  const index = allVars.findIndex((vars) => vars[key] === value);
  return `profile-${index + 1}`;
}

/**
 * Build profiles from detected profile variables
 */
export function buildProfiles(
  active: Record<string, string>,
  commented: Record<string, string>[],
  profileVars: ProfileVariable[]
): Profile[] {
  const profiles: Profile[] = [];

  // Determine how many unique profiles we have
  const profileNames = new Set<string>();
  for (const pv of profileVars) {
    for (const profileName of pv.values.keys()) {
      profileNames.add(profileName);
    }
  }

  // Build each profile
  for (const profileName of profileNames) {
    const variables: Record<string, string> = {};

    // Add all shared variables (ones that don't change)
    for (const [key, value] of Object.entries(active)) {
      const isProfileVar = profileVars.some((pv) => pv.key === key);
      if (!isProfileVar) {
        variables[key] = value;
      }
    }

    // Add profile-specific variables
    for (const pv of profileVars) {
      const value = pv.values.get(profileName);
      if (value) {
        variables[pv.key] = value;
      }
    }

    profiles.push({
      name: profileName,
      variables,
      isDangerous: profileName.includes('prod') || profileName === 'live',
    });
  }

  return profiles;
}

/**
 * Generate .env file content from variables
 */
export function generateEnvContent(variables: Record<string, string>): string {
  const lines: string[] = [];

  // Group by category (based on comments in original)
  lines.push('# Generated by Sticky.env');
  lines.push('# Do not edit manually - use `sticky use <profile>` to switch profiles');
  lines.push('');

  for (const [key, value] of Object.entries(variables)) {
    // Quote value if it contains spaces or special characters
    const needsQuotes = /[\s#]/.test(value);
    const quotedValue = needsQuotes ? `"${value}"` : value;
    lines.push(`${key}=${quotedValue}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Find all .env files in monorepo
 */
export async function findEnvFiles(rootDir: string = process.cwd()): Promise<string[]> {
  const envFiles: string[] = [];

  async function scan(dir: string, depth: number = 0) {
    // Don't scan too deep or into node_modules
    if (depth > 5) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, dist, etc.
        if (entry.isDirectory()) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === '.next'
          ) {
            continue;
          }
          await scan(fullPath, depth + 1);
        } else if (entry.isFile()) {
          // Match .env, .env.local, .env.development, etc.
          if (entry.name === '.env' || entry.name.startsWith('.env.')) {
            envFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await scan(rootDir);

  // Sort by path length (prefer root .env files first)
  return envFiles.sort((a, b) => a.length - b.length);
}

/**
 * Read and parse an env file
 */
export async function readEnvFile(filePath: string): Promise<EnvFile> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { active } = parseEnvFile(content);

  return {
    path: filePath,
    content,
    variables: active,
  };
}

/**
 * Write env file
 */
export async function writeEnvFile(
  filePath: string,
  variables: Record<string, string>
): Promise<void> {
  const content = generateEnvContent(variables);
  await fs.writeFile(filePath, content, 'utf-8');
}
