/**
 * AI Review Engine.
 *
 * Sends code diffs to OpenAI GPT-4 and parses the response into
 * structured review comments with line numbers, categories, and suggestions.
 */

import OpenAI from 'openai';
import { getReviewPrompt } from './prompts';
import { parseDiffHunks } from './diff-parser';
import type { PRFile } from './github';

export interface ReviewComment {
  file: string;
  line: number;
  message: string;
  category: string;     // 'Security' | 'Performance' | 'Bug' | 'Style'
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;  // Optional code suggestion
}

/**
 * Review a single file's diff using OpenAI.
 *
 * Parses the diff into hunks, builds a prompt with the relevant
 * code context, and asks GPT-4 to identify issues.
 */
export async function reviewFile(
  apiKey: string,
  model: string,
  file: PRFile,
  focusAreas: string[],
): Promise<ReviewComment[]> {
  if (!file.patch) return [];

  const openai = new OpenAI({ apiKey });
  const hunks = parseDiffHunks(file.patch);

  if (hunks.length === 0) return [];

  // Build the prompt with file context and focus areas
  const systemPrompt = getReviewPrompt(focusAreas);
  const userMessage = [
    `File: ${file.filename}`,
    `Status: ${file.status}`,
    `Changes: +${file.additions} -${file.deletions}`,
    '',
    'Diff:',
    '```',
    file.patch,
    '```',
    '',
    'Respond with a JSON array of issues found. Each issue should have:',
    '- line: number (the line number in the new file)',
    '- message: string (clear description of the issue)',
    '- category: string (Security, Performance, Bug, or Style)',
    '- severity: "error" | "warning" | "info"',
    '- suggestion: string | null (corrected code if applicable)',
    '',
    'If no issues are found, return an empty array: []',
  ].join('\n');

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,  // Low temperature for consistent reviews
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const issues = Array.isArray(parsed) ? parsed : parsed.issues ?? [];

    // Validate and map to ReviewComment format
    return issues
      .filter((issue: any) => issue.line && issue.message)
      .map((issue: any) => ({
        file: file.filename,
        line: Number(issue.line),
        message: String(issue.message),
        category: String(issue.category ?? 'General'),
        severity: (['error', 'warning', 'info'].includes(issue.severity)
          ? issue.severity
          : 'warning') as ReviewComment['severity'],
        suggestion: issue.suggestion ? String(issue.suggestion) : undefined,
      }));
  } catch (error) {
    console.error(`Failed to review ${file.filename}:`, error);
    return [];
  }
}
