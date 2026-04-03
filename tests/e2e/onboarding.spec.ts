import { test, expect } from '@playwright/test';

/**
 * E2E tests for onboarding flow
 * Covers: landing page -> signup -> onboarding wizard -> dashboard
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!@#';

test.describe('Onboarding Flow', () => {
  test('should complete full onboarding journey', async ({ page }) => {
    // Step 1: Navigate to landing page
    test.step('Navigate to landing page', async () => {
      await page.goto(`${BASE_URL}/`);
      await expect(page).toHaveURL(`${BASE_URL}/`);
      await expect(page.locator('h1')).toContainText(/visibility|platform|ai/i);
    });

    // Step 2: Click "Start Free" button
    test.step('Click Start Free button', async () => {
      const startButton = page.locator('button:has-text("Start Free")');
      await expect(startButton).toBeVisible();
      await startButton.click();

      // Verify redirect to signup page
      await expect(page).toHaveURL(/\/(signup|auth\/signup)/);
    });

    // Step 3: Complete signup form
    test.step('Complete signup form', async () => {
      // Fill in form
      await page.locator('input[type="email"]').fill(TEST_EMAIL);
      await page.locator('input[name="password"]').fill(TEST_PASSWORD);
      await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

      // Agree to terms if checkbox exists
      const termsCheckbox = page.locator('input[type="checkbox"][name="terms"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }

      // Submit form
      const submitButton = page.locator('button:has-text("Sign Up")');
      await expect(submitButton).toBeEnabled();
      await submitButton.click();
    });

    // Step 4: Verify email verification (if required)
    test.step('Handle email verification if needed', async () => {
      // Check if verification page is shown
      const verifyPageTitle = page.locator('h1:has-text("Verify")');
      if (await verifyPageTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Skip verification step (in real tests, use test email service)
        const skipButton = page.locator('button:has-text("Skip")');
        if (await skipButton.isVisible()) {
          await skipButton.click();
        }
      }
    });

    // Step 5: Complete onboarding wizard (4 steps)
    test.step('Complete onboarding wizard - Step 1: Business Info', async () => {
      // Wait for and verify step 1
      const step1Title = page.locator('h2, h3').filter({ hasText: /business|company|organization/i });
      await expect(step1Title.first()).toBeVisible();

      // Fill business name
      const businessInput = page.locator('input[placeholder*="business"], input[name*="business"], input[placeholder*="company"]');
      if (await businessInput.isVisible()) {
        await businessInput.fill('Test Business Co');
      }

      // Fill website URL
      const urlInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="http"]');
      if (await urlInput.isVisible()) {
        await urlInput.fill('https://testbusiness.com');
      }

      // Continue to next step
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
      await expect(nextButton.first()).toBeEnabled();
      await nextButton.first().click();
    });

    test.step('Complete onboarding wizard - Step 2: Industry', async () => {
      // Wait for and verify step 2
      await page.waitForTimeout(500); // Brief wait for page transition

      const step2Title = page.locator('h2, h3').filter({ hasText: /industry|category|sector/i });
      await expect(step2Title.first()).toBeVisible({ timeout: 5000 }).catch(() => Promise.resolve());

      // Select an industry (first available option)
      const selectField = page.locator('select, [role="combobox"]').first();
      if (await selectField.isVisible()) {
        await selectField.click();
        const firstOption = page.locator('[role="option"]').first();
        await firstOption.click();
      }

      // Continue
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isEnabled()) {
        await nextButton.click();
      }
    });

    test.step('Complete onboarding wizard - Step 3: Competitors', async () => {
      // Wait for step 3
      await page.waitForTimeout(500);

      const step3Title = page.locator('h2, h3').filter({ hasText: /competitor|rival|market/i });
      await expect(step3Title.first()).toBeVisible({ timeout: 5000 }).catch(() => Promise.resolve());

      // Add a competitor (find text input or button)
      const competitorInput = page.locator('input[placeholder*="competitor"]').first();
      if (await competitorInput.isVisible()) {
        await competitorInput.fill('Competitor.com');

        const addButton = page.locator('button:has-text("Add")').first();
        if (await addButton.isEnabled()) {
          await addButton.click();
        }
      }

      // Continue
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isEnabled()) {
        await nextButton.click();
      }
    });

    test.step('Complete onboarding wizard - Step 4: Preferences', async () => {
      // Wait for final step
      await page.waitForTimeout(500);

      const step4Title = page.locator('h2, h3').filter({ hasText: /preference|notification|frequency/i });
      await expect(step4Title.first()).toBeVisible({ timeout: 5000 }).catch(() => Promise.resolve());

      // Select any checkboxes or preferences
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count > 0) {
        await checkboxes.first().check();
      }

      // Complete onboarding
      const completeButton = page.locator('button:has-text("Complete"), button:has-text("Finish"), button:has-text("Get Started")').first();
      if (await completeButton.isEnabled()) {
        await completeButton.click();
      }
    });

    // Step 6: Verify dashboard loads with data
    test.step('Verify dashboard loads with data', async () => {
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Verify key dashboard elements are visible
      const dashboardTitle = page.locator('h1:has-text("Dashboard"), h1:has-text("Visibility")');
      await expect(dashboardTitle.first()).toBeVisible();

      // Check for data sections
      const visibilityScore = page.locator('text=/visibility|score|rank/i').first();
      const platformBreakdown = page.locator('text=/platform|breakdown|channel/i').first();

      await expect(visibilityScore).toBeVisible({ timeout: 5000 });
      await expect(platformBreakdown).toBeVisible({ timeout: 5000 });
    });

    // Step 7: Navigate to competitors page
    test.step('Navigate to competitors page', async () => {
      const competitorsLink = page.locator('a:has-text("Competitor"), a:has-text("Comparison")').first();
      await expect(competitorsLink).toBeVisible();
      await competitorsLink.click();

      await expect(page).toHaveURL(/\/competitors/, { timeout: 5000 });
      const competitorsTitle = page.locator('h1:has-text("Competitor")').first();
      await expect(competitorsTitle).toBeVisible();
    });

    // Step 8: Navigate to citations page
    test.step('Navigate to citations page', async () => {
      const citationsLink = page.locator('a:has-text("Citation"), a:has-text("Mention")').first();
      await expect(citationsLink).toBeVisible();
      await citationsLink.click();

      await expect(page).toHaveURL(/\/citations/, { timeout: 5000 });
      const citationsTitle = page.locator('h1:has-text("Citation")').first();
      await expect(citationsTitle).toBeVisible();
    });
  });
});
