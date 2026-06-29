const fs = require('fs');
const path = require('path');

const resultsDir = './allure-results';
const testFiles = Object.create(null);

// ---------- helpers ----------
function safeNumber(n) {
    return typeof n === 'number' && isFinite(n) ? n : 0;
}

function extractDurationMs(data) {
    const duration = Number(data?.time?.duration);
    if (duration > 0) return duration;

    const start = Number(data?.start);
    const stop = Number(data?.stop);
    if (stop > start) return stop - start;

    if (Array.isArray(data?.steps)) {
        return data.steps.reduce((sum, step) => {
            const sStart = Number(step?.start);
            const sStop = Number(step?.stop);
            return sum + (sStop > sStart ? sStop - sStart : 0);
        }, 0);
    }

    return 0;
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0.00s';
    const seconds = ms / 1000;
    if (seconds < 60) return seconds.toFixed(2) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}

function padRight(str, width) {
    const s = String(str);
    if (s.length >= width) return s.slice(0, width);
    return s + ' '.repeat(width - s.length);
}
function padLeft(str, width) {
    const s = String(str);
    if (s.length >= width) return s.slice(0, width);
    return ' '.repeat(width - s.length) + s;
}

// ---------- collect ----------
if (!fs.existsSync(resultsDir)) {
    console.log('No allure-results directory found. Run tests first.');
    process.exit(0);
}

fs.readdirSync(resultsDir).forEach((file) => {
    if (!file.endsWith('-result.json')) return;
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf-8'));

    const status = data.status || 'unknown';
    const duration = extractDurationMs(data);

    let fileName = 'unknown-spec';
    const fileLabel = (data.labels || []).find((l) => l.name === 'file');
    if (fileLabel?.value) {
        fileName = path.basename(fileLabel.value);
    } else if (data.testCaseId?.includes(':')) {
        const specPath = data.testCaseId.split(':')[0];
        fileName = path.basename(specPath);
    } else if (data.fullName?.includes('.spec.') || data.fullName?.includes('.cy.')) {
        const match = data.fullName.match(/([\\/]?[\w.-]+\.(spec|cy)\.\w+)/);
        if (match) fileName = match[1].replace(/^.*[\\/]/, '');
    }

    if (!testFiles[fileName]) {
        testFiles[fileName] = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            pending: 0,
            duration: 0,
        };
    }

    const rec = testFiles[fileName];
    rec.total += 1;
    rec.duration += duration;

    if (status === 'passed') rec.passed += 1;
    else if (status === 'failed' || status === 'broken') rec.failed += 1;
    else if (status === 'skipped') rec.skipped += 1;
    else if (status === 'pending' || status === 'unknown') rec.pending += 1;
});

// ---------- layout config ----------
const COLS = [
    { key: 'statusIcon', title: '', width: 2, align: 'left' },
    { key: 'spec', title: 'Spec', width: 40, align: 'left' },
    { key: 'duration', title: 'Duration', width: 10, align: 'right' },
    { key: 'total', title: 'Tests', width: 7, align: 'right' },
    { key: 'passed', title: 'Passing', width: 8, align: 'right' },
    { key: 'failed', title: 'Failing', width: 8, align: 'right' },
    { key: 'pending', title: 'Pending', width: 8, align: 'right' },
    { key: 'skipped', title: 'Skipped', width: 8, align: 'right' },
];

function renderCell(value, col) {
    return col.align === 'right' ? padLeft(value, col.width) : padRight(value, col.width);
}

function buildRow(cells) {
    const inner = cells.map((v, i) => renderCell(v, COLS[i])).join('  ');
    return `│ ${inner} │`;
}

const innerWidth = COLS.reduce((sum, c, i) => sum + c.width + (i ? 2 : 0), 0);
const top = '┌' + '─'.repeat(innerWidth + 2) + '┐';
const mid = '├' + '─'.repeat(innerWidth + 2) + '┤';
const bottom = '└' + '─'.repeat(innerWidth + 2) + '┘';

// ---------- compose ----------
let output = '';

const headerCells = COLS.map((c) => c.title);
output += top + '\n';
output += buildRow(headerCells) + '\n';
output += mid + '\n';

const entries = Object.entries(testFiles).sort((a, b) => {
    const fa = b[1].failed - a[1].failed;
    if (fa !== 0) return fa;
    return a[0].localeCompare(b[0]);
});

let totalTests = 0,
    totalPassed = 0,
    totalFailed = 0,
    totalPending = 0,
    totalSkipped = 0,
    totalDuration = 0;

for (const [spec, stats] of entries) {
    const icon = stats.failed > 0 ? '✖' : '✔';
    const rowCells = [
        icon,
        spec,
        formatDuration(stats.duration),
        String(stats.total),
        String(stats.passed),
        String(stats.failed),
        String(stats.pending),
        String(stats.skipped),
    ];
    output += buildRow(rowCells) + '\n';

    totalTests += stats.total;
    totalPassed += stats.passed;
    totalFailed += stats.failed;
    totalPending += stats.pending;
    totalSkipped += stats.skipped;
    totalDuration += stats.duration;
}

output += mid + '\n';

const totalRow = [
    '',
    'TOTAL',
    formatDuration(totalDuration),
    String(totalTests),
    String(totalPassed),
    String(totalFailed),
    String(totalPending),
    String(totalSkipped),
];
output += buildRow(totalRow) + '\n';
output += bottom + '\n';

// ---------- write ----------
fs.writeFileSync('out', output, 'utf-8');
console.log('Plain text boxed summary written to out');
