const { app, BrowserWindow, ipcMain } = require("electron");
const puppeteer = require("puppeteer-core");
const path = require("path");

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "public", "index.html"));
});

ipcMain.on("start-automation", async (event, url) => {
  if (!url || !url.startsWith("http")) {
    event.reply("automation-error", "A valid URL is required");
    return;
  }

  let browser;
  try {
    console.log(`Connecting to existing Chrome browser...`);
    browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" });

    const pages = await browser.pages();
    const page =
      pages.find((p) => p.url().includes("devgsportal.neom.com")) || pages[0];

    let maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Opening URL (attempt ${i + 1}): ${url}`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
        console.log("Page loaded successfully");
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(
          `Retrying navigation (${i + 1}/${maxRetries}) due to:`,
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const userData = await page.evaluate(() => ({
      name: document.querySelector('input[name="name"]')?.value || "",
      nationality:
        document.querySelector("#nationality-select")?.value || "Saudi Arabia",
      countryCode:
        document.querySelector("#country-code-select")?.value || "966",
      idNumber: document.querySelector('input[name="idNumber"]')?.value || "",
      mobileNo: document.querySelector('input[name="mobileNo"]')?.value || "",
    }));

    console.log("Extracted Data:", userData);

    // === Open Web App 2 and Paste Data === //
    const page2 = await browser.newPage();
    await page2.goto("https://stg-gsportal.neom.com/pages/profile/edit", {
      waitUntil: "networkidle0",
    });

    console.log("Opened Web App 2 to paste data...");

    if (userData.name) {
      await page2.waitForSelector('input[name="name"]', { timeout: 10000 });
      await page2.type('input[name="name"]', userData.name, { delay: 100 });
    }

    if (userData.nationality) {
      await page2.click("#nationality-select");
      await page2.type("#nationality-select", userData.nationality, {
        delay: 100,
      });
      await page2.waitForSelector('li[role="option"]', { timeout: 10000 });
      await page2.evaluate((value) => {
        const options = Array.from(
          document.querySelectorAll('li[role="option"]')
        );
        const optionToSelect = options.find((option) =>
          option.textContent.includes(value)
        );
        if (optionToSelect) optionToSelect.click();
      }, userData.nationality);
    }

    if (userData.countryCode) {
      await page2.click("#country-code-select");
      await page2.type("#country-code-select", userData.countryCode, {
        delay: 100,
      });
      await page2.waitForSelector('li[role="option"]', { timeout: 10000 });
      await page2.evaluate((value) => {
        const options = Array.from(
          document.querySelectorAll('li[role="option"]')
        );
        const optionToSelect = options.find((option) =>
          option.textContent.includes(value)
        );
        if (optionToSelect) optionToSelect.click();
      }, userData.countryCode);
    }

    if (userData.mobileNo) {
      await page2.waitForSelector('input[name="mobileNo"]', { timeout: 10000 });
      await page2.type('input[name="mobileNo"]', userData.mobileNo, {
        delay: 100,
      });
    }

    if (userData.idNumber) {
      const idFieldExists = await page2.$('input[name="idNumber"]');
      if (idFieldExists) {
        await page2.waitForSelector('input[name="idNumber"]', {
          timeout: 10000,
        });
        await page2.type('input[name="idNumber"]', userData.idNumber, {
          delay: 100,
        });
      }
    }

    event.reply(
      "automation-complete",
      "Data successfully transferred to Web App 2"
    );
  } catch (error) {
    event.reply("automation-error", error.message);
  } finally {
    if (browser) await browser.disconnect();
  }
});
