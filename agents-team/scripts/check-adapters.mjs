#!/usr/bin/env node
// Structural check for agents-team harness adapters.
// Usage: node check-adapters.mjs [--dir <adapters dir>] [--readme <README.md path>]
// Exit codes: 0 ok - 1 problems - 2 no verdict (usage error/no adapters or unidentifiable dispatch contract).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = 'usage: check-adapters.mjs [--dir <adapters dir>] [--readme <README.md path>]';
const usageError = (detail) => {
  console.error(usage);
  if (detail) console.error(detail);
  process.exit(2);
};

const options = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const flag = argv[i];
  if (flag !== '--dir' && flag !== '--readme') usageError(`unknown flag: ${flag}`);
  if (options[flag] !== undefined) usageError(`duplicate flag: ${flag}`);
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) usageError(`missing value for ${flag}`);
  options[flag] = value;
  i += 1;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const adaptersDir = resolve(options['--dir'] ?? join(scriptDir, '..', 'adapters'));
const readmePath = resolve(options['--readme'] ?? join(adaptersDir, 'README.md'));
if (!existsSync(adaptersDir) || !statSync(adaptersDir).isDirectory()) {
  usageError(`--dir does not exist or is not a directory: ${adaptersDir}`);
}
if (!existsSync(readmePath) || !statSync(readmePath).isFile()) {
  usageError(`--readme does not exist or is not a file: ${readmePath}`);
}

const headings = [
  '## Capabilities',
  '## Role dispatch',
  '## Edges that shape how a team is run',
  '## Gate',
  '## Verified / not verified',
];
const capabilities = [
  'spawn', 'identity', 'parallel-spawn', 'status', 'steer', 'stop',
  'gate', 'raise', 'fresh-context', 'fan-out', 'isolate',
];
const problems = [];
const adapterFiles = readdirSync(adaptersDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
  .map((entry) => entry.name)
  .sort();
if (adapterFiles.length === 0) usageError(`--dir contains no adapter .md files: ${adaptersDir}`);

const readmeLines = readFileSync(readmePath, 'utf8').split('\n').map((line) => line.replace(/\r$/, ''));
const { outsideFenceLines, tables } = parseMarkdownTables(readmeLines);
const dispatchTables = tables.filter((table) => table.headerCells[2] === 'Read');
if (dispatchTables.length === 0) {
  usageError('dispatch table could not be located: expected one unfenced Markdown table with third header cell "Read"');
}
if (dispatchTables.length > 1) {
  usageError(`dispatch table contract is ambiguous: found ${dispatchTables.length} candidate tables with third header cell "Read"; expected one`);
}

const readmeMentions = new Set(outsideFenceLines
  .flatMap((line) => [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1])));
const directoryFiles = new Set(readdirSync(adaptersDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name));

function sectionBody(lines, headingIndex) {
  let end = headingIndex + 1;
  while (end < lines.length && !lines[end].trim().startsWith('## ')) end += 1;
  return lines.slice(headingIndex + 1, end);
}

function tableCells(line) {
  if (!line?.trimStart().startsWith('|')) return null;
  const trimmed = line.trim();
  return trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined).split('|').map((cell) => cell.trim());
}

function isTableDelimiter(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownTables(lines) {
  const outsideFenceLines = [];
  let fenceCharacter = null;
  let fenceLength = 0;
  for (const line of lines) {
    if (fenceCharacter !== null) {
      const closingFence = line.match(/^ {0,3}(`+|~+)\s*$/);
      if (closingFence && closingFence[1][0] === fenceCharacter && closingFence[1].length >= fenceLength) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      outsideFenceLines.push(null);
      continue;
    }
    const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (openingFence) {
      fenceCharacter = openingFence[1][0];
      fenceLength = openingFence[1].length;
      outsideFenceLines.push(null);
      continue;
    }
    outsideFenceLines.push(line);
  }

  const tables = [];
  for (let i = 0; i < outsideFenceLines.length;) {
    if (outsideFenceLines[i] === null || !tableCells(outsideFenceLines[i])) {
      i += 1;
      continue;
    }
    const rows = [];
    let end = i;
    while (end < outsideFenceLines.length && outsideFenceLines[end] !== null) {
      const cells = tableCells(outsideFenceLines[end]);
      if (!cells) break;
      rows.push({ line: outsideFenceLines[end], cells });
      end += 1;
    }
    if (rows.length > 1 && rows[0].cells.length >= 3 && isTableDelimiter(rows[1].cells)) {
      tables.push({ headerCells: rows[0].cells, dataRows: rows.slice(2) });
    }
    i = end > i ? end : i + 1;
  }
  return { outsideFenceLines: outsideFenceLines.filter((line) => line !== null), tables };
}
const dispatchTable = dispatchTables[0];
const dispatchNames = [];
for (const row of dispatchTable.dataRows) {
  const readCell = row.cells[2] ?? '';
  for (const match of readCell.matchAll(/`([^`]+\.md)`/g)) dispatchNames.push(match[1]);
}
const seenDispatchNames = new Set();
for (const name of dispatchNames) {
  if (seenDispatchNames.has(name)) problems.push(`README.md: dispatch table names "${name}" more than once`);
  else seenDispatchNames.add(name);
  if (!directoryFiles.has(name)) problems.push(`README.md: dispatch table names missing file "${name}"`);
}

for (const file of adapterFiles) {
  const lines = readFileSync(join(adaptersDir, file), 'utf8')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''));
  for (const heading of headings) {
    const actual = lines.filter((line) => line.trim() === heading).length;
    if (actual !== 1) problems.push(`${file}: heading "${heading}" expected 1, actual ${actual}`);
  }

  const gateIndex = lines.findIndex((line) => line.trim() === '## Gate');
  if (gateIndex !== -1 && !sectionBody(lines, gateIndex).some((line) => line.trim() !== '')) {
    problems.push(`${file}: empty Gate body`);
  }

  const capabilitiesIndex = lines.findIndex((line) => line.trim() === '## Capabilities');
  const capabilityLines = capabilitiesIndex === -1 ? [] : sectionBody(lines, capabilitiesIndex);
  const headerIndex = capabilityLines.findIndex((line) => line.trim() === '| Capability | Call |');
  if (headerIndex === -1) {
    problems.push(`${file}: capability table header "| Capability | Call |" expected 1, actual 0`);
  } else {
    const counts = new Map(capabilities.map((capability) => [capability, 0]));
    for (let i = headerIndex + 1; i < capabilityLines.length; i += 1) {
      const cells = tableCells(capabilityLines[i]);
      if (!cells) break;
      const name = (cells[0] ?? '').replaceAll('`', '').trim();
      if (!name || /^:?-{3,}:?$/.test(name)) continue;
      if (counts.has(name)) counts.set(name, counts.get(name) + 1);
      else problems.push(`${file}: unexpected capability "${name}"`);
      if (!(cells[1] ?? '').trim()) problems.push(`${file}: capability "${name}" has an empty Call cell`);
    }
    for (const [capability, count] of counts) {
      if (count === 0) problems.push(`${file}: capability "${capability}" missing`);
      else if (count > 1) problems.push(`${file}: capability "${capability}" duplicated (${count} times)`);
    }
  }

  if (!readmeMentions.has(file)) {
    problems.push(`README.md: adapter file "${file}" is present but not named in backticks`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.log(problem);
  console.log(`${problems.length} problem(s)`);
  process.exit(1);
}

for (const file of adapterFiles) console.log(`OK ${file}: 11/11 capabilities, 5/5 sections`);
console.log(`${adapterFiles.length} adapter(s) conformant`);
