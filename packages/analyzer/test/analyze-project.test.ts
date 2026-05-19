import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { analyzeProject } from '../src/index.js';

const fixturesPath = path.resolve(__dirname, 'fixtures');

describe('analyzeProject', () => {
  it('detects Nuxt project metadata', async () => {
    const report = await analyzeProject(path.join(fixturesPath, 'nuxt-app'));

    expect(report.projectName).toBe('fixture-nuxt-app');
    expect(report.projectMeta.frameworks).toContain('nuxt');
    expect(report.projectMeta.primaryFramework).toBe('nuxt');
    expect(report.projectMeta.language).toBe('typescript');
    expect(report.projectMeta.packageManager).toBe('pnpm');
  });

  it('detects fullstack multi-framework project', async () => {
    const report = await analyzeProject(path.join(fixturesPath, 'fullstack-app'));

    expect(report.projectName).toBe('fixture-fullstack-app');
    expect(report.projectMeta.frameworks).toContain('angular');
    expect(report.projectMeta.frameworks).toContain('nestjs');
    expect(report.projectMeta.frameworks).toContain('express');
    expect(report.projectMeta.primaryFramework).toBe('angular');
    expect(report.projectMeta.language).toBe('typescript');
    expect(report.projectMeta.packageManager).toBe('pnpm');
  });

  it('excludes test files from production source files count', async () => {
    const report = await analyzeProject(path.join(fixturesPath, 'fullstack-app'));

    expect(report.testHealth.sourceFiles).toBe(2);
    expect(report.testHealth.testFiles).toBe(1);
    expect(report.fileHealth.some(file => file.file.endsWith('.spec.ts'))).toBe(false);
  });

  it('generates recommendations for weak project setup', async () => {
    const report = await analyzeProject(path.join(fixturesPath, 'weak-app'));

    const recommendationTitles = report.recommendations.map(item => item.title);

    expect(recommendationTitles).toContain('Missing test script');
    expect(recommendationTitles).toContain('Missing lint script');
    expect(recommendationTitles).toContain('Missing build script');
    expect(recommendationTitles).toContain('No tests found');
    expect(recommendationTitles).toContain('Any usage detected');
    expect(recommendationTitles).toContain('Console log detected');
    expect(recommendationTitles).toContain('TODO/FIXME comments detected');
  });

  it('returns a valid score between 0 and 100', async () => {
    const report = await analyzeProject(path.join(fixturesPath, 'weak-app'));

    expect(report.summary.score).toBeGreaterThanOrEqual(0);
    expect(report.summary.score).toBeLessThanOrEqual(100);
  });
});
