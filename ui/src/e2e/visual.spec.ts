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
