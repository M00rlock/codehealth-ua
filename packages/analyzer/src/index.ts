import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CodeHealthReport,
  FileHealth,
  Framework,
  PackageHealth,
  PackageManager,
  ProjectLanguage,
  ProjectMeta,
  Recommendation,
  RiskLevel,
  TestHealth,
} from './types.js';

function getRiskLevel(file: Omit<FileHealth, 'riskLevel'>): RiskLevel {
  let points = 0;

  if (file.lines > 300) points += 3;
  else if (file.lines > 150) points += 1;

  if (file.todos > 0) points += file.todos;
  if (file.consoleLogs > 0) points += file.consoleLogs;
  if (file.anyUsages > 0) points += file.anyUsages;

  if (points >= 5) return 'high';
  if (points >= 2) return 'medium';
  return 'low';
}

function calculateScore(params: {
  packageHealth: PackageHealth;
  fileHealth: FileHealth[];
  testHealth: TestHealth;
}) {
  const { packageHealth, fileHealth, testHealth } = params;

  let projectSetup = 100;
  if (!packageHealth.hasBuildScript) projectSetup -= 20;
  if (!packageHealth.hasLintScript) projectSetup -= 20;
  if (!packageHealth.hasTypeScript) projectSetup -= 20;
  if (!packageHealth.hasEslint) projectSetup -= 15;
  if (!packageHealth.hasPrettier) projectSetup -= 10;

  let testing = 100;
  if (testHealth.status === 'none') testing = 10;
  if (testHealth.status === 'low') testing = 40;

  const highRiskFiles = fileHealth.filter(file => file.riskLevel === 'high').length;
  const mediumRiskFiles = fileHealth.filter(file => file.riskLevel === 'medium').length;

  let maintainability = 100;
  maintainability -= highRiskFiles * 10;
  maintainability -= mediumRiskFiles * 4;

  let dependencies = 100;
  if (packageHealth.dependenciesCount > 40) dependencies -= 20;
  if (packageHealth.dependenciesCount > 80) dependencies -= 20;

  projectSetup = Math.max(projectSetup, 0);
  testing = Math.max(testing, 0);
  maintainability = Math.max(maintainability, 0);
  dependencies = Math.max(dependencies, 0);

  const score = Math.round(
    projectSetup * 0.25 +
      testing * 0.25 +
      maintainability * 0.35 +
      dependencies * 0.15,
  );

  return {
    score,
    maintainability,
    testing,
    dependencies,
    projectSetup,
  };
}

function buildRecommendations(params: {
  packageHealth: PackageHealth;
  fileHealth: FileHealth[];
  testHealth: TestHealth;
}): Recommendation[] {
  const { packageHealth, fileHealth, testHealth } = params;

  const recommendations: Recommendation[] = [];

  if (!packageHealth.hasTestScript) {
    recommendations.push({
      type: 'package',
      severity: 'high',
      message: 'Додай test script у package.json, щоб проєкт мав стандартний спосіб запуску тестів.',
    });
  }

  if (!packageHealth.hasLintScript) {
    recommendations.push({
      type: 'package',
      severity: 'medium',
      message: 'Додай lint script у package.json для стабільнішої якості коду.',
    });
  }

  if (!packageHealth.hasTypeScript) {
    recommendations.push({
      type: 'package',
      severity: 'medium',
      message: 'Проєкт не має TypeScript у dependencies/devDependencies. Для великих JS-проєктів типізація може зменшити кількість помилок.',
    });
  }

  if (testHealth.status === 'none') {
    recommendations.push({
      type: 'testing',
      severity: 'high',
      message: 'Тести не знайдені. Почни хоча б з unit-тестів для основної бізнес-логіки.',
    });
  }

  if (testHealth.status === 'low') {
    recommendations.push({
      type: 'testing',
      severity: 'medium',
      message: 'Тестів мало відносно кількості source-файлів. Варто покрити критичні модулі.',
    });
  }

  
  const riskyFiles = fileHealth.filter(file => file.riskLevel === 'high');

  for (const file of riskyFiles.slice(0, 5)) {
    recommendations.push({
      type: 'file',
      severity: 'high',
      message: `Файл ${file.file} має високий ризик: ${file.lines} рядків, ${file.anyUsages} any, ${file.consoleLogs} console.log, ${file.todos} TODO/FIXME.`,
    });
  }

  return recommendations;
}
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectPackageManager(projectPath: string): Promise<PackageManager> {
  if (await fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (await fileExists(path.join(projectPath, 'package-lock.json'))) {
    return 'npm';
  }

  if (await fileExists(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }

  if (await fileExists(path.join(projectPath, 'bun.lockb'))) {
    return 'bun';
  }

  return 'unknown';
}

function detectFramework(packageJson: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): Framework {
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};

  const allDependencies = {
    ...dependencies,
    ...devDependencies,
  };

  if (allDependencies.nuxt) return 'nuxt';
  if (allDependencies.next) return 'next';
  if (allDependencies['@angular/core']) return 'angular';
  if (allDependencies['@nestjs/core']) return 'nestjs';
  if (allDependencies['@sveltejs/kit']) return 'sveltekit';
  if (allDependencies.svelte) return 'svelte';
  if (allDependencies.vue) return 'vue';
  if (allDependencies.react) return 'react';
  if (allDependencies.express) return 'express';

  return 'unknown';
}

function detectLanguage(params: {
  hasTypeScript: boolean;
  sourceFiles: string[];
}): ProjectLanguage {
  const { hasTypeScript, sourceFiles } = params;

  const tsFiles = sourceFiles.filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));
  const jsFiles = sourceFiles.filter(file => file.endsWith('.js') || file.endsWith('.jsx'));

  if (tsFiles.length > 0 && jsFiles.length > 0) {
    return 'mixed';
  }

  if (hasTypeScript || tsFiles.length > 0) {
    return 'typescript';
  }

  if (jsFiles.length > 0) {
    return 'javascript';
  }

  return 'unknown';
}

