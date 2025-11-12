import chalk from 'chalk';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';

export const log = {
  success: (message: string) => console.log(chalk.green('✓'), message),
  error: (message: string) => console.log(chalk.red('✗'), message),
  warning: (message: string) => console.log(chalk.yellow('⚠'), message),
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  plain: (message: string) => console.log(message),
};

export function spinner(text: string): Ora {
  return ora(text).start();
}

export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);
  return confirmed;
}

export async function input(
  message: string,
  defaultValue?: string
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
    },
  ]);
  return value;
}

export async function select<T extends string>(
  message: string,
  choices: T[]
): Promise<T> {
  const { value } = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message,
      choices,
    },
  ]);
  return value;
}

export async function multiSelect<T extends string>(
  message: string,
  choices: T[]
): Promise<T[]> {
  const { values } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'values',
      message,
      choices,
    },
  ]);
  return values;
}

export function formatTable(rows: Array<Record<string, string>>): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const columnWidths = headers.map((header) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map((row) => String(row[header] || '').length)
    );
    return maxLength + 2;
  });

  // Print headers
  const headerRow = headers
    .map((header, i) => header.padEnd(columnWidths[i]))
    .join(' ');
  console.log(chalk.bold(headerRow));

  // Print separator
  const separator = columnWidths.map((width) => '─'.repeat(width)).join(' ');
  console.log(chalk.gray(separator));

  // Print rows
  for (const row of rows) {
    const rowStr = headers
      .map((header, i) => String(row[header] || '').padEnd(columnWidths[i]))
      .join(' ');
    console.log(rowStr);
  }
}
