/**
 * GitHub API wrapper.
 *
 * Handles fetching PR file diffs and posting review comments
 * using the GitHub REST API via @actions/github.
 */

import type { GitHub } from '@actions/github/lib/utils';
import type { ReviewComment } from './reviewer';

export interface PRFile {
  filename: string;
  status: string;       // 'added' | 'modified' | 'removed' | 'renamed'
  additions: number;
  deletions: number;
  patch?: string;       // Unified diff patch for this file
}

type Octokit = InstanceType<typeof GitHub>;

/**
 * Fetch all changed files in a pull request.
 */
export async function fetchPRFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<PRFile[]> {
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return files.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));
}

/**
 * Post review comments on a pull request.
 *
 * Uses the pull request review API to submit all comments
 * as a single review with a REQUEST_CHANGES or COMMENT event.
 */
export async function postReviewComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  comments: ReviewComment[],
): Promise<void> {
  // Convert our comments to GitHub's review comment format
  const ghComments = comments.map((c) => ({
    path: c.file,
    line: c.line,
    body: formatComment(c),
  }));

  // Determine review event based on severity
  const hasHighSeverity = comments.some((c) => c.severity === 'error');
  const event = hasHighSeverity ? 'REQUEST_CHANGES' as const : 'COMMENT' as const;

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event,
    body: `AI Code Review: Found ${comments.length} issue(s) to address.`,
    comments: ghComments,
  });
}

/**
 * Format a review comment with category badge and suggestion.
 */
function formatComment(comment: ReviewComment): string {
  const severityEmoji = {
    error: '🔴',
    warning: '🟡',
    info: '🔵',
  }[comment.severity];

  let body = `${severityEmoji} **${comment.category}**: ${comment.message}`;

  if (comment.suggestion) {
    body += `\n\n**Suggestion:**\n\`\`\`suggestion\n${comment.suggestion}\n\`\`\``;
  }

  return body;
}
