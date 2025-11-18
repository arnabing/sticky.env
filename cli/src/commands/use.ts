import { Command } from 'commander';
import { ConfigManager, loadProfilesFromDisk } from '../lib/config';
import { writeEnvFile } from '../lib/profiles';
import { log, spinner, confirm } from '../utils/ui';
import { autoInstall, runCustomInstallScript } from '../utils/installer';
import chalk from 'chalk';

export const useCommand = new Command('use')
  .description('Switch to a different profile')
  .argument('<profile>', 'Profile name to switch to')
  .option('--install', 'Auto-install dependencies after switching')
  .action(async (profileName: string, options: { install?: boolean }) => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Check if profile exists
      if (!config.profiles.includes(profileName)) {
        log.error(`Profile "${profileName}" not found.`);
        log.info('Available profiles:');
        for (const p of config.profiles) {
          const current = p === config.currentProfile ? ' (current)' : '';
          const dangerous = config.dangerousProfiles.includes(p) ? ' ⚠️' : '';
          log.info(`  • ${p}${current}${dangerous}`);
        }
        process.exit(1);
      }

      // Check if already using this profile
      if (config.currentProfile === profileName) {
        log.info(`Already using profile: ${profileName}`);
        return;
      }

      // Warn if dangerous profile
      if (config.dangerousProfiles.includes(profileName)) {
        console.log();
        log.warning(`"${profileName}" is marked as a dangerous profile!`);
        log.warning('This profile may connect to production resources.');
        console.log();
        const shouldContinue = await confirm(
          `Are you sure you want to switch to ${profileName}?`,
          false
        );

        if (!shouldContinue) {
          log.info('Cancelled.');
          return;
        }
      }

      // Load profiles
      const profiles = await loadProfilesFromDisk();
      const targetProfile = profiles.get(profileName);

      if (!targetProfile) {
        log.error(
          `Profile "${profileName}" exists in config but not on disk. Run \`sticky pull\` first.`
        );
        process.exit(1);
      }

      // Update all env files
      const updateSpinner = spinner(
        `Switching to ${profileName} profile...`
      );

      for (const envFile of config.files) {
        await writeEnvFile(envFile, targetProfile);
      }

      updateSpinner.succeed(`Switched to ${profileName} profile`);

      // Update current profile in config
      await configManager.setCurrentProfile(profileName);

      // Show what changed
      console.log();
      log.success(`All ${config.files.length} .env file(s) updated`);

      // Show key changes (just profile-specific vars)
      const sampleVars = Object.keys(targetProfile)
        .filter((key) => key.includes('DATABASE') || key.includes('CLERK'))
        .slice(0, 3);

      if (sampleVars.length > 0) {
        log.info('Key variables:');
        for (const key of sampleVars) {
          const value = targetProfile[key];
          const truncated =
            value.length > 50 ? value.substring(0, 47) + '...' : value;
          log.info(`  ${key}=${truncated}`);
        }
      }

      console.log();

      // Auto-install dependencies if requested or configured
      const shouldInstall = options.install || config.autoInstall;

      if (shouldInstall) {
        try {
          // Run custom install script if configured
          if (config.installScript) {
            await runCustomInstallScript(config.installScript);
          } else {
            // Auto-detect and install
            await autoInstall();
          }
        } catch (error: any) {
          log.warning(`Install failed: ${error.message}`);
          log.info('You may need to install dependencies manually.');
        }
        console.log();
      }

      log.info('Run your app - it will now use the new profile:');
      log.info(`  ${chalk.cyan('npm run dev')}`);
    } catch (error: any) {
      log.error(`Failed to switch profile: ${error.message}`);
      process.exit(1);
    }
  });
