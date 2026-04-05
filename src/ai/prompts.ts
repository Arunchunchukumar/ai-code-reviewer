import { DiffFile } from '../diff-parser';

const REVIEW_LEVELS: Record<string, string> = {
  quick: 'Focus only on critical bugs and security vulnerabilities.',
  standard: 'Review for bugs, security issues, and significant code quality problems.',
  thorough: 'Provide comprehensive review covering bugs, security, performance, readability, naming conventions, error handling, and testing gaps.',
};

export function buildReviewPrompt(file: DiffFile, level: string): string {
  const levelGuide = REVIEW_LEVELS[level] || REVIEW_LEVELS.standard;

  return `
Review the following code changes in ${file.filename}.

${levelGuide}

For each issue found, respond with:
LINE <line_number>: <description of issue and suggested fix>

If the code looks good, respond with: LGTM - no issues found.

Diff:
\`\`\`
${file.hunks.map((h) => h.content).join('\n')}
\`\`\`
`.trim();
}
