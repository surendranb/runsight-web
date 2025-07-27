# Testing Workflow for Task Completion

## Overview
This document outlines the testing approach to be followed at the end of each major task (not subtasks) to ensure code quality and deployment readiness.

## Testing Steps

### 1. Local Build Verification
Before deploying, always run a local build to catch any compilation errors:

```bash
npm run build
```

**Expected outcome:** Build should complete successfully without errors. Warnings about chunk size are acceptable but should be noted.

### 2. TypeScript Type Checking
Verify there are no TypeScript errors:

```bash
npx tsc --noEmit
```

**Expected outcome:** No TypeScript compilation errors.

### 3. Code Quality Check (Optional)
If ESLint is properly configured, run:

```bash
npm run lint
```

**Note:** Currently ESLint configuration needs migration to v9 format. This step can be skipped if configuration issues exist, but TypeScript checking covers most issues.

### 4. Git Workflow
After successful local testing:

1. **Stage all changes:**
   ```bash
   git add .
   ```

2. **Commit with descriptive message:**
   ```bash
   git commit -m "feat: [task description]
   
   - [key change 1]
   - [key change 2]
   - [key change 3]
   
   Completed task [X] and all subtasks"
   ```

3. **Push to trigger deployment:**
   ```bash
   git push origin main
   ```

### 5. Deployment Verification
After pushing to GitHub:

1. **Monitor Netlify deployment** (automatic via GitHub integration)
2. **Test deployed application** at the live URL
3. **Verify key functionality** works as expected
4. **Check for any runtime errors** in browser console

### 6. Automated Playwright Testing (Recommended)
For comprehensive post-deployment testing, use Playwright to verify functionality:

#### 6.1 Basic Functionality Test
```javascript
// Navigate to deployed site
await page.goto('https://your-site.netlify.app/');

// Check for console errors
const consoleMessages = await page.evaluate(() => {
  return window.console.messages || [];
});

// Take snapshot to verify page loads
await page.screenshot({ path: 'deployment-test.png' });
```

#### 6.2 Key Feature Testing
Test critical user flows:

```javascript
// Test navigation
await page.click('button:has-text("Insights")');
await page.waitForLoadState('networkidle');

// Test time period selector
await page.selectOption('select[aria-label="Select time period"]', 'last7');
await page.waitForLoadState('networkidle');

// Verify data updates
const dataCount = await page.textContent('[data-testid="data-count"]');
```

#### 6.3 Error Detection
Monitor for runtime errors:

```javascript
// Listen for console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('Console error:', msg.text());
  }
});

// Check for JavaScript errors
page.on('pageerror', error => {
  console.log('Page error:', error.message);
});
```

#### 6.4 Performance Verification
Check basic performance metrics:

```javascript
// Wait for page to be fully loaded
await page.waitForLoadState('networkidle');

// Check if critical elements are visible
await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
```

#### 6.5 Playwright Testing Checklist
- [ ] Page loads without JavaScript errors
- [ ] Navigation between sections works
- [ ] Time period selector functions correctly
- [ ] Charts and data visualizations render
- [ ] No broken UI components
- [ ] Responsive design works on different screen sizes
- [ ] Key user interactions function as expected

### 7. Feedback Loop
If issues are found during testing:

1. **Document the issue** clearly
2. **Create a fix** locally
3. **Re-run testing steps 1-3**
4. **Deploy fix** using steps 4-5
5. **Re-verify** functionality with Playwright if needed

## Testing Checklist Template

Use this checklist at the end of each major task:

- [ ] Local build completes successfully (`npm run build`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Changes committed with descriptive message
- [ ] Code pushed to GitHub
- [ ] Netlify deployment successful
- [ ] Live application tested manually
- [ ] No console errors in browser
- [ ] Key functionality verified working
- [ ] **Playwright testing completed** (for major features)
- [ ] Ready for next task or user feedback

## When to Apply This Workflow

- ✅ **Apply after:** Major tasks (e.g., Task 1, Task 2, etc.)
- ❌ **Skip for:** Individual subtasks (e.g., Task 1.1, 1.2, 1.3)
- ✅ **Apply after:** Significant feature completions
- ✅ **Apply before:** Requesting user feedback or testing

## Benefits

1. **Early error detection** before deployment
2. **Consistent code quality** across iterations
3. **Reliable deployment process** with verification
4. **Faster feedback cycles** with working deployments
5. **Reduced debugging time** by catching issues locally
6. **Automated testing** with Playwright for comprehensive coverage
7. **Real-world user experience validation** through browser automation

## Notes

- This workflow ensures each major milestone is properly tested and deployed
- Local testing catches most issues before they reach production
- The commit message format helps track progress and changes
- Manual testing of the deployed app is crucial for UX verification
- Playwright testing provides automated verification of user interactions
- Use Playwright especially for major UI changes or new feature implementations
- Playwright can catch runtime errors that might not appear in local testing

## Playwright Testing Best Practices

### When to Use Playwright Testing
- ✅ **Major feature releases** (like Task 2 - UI standardization)
- ✅ **Critical bug fixes** that affect user interactions
- ✅ **Navigation or routing changes**
- ✅ **Form submissions and user input handling**
- ✅ **Chart and data visualization updates**
- ❌ **Minor styling changes** (unless they affect functionality)
- ❌ **Backend-only changes** (unless they affect frontend behavior)

### Common Playwright Test Patterns for RunSight

#### Navigation Testing
```javascript
// Test main navigation
await page.click('button:has-text("Dashboard")');
await page.click('button:has-text("Insights")');
await page.click('button:has-text("Goals")');
```

#### Time Period Selector Testing
```javascript
// Test time period changes
await page.selectOption('[aria-label="Select time period"]', 'last7');
await page.waitForLoadState('networkidle');
// Verify data updates
```

#### Chart Interaction Testing
```javascript
// Test chart tooltips and interactions
await page.hover('[data-testid="pace-chart"] circle');
await expect(page.locator('.recharts-tooltip')).toBeVisible();
```

#### Error Monitoring
```javascript
// Monitor for console errors during testing
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
// Assert no errors at end of test
expect(errors).toHaveLength(0);
```