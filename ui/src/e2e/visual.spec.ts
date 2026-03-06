import { test, expect } from "@playwright/test";

const stories: { name: string; waitFor: string }[] = [
  { name: "Grid", waitFor: "#root > div" },
  { name: "GridColorTitleBar", waitFor: "#root > div" },
  { name: "NavBar", waitFor: "#root > div" },
  { name: "NavBarPaused", waitFor: "#root > div" },
  { name: "FatalError", waitFor: "#root > div" },
  { name: "UpgradeNeeded", waitFor: "#root > div" },
  { name: "ReloadNeeded", waitFor: "#root > div" },
  { name: "EmptyGrid", waitFor: "#root > div" },
  { name: "NoUpstream", waitFor: "#root > div" },
  { name: "InternalError", waitFor: "#root > div" },
  { name: "MainModal", waitFor: ".modal-content" },
  { name: "OverviewModal", waitFor: ".modal-content" },
  { name: "ManagedSilence", waitFor: ".components-managed-silence" },
  { name: "SilenceModalEditorReadOnly", waitFor: ".modal-content" },
  { name: "SilenceModalEditor", waitFor: ".modal-content" },
  { name: "SilenceModalBrowser", waitFor: ".components-managed-silence" },
  { name: "SilenceModalEmptyBrowser", waitFor: ".modal-content" },
  { name: "Toast", waitFor: "#root > div" },
];

for (const story of stories) {
  test(story.name, async ({ page }) => {
    await page.clock.install({ time: new Date("2018-08-14T17:00:00Z") });
    await page.goto(`/src/e2e/stories.html#${story.name}`);
    await page.locator(story.waitFor).first().waitFor({ timeout: 10000 });
    await expect(page).toHaveScreenshot(`${story.name}.png`, {
      fullPage: true,
    });
  });
}

test("SilenceModalEditorEndsTab", async ({ page }) => {
  await page.clock.install({ time: new Date("2018-08-14T17:00:00Z") });
  await page.goto(`/src/e2e/stories.html#SilenceModalEditor`);
  await page.locator(".modal-content").first().waitFor({ timeout: 10000 });
  // click "Ends" tab in both light and dark theme sections
  const endsTabs = page.locator("text=Ends");
  for (const tab of await endsTabs.all()) {
    await tab.click();
  }
  // click day 20 on each calendar to create a visible multi-day range
  const dayButtons = page.locator(
    ".rdp-day:not(.rdp-disabled) .rdp-day_button",
  );
  for (const btn of await dayButtons.all()) {
    const text = await btn.textContent();
    if (text?.trim() === "20") {
      await btn.click();
    }
  }
  await expect(page).toHaveScreenshot("SilenceModalEditorEndsTab.png", {
    fullPage: true,
  });
});
