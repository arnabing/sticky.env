import { Command } from 'commander';
import { VercelClient } from '../lib/vercel';
import { ConfigManager, loadProfilesFromDisk } from '../lib/config';
import { log, spinner, confirm, input } from '../utils/ui';
import chalk from 'chalk';

export const pushCommand = new Command('push')
  .description('Push profiles to Vercel Development environment')
  .option('--allow', 'Allow pushing (disabled by default for safety)')
  .argument('[profile]', 'Specific profile to push (optional)')
  .action(async (profileName?: string, options?: { allow?: boolean }) => {
    try {
      // Safety check
      if (!options?.allow) {
        log.error('Pushing is disabled by default for safety.');
        log.info(`Run: ${chalk.cyan('sticky push --allow')} to enable pushing`);
        log.info('This will update Vercel Development environment for your whole team.');
        process.exit(1);
      }

      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Get Vercel token
      const token = configManager.getVercelToken();
      if (!token) {
        log.error(
          'No Vercel token found. Set it with:\n' +
            '  export VERCEL_TOKEN=your_token\n' +
            '  or run: sticky config set-token'
        );
        process.exit(1);
      }

      const vercelClient = new VercelClient(token, config.vercelProjectId);

      // Load profiles
      const profiles = await loadProfilesFromDisk();

      if (profiles.size === 0) {
        log.error('No profiles found. Run `sticky init` first.');
        process.exit(1);
      }

      // Determine which profiles to push
      let profilesToPush: string[];

      if (profileName) {
        if (!profiles.has(profileName)) {
          log.error(`Profile "${profileName}" not found.`);
          log.info('Available profiles:');
          for (const p of config.profiles) {
            log.info(`  • ${p}`);
          }
          process.exit(1);
        }
        profilesToPush = [profileName];
      } else {
        profilesToPush = Array.from(profiles.keys());
      }

      // Confirm push
      console.log();
      log.warning('You are about to push to Vercel Development environment!');
      log.warning('This will update environment variables for your whole team.');
      console.log();
      log.info('Profiles to push:');
      for (const p of profilesToPush) {
        const varCount = Object.keys(profiles.get(p)!).length;
        log.info(`  • ${p} (${varCount} variables)`);
      }
      console.log();

      const shouldContinue = await confirm(
        'Continue with push?',
        false
      );

      if (!shouldContinue) {
        log.info('Cancelled.');
        return;
      }

      // Extra confirmation for specific profile name
      if (profilesToPush.length === 1) {
        const confirmName = await input(
          `Type the profile name "${profilesToPush[0]}" to confirm:`
        );

        if (confirmName !== profilesToPush[0]) {
          log.error('Profile name mismatch. Cancelled.');
          return;
        }
      }

      // Push to Vercel
      const pushSpinner = spinner('Pushing to Vercel Development environment...');

      try {
        let totalVars = 0;

        for (const profileName of profilesToPush) {
          const variables = profiles.get(profileName)!;

          for (const [key, value] of Object.entries(variables)) {
            const prefixedKey = `${profileName}_${key}`;
            await vercelClient.setEnvVar(prefixedKey, value);
            totalVars++;
          }
        }

        pushSpinner.succeed(
          `Pushed ${profilesToPush.length} profile(s) to Vercel (${totalVars} variables)`
        );

        console.log();
        log.success('Push complete!');
        log.info('Team members can now run: sticky pull');
      } catch (error: any) {
        pushSpinner.fail(`Failed to push to Vercel: ${error.message}`);
        process.exit(1);
      }
    } catch (error: any) {
      log.error(`Push failed: ${error.message}`);
      process.exit(1);
    }
  });
