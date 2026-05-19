export type RiskLevel = 'low' | 'medium' | 'high';

export type Framework =
  | 'angular'
  | 'react'
  | 'next'
  | 'vue'
  | 'nuxt'
  | 'svelte'
  | 'sveltekit'
  | 'nestjs'
  | 'express'
  | 'unknown';

export type ProjectLanguage = 'typescript' | 'javascript' | 'mixed' | 'unknown';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';

export interface ProjectMeta {
  frameworks: Framework[];
  primaryFramework: Framework;
  language: ProjectLanguage;
  packageManager: PackageManager;
}

export interface PackageHealth {
  hasBuildScript: boolean;
  hasTestScript: boolean;
  hasLintScript: boolean;
  hasTypeScript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  dependenciesCount: number;
  devDependenciesCount: number;
}

export interface FileHealth {
  file: string;
  lines: number;
  todos: number;
  consoleLogs: number;
  anyUsages: number;
  riskLevel: RiskLevel;
}

export interface TestHealth {
  sourceFiles: number;
  testFiles: number;
  testRatio: number;
  status: 'none' | 'low' | 'ok';
}

export type RecommendationType =
  | 'package'
  | 'file'
  | 'testing'
  | 'maintainability'
  | 'dependencies'
  | 'project-setup';

export interface Recommendation {
  type: RecommendationType;
  severity: RiskLevel;
  title: string;
  message: string;
  suggestion: string;
}

export interface CodeHealthReport {
  projectName: string;
  summary: {
    score: number;
    maintainability: number;
    testing: number;
    dependencies: number;
    projectSetup: number;
  };
  projectMeta: ProjectMeta;
  packageHealth: PackageHealth;
  fileHealth: FileHealth[];
  testHealth: TestHealth;
  recommendations: Recommendation[];
}
