import Conf from 'conf';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StickyConfig } from '../types';

const DEFAULT_CONFIG: Partial<StickyConfig> = {
  profiles: [],
  files: [],
  syncTogether: true,
  dangerousProfiles: [],
};

/**
 * Config manager for Sticky.env
 * Stores configuration in .sticky/config.json
 */
export class ConfigManager {
  private configPath: string;
  private config: StickyConfig | null = null;

  constructor(rootDir: string = process.cwd()) {
    this.configPath = path.join(rootDir, '.sticky', 'config.json');
  }

  /**
   * Check if config exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load configuration
   */
  async load(): Promise<StickyConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(content) } as StickyConfig;
      return this.config;
    } catch (error) {
      throw new Error(
        'No Sticky configuration found. Run `sticky init` first.'
      );
    }
  }

  /**
   * Save configuration
   */
  async save(config: StickyConfig): Promise<void> {
    const dir = path.dirname(this.configPath);

    // Ensure .sticky directory exists
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory already exists
    }

    // Write config
    await fs.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    this.config = config;
  }

  /**
   * Update specific config fields
   */
  async update(updates: Partial<StickyConfig>): Promise<void> {
    const config = await this.load();
    const updated = { ...config, ...updates };
    await this.save(updated);
  }

  /**
   * Get current profile
   */
  async getCurrentProfile(): Promise<string | undefined> {
    const config = await this.load();
    return config.currentProfile;
  }

  /**
   * Set current profile
   */
  async setCurrentProfile(profile: string): Promise<void> {
    await this.update({ currentProfile: profile });
  }

  /**
   * Get Vercel token from config or environment
   */
  getVercelToken(): string | undefined {
    // Try environment variable first
    if (process.env.VERCEL_TOKEN) {
      return process.env.VERCEL_TOKEN;
    }

    // Try config
    if (this.config?.vercelToken) {
      return this.config.vercelToken;
    }

    return undefined;
  }

  /**
   * Set Vercel token in config
   */
  async setVercelToken(token: string): Promise<void> {
    await this.update({ vercelToken: token });
  }
}

/**
 * Load profiles from .sticky/profiles/ directory
 */
export async function loadProfilesFromDisk(
  rootDir: string = process.cwd()
): Promise<Map<string, Record<string, string>>> {
  const profilesDir = path.join(rootDir, '.sticky', 'profiles');
  const profiles = new Map<string, Record<string, string>>();

  try {
    const files = await fs.readdir(profilesDir);

    for (const file of files) {
      if (file.endsWith('.env')) {
        const profileName = file.replace('.env', '');
        const filePath = path.join(profilesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse env file
        const variables: Record<string, string> = {};
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^["']|["']$/g, '');
              variables[key.trim()] = value;
            }
          }
        }

        profiles.set(profileName, variables);
      }
    }
  } catch (error) {
    // Profiles directory doesn't exist yet
  }

  return profiles;
}

/**
 * Save profiles to .sticky/profiles/ directory
 */
export async function saveProfilesToDisk(
  profiles: Map<string, Record<string, string>>,
  rootDir: string = process.cwd()
): Promise<void> {
  const profilesDir = path.join(rootDir, '.sticky', 'profiles');

  // Create profiles directory
  await fs.mkdir(profilesDir, { recursive: true });

  // Write each profile
  for (const [profileName, variables] of profiles.entries()) {
    const filePath = path.join(profilesDir, `${profileName}.env`);
    const content = generateEnvContent(variables);
    await fs.writeFile(filePath, content, 'utf-8');
  }
}

function generateEnvContent(variables: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(variables)) {
    const needsQuotes = /[\s#]/.test(value);
    const quotedValue = needsQuotes ? `"${value}"` : value;
    lines.push(`${key}=${quotedValue}`);
  }
  return lines.join('\n') + '\n';
}
