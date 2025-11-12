import { Command } from 'commander';
import { VercelClient } from '../lib/vercel';
import { ConfigManager, saveProfilesToDisk } from '../lib/config';
import { log, spinner } from '../utils/ui';

export const pullCommand = new Command('pull')
  .description('Pull profiles from Vercel Development environment')
  .action(async () => {
    try {
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

      // Pull from Vercel
      const pullSpinner = spinner('Pulling from Vercel Development environment...');

      try {
        const envVars = await vercelClient.listEnvVars();

        if (envVars.length === 0) {
          pullSpinner.info('No environment variables found in Vercel.');
          log.info('Run `sticky push --allow` to upload your profiles.');
          return;
        }

        // Parse variables into profiles
        const profiles = new Map<string, Record<string, string>>();

        for (const envVar of envVars) {
          // Variables are stored as: profileName_VARIABLE_NAME
          const parts = envVar.key.split('_');

          if (parts.length < 2) {
            // Not a profile variable, skip
            continue;
          }

          const profileName = parts[0];
          const varName = parts.slice(1).join('_');

          if (!profiles.has(profileName)) {
            profiles.set(profileName, {});
          }

          profiles.get(profileName)![varName] = envVar.value;
        }

        pullSpinner.succeed(
          `Pulled ${profiles.size} profiles from Vercel (${envVars.length} variables)`
        );

        // Save profiles to disk
        await saveProfilesToDisk(profiles);

        // Update config with profile names
        const profileNames = Array.from(profiles.keys());
        await configManager.update({ profiles: profileNames });

        console.log();
        log.success('Profiles synced:');
        for (const profileName of profileNames) {
          const varCount = Object.keys(profiles.get(profileName)!).length;
          const dangerous = config.dangerousProfiles.includes(profileName) ? ' ⚠️' : '';
          log.info(`  • ${profileName} (${varCount} variables)${dangerous}`);
        }

        console.log();
        log.info('Switch to a profile with: sticky use <profile>');
      } catch (error: any) {
        pullSpinner.fail(`Failed to pull from Vercel: ${error.message}`);
        process.exit(1);
      }
    } catch (error: any) {
      log.error(`Pull failed: ${error.message}`);
      process.exit(1);
    }
  });
