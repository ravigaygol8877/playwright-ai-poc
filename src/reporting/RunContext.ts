import fs from 'fs';
import path from 'path';

export interface RunPaths {
  runId:            string;
  root:             string;
  playwright:       string;
  allureResults:    string;
  allureReport:     string;
  aiReports:        string;
  generatedCases:   string;
  generatedScripts: string;
  logs:             string;
  testArtifacts:    string;
}

const RUN_ID_FILE  = path.join('reports', '.current-run-id');
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function makeRunId(): string {
  const d   = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

function buildPaths(base: string, runId: string): RunPaths {
  const root = path.join(base, runId);
  return {
    runId,
    root,
    playwright:       path.join(root, 'playwright'),
    allureResults:    path.join(root, 'allure', 'results'),
    allureReport:     path.join(root, 'allure', 'report'),
    aiReports:        path.join(root, 'ai-reports'),
    generatedCases:   path.join(root, 'generated', 'test-cases'),
    generatedScripts: path.join(root, 'generated', 'test-scripts'),
    logs:             path.join(root, 'logs'),
    testArtifacts:    path.join(root, 'test-artifacts'),
  };
}

function createDirs(runPaths: RunPaths): void {
  for (const dir of [
    runPaths.root,
    runPaths.playwright,
    runPaths.allureResults,
    runPaths.aiReports,
    runPaths.generatedCases,
    runPaths.generatedScripts,
    runPaths.logs,
    runPaths.testArtifacts,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function updateLatestSymlink(base: string, runId: string): void {
  const linkPath = path.join(base, 'latest');
  try {
    if (fs.existsSync(linkPath)) fs.unlinkSync(linkPath);
    fs.symlinkSync(runId, linkPath);
  } catch {
    // Symlinks may fail on Windows without elevated privileges — silently skip
  }
}

function isFreshRunId(): boolean {
  try {
    const stat = fs.statSync(RUN_ID_FILE);
    return (Date.now() - stat.mtimeMs) < TWO_HOURS_MS;
  } catch {
    return false;
  }
}

/** Create a brand-new timestamped run context and persist the run ID. */
export function createRunContext(base = 'reports'): RunPaths {
  const runId    = makeRunId();
  const runPaths = buildPaths(base, runId);

  fs.mkdirSync(base, { recursive: true });
  createDirs(runPaths);
  fs.writeFileSync(RUN_ID_FILE, runId, 'utf-8');
  updateLatestSymlink(base, runId);

  process.env['REPORT_RUN_ID'] = runId;
  return runPaths;
}

/**
 * Resolve the active run context for test execution.
 *
 * Priority:
 *   1. REPORT_RUN_ID env var — set by generate-all in the same shell session
 *   2. .current-run-id file written within the last 2 hours — same generation cycle
 *   3. Fresh run context — standalone test execution with no prior generation step
 */
export function resolveRunContext(base = 'reports'): RunPaths {
  const envRunId = process.env['REPORT_RUN_ID'];
  if (envRunId) {
    const runPaths = buildPaths(base, envRunId);
    createDirs(runPaths);
    return runPaths;
  }

  if (isFreshRunId()) {
    try {
      const runId = fs.readFileSync(RUN_ID_FILE, 'utf-8').trim();
      if (runId) {
        const runPaths = buildPaths(base, runId);
        createDirs(runPaths);
        process.env['REPORT_RUN_ID'] = runId;
        return runPaths;
      }
    } catch {
      // Fall through to create a new context
    }
  }

  return createRunContext(base);
}
