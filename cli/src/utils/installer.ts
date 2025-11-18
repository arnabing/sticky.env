import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { log, spinner } from './ui';

interface PackageManager {
  name: string;
  detectFile: string;
  installCommand: string;
  installArgs: string[];
}

const PACKAGE_MANAGERS: PackageManager[] = [
  {
    name: 'npm',
    detectFile: 'package.json',
    installCommand: 'npm',
    installArgs: ['install'],
  },
  {
    name: 'yarn',
    detectFile: 'yarn.lock',
    installCommand: 'yarn',
    installArgs: ['install'],
  },
  {
    name: 'pnpm',
    detectFile: 'pnpm-lock.yaml',
    installCommand: 'pnpm',
    installArgs: ['install'],
  },
  {
    name: 'bun',
    detectFile: 'bun.lockb',
    installCommand: 'bun',
    installArgs: ['install'],
  },
  {
    name: 'pip',
    detectFile: 'requirements.txt',
    installCommand: 'pip',
    installArgs: ['install', '-r', 'requirements.txt'],
  },
  {
    name: 'pipenv',
    detectFile: 'Pipfile',
    installCommand: 'pipenv',
    installArgs: ['install'],
  },
  {
    name: 'poetry',
    detectFile: 'poetry.lock',
    installCommand: 'poetry',
    installArgs: ['install'],
  },
  {
    name: 'go',
    detectFile: 'go.mod',
    installCommand: 'go',
    installArgs: ['mod', 'download'],
  },
  {
    name: 'cargo',
    detectFile: 'Cargo.toml',
    installCommand: 'cargo',
    installArgs: ['build'],
  },
  {
    name: 'composer',
    detectFile: 'composer.json',
    installCommand: 'composer',
    installArgs: ['install'],
  },
  {
    name: 'bundle',
    detectFile: 'Gemfile',
    installCommand: 'bundle',
    installArgs: ['install'],
  },
];

/**
 * Detect which package managers are present in the project
 */
export async function detectPackageManagers(
  rootDir: string = process.cwd()
): Promise<PackageManager[]> {
  const detected: PackageManager[] = [];

  for (const pm of PACKAGE_MANAGERS) {
    const filePath = path.join(rootDir, pm.detectFile);
    try {
      await fs.access(filePath);
      detected.push(pm);
    } catch {
      // File doesn't exist, skip
    }
  }

  return detected;
}

/**
 * Run install command for a package manager
 */
async function runInstallCommand(pm: PackageManager, rootDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const installSpinner = spinner(`Installing dependencies with ${pm.name}...`);

    const child = spawn(pm.installCommand, pm.installArgs, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        installSpinner.succeed(`Installed dependencies with ${pm.name}`);
        resolve();
      } else {
        installSpinner.fail(`Failed to install with ${pm.name} (exit code ${code})`);
        reject(new Error(`${pm.name} install failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      installSpinner.fail(`Failed to run ${pm.name}: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Auto-install dependencies for detected package managers
 */
export async function autoInstall(rootDir: string = process.cwd()): Promise<void> {
  const packageManagers = await detectPackageManagers(rootDir);

  if (packageManagers.length === 0) {
    log.info('No package managers detected. Skipping auto-install.');
    return;
  }

  console.log();
  log.info(`Detected ${packageManagers.length} package manager(s):`);
  for (const pm of packageManagers) {
    log.info(`  • ${pm.name} (${pm.detectFile})`);
  }
  console.log();

  // Run install for each detected package manager
  for (const pm of packageManagers) {
    try {
      await runInstallCommand(pm, rootDir);
    } catch (error: any) {
      // Log error but continue with other package managers
      log.warning(`Skipping ${pm.name} due to error: ${error.message}`);
    }
  }
}

/**
 * Run custom install script from .stickyrc
 */
export async function runCustomInstallScript(
  script: string,
  rootDir: string = process.cwd()
): Promise<void> {
  return new Promise((resolve, reject) => {
    const installSpinner = spinner('Running custom install script...');

    const child = spawn(script, [], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        installSpinner.succeed('Custom install script completed');
        resolve();
      } else {
        installSpinner.fail(`Custom install script failed (exit code ${code})`);
        reject(new Error(`Install script failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      installSpinner.fail(`Failed to run install script: ${error.message}`);
      reject(error);
    });
  });
}
