import { describe, it, expect } from '@jest/globals';
import { parseDiff } from '../src/diff-parser';

const SAMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,5 @@
 import express from 'express';
+import helmet from 'helmet';
 const app = express();
+app.use(helmet());
 app.listen(3000);
`;

describe('parseDiff', () => {
  it('should parse a simple diff', () => {
    const files = parseDiff(SAMPLE_DIFF);
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe('src/index.ts');
    expect(files[0].status).toBe('modified');
    expect(files[0].hunks.length).toBeGreaterThan(0);
  });

  it('should detect added files', () => {
    const diff = `diff --git a/new.ts b/new.ts
new file mode 100644
--- /dev/null
+++ b/new.ts
@@ -0,0 +1,3 @@
+export const x = 1;
`;
    const files = parseDiff(diff);
    expect(files[0].status).toBe('added');
  });

  it('should handle empty diff', () => {
    const files = parseDiff('');
    expect(files).toHaveLength(0);
  });
});
