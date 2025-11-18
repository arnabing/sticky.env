export interface Profile {
  name: string;
  variables: Record<string, string>;
  isDangerous?: boolean;
}

export interface StickyConfig {
  profiles: string[];
  files: string[];
  syncTogether: boolean;
  dangerousProfiles: string[];
  currentProfile?: string;
  vercelProjectId?: string;
  vercelToken?: string;
  installScript?: string; // Custom install command to run after switching
  autoInstall?: boolean; // Auto-detect and install dependencies
}

export interface EnvFile {
  path: string;
  content: string;
  variables: Record<string, string>;
}

export interface ProfileVariable {
  key: string;
  values: Map<string, string>; // profileName -> value
}

export interface VercelEnvVar {
  type: 'encrypted' | 'plain' | 'secret' | 'system';
  id: string;
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  gitBranch?: string;
  configurationId?: string | null;
  updatedAt?: number;
  createdAt?: number;
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
}
