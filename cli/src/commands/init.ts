import { Command } from 'commander';
import * as path from 'path';
import { VercelClient } from '../lib/vercel';
import { ConfigManager, saveProfilesToDisk } from '../lib/config';
import {
  parseEnvFile,
  detectProfileVariables,
  buildProfiles,
  findEnvFiles,
  readEnvFile,
} from '../lib/profiles';
import { log, spinner, confirm, input } from '../utils/ui';
import chalk from 'chalk';

export const initCommand = new Command('init')
  .description('Initialize Sticky.env in your project')
  .action(async () => {
    try {
      const configManager = new ConfigManager();

      // Check if already initialized
      if (await configManager.exists()) {
        log.warning('Sticky.env is already initialized in this project.');
        const shouldContinue = await confirm(
          'Do you want to reconfigure?',
          false
        );
        if (!shouldContinue) {
          return;
        }
      }

      console.log();
      console.log(chalk.bold('🚀 Initializing Sticky.env...'));
      console.log();

      // Step 1: Find all .env files
      const envSpinner = spinner('Scanning for .env files...');
      const envFiles = await findEnvFiles();

      if (envFiles.length === 0) {
        envSpinner.fail('No .env files found!');
        log.error('Create a .env file first, then run `sticky init` again.');
        process.exit(1);
      }

      envSpinner.succeed(
        `Found ${envFiles.length} .env file${envFiles.length > 1 ? 's' : ''}`
      );

      // Show found files
      for (const file of envFiles) {
        log.info(`  ${path.relative(process.cwd(), file)}`);
      }
      console.log();

      // Step 2: Read primary .env file (first one found, usually root)
      const primaryEnvFile = envFiles[0];
      const envContent = (await readEnvFile(primaryEnvFile)).content;
      const { active, commented } = parseEnvFile(envContent);

      // Step 3: Detect profile variables
      const detectSpinner = spinner('Detecting profile variables...');
      const profileVars = detectProfileVariables(active, commented);

      if (profileVars.length === 0) {
        detectSpinner.fail('No profile variables detected!');
        log.error(
          'Sticky.env works best when you have commented variations of env vars.\n' +
            'Example:\n' +
            '  DATABASE_URL="postgresql://...prod"\n' +
            '  # DATABASE_URL="postgresql://...staging"\n' +
            '  # DATABASE_URL="postgresql://...dev"'
        );
        process.exit(1);
      }

      detectSpinner.succeed(
        `Found ${profileVars.length} profile-specific variable${
          profileVars.length > 1 ? 's' : ''
        }`
      );

      // Show detected profile variables
      for (const pv of profileVars) {
        log.info(`  ${pv.key} (${pv.values.size} variations)`);
      }
      console.log();

      // Step 4: Build profiles
      const profiles = buildProfiles(active, commented, profileVars);

      log.success(`Created ${profiles.length} profiles:`);
      for (const profile of profiles) {
        const icon = profile.isDangerous ? '⚠️ ' : '';
        log.info(`  ${icon}${profile.name}`);
      }
      console.log();

      // Step 5: Ask about monorepo management
      let syncTogether = true;
      if (envFiles.length > 1) {
        syncTogether = await confirm(
          `Manage all ${envFiles.length} .env files together?`,
          true
        );
      }

      // Step 6: Mark dangerous profiles
      const dangerousProfiles: string[] = profiles
        .filter((p) => p.isDangerous)
        .map((p) => p.name);

      if (dangerousProfiles.length > 0) {
        console.log();
        log.warning(
          `The following profiles appear to be production environments:\n` +
            dangerousProfiles.map((p) => `  • ${p}`).join('\n')
        );
        console.log();
        const markDangerous = await confirm(
          'Mark these as dangerous (require confirmation to use)?',
          true
        );

        if (!markDangerous) {
          dangerousProfiles.length = 0;
        }
      }

      // Step 7: Check for Vercel project
      console.log();
      const vercelSpinner = spinner('Checking for Vercel project...');

      let vercelToken: string | undefined;
      let vercelClient: VercelClient | undefined;

      try {
        // Try to get token from environment or Vercel CLI
        vercelToken =
          process.env.VERCEL_TOKEN ||
          process.env.VERCEL_AUTH_TOKEN ||
          configManager.getVercelToken();

        if (!vercelToken) {
          vercelSpinner.info(
            'No Vercel token found. You can add one later with `sticky config set-token`'
          );
        } else {
          vercelClient = new VercelClient(vercelToken);
          const project = await vercelClient.getCurrentProject();
          vercelSpinner.succeed(`Connected to Vercel project: ${project.name}`);
        }
      } catch (error: any) {
        vercelSpinner.info(
          `Not connected to Vercel (${error.message}). You can connect later.`
        );
      }

      // Step 8: Save configuration
      console.log();
      const saveSpinner = spinner('Saving configuration...');

      await configManager.save({
        profiles: profiles.map((p) => p.name),
        files: envFiles,
        syncTogether,
        dangerousProfiles,
        currentProfile: profiles[0].name,
        vercelToken,
      });

      // Save profiles to disk
      const profilesMap = new Map(
        profiles.map((p) => [p.name, p.variables])
      );
      await saveProfilesToDisk(profilesMap);

      saveSpinner.succeed('Configuration saved to .sticky/');

      // Step 9: Push to Vercel if connected
      if (vercelClient) {
        console.log();
        const shouldPush = await confirm(
          'Push profiles to Vercel Development environment?',
          true
        );

        if (shouldPush) {
          const pushSpinner = spinner('Pushing to Vercel...');

          try {
            // Push each profile as prefixed variables
            for (const profile of profiles) {
              for (const [key, value] of Object.entries(profile.variables)) {
                const prefixedKey = `${profile.name}_${key}`;
                await vercelClient.setEnvVar(prefixedKey, value);
              }
            }

            pushSpinner.succeed(
              'Profiles pushed to Vercel Development environment'
            );
          } catch (error: any) {
            pushSpinner.fail(`Failed to push to Vercel: ${error.message}`);
          }
        }
      }

      // Step 10: Success!
      console.log();
      log.success('Sticky.env initialized successfully!');
      console.log();
      log.info('Next steps:');
      log.info(`  • Run ${chalk.cyan('sticky use <profile>')} to switch profiles`);
      log.info(`  • Run ${chalk.cyan('sticky pull')} to sync from Vercel`);
      log.info(`  • Run ${chalk.cyan('sticky push --allow')} to update Vercel`);
      console.log();

      if (dangerousProfiles.length > 0) {
        log.warning(
          `Remember: ${dangerousProfiles.join(', ')} ${
            dangerousProfiles.length > 1 ? 'are' : 'is'
          } marked as dangerous`
        );
      }
    } catch (error: any) {
      log.error(`Initialization failed: ${error.message}`);
      process.exit(1);
    }
  });
