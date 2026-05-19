#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeProject } from './index.js';

const args = process.argv.slice(2);

const targetPath = args.find(arg => !arg.startsWith('--'));
const isJsonOutput = args.includes('--json');

const outIndex = args.indexOf('--out');
const outputPath = outIndex >= 0 ? args[outIndex + 1] : undefined;

if (!targetPath) {
  console.error('Usage: codehealth <path-to-project> [--json] [--out <file>]');
  process.exit(1);
}

if (outIndex >= 0 && !outputPath) {
  console.error('Missing output file after --out');
  process.exit(1);
}

  const commandCwd = process.env.INIT_CWD ?? process.cwd();
  const absolutePath = path.resolve(commandCwd, targetPath);

  try {
    const report = await analyzeProject(absolutePath);
    if (outputPath) {
    const absoluteOutputPath = path.resolve(commandCwd, outputPath);
    await fs.writeFile(absoluteOutputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`CodeHealth report saved to ${absoluteOutputPath}`);
    process.exit(0);
  }

  if (isJsonOutput) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.log('');
  console.log('CodeHealth UA Report');
  console.log('====================');
  console.log('');
  console.log(`Project: ${report.projectName}`);
  console.log(`Score: ${report.summary.score}/100`);
  console.log(`Framework: ${report.projectMeta.framework}`);
  console.log(`Language: ${report.projectMeta.language}`);
  console.log(`Package manager: ${report.projectMeta.packageManager}`);
  console.log('');
  console.log('Summary:');
  console.log(`- Maintainability: ${report.summary.maintainability}`);
  console.log(`- Testing: ${report.summary.testing}`);
  console.log(`- Dependencies: ${report.summary.dependencies}`);
  console.log(`- Project setup: ${report.summary.projectSetup}`);
  console.log('');
  console.log('Project stats:');
  console.log(`- Source files: ${report.testHealth.sourceFiles}`);
  console.log(`- Test files: ${report.testHealth.testFiles}`);
  console.log(`- Dependencies: ${report.packageHealth.dependenciesCount}`);
  console.log(`- Dev dependencies: ${report.packageHealth.devDependenciesCount}`);
  console.log('');

  if (report.fileHealth.length > 0) {
    console.log('Analyzed files:');

    for (const file of report.fileHealth) {
      console.log(
        `- [${file.riskLevel}] ${file.file} — ${file.lines} lines, ${file.anyUsages} any, ${file.consoleLogs} console.log, ${file.todos} TODO/FIXME`,
      );
    }

    console.log('');
  }

  const riskyFiles = report.fileHealth
    .filter(file => file.riskLevel !== 'low')
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10);

  if (riskyFiles.length > 0) {
    console.log('Risky files:');

    for (const file of riskyFiles) {
      console.log(
        `- [${file.riskLevel}] ${file.file} — ${file.lines} lines, ${file.anyUsages} any, ${file.consoleLogs} console.log, ${file.todos} TODO/FIXME`,
      );
    }

    console.log('');
  }

  if (report.recommendations.length > 0) {
    console.log('Recommendations:');

    for (const recommendation of report.recommendations) {
      console.log(`- [${recommendation.severity}] ${recommendation.message}`);
    }

    console.log('');
  }
} catch (error) {
  console.error('Failed to analyze project');

  if (error instanceof Error) {
    console.error(error.message);
  }

  process.exit(1);
}
