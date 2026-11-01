import { readFileSync } from 'node:fs';
import type { TestEvent } from 'node:test/reporters';

const TEST_CASES_FILE = new URL('../../docs/test-cases.csv', import.meta.url);
const TEST_CASE_ID = /^([A-Z]+-\d{3})\b/;
const MAX_ERROR_LENGTH = 300;

type TestCaseResult = {
  status: 'Passed' | 'Failed';
  durationMs: number;
  nesting: number;
  observations: string[];
  error?: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toCsvLine(fields: string[]) {
  return fields.map((field) => `"${field.replaceAll('"', '""')}"`).join(',');
}

function shortenError(error: unknown) {
  const cause = (error as { cause?: unknown }).cause ?? error;
  const message = cause instanceof Error ? cause.message : String(cause);
  const oneLine = message.replace(/\s+/g, ' ').trim();
  return oneLine.length > MAX_ERROR_LENGTH ? oneLine.slice(0, MAX_ERROR_LENGTH) + '…' : oneLine;
}

function toActualResult(result: TestCaseResult) {
  const observed = result.observations.join('; ');
  if (result.status === 'Passed') {
    return observed;
  }
  return observed ? `LỖI: ${result.error} | Đã thấy: ${observed}` : `LỖI: ${result.error}`;
}

export default async function* testCaseReporter(source: AsyncIterable<TestEvent>) {
  const results = new Map<string, TestCaseResult>();
  let lastResult: TestCaseResult | undefined;

  for await (const event of source) {
    if (event.type === 'test:pass' || event.type === 'test:fail') {
      const testCaseId = TEST_CASE_ID.exec(event.data.name)?.[1];
      lastResult = undefined;
      if (testCaseId) {
        lastResult = {
          status: event.type === 'test:pass' ? 'Passed' : 'Failed',
          durationMs: Math.round(event.data.details.duration_ms),
          nesting: event.data.nesting,
          observations: [],
          error: event.type === 'test:fail' ? shortenError(event.data.details.error) : undefined,
        };
        results.set(testCaseId, lastResult);
      }
    } else if (event.type === 'test:diagnostic' && lastResult?.nesting === event.data.nesting) {
      lastResult.observations.push(event.data.message);
    }
  }

  const [header, ...testCases] = parseCsv(readFileSync(TEST_CASES_FILE, 'utf8').replace(/^\uFEFF/, ''));
  const executedAt = new Date().toLocaleString('sv-SE');

  const lines = [toCsvLine([...header, 'Actual result', 'Status', 'Duration (ms)', 'Executed at'])];
  for (const testCase of testCases) {
    const result = results.get(testCase[0]);
    const resultFields = result
      ? [toActualResult(result), result.status, String(result.durationMs), executedAt]
      : ['Không có test tự động tương ứng', 'Not run', '', executedAt];
    lines.push(toCsvLine([...testCase, ...resultFields]));
  }

  yield '\uFEFF' + lines.join('\r\n') + '\r\n';
}
