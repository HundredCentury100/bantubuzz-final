# BantuBuzz Version Control Strategy

## Current Git Status Analysis (May 12, 2026)

### Branch Structure

**Current Branch**: `edits` ✅
**Main Branch**: `main`

**All Branches**:
```
├── main (stable production)
├── edits (current work - SmilePay card fix)
├── feature/brand-wallet-system
├── feature/thunzi-integration
├── feature/trust-safety-system
└── backup-current-feb6-2026
```

### Recent Changes in `edits` Branch

**Key Commits**:
1. `15a0ba2` - Add comprehensive deployment guides for SmilePay card payment Express Checkout fix
2. `3660555` - **Fix card payments to use Express Checkout (redirect-based)** ✅
3. `598b9a7` - Update campaign cart, collaboration features, and subscription enhancements

**Files Modified in `edits` vs `main`**:
```
DEPLOYMENT_READY.md                      | 273 ++++++
DEPLOYMENT_SMILEPAY_CARD_FIX.md          | 229 ++++++
backend/app/routes/smilepay_payments.py  |  71 ++----
backend/app/services/smilepay_service.py |  84 -------
deploy-smilepay-card-fix.ps1             | 139 ++++++
```

### Critical Fix Applied in `edits` Branch

**Problem**: Card payment was incorrectly collecting card details in our form
**Solution**: Changed to Express Checkout (redirect to SmilePay's hosted page)

**Changes Made**:
1. ✅ **Removed** card detail fields from backend (card_number, expiry, cvv)
2. ✅ **Added** card_type parameter ('visa' or 'mastercard')
3. ✅ **Returns** redirect_url to SmilePay's hosted checkout
4. ✅ **Updated** documentation and comments

---

## 📋 Version Control Strategy

### 1. Branch Naming Convention

**Feature Branches**: `feature/<feature-name>`
- Example: `feature/smilepay-integration`
- Example: `feature/brand-wallet-system`

**Bugfix Branches**: `bugfix/<bug-description>`
- Example: `bugfix/card-payment-pci-compliance`
- Example: `bugfix/user-name-extraction`

**Hotfix Branches**: `hotfix/<critical-issue>`
- Example: `hotfix/payment-gateway-down`
- Example: `hotfix/database-column-missing`

**Development Branch**: `develop` (to be created)
- Integration branch for all features before merging to main

**Current Working Branch**: `edits`
- **Recommendation**: Rename to `feature/smilepay-card-fix` or merge to main

### 2. Branch Workflow (Git Flow)

```
main (production)
  ↑
  │ merge when tested & approved
  │
develop (integration)
  ↑
  │ merge when feature complete
  │
feature/* (individual features)
```

**Proposed Workflow**:
1. **main** - Production-ready code only
2. **develop** - Integration branch for testing
3. **feature/** - Individual features
4. **hotfix/** - Emergency fixes (branch from main, merge back to main & develop)

### 3. Commit Message Convention

**Format**: `<type>: <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat: Add SmilePay Express Checkout for card payments
fix: Remove direct card detail collection for PCI compliance
docs: Update SmilePay integration documentation
refactor: Extract user name helper function
chore: Update deployment scripts
```

### 4. Pull Request Process

**Before Creating PR**:
1. Ensure all tests pass
2. Update documentation
3. Review your own changes
4. Check for merge conflicts

**PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] All payment methods tested
- [ ] No regressions found

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

### 5. Merge Strategy

**Merge to Main**:
- ✅ All tests pass
- ✅ Code reviewed
- ✅ Documentation updated
- ✅ No breaking changes (or properly documented)

**Merge Methods**:
- **Squash and Merge**: For feature branches (keeps main history clean)
- **Merge Commit**: For develop to main (preserves feature history)
- **Rebase**: For keeping feature branches up to date with main

### 6. Tag/Release Strategy

**Semantic Versioning**: `v{major}.{minor}.{patch}`

**Examples**:
- `v1.0.0` - Initial production release
- `v1.1.0` - New feature (SmilePay 5 methods)
- `v1.1.1` - Bug fix (card payment PCI compliance)
- `v2.0.0` - Breaking change

**Tag Commands**:
```bash
git tag -a v1.1.1 -m "Fix: Card payments now use Express Checkout"
git push origin v1.1.1
```

---

## 🚀 Recommended Actions for Current State

### Immediate Actions

#### 1. Clean Up Current Branch
```bash
# Option A: Rename edits to feature branch
git branch -m edits feature/smilepay-card-fix

# Option B: Merge edits to main (if ready for production)
git checkout main
git merge edits
git push origin main
git tag -a v1.1.1 -m "Fix: Card payments use Express Checkout"
git push origin v1.1.1
```

#### 2. Create Develop Branch
```bash
git checkout main
git checkout -b develop
git push origin develop
```

#### 3. Update .gitignore
```bash
# Add to .gitignore
*.log
*.pyc
__pycache__/
.env
.venv/
venv/
node_modules/
dist/
.DS_Store
*.swp
*.swo
.idea/
.vscode/
gunicorn_error.log
gunicorn.log
```

#### 4. Add Documentation Files to Git
```bash
# These are currently untracked
git add SMILEPAY_CARD_IMPLEMENTATION_FIX.md
git add SMILEPAY_EXPRESS_CHECKOUT_EXACT_DOCUMENTATION.md
git add SMILEPAY_IMPLEMENTATION_STATUS.md
git add SMILEPAY_QUICK_REFERENCE.md
git add deploy.sh
git commit -m "docs: Add SmilePay implementation documentation"
```

---

## 📊 Branch Protection Rules (GitHub/GitLab)

### For `main` branch:
- ✅ Require pull request reviews (at least 1)
- ✅ Require status checks to pass
- ✅ Restrict who can push (only maintainers)
- ✅ Require branches to be up to date before merging

### For `develop` branch:
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ⚠️ Allow force push (for rebasing)

---

## 🔄 Daily Workflow Example

### Starting New Feature
```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-payment-method

# 3. Make changes, commit often
git add .
git commit -m "feat: Add payment method X"

# 4. Push to remote
git push origin feature/new-payment-method

# 5. Create Pull Request on GitHub/GitLab
```

### Fixing Bug
```bash
# 1. Create bugfix branch from main
git checkout main
git pull origin main
git checkout -b bugfix/payment-status-not-updating

# 2. Fix bug, test
git add .
git commit -m "fix: Update payment status polling logic"

# 3. Push and create PR
git push origin bugfix/payment-status-not-updating
```

### Hotfix (Production Emergency)
```bash
# 1. Branch from main immediately
git checkout main
git checkout -b hotfix/database-connection-error

# 2. Fix critical issue
git add .
git commit -m "hotfix: Fix database connection pool exhaustion"

# 3. Merge to main AND develop
git checkout main
git merge hotfix/database-connection-error
git push origin main

git checkout develop
git merge hotfix/database-connection-error
git push origin develop

# 4. Tag release
git tag -a v1.1.2 -m "Hotfix: Database connection pool"
git push origin v1.1.2
```

---

## 📝 Current Situation Summary

### What's in `edits` Branch
✅ **Card Payment Fix** - Correctly uses Express Checkout now
✅ **Documentation** - Multiple docs added
✅ **Deployment Scripts** - PowerShell scripts for deployment
✅ **Code Changes** - Backend routes & services updated

### What Needs to Happen
1. ⏳ **Frontend Update** - Remove card form, add redirect logic
2. ⏳ **Testing** - Test card payment redirect flow
3. ⏳ **Merge Decision** - Merge `edits` to `main` or rename to feature branch
4. ⏳ **Deploy** - Deploy corrected implementation to production

### Recommendation
Since the `edits` branch contains critical fixes (PCI compliance), I recommend:

1. **Complete frontend changes** (remove card form)
2. **Test thoroughly** on staging/development
3. **Merge to main** with proper commit message
4. **Tag as v1.1.1** (bug fix version)
5. **Deploy to production**
6. **Create develop branch** for future work

---

## 🎯 Version Control Best Practices

### Do's ✅
- ✅ Commit often with meaningful messages
- ✅ Pull before push
- ✅ Review your own changes before committing
- ✅ Keep commits atomic (one logical change per commit)
- ✅ Write descriptive commit messages
- ✅ Use branches for all changes
- ✅ Delete branches after merging
- ✅ Tag releases

### Don'ts ❌
- ❌ Don't commit directly to main
- ❌ Don't commit sensitive data (.env files, API keys)
- ❌ Don't commit large binary files
- ❌ Don't force push to shared branches
- ❌ Don't commit commented-out code
- ❌ Don't commit incomplete features to main
- ❌ Don't use vague commit messages ("fix stuff", "update")

---

## 📦 Deployment Strategy

### Environment-Based Deployment
```
Development → Staging → Production
   (develop)    (release)   (main)
```

**Development**: `develop` branch
- Latest features
- May be unstable
- For internal testing

**Staging**: `release/v1.x` branch
- Feature complete
- For QA testing
- Mirrors production

**Production**: `main` branch
- Stable only
- Tagged releases
- Customer-facing

---

## 🔍 Git Commands Cheat Sheet

### Checking Status
```bash
git status                    # Check current changes
git diff                      # See unstaged changes
git diff --staged             # See staged changes
git log --oneline -10         # Last 10 commits
git branch -a                 # List all branches
```

### Branch Management
```bash
git branch <name>             # Create branch
git checkout <name>           # Switch branch
git checkout -b <name>        # Create and switch
git branch -d <name>          # Delete branch
git push origin --delete <name>  # Delete remote branch
```

### Committing
```bash
git add <file>                # Stage file
git add .                     # Stage all
git commit -m "message"       # Commit
git commit --amend            # Amend last commit
```

### Remote Operations
```bash
git pull origin <branch>      # Pull changes
git push origin <branch>      # Push changes
git fetch origin              # Fetch all branches
git remote -v                 # List remotes
```

### Undoing Changes
```bash
git restore <file>            # Discard changes
git restore --staged <file>   # Unstage file
git reset HEAD~1              # Undo last commit (keep changes)
git reset --hard HEAD~1       # Undo last commit (discard changes)
```

---

**Status**: Strategy Documented
**Next Step**: Update frontend card payment, then merge `edits` to `main`
**Priority**: HIGH (PCI compliance issue)
