# DevOps CI/CD Pipeline Project

A production-grade CI/CD pipeline implementation using GitHub Actions, demonstrating automated testing, deployment, semantic versioning, and rollback capabilities.

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Branch Strategy](#branch-strategy)
- [Pipeline Architecture](#pipeline-architecture)
- [Workflow Details](#workflow-details)
- [How to Trigger Each Workflow](#how-to-trigger-each-workflow)
- [GitHub Environment Setup](#github-environment-setup)
- [Secrets Configuration](#secrets-configuration)
- [Observations](#observations)
- [Setup Instructions](#setup-instructions)

---

## Project Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18 | SPA with version display and health route |
| Backend | Node.js + Express | REST API with health checks |
| CI/CD | GitHub Actions | Automated pipeline |
| Container | Docker | Production packaging |
| Testing | Jest + Supertest | Unit tests with 80%+ coverage |

---

## Repository Structure

```
repo/
├── src/
│   ├── frontend/                   # React application
│   │   ├── public/
│   │   │   └── index.html
│   │   ├── src/
│   │   │   ├── App.js
│   │   │   └── index.js
│   │   └── package.json
│   └── backend/                    # Express server
│       ├── app.js                  # Express app (testable)
│       └── server.js               # Server entry point
├── tests/
│   └── backend.test.js             # Jest unit tests (>80% coverage)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Continuous Integration
│   │   ├── cd.yml                  # Continuous Deployment
│   │   ├── release.yml             # Semantic Release
│   │   └── rollback.yml            # Emergency Rollback
│   └── actions/
│       ├── setup-env/action.yml    # Composite: Node.js + npm install
│       └── deploy/action.yml       # Composite: Docker build + deploy
├── Dockerfile                      # Multi-stage Docker build
├── .dockerignore
├── .eslintrc.json
├── .gitignore
├── package.json
├── version.txt                     # Semantic version (auto-updated)
└── README.md
```

---

## Branch Strategy

| Branch | Deploys To | Trigger | Notes |
|--------|-----------|---------|-------|
| `feature/*` | — | CI only | Development feature branches |
| `develop` | Staging | Push triggers CD | Integration branch |
| `main` | Production | Push triggers CD + Release | Protected branch |
| `hotfix/*` | — | CI, then merge to main | Emergency fixes |

### Branch Flow Diagram

```
feature/login ──┐
feature/auth ───┤
                ├──▶ develop ──▶ staging deployment
feature/api ────┘        │
                         ▼
                       main ──▶ production deployment
                         ▲          │
                         │          ▼ (if health check fails)
                    hotfix/* ◀── rollback workflow
```

### Branch Protection Rules (main)

Configure these in GitHub → Settings → Branches → Branch protection rules:

| Rule | Setting |
|------|---------|
| Require pull request before merging | ✅ Enabled |
| Required approving reviewers | 1 |
| Require status checks to pass | ✅ CI Gate |
| Require branches to be up to date | ✅ Enabled |
| Include administrators | ✅ Enabled |

---

## Pipeline Architecture

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI PIPELINE (ci.yml)                        │
│  Trigger: push feature/*, PR to main                           │
│                                                                 │
│  ┌──────┐  ┌────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │ Lint │  │ Unit Tests │  │ Matrix Build   │  │ Coverage   │ │
│  │      │  │            │  │ Node 16 & 18   │  │ Check ≥80% │ │
│  └──┬───┘  └─────┬──────┘  └───────┬────────┘  └─────┬──────┘ │
│     │            │                  │                  │        │
│     └────────────┴─────────┬────────┴──────────────────┘        │
│                            ▼                                    │
│                      ┌──────────┐                               │
│                      │ CI Gate  │  ← All jobs must pass         │
│                      └──────────┘                               │
│                            │                                    │
│                   Upload build artifact                         │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CD PIPELINE (cd.yml)                        │
│  Trigger: push to develop OR main                              │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ Download CI      │  ← No rebuild, uses artifact              │
│  │ Artifact         │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│     ┌─────┴──────┐                                             │
│     ▼            ▼                                              │
│  develop       main                                             │
│     │            │                                              │
│     ▼            ▼                                              │
│  ┌────────┐  ┌──────────────┐                                  │
│  │Staging │  │ Production   │  ← Requires reviewer approval    │
│  │Deploy  │  │ Deploy       │    (GitHub Environment gate)     │
│  └───┬────┘  └──────┬───────┘                                  │
│      │               │                                          │
│      ▼               ▼                                          │
│  ┌────────┐  ┌──────────────┐                                  │
│  │ Smoke  │  │ Health Check │                                  │
│  │ Test   │  └──────┬───────┘                                  │
│  └────────┘         │                                           │
│                ┌────┴────┐                                      │
│                │ Failed? │                                      │
│                └────┬────┘                                      │
│                     ▼                                           │
│              ┌──────────────┐                                   │
│              │ Rollback     │  ← workflow_call to rollback.yml  │
│              └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RELEASE PIPELINE (release.yml)                 │
│  Trigger: push to main                                         │
│                                                                 │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐      │
│  │ Analyze    │─▶│ Bump Version │─▶│ Create Tag +      │      │
│  │ Commits    │  │ in version.txt│  │ GitHub Release    │      │
│  └────────────┘  └──────────────┘  └───────────────────┘      │
│                                                                 │
│  Semantic Rules:                                                │
│    feat:            → minor bump (1.0.0 → 1.1.0)              │
│    fix:             → patch bump (1.0.0 → 1.0.1)              │
│    BREAKING CHANGE  → major bump (1.0.0 → 2.0.0)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Details

### 1. CI Workflow (`ci.yml`)

**Purpose:** Validate code quality on every feature branch push and PR to main.

| Job | Description | Runs In Parallel |
|-----|-------------|-----------------|
| `lint` | ESLint checks on backend code | Yes |
| `unit-tests` | Jest tests with coverage report | Yes |
| `coverage` | Enforces ≥80% coverage threshold | After unit-tests |
| `matrix-build` | Builds on Node 16 and Node 18 | Yes |
| `ci-gate` | Final gate — all jobs must pass | After all |

**Advanced features used:**
- `concurrency:` cancels redundant runs on same branch
- `actions/cache` for node_modules
- `actions/upload-artifact` for build artifacts
- Matrix strategy for multi-version testing
- Composite action `setup-env` for DRY setup

### 2. CD Workflow (`cd.yml`)

**Purpose:** Deploy to staging (develop) or production (main).

| Job | Description | Condition |
|-----|-------------|-----------|
| `prepare` | Downloads CI artifact (no rebuild) | Always |
| `deploy-staging` | Deploys to staging + smoke test | `develop` branch |
| `deploy-production` | Deploys to production with approval | `main` branch |
| `rollback-on-failure` | Triggers rollback if deploy fails | On failure, `main` |

**Advanced features used:**
- `concurrency:` prevents parallel deploys
- GitHub Environment `production` with approval gate
- `needs:` for job ordering
- `secrets:` for deploy tokens
- Automatic rollback via `workflow_call`
- PR comment on failure

### 3. Release Workflow (`release.yml`)

**Purpose:** Auto semantic versioning and GitHub Release creation.

| Step | Description |
|------|-------------|
| Read version | Reads current version from `version.txt` |
| Analyze commits | Parses commit messages for feat/fix/BREAKING |
| Bump version | Increments major/minor/patch accordingly |
| Update file | Writes new version to `version.txt` |
| Create tag | Creates annotated Git tag (e.g., `v1.2.3`) |
| Create release | Publishes GitHub Release with auto-generated notes |

**Advanced features used:**
- `workflow_call` for reusability
- Auto-generated release notes from commits
- Commit message convention parsing

### 4. Rollback Workflow (`rollback.yml`)

**Purpose:** Emergency rollback to last known good release.

| Step | Description |
|------|-------------|
| Get previous tag | Finds the last stable release tag |
| Checkout previous | Checks out code at previous tag |
| Redeploy | Builds and deploys previous Docker image |
| Health check | Verifies rollback succeeded |
| Mark failed | Updates deployment status to failed |
| Comment PR | Posts failure details on the merged PR |

**Advanced features used:**
- `workflow_call` + `workflow_dispatch` triggers
- Automatic PR commenting with failure details
- Deployment status API integration

---

## How to Trigger Each Workflow

### CI Pipeline
```bash
# Automatic: push to a feature branch
git checkout -b feature/my-feature
git commit -m "feat: add new feature"
git push origin feature/my-feature

# Automatic: open a PR to main
# → CI runs automatically on the PR
```

### CD Pipeline — Staging
```bash
# Merge feature into develop
git checkout develop
git merge feature/my-feature
git push origin develop
# → CD deploys to staging automatically
```

### CD Pipeline — Production
```bash
# Create PR from develop to main
# → After review + CI passes, merge
# → CD deploys to production (after reviewer approval in GitHub Environment)
```

### Release
```bash
# Automatic: triggered when code is pushed/merged to main
# Version bump determined by commit messages:
git commit -m "feat: add user dashboard"    # → minor bump
git commit -m "fix: correct login error"     # → patch bump
git commit -m "feat!: redesign API"          # → major bump (BREAKING)
```

### Rollback
```bash
# Automatic: triggered by CD when production health check fails

# Manual: via GitHub Actions UI
# Go to Actions → Rollback Pipeline → Run workflow
# Fill in: reason, failed_version
```

---

## GitHub Environment Setup

### Create "production" Environment

1. Go to Repository → Settings → Environments
2. Click "New environment" → Name: `production`
3. Configure:
   - ✅ Required reviewers → Add at least 1 reviewer
   - Wait timer: 0 minutes (optional: add delay)
   - Deployment branches: `main` only

### Required Secrets

| Secret | Where Used | Description |
|--------|-----------|-------------|
| `DEPLOY_TOKEN` | cd.yml, rollback.yml | Authentication token for deployment server |
| `GITHUB_TOKEN` | All workflows | Auto-provided by GitHub Actions |

To add secrets: Repository → Settings → Secrets and variables → Actions → New repository secret

---

## Secrets Configuration

```yaml
# Secrets used across workflows:
secrets:
  DEPLOY_TOKEN:     # Token for deployment authentication
  GITHUB_TOKEN:     # Automatically provided by GitHub
```

Set up in: **GitHub → Repository → Settings → Secrets and variables → Actions**

---

## Observations

### CI Performance: Before vs After Caching

| Metric | Without Cache | With Cache | Improvement |
|--------|--------------|------------|-------------|
| npm install time | ~25-40s | ~2-5s | ~85% faster |
| Total CI time | ~90-120s | ~45-70s | ~45% faster |
| Cache hit rate | N/A | ~90% | — |
| node_modules size | ~150MB | Cached | — |

### Build Artifacts

| Artifact | Size | Retention |
|----------|------|-----------|
| Backend build | ~2-5 MB | 14 days |
| Frontend build | ~5-15 MB | 14 days |
| Test coverage | ~1-3 MB | 7 days |
| Deploy bundle | ~10-20 MB | 7 days |

### Rollback Observations

| Scenario | Metric | Expected |
|----------|--------|----------|
| Health check failure detection | Time to detect | 30-60 seconds |
| Rollback trigger | Time after detection | Immediate (automated) |
| Previous image redeployment | Time to redeploy | 30-60 seconds |
| Total recovery time | End to end | ~2-3 minutes |
| PR comment posted | After rollback | Automatic |

### Deployment Logs Sample

```
============================================
           DEPLOYMENT SUMMARY
============================================
Environment:    production
Version:        v1.2.3
Docker Image:   devops-app:v1.2.3
Health Check:   PASSED (HTTP 200)
Deploy Time:    2026-03-10 10:30:00 UTC
============================================
```

### Rollback Logs Sample

```
============================================
           ROLLBACK SUMMARY
============================================
Reason:           Health check failed
Failed Version:   v1.3.0
Rolled Back To:   v1.2.3
Status:           Completed
Time:             2026-03-10 11:00:00 UTC
============================================
```

---

## Setup Instructions

### Prerequisites
- Node.js 16 or 18
- Docker
- GitHub repository with Actions enabled

### Local Development

```bash
# Clone the repository
git clone <repo-url>
cd devops-project

# Install backend dependencies
npm install

# Run backend
node src/backend/server.js

# Run tests
npm test

# Run linter
npm run lint

# Install frontend dependencies
cd src/frontend
npm install

# Run frontend
npm start
```

### Docker Build

```bash
# Build the image
docker build -t devops-app:latest .

# Run the container
docker run -p 3001:3001 -e NODE_ENV=production devops-app:latest

# Test health endpoint
curl http://localhost:3001/health
```

### API Endpoints

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/` | `{ message: "Hello", version: "1.0.0", env: "production" }` |
| GET | `/health` | `{ status: "ok" }` |
| GET | `/version` | `{ version: "1.0.0" }` |

---

## Advanced GitHub Actions Features Used

| Feature | Workflow | Purpose |
|---------|----------|---------|
| `needs:` | All | Job dependency ordering |
| `concurrency:` | All | Prevent parallel conflicting runs |
| `workflow_call:` | release.yml, rollback.yml | Reusable workflow invocation |
| `actions/cache` | ci.yml (via setup-env) | Cache node_modules for speed |
| `secrets:` | cd.yml, rollback.yml | Secure token management |
| GitHub Environment | cd.yml (production) | Approval gate for production |
| `matrix:` | ci.yml | Multi-version Node.js testing |
| `actions/upload-artifact` | ci.yml | Build artifact persistence |
| `actions/download-artifact` | cd.yml | Artifact reuse (no rebuild) |
| Composite actions | setup-env, deploy | DRY reusable action steps |

---

## License

This project is created for educational purposes as a university lab assignment demonstrating production-grade CI/CD practices with GitHub Actions.
