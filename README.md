# ai-code-reviewer

[![GitHub Action](https://img.shields.io/badge/GitHub_Action-ready-2088FF?logo=github-actions)](https://github.com/marketplace)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?logo=openai)](https://openai.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A **GitHub Action** that uses OpenAI GPT-4 to automatically review pull requests. It parses diffs, analyzes code changes, and posts inline review comments with actionable suggestions for improvements, security issues, and bugs.

## How It Works

```
PR Opened/Updated --> Action Triggered --> Fetch Diff
    --> Parse Changed Files --> Send to GPT-4 for Review
    --> Post Inline Comments on PR
```

## Quick Setup

Add this to `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: Arunchunchukumar/ai-code-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          model: gpt-4
          review-focus: security,performance,bugs
          max-files: 10
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | Yes | - | GitHub token for PR access |
| `openai-api-key` | Yes | - | OpenAI API key |
| `model` | No | `gpt-4` | OpenAI model to use |
| `review-focus` | No | `all` | Comma-separated focus areas: security, performance, bugs, style |
| `max-files` | No | `10` | Maximum files to review per PR |
| `ignore-patterns` | No | - | Glob patterns for files to skip (e.g., `*.test.ts,*.md`) |

## Example Output

The bot posts inline review comments like:

> **Security**: This SQL query uses string concatenation which is vulnerable to injection. Use parameterized queries instead.
>
> **Suggestion**:
> ```typescript
> const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
> ```

## Project Structure

```
src/
  index.ts        # Action entry point - orchestrates the review flow
  github.ts       # GitHub API wrapper for fetching diffs and posting comments
  reviewer.ts     # OpenAI integration and review logic
  prompts.ts      # Prompt templates for different review focus areas
  diff-parser.ts  # Unified diff parser for extracting changed code
action.yml        # GitHub Action metadata and input definitions
```

## Development

```bash
npm install
npm run build
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) for details.
