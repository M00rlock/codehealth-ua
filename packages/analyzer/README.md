# CodeHealth UA

CodeHealth UA is a CLI tool that analyzes JavaScript and TypeScript projects and generates a code health report.

It checks:

- framework stack
- package setup
- testing signal
- source files
- maintainability risks
- recommendations

## Installation

```bash
npm i -D @m00rl0ck/codehealth-ua
```

## Usage

```bash
npx codehealth <path_to_project> --md --out filename.report.md
```