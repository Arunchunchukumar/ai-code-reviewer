/**
 * AI Code Reviewer - GitHub Action entry point.
 *
 * Orchestrates the review pipeline:
 * 1. Read action inputs and PR context
 * 2. Fetch the PR diff from GitHub
 * 3. Parse changed files and filter by config
 * 4. Send each file to the AI reviewer
 * 5. Post inline comments on the PR
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { fetchPRFiles, postReviewComments, type PRFile } from './github';
import { reviewFile, type ReviewComment } from './reviewer';
import { minimatch } from './diff-parser';

async function run(): Promise<void> {
  try {
    // 1. Read inputs
    const token = core.getInput('github-token', { required: true });
    const openaiKey = core.getInput('openai-api-key', { required: true });
    const model = core.getInput('model') || 'gpt-4';
    const reviewFocus = core.getInput('review-focus') || 'all';
    const maxFiles = parseInt(core.getInput('max-files') || '10', 10);
    const ignorePatterns = core.getInput('ignore-patterns')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // 2. Get PR context
    const context = github.context;
    if (!context.payload.pull_request) {
      core.setFailed('This action only works on pull_request events.');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`Reviewing PR #${prNumber} in ${owner}/${repo}`);
    core.info(`Model: ${model}, Focus: ${reviewFocus}, Max files: ${maxFiles}`);

    // 3. Fetch changed files
    const octokit = github.getOctokit(token);
    const files = await fetchPRFiles(octokit, owner, repo, prNumber);

    // Filter out ignored patterns and limit file count
    const filesToReview = files
      .filter((f) => !ignorePatterns.some((pattern) => minimatch(f.filename, pattern)))
      .slice(0, maxFiles);

    core.info(`Reviewing ${filesToReview.length} of ${files.length} changed files`);

    if (filesToReview.length === 0) {
      core.info('No files to review after filtering.');
      return;
    }

    // 4. Review each file with AI
    const allComments: ReviewComment[] = [];
    const focusAreas = reviewFocus === 'all'
      ? ['security', 'performance', 'bugs', 'style']
      : reviewFocus.split(',').map((f) => f.trim());

    for (const file of filesToReview) {
      if (!file.patch) {
        core.debug(`Skipping ${file.filename} (no patch/diff available)`);
        continue;
      }

      core.info(`Reviewing: ${file.filename}`);
      const comments = await reviewFile(openaiKey, model, file, focusAreas);
      allComments.push(...comments);
    }

    core.info(`Generated ${allComments.length} review comment(s)`);

    // 5. Post comments on the PR
    if (allComments.length > 0) {
      await postReviewComments(octokit, owner, repo, prNumber, allComments);
      core.info('Review comments posted successfully.');
    } else {
      core.info('No issues found - PR looks good!');
    }

    core.setOutput('comments-count', allComments.length);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
