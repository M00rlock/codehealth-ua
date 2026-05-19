# CodeHealth UA

**CodeHealth UA** is an open-source code quality radar for JavaScript and TypeScript projects.

It analyzes a local project and generates a health report focused on:

- project setup
- framework detection
- package manager detection
- source file health
- testing signal
- dependency overview
- maintainability risks
- human-readable recommendations

The project is currently in early MVP stage.

---

## Why CodeHealth UA?

Modern JavaScript and TypeScript projects grow quickly.

Over time, they often accumulate:

- missing tests
- large files
- weak project setup
- too many dependencies
- `any` usages
- temporary `TODO` / `FIXME` comments
- forgotten `console.log`
- unclear maintainability risks

**CodeHealth UA** helps detect these signals early and provides practical recommendations for improving project health.

---

## Current Version

```txt
0.0.4
```

Current version includes:

- local project analyzer
- basic project health score
- framework detection
- language detection
- package manager detection
- JSON output
- report export to file
- improved recommendations with title, message and suggestion

---

## Features

### Project Health Score

Generates an overall score from `0` to `100`.

```txt
Score: 66/100
```

The score is based on:

- maintainability
- testing signal
- dependency health
- project setup

---

### Framework Detection

CodeHealth UA can currently detect:

- Angular
- React
- Next.js
- Vue
- Nuxt
- Svelte
- SvelteKit
- NestJS
- Express

Example:

```txt
Framework: nuxt
Language: typescript
Package manager: pnpm
```

---

### Package Health

Checks `package.json` for:

- build script
- test script
- lint script
- TypeScript
- ESLint
- Prettier
- dependencies count
- devDependencies count

---

### File Health

Analyzes source files and detects:

- number of lines
- `TODO`
- `FIXME`
- `console.log`
- `any` usages
- basic risk level

Supported file types:

```txt
.ts
.tsx
.js
.jsx
.vue
```

---

### Testing Signal

Detects test files such as:

```txt
*.spec.ts
*.test.ts
*.spec.js
*.test.js
*.spec.vue
*.test.vue
```

Also supports:

```txt
__tests__/
```

The analyzer reports:

- source files count
- test files count
- test ratio
- testing status

---

### Recommendations

CodeHealth UA provides structured recommendations.

Each recommendation includes:

- type
- severity
- title
- message
- suggestion

Example:

```txt
[high] Missing test script
У package.json не знайдено test script. Це ускладнює перевірку проєкту перед деплоєм або pull request.
Suggestion: Додай test script. Наприклад: "test": "vitest" або "test": "jest".
```

---

## Project Structure

```txt
codehealth-ua/
├── packages/
│   └── analyzer/
│       └── src/
│           ├── cli.ts
│           ├── index.ts
│           └── types.ts
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/codehealth-ua.git
cd codehealth-ua
```

Install dependencies:

```bash
pnpm install
```

---

## Usage

### Analyze a local project

```bash
pnpm analyze ../your-project
```

Example:

```bash
pnpm analyze ../portfolio-nuxt
```

Output:

```txt
CodeHealth UA Report
====================

Project: portfolio-nuxt
Score: 66/100
Framework: nuxt
Language: typescript
Package manager: pnpm

Summary:
- Maintainability: 100
- Testing: 10
- Dependencies: 100
- Project setup: 55

Project stats:
- Source files: 3
- Test files: 0
- Dependencies: 5
- Dev dependencies: 2
```

---

### JSON output

```bash
pnpm analyze ../your-project --json
```

Example output:

```json
{
  "projectName": "portfolio-nuxt",
  "projectMeta": {
    "framework": "nuxt",
    "language": "typescript",
    "packageManager": "pnpm"
  },
  "summary": {
    "score": 66,
    "maintainability": 100,
    "testing": 10,
    "dependencies": 100,
    "projectSetup": 55
  }
}
```

---

### Save report to file

```bash
pnpm analyze ../your-project --out codehealth-report.json
```

The generated report will be saved as:

```txt
codehealth-report.json
```

This file is ignored by Git by default.

---

## Example Report

