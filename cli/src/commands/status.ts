import { Command } from 'commander';
import { ConfigManager } from '../lib/config';
import { log } from '../utils/ui';
import chalk from 'chalk';
import * as path from 'path';

export const statusCommand = new Command('status')
  .description('Show current profile and configuration')
  .action(async () => {
    try {
      const configManager = new ConfigManager();

      if (!(await configManager.exists())) {
        log.error('Sticky.env not initialized. Run `sticky init` first.');
        process.exit(1);
      }

      const config = await configManager.load();

      console.log();
      console.log(chalk.bold('Sticky.env Status'));
      console.log();

      // Current profile
      if (config.currentProfile) {
        const dangerous = config.dangerousProfiles.includes(config.currentProfile)
          ? ' ⚠️'
          : '';
        log.success(`Current profile: ${chalk.cyan(config.currentProfile)}${dangerous}`);
      } else {
        log.info('Current profile: (none)');
      }

      console.log();

      // Available profiles
      log.info(`Available profiles (${config.profiles.length}):`);
      for (const profile of config.profiles) {
        const current = profile === config.currentProfile ? ' ← current' : '';
        const dangerous = config.dangerousProfiles.includes(profile) ? ' ⚠️' : '';
        log.info(`  • ${profile}${current}${dangerous}`);
      }

      console.log();

      // Managed files
      log.info(`Managed files (${config.files.length}):`);
      for (const file of config.files) {
        const relativePath = path.relative(process.cwd(), file);
        log.info(`  • ${relativePath}`);
      }

      console.log();

      // Sync mode
      const syncMode = config.syncTogether ? 'together' : 'separate';
      log.info(`Sync mode: ${syncMode}`);

      // Vercel connection
      const vercelStatus = config.vercelProjectId
        ? `Connected (${config.vercelProjectId})`
        : 'Not connected';
      log.info(`Vercel: ${vercelStatus}`);

      console.log();
      log.info('Commands:');
      log.info(`  ${chalk.cyan('sticky use <profile>')} - Switch profiles`);
      log.info(`  ${chalk.cyan('sticky pull')} - Sync from Vercel`);
      log.info(`  ${chalk.cyan('sticky push --allow')} - Push to Vercel`);
    } catch (error: any) {
      log.error(`Failed to get status: ${error.message}`);
      process.exit(1);
    }
  });
