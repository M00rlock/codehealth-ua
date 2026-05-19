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
import {
  IGNORE_PATTERNS,
  SOURCE_FILE_PATTERNS,
  TEST_FILE_PATTERNS,
} from './patterns.js';

  async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  type PackageJsonLike = {
    name?: string;
    packageManager?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  async function findWorkspacePackageJsons(projectPath: string): Promise<PackageJsonLike[]> {
  const packageJsonFiles = await fg(['**/package.json'], {
    cwd: projectPath,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**',
    ],
  });

  const packageJsons = await Promise.all(
    packageJsonFiles.map(file => readJsonFile<PackageJsonLike>(file)),
  );

  return packageJsons.filter((item): item is PackageJsonLike => Boolean(item));
}

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
      type: 'project-setup',
      severity: 'high',
      title: 'Missing test script',
      message:
        'У package.json не знайдено test script. Це ускладнює перевірку проєкту перед деплоєм або pull request.',
      suggestion:
        'Додай test script. Наприклад: "test": "vitest" або "test": "jest".',
    });
  }

  if (!packageHealth.hasLintScript) {
    recommendations.push({
      type: 'project-setup',
      severity: 'medium',
      title: 'Missing lint script',
      message:
        'У package.json не знайдено lint script. Без нього складніше підтримувати єдиний стиль і базову якість коду.',
      suggestion:
        'Додай lint script. Наприклад: "lint": "eslint .".',
    });
  }

  if (!packageHealth.hasBuildScript) {
    recommendations.push({
      type: 'project-setup',
      severity: 'medium',
      title: 'Missing build script',
      message:
        'У package.json не знайдено build script. Це може ускладнити CI/CD або production deployment.',
      suggestion:
        'Додай build script відповідно до фреймворку. Наприклад: "build": "nuxt build", "build": "ng build" або "build": "tsc".',
    });
  }

  if (!packageHealth.hasTypeScript) {
    recommendations.push({
      type: 'package',
      severity: 'medium',
      title: 'TypeScript is not detected',
      message:
        'TypeScript не знайдено у dependencies/devDependencies. Для середніх і великих JS-проєктів типізація допомагає зменшити кількість runtime-помилок.',
      suggestion:
        'Якщо це production-проєкт, розглянь поступову міграцію на TypeScript або хоча б JSDoc typing для критичних модулів.',
    });
  }

  if (!packageHealth.hasEslint) {
    recommendations.push({
      type: 'project-setup',
      severity: 'medium',
      title: 'ESLint is not detected',
      message:
        'ESLint не знайдено у dependencies/devDependencies. Це означає, що частина помилок стилю, імпортів або потенційних багів може не ловитись автоматично.',
      suggestion:
        'Додай ESLint із конфігурацією під твій стек. Для Nuxt можна використати Nuxt ESLint module, для Angular — @angular-eslint.',
    });
  }

  if (!packageHealth.hasPrettier) {
    recommendations.push({
      type: 'project-setup',
      severity: 'low',
      title: 'Prettier is not detected',
      message:
        'Prettier не знайдено у dependencies/devDependencies. Це не критично, але автоформатування зменшує шум у pull requests.',
      suggestion:
        'Додай Prettier або переконайся, що форматування покривається іншим інструментом.',
    });
  }

  if (testHealth.status === 'none') {
    recommendations.push({
      type: 'testing',
      severity: 'high',
      title: 'No tests found',
      message:
        'Тестові файли не знайдені. Це підвищує ризик регресій при зміні логіки.',
      suggestion:
        'Почни з unit-тестів для core-функцій, сервісів, composables або utility-модулів. Не треба покривати все одразу.',
    });
  }

  if (testHealth.status === 'low') {
    recommendations.push({
      type: 'testing',
      severity: 'medium',
      title: 'Low test signal',
      message:
        `Знайдено ${testHealth.testFiles} тестових файлів на ${testHealth.sourceFiles} source-файлів. Це низьке співвідношення для стабільного проєкту.`,
      suggestion:
        'Покрий тестами найбільш ризикові місця: бізнес-логіку, форматери, API-клієнти, сервіси та складні компоненти.',
    });
  }

  const largeFiles = fileHealth
    .filter(file => file.lines > 200)
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5);

  for (const file of largeFiles) {
    recommendations.push({
      type: 'maintainability',
      severity: file.lines > 350 ? 'high' : 'medium',
      title: 'Large file detected',
      message:
        `Файл ${file.file} має ${file.lines} рядків. Великі файли складніше читати, тестувати і безпечно змінювати.`,
      suggestion:
        'Спробуй розділити файл на менші частини: component/service/helper/mapper/types або винести повторювану логіку в окремий модуль.',
    });
  }

  const filesWithAny = fileHealth
    .filter(file => file.anyUsages > 0)
    .sort((a, b) => b.anyUsages - a.anyUsages)
    .slice(0, 5);

  for (const file of filesWithAny) {
    recommendations.push({
      type: 'maintainability',
      severity: file.anyUsages > 5 ? 'high' : 'medium',
      title: 'Any usage detected',
      message:
        `Файл ${file.file} містить ${file.anyUsages} використань any. Це послаблює TypeScript і може приховувати помилки.`,
      suggestion:
        'Заміни any на конкретний тип, unknown з type guard, generic або окремий interface/type.',
    });
  }

  const filesWithConsoleLogs = fileHealth
    .filter(file => file.consoleLogs > 0)
    .sort((a, b) => b.consoleLogs - a.consoleLogs)
    .slice(0, 5);

  for (const file of filesWithConsoleLogs) {
    recommendations.push({
      type: 'maintainability',
      severity: 'low',
      title: 'Console log detected',
      message:
        `Файл ${file.file} містить ${file.consoleLogs} console.log. У production-коді це може створювати шум або випадково показувати зайву інформацію.`,
      suggestion:
        'Прибери console.log або заміни на logger/debug utility з контролем середовища.',
    });
  }

  const filesWithTodos = fileHealth
    .filter(file => file.todos > 0)
    .sort((a, b) => b.todos - a.todos)
    .slice(0, 5);

  for (const file of filesWithTodos) {
    recommendations.push({
      type: 'maintainability',
      severity: 'low',
      title: 'TODO/FIXME comments detected',
      message:
        `Файл ${file.file} містить ${file.todos} TODO/FIXME коментарів. Це може бути сигналом незавершеної або тимчасової логіки.`,
      suggestion:
        'Перенеси TODO у issue tracker або перетвори їх на конкретні задачі з пріоритетом.',
    });
  }

  if (packageHealth.dependenciesCount > 40) {
    recommendations.push({
      type: 'dependencies',
      severity: 'medium',
      title: 'Many production dependencies',
      message:
        `Проєкт має ${packageHealth.dependenciesCount} production dependencies. Велика кількість залежностей збільшує surface area для security і maintenance ризиків.`,
      suggestion:
        'Перевір, чи всі dependencies справді потрібні в runtime. Частину можна перенести в devDependencies або видалити.',
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

async function detectPackageManager(
  projectPath: string,
  packageJson?: { packageManager?: string },
): Promise<PackageManager> {
  const declaredPackageManager = packageJson?.packageManager;

  if (declaredPackageManager?.startsWith('pnpm')) return 'pnpm';
  if (declaredPackageManager?.startsWith('npm')) return 'npm';
  if (declaredPackageManager?.startsWith('yarn')) return 'yarn';
  if (declaredPackageManager?.startsWith('bun')) return 'bun';

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

function detectFramework(allDependencies: Record<string, string>): Framework {
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

async function detectLanguage(params: {
  projectPath: string;
  hasTypeScript: boolean;
  sourceFiles: string[];
}): Promise<ProjectLanguage> {
  const { projectPath, hasTypeScript, sourceFiles } = params;

  const hasTsConfig = await fileExists(path.join(projectPath, 'tsconfig.json'));

  const tsFiles = sourceFiles.filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));
  const jsFiles = sourceFiles.filter(file => file.endsWith('.js') || file.endsWith('.jsx'));

  if (tsFiles.length > 0 && jsFiles.length > 0) {
    return 'mixed';
  }

  if (hasTypeScript || hasTsConfig || tsFiles.length > 0) {
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
const packageJson = JSON.parse(packageJsonRaw) as PackageJsonLike;

const workspacePackageJsons = await findWorkspacePackageJsons(projectPath);

const dependencies = Object.assign(
  {},
  ...workspacePackageJsons.map(item => item.dependencies ?? {}),
);

const devDependencies = Object.assign(
  {},
  ...workspacePackageJsons.map(item => item.devDependencies ?? {}),
);

const allDependencies = {
  ...dependencies,
  ...devDependencies,
};

const scripts = Object.assign(
  {},
  ...workspacePackageJsons.map(item => item.scripts ?? {}),
);

  const sourceFiles = await fg(SOURCE_FILE_PATTERNS, {
    cwd: projectPath,
    absolute: true,
    ignore: IGNORE_PATTERNS,
  });

  const testFiles = await fg(TEST_FILE_PATTERNS, {
    cwd: projectPath,
    absolute: true,
    ignore: IGNORE_PATTERNS,
  });

  const testFileSet = new Set(testFiles);

  const productionSourceFiles = sourceFiles.filter(file => !testFileSet.has(file));

  const fileHealth: FileHealth[] = await Promise.all(
    productionSourceFiles.map(async file => {
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
    framework: detectFramework(allDependencies),
    language: await detectLanguage({
      projectPath,
      hasTypeScript: packageHealth.hasTypeScript,
      sourceFiles: productionSourceFiles,
    }),
    packageManager: await detectPackageManager(projectPath, packageJson),
  };

  const testRatio =
    productionSourceFiles.length === 0
      ? 0
      : testFiles.length / productionSourceFiles.length;

  const testHealth: TestHealth = {
    sourceFiles: productionSourceFiles.length,
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