```txt
CodeHealth UA Report
====================

Project: portfolio-nuxt
Score: 66/100
Framework: nuxt
Language: typescript
Package manager: pnpm

Summary:
- Maintainability: 100
- Testing: 10
- Dependencies: 100
- Project setup: 55

Project stats:
- Source files: 3
- Test files: 0
- Dependencies: 5
- Dev dependencies: 2

Recommendations:
- [high] Missing test script
  У package.json не знайдено test script. Це ускладнює перевірку проєкту перед деплоєм або pull request.
  Suggestion: Додай test script. Наприклад: "test": "vitest" або "test": "jest".

- [medium] Missing lint script
  У package.json не знайдено lint script. Без нього складніше підтримувати єдиний стиль і базову якість коду.
  Suggestion: Додай lint script. Наприклад: "lint": "eslint .".
```

---

## Versioning

CodeHealth UA follows early-stage semantic versioning.

Current development uses `0.0.x` versions while the project is in MVP phase.

### Version roadmap

```txt
0.0.1 — basic local analyzer
0.0.2 — framework, language and package manager detection
0.0.3 — JSON output and report export
0.0.4 — improved recommendation details
```

### Version meaning

```txt
0.0.x — internal MVP iterations
0.1.0 — first public CLI MVP
1.0.0 — stable public release
```

### Planned `0.1.0`

The first public MVP should include:

- stable CLI
- JSON output
- local project analysis
- framework detection
- useful recommendations
- documentation
- example reports
- basic test coverage

---

## Roadmap

### MVP

- [x] Create monorepo structure
- [x] Add analyzer package
- [x] Read package.json
- [x] Detect build/test/lint scripts
- [x] Detect framework
- [x] Detect language
- [x] Detect package manager
- [x] Analyze source files
- [x] Detect test files
- [x] Calculate basic health score
- [x] Generate recommendations
- [x] Add JSON output
- [x] Add report export
- [x] Add Markdown report output
- [x] Add better source file patterns (v0.0.5)
- [x] Add CLI help command
- [ ] Multiframework detection
- [ ] Add tests for analyzer
- [ ] Add GitHub Actions CI

### Future

- [ ] GitHub repository analysis by URL
- [ ] NestJS API
- [ ] Angular dashboard
- [ ] Historical reports
- [ ] Dependency risk analysis
- [ ] Circular dependency detection
- [ ] AI-assisted recommendation summary
- [ ] Ukrainian and English report modes

---

## Planned Architecture

```txt
CLI
 |
 v
Analyzer Core
 |
 v
JSON Report
 |
 +--> Markdown Report
 |
 +--> NestJS API
        |
        v
   Angular Dashboard
```

---

## Tech Stack

Current:

- Node.js
- TypeScript
- pnpm workspace
- tsx
- fast-glob

Planned:

- NestJS
- Angular
- PostgreSQL
- Redis / BullMQ
- GitHub API

---

## Development

Run analyzer:

```bash
pnpm analyze ../your-project
```

Run analyzer with JSON output:

```bash
pnpm analyze ../your-project --json
```

Save report:

```bash
pnpm analyze ../your-project --out codehealth-report.json
```

---

## Git Ignore

Generated reports are ignored by default:

```txt
codehealth-report.json
reports/
```

Environment files are ignored:

```txt
.env
.env.*
```

Use `.env.example` for documenting required variables.

---

## License

MIT

---

## Status

CodeHealth UA is currently in early active development.

The project is not production-ready yet, but the local analyzer already works and can generate useful project health reports.

## 0.0.5

### Added
- Markdown report generator
- `--markdown` CLI flag
- `--md` CLI alias
- Markdown report export via `--out`
- Automatic output directory creation

## 0.0.6

### Added
- `--help` CLI command
- `-h` CLI alias
- `--version` CLI command
- `-v` CLI alias
- Better usage output
- Better error message for missing `--out` value


## 0.0.7 

Before:
- шукав переважно src/
- не бачив nested projects
- міг показувати Source files: 0
- framework unknown

After:
- бачить apps/packages/custom-folder/src
- бачить nested package.json
- краще визначає framework/language/package manager
- test files не зараховуються як production source