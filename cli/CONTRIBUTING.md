# Contributing to Sticky.env

Thank you for your interest in contributing! 🎉

## Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/sticky-env
cd sticky-env/cli

# Install dependencies
npm install

# Run in development mode
npm run dev -- init

# Build
npm run build

# Test the built CLI
node dist/index.js --help
```

## Project Structure

```
cli/
├── src/
│   ├── commands/      # CLI commands (init, use, pull, push, status)
│   ├── lib/           # Core logic (Vercel client, profiles, config)
│   ├── types/         # TypeScript types
│   ├── utils/         # Utilities (UI helpers)
│   └── index.ts       # CLI entry point
├── package.json
└── tsconfig.json
```

## Key Principles

1. **Safety First** - Never touch Vercel Production/Preview environments
2. **Simple UX** - One command should do one thing well
3. **Monorepo Support** - Must work with multiple .env files
4. **No Dependencies Hell** - Keep dependencies minimal

## Adding a New Command

1. Create `src/commands/your-command.ts`:

```typescript
import { Command } from 'commander';
import { log } from '../utils/ui';

export const yourCommand = new Command('your-command')
  .description('What your command does')
  .action(async () => {
    try {
      // Your logic here
      log.success('Done!');
    } catch (error: any) {
      log.error(`Failed: ${error.message}`);
      process.exit(1);
    }
  });
```

2. Add to `src/index.ts`:

```typescript
import { yourCommand } from './commands/your-command';
program.addCommand(yourCommand);
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

We use Vitest for testing. Add tests in `src/**/*.test.ts`.

## Code Style

- Use TypeScript strict mode
- Use async/await (not callbacks)
- Use descriptive variable names
- Add JSDoc comments for public APIs

## Pull Request Process

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push and create PR

## Commit Message Format

```
feat: add support for Railway platform
fix: handle missing .vercel/project.json
docs: update README with FAQ
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

## Questions?

Open an issue or join our Discord (coming soon)!
