import axios, { AxiosInstance } from 'axios';
import { VercelEnvVar, VercelProject } from '../types';

const VERCEL_API_URL = 'https://api.vercel.com';
const ALLOWED_TARGET = 'development'; // ONLY touch development environment
const BLOCKED_TARGETS = ['production', 'preview']; // NEVER touch these

export class VercelClient {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(token: string, projectId?: string) {
    this.client = axios.create({
      baseURL: VERCEL_API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    this.projectId = projectId;
  }

  /**
   * Safety check - ensure we never touch production or preview
   */
  private ensureSafeTarget(target: string) {
    if (BLOCKED_TARGETS.includes(target)) {
      throw new Error(
        `🚨 SAFETY CHECK FAILED: Sticky never touches ${target} environment!\n` +
        `Sticky only manages the "development" environment for local team sync.\n` +
        `Your ${target} deployments are completely safe and isolated.`
      );
    }
    if (target !== ALLOWED_TARGET) {
      throw new Error(`Invalid target: ${target}. Only "development" is allowed.`);
    }
  }

  /**
   * Get current Vercel project
   */
  async getCurrentProject(): Promise<VercelProject> {
    // Try to read from .vercel/project.json first
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const projectJsonPath = path.join(process.cwd(), '.vercel', 'project.json');
      const projectJson = await fs.readFile(projectJsonPath, 'utf-8');
      const data = JSON.parse(projectJson);

      if (data.projectId) {
        this.projectId = data.projectId;

        // Fetch project details
        const response = await this.client.get(`/v9/projects/${data.projectId}`);
        return response.data;
      }
    } catch (error) {
      // .vercel/project.json doesn't exist, continue
    }

    // If no local project, list user's projects
    const response = await this.client.get('/v9/projects');
    const projects = response.data.projects;

    if (projects.length === 0) {
      throw new Error('No Vercel projects found. Run `vercel link` first.');
    }

    if (projects.length === 1) {
      this.projectId = projects[0].id;
      return projects[0];
    }

    throw new Error(
      'Multiple Vercel projects found. Run `vercel link` to select one.'
    );
  }

  /**
   * List all environment variables from Development environment
   */
  async listEnvVars(): Promise<VercelEnvVar[]> {
    this.ensureSafeTarget(ALLOWED_TARGET);

    if (!this.projectId) {
      const project = await this.getCurrentProject();
      this.projectId = project.id;
    }

    const response = await this.client.get(
      `/v9/projects/${this.projectId}/env`
    );

    // Filter to only development environment
    return response.data.envs.filter((env: VercelEnvVar) =>
      env.target.includes(ALLOWED_TARGET)
    );
  }

  /**
   * Add or update an environment variable in Development environment
   */
  async setEnvVar(
    key: string,
    value: string,
    type: 'encrypted' | 'plain' = 'encrypted'
  ): Promise<void> {
    this.ensureSafeTarget(ALLOWED_TARGET);

    if (!this.projectId) {
      const project = await this.getCurrentProject();
      this.projectId = project.id;
    }

    // Check if variable already exists
    const existing = await this.listEnvVars();
    const existingVar = existing.find((env) => env.key === key);

    if (existingVar) {
      // Update existing
      await this.client.patch(
        `/v9/projects/${this.projectId}/env/${existingVar.id}`,
        {
          value,
          target: [ALLOWED_TARGET],
          type,
        }
      );
    } else {
      // Create new
      await this.client.post(`/v9/projects/${this.projectId}/env`, {
        key,
        value,
        target: [ALLOWED_TARGET],
        type,
      });
    }
  }

  /**
   * Delete an environment variable from Development environment
   */
  async deleteEnvVar(key: string): Promise<void> {
    this.ensureSafeTarget(ALLOWED_TARGET);

    if (!this.projectId) {
      const project = await this.getCurrentProject();
      this.projectId = project.id;
    }

    const existing = await this.listEnvVars();
    const existingVar = existing.find((env) => env.key === key);

    if (existingVar) {
      await this.client.delete(
        `/v9/projects/${this.projectId}/env/${existingVar.id}`
      );
    }
  }

  /**
   * Bulk update environment variables
   */
  async bulkSetEnvVars(
    variables: Record<string, string>
  ): Promise<void> {
    this.ensureSafeTarget(ALLOWED_TARGET);

    // Set variables one by one (Vercel doesn't have bulk API)
    for (const [key, value] of Object.entries(variables)) {
      await this.setEnvVar(key, value);
    }
  }
}
