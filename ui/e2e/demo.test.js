describe("Demo", () => {
  beforeEach(async () => {
    await page.goto("http://karma-demo.herokuapp.com/");
    await page.waitForSelector("div.components-grid-alertgrid-alertgroup");
  });

  it('should be titled "karma-demo"', async () => {
    await expect(page.title()).resolves.toMatch("karma-demo");
  });

  it("should render alert gruops", async () => {
    const alertGroups = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll(
          ".components-grid-alertgrid-alertgroup > .card > .card-header"
        )
      );
      return anchors.map((anchor) => anchor.textContent);
    });
    await expect(alertGroups.length).toBeGreaterThan(10);
    await expect(alertGroups).toEqual(
      expect.arrayContaining([
        "alertname: Inhibition Test Alertcluster: prod1",
        "alertname: Disk Free Lowcluster: prod10",
        "alertname: Time Annotationcluster: prod1",
      ])
    );
  });

  it("opens overview modal on click", async () => {
    await page.waitForSelector("div.cursor-pointer.navbar-brand");

    await expect(page).toClick("div.cursor-pointer.navbar-brand");

    await page.waitForSelector("div.modal-content");
    await page.waitForSelector(".components-labelWithPercent-percent");

    const labels = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll(".components-labelWithPercent-percent")
      );
      return anchors.map((anchor) => anchor.textContent);
    });
    await expect(labels.length).toBeGreaterThan(10);

    await expect(page).toClick(".modal-header > button.close");
  });

  it("opens silence modal on click", async () => {
    await page.waitForSelector("#components-new-silence");

    await expect(page).toClick("#components-new-silence");

    await page.waitForSelector("div.modal-content");
    await page.waitForSelector(".modal-body > form");

    await expect(page).toClick(".modal-header > nav > button.close");
  });

  it("opens settings modal on click", async () => {
    await page.waitForSelector("#components-settings");

    await expect(page).toClick("#components-settings");

    await page.waitForSelector("div.modal-content");
    await page.waitForSelector(".modal-body > form.accordion");

    await expect(page).toClick(".modal-header > nav > button.close");
  });
});
