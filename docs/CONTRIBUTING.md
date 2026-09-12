# 🤝 Contributing to QATRA (قطرہ)

### *Engineering Guidelines, Code Standards, and Contribution Protocol*

Thank you for contributing to **QATRA**! Every contribution helps save lives across Pakistan by strengthening our emergency blood donation infrastructure. Please review these standards before submitting code.

---

## 📑 Table of Contents

- [1. Code of Conduct & Mission](#1-code-of-conduct--mission)
- [2. Branching Strategy (Git Flow)](#2-branching-strategy-git-flow)
- [3. Local Development Workflow](#3-local-development-workflow)
- [4. Coding Standards & Linter Rules](#4-coding-standards--linter-rules)
  - [Python & FastAPI Backend](#python--fastapi-backend)
  - [Frontend HTML & Apple HIG CSS](#frontend-html--apple-hig-css)
  - [Security & Privacy Safeguards](#security--privacy-safeguards)
- [5. Testing & Quality Assurance](#5-testing--quality-assurance)
- [6. Pull Request Protocol & Approval Sequence](#6-pull-request-protocol--approval-sequence)
- [7. Task Attribution & Team Contacts](#7-task-attribution--team-contacts)

---

## 1. Code of Conduct & Mission

QATRA is a non-profit, humanitarian emergency response platform. We treat all donor and patient data with utmost ethical responsibility:
- **Respect & Empathy**: Interactions with team members, medical personnel, and volunteers must remain professional and supportive.
- **Zero Commercial Compromise**: Code that attempts to monetize or commercially broker blood requests is strictly prohibited.
- **Data Integrity**: Security, encryption, and privacy rules are never bypassed for developer convenience.

---

## 2. Branching Strategy (Git Flow)

We operate on a two-tier core branch model with dedicated feature branches:

```
main (Production — Locked & Protected)
  ▲
  │ (Approved PR with Passing CI)
develop (Integration Branch)
  ▲
  │ (Feature Work)
  ├── feature/live-map (Hareem Israr)
  ├── feature/auth-verification (Saghir Ahmed)
  ├── feature/feed (Mahrukh Baig)
  ├── feature/awareness (Yumna Abbasi)
  └── feature/security-nfr (Nimra Iftikhar)
```

- **`main`**: Production branch deploying automatically to [https://qatra-web-app.vercel.app](https://qatra-web-app.vercel.app). Direct pushes are **disabled** by branch protection rules (`required_approving_review_count=1`).
- **`develop`**: Primary integration branch where member features are merged and verified.
- **Feature Branches**: Named `feature/<module-name>` or `fix/<issue-name>`.

---

## 3. Local Development Workflow

1. **Clone & Branch**:
   ```bash
   git clone https://github.com/abdulhayykhan/QATRA-Web-App.git
   cd QATRA-Web-App
   git checkout develop
   git checkout -b feature/your-feature-name
   ```

2. **Activate Environment**:
   ```bash
   # On macOS/Linux:
   source .venv/bin/activate
   # On Windows:
   .\.venv\Scripts\Activate.ps1
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Verify Clean Baseline**:
   ```bash
   pytest backend/tests -q
   ruff check backend/app
   ```

---

## 4. Coding Standards & Linter Rules

### Python & FastAPI Backend
- **Type Annotations**: All function signatures, schemas, and return values must include explicit Python 3.12+ type hints.
- **Pydantic v2**: Use `BaseModel` with typed fields and descriptive docstrings. Do not use legacy class-based `Config`; use `ConfigDict`.
- **Ruff Compliance**: All code must pass `ruff check` cleanly without disabling security checks. Run `ruff check --fix` for automated cleanup.
- **Asynchronous Handlers**: Use `async def` for I/O-bound endpoints (database, file reading, HTTP requests). Use standard `def` for pure CPU or synchronous dependencies.

### Frontend HTML & Apple HIG CSS
- **Vanilla Architecture**: Do NOT introduce heavyweight client frameworks (React, Angular, Vue) into the web app shell. Use modular Vanilla JavaScript (`<script type="module">`).
- **Apple HIG Styling**: All new UI components must import `apple.css` and use defined design tokens (`tokens.css`).
- **Pure White Canvas**: Dark mode is completely disabled. Never introduce dark mode media queries (`@media (prefers-color-scheme: dark)`).
- **Continuous Squircles**: Use border-radius values of `14px`, `20px`, or `28px` for buttons, cards, and bottom sheets.
- **Public Mirror Synchronization**: When creating or editing files in `frontend/pages/` or `frontend/static/`, ensure the identical file is mirrored into `public/` so Vercel can serve it directly.

### Security & Privacy Safeguards
- **Never Log PII**: Do not print or log raw CNICs, phone numbers, or passwords.
- **Always Validate Checksums**: Validate 13-digit Pakistani CNICs using the utility in `backend/app/core/security.py`.
- **Mask Phone Numbers**: Use the proxy dialer helper (`/api/map/proxy-call/*`) for all seeker-donor communications.

---

## 5. Testing & Quality Assurance

All pull requests must maintain **100% test passing rate**:

```bash
# Run the entire test suite
pytest backend/tests -v

# Run a specific test module
pytest backend/tests/test_auth_phase2.py
pytest backend/tests/test_map_phase2.py
pytest backend/tests/test_feed_phase2.py
pytest backend/tests/test_awareness_phase2.py
pytest backend/tests/test_nfr_security_phase2.py
```

### Writing New Tests
1. Add new tests under `backend/tests/`.
2. Use the shared database session fixture from `tests/conftest.py`.
3. If testing rate-limited endpoints, ensure the rate limiter cache is cleared using `limiter.clear()`.

---

## 6. Pull Request Protocol & Approval Sequence

1. **Commit Messages**: Follow Conventional Commits format:
   - `feat(module): description`
   - `fix(module): description`
   - `docs(module): description`
   - `test(module): description`

2. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open Pull Request**:
   - Target base branch: `develop`.
   - Title: Clear, descriptive summary of changes.
   - Body: List components modified, verification steps executed, and test pass counts.

4. **Review & Approval**:
   - Every PR requires review and approval by the Team Lead (**Abdul Hayy Khan**).
   - Once approved and GitHub Actions checks are green, merge into `develop`.

---

## 7. Task Attribution & Team Contacts

For questions on specific modules, consult the respective module owner:

| Module | Primary Contact | Role |
| :--- | :--- | :--- |
| **System Architecture, PWA & Design** | **Abdul Hayy Khan** | Team Lead / Systems Architect |
| **Live Map & Geospatial Matching** | **Hareem Israr** | Proximity Matching Lead |
| **Auth, CNIC & 24/7 Verification Desk** | **Saghir Ahmed** | Verification Desk Lead |
| **Urgent Feed & WhatsApp Sharing** | **Mahrukh Baig** | Appeals Feed Lead |
| **Awareness & 4-Step Eligibility** | **Yumna Abbasi** | Community Awareness Lead |
| **Security, Rate Limiting & NFRs** | **Nimra Iftikhar** | Security & Cryptography Lead |

---

<div align="center">
  <b>QATRA Engineering Contribution Protocol</b><br>
  <i>Built with dedication for the Alkhidmat Summer Social Internship Program (SSIP).</i>
</div>
