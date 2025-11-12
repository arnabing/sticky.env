#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { useCommand } from './commands/use';
import { pullCommand } from './commands/pull';
import { pushCommand } from './commands/push';
import { statusCommand } from './commands/status';

const program = new Command();

program
  .name('sticky')
  .description('Dead simple environment variable management with profile switching')
  .version('0.1.0');

// Add commands
program.addCommand(initCommand);
program.addCommand(useCommand);
program.addCommand(pullCommand);
program.addCommand(pushCommand);
program.addCommand(statusCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