export async function analyzeProject(projectPath: string): Promise<CodeHealthReport> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonRaw) as {
    name?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};
  const allDependencies = {
    ...dependencies,
    ...devDependencies,
  };

const sourceFiles = await fg(
  [
    'src/**/*.{ts,tsx,js,jsx,vue}',
    'app/**/*.{ts,tsx,js,jsx,vue}',
    'components/**/*.{ts,tsx,js,jsx,vue}',
    'pages/**/*.{ts,tsx,js,jsx,vue}',
    'layouts/**/*.{ts,tsx,js,jsx,vue}',
    'composables/**/*.{ts,tsx,js,jsx}',
    'server/**/*.{ts,tsx,js,jsx}',
    'plugins/**/*.{ts,tsx,js,jsx}',
    'utils/**/*.{ts,tsx,js,jsx}',
    'stores/**/*.{ts,tsx,js,jsx}',
    'middleware/**/*.{ts,tsx,js,jsx}',
    'app.vue',
  ],
  {
    cwd: projectPath,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/build/**',
    ],
  },
);

const testFiles = await fg(
  [
    '**/*.spec.{ts,tsx,js,jsx,vue}',
    '**/*.test.{ts,tsx,js,jsx,vue}',
    '**/__tests__/**/*.{ts,tsx,js,jsx,vue}',
  ],
  {
    cwd: projectPath,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/build/**',
    ],
  },
);

  const fileHealth: FileHealth[] = await Promise.all(
    sourceFiles.map(async file => {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');

      const baseFileHealth = {
        file: path.relative(projectPath, file),
        lines: lines.length,
        todos: (content.match(/\bTODO\b|\bFIXME\b/g) ?? []).length,
        consoleLogs: (content.match(/console\.log/g) ?? []).length,
        anyUsages: (content.match(/:\s*any\b|as\s+any\b/g) ?? []).length,
      };

      return {
        ...baseFileHealth,
        riskLevel: getRiskLevel(baseFileHealth),
      };
    }),
  );

  const scripts = packageJson.scripts ?? {};

  const packageHealth: PackageHealth = {
    hasBuildScript: Boolean(scripts.build),
    hasTestScript: Boolean(scripts.test),
    hasLintScript: Boolean(scripts.lint),
    hasTypeScript: Boolean(allDependencies.typescript),
    hasEslint: Boolean(allDependencies.eslint),
    hasPrettier: Boolean(allDependencies.prettier),
    dependenciesCount: Object.keys(dependencies).length,
    devDependenciesCount: Object.keys(devDependencies).length,
  };

  const projectMeta: ProjectMeta = {
    framework: detectFramework(packageJson),
    language: detectLanguage({
      hasTypeScript: packageHealth.hasTypeScript,
      sourceFiles,
    }),
    packageManager: await detectPackageManager(projectPath),
  };

  const testRatio = sourceFiles.length === 0 ? 0 : testFiles.length / sourceFiles.length;

  const testHealth: TestHealth = {
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    testRatio: Number(testRatio.toFixed(2)),
    status: testFiles.length === 0 ? 'none' : testRatio < 0.25 ? 'low' : 'ok',
  };

  const summary = calculateScore({
    packageHealth,
    fileHealth,
    testHealth,
  });

  const recommendations = buildRecommendations({
    packageHealth,
    fileHealth,
    testHealth,
  });

  return {
    projectName: packageJson.name ?? 'unknown',
    summary,
    packageHealth,
    fileHealth,
    testHealth,
    recommendations,
    projectMeta
  };
}

export type * from './types.js';
