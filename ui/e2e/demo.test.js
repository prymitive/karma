const puppeteer = require("puppeteer");

let browser;
let page;

describe("Demo", () => {
  beforeAll(async () => {
    jest.setTimeout(30000);

    browser = await puppeteer.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
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

    await page.click("div.cursor-pointer.navbar-brand");

    await page.waitForSelector(
      "div.modal-open.components-animation-modal-enter-done"
    );
    await page.waitForSelector("div.modal-content");
    await page.waitForSelector(".components-labelWithPercent-percent");

    const labels = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll(".components-labelWithPercent-percent")
      );
      return anchors.map((anchor) => anchor.textContent);
    });
    await expect(labels.length).toBeGreaterThan(10);

    await page.click(".modal-header > button.btn-close");
  });

  it("opens silence modal on click", async () => {
    await page.waitForSelector("#components-new-silence");

    await page.click("#components-new-silence");

    await page.waitForSelector(
      "div.modal-open.components-animation-modal-enter-done"
    );
    await page.waitForSelector("div.modal-content");
    await page.waitForSelector(".modal-body > form");

    await page.click(".modal-header > nav > button.btn-close");
  });

  it("opens settings modal on click", async () => {
    await page.waitForSelector("#components-settings");

    await page.click("#components-settings");

    await page.waitForSelector(
      "div.modal-open.components-animation-modal-enter-done"
    );
    await page.waitForSelector("div.modal-content");
    await page.waitForSelector(".modal-body > div.accordion");

    await page.click(".modal-header > nav > button.btn-close");
  });
});
