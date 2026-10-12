import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url =
  process.env.APP_URL || "https://grape9113.github.io/rejseflex-mini/";
test("journeys, documents, browser restart and offline use", async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), "rejseflex-test-"));
  let context = await chromium.launchPersistentContext(profile, {
    headless: true,
    acceptDownloads: true,
  });
  try {
    context.setDefaultTimeout(15_000);
    let page = context.pages()[0];
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "Mine rejser" }),
    ).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    expect(
      await page.evaluate(() => !!navigator.serviceWorker.controller),
    ).toBe(true);
    const manifest = await page.evaluate(
      async () =>
        await (
          await fetch(
            document.querySelector<HTMLLinkElement>("link[rel=manifest]")!.href,
          )
        ).json(),
    );
    expect(manifest.start_url).toBe("/rejseflex-mini/");
    expect(manifest.scope).toBe("/rejseflex-mini/");
    expect(manifest.display).toBe("standalone");
    for (const icon of manifest.icons) {
      expect((await page.request.get(new URL(icon.src, url).href)).ok()).toBe(
        true,
      );
    }
    const cdp = await context.newCDPSession(page);
    console.log(
      "Installability criteria:",
      JSON.stringify(await cdp.send("Page.getInstallabilityErrors")),
    );
    await page.getByRole("button", { name: "＋ Opret rejse" }).click();
    await expect(page.locator(".meeting")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "15 min" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByLabel("Rejsens navn").fill("Besøg mor i København");
    await page.getByLabel("Rejsedato").fill("2026-10-20");
    await page
      .getByLabel("Afhentningsadresse", { exact: true })
      .fill("Vestergade 10");
    await page.getByLabel("Destinationsstation").fill("Aarhus H");
    await page
      .getByLabel("Afhentningstidspunkt", { exact: true })
      .nth(0)
      .fill("13:00");
    await page.getByLabel("Afgangsstation", { exact: true }).fill("Aarhus H");
    await page.getByLabel("Afgangstidspunkt", { exact: true }).fill("14:00");
    await expect(page.locator(".meeting")).toContainText("13:45");
    await page.getByRole("button", { name: "30 min" }).click();
    await expect(page.locator(".meeting")).toContainText("13:30");
    await page.getByLabel("Afgangstidspunkt", { exact: true }).fill("00:10");
    await expect(page.locator(".meeting")).toContainText("23:40");
    await expect(page.locator(".meeting")).toContainText("Dagen før");
    await page.getByLabel("Afgangstidspunkt", { exact: true }).fill("14:00");
    await page
      .getByLabel("Ankomststation", { exact: true })
      .fill("København H");
    await page.getByLabel("Ankomsttidspunkt", { exact: true }).fill("17:00");
    await page
      .getByLabel("Afhentningsstation", { exact: true })
      .fill("København H");
    await page
      .getByLabel("Destinationsadresse", { exact: true })
      .fill("Nørrebrogade 20");
    await page
      .getByLabel("Afhentningstidspunkt", { exact: true })
      .nth(1)
      .fill("17:20");
    await page
      .locator("#itinerary")
      .setInputFiles("tests/fixtures/rejseplan.docx");
    await page.locator("#ticket").setInputFiles("tests/fixtures/billet.pdf");
    await expect(page.locator(".filename")).toHaveCount(2);
    await page.getByRole("button", { name: "Gem rejse" }).click();
    await expect(
      page.getByRole("heading", { name: "Besøg mor i København" }),
    ).toBeVisible();
    await page.reload();
    await page.locator(".journey-card").click();
    await expect(page.locator(".meeting")).toContainText("13:30");
    async function checkDocuments() {
      console.log(
        "Checking document downloads",
        await page.locator(".filename").allTextContents(),
      );
      for (const name of ["rejseplan.docx", "billet.pdf"]) {
        const downloadPromise = page.waitForEvent("download");
        await page.locator(`a[download="${name}"]`).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe(name);
        expect(await readFile((await download.path())!)).toEqual(
          await readFile("tests/fixtures/" + name),
        );
      }
      const openLink = page
        .locator(".document")
        .nth(1)
        .getByRole("link", { name: "Åbn", exact: true });
      await expect(openLink).toHaveAttribute("target", "_blank");
      expect(await openLink.getAttribute("href")).toMatch(/^blob:/);
    }
    await checkDocuments();
    await page.getByRole("button", { name: "Rediger rejse" }).click();
    await expect(page.getByRole("button", { name: "30 min" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page
      .getByLabel("Rejsens navn")
      .fill("Besøg mor i København – redigeret");
    await page.getByRole("button", { name: "Gem rejse" }).click();
    await expect(
      page.getByRole("button", { name: "Rediger rejse" }),
    ).toBeVisible();
    await checkDocuments();
    console.log("Restarting browser");
    await context.close();
    context = await chromium.launchPersistentContext(profile, {
      headless: true,
      acceptDownloads: true,
    });
    page = context.pages()[0];
    await page.goto(url);
    await page.locator(".journey-card").click();
    await expect(
      page.getByRole("heading", { name: "Besøg mor i København – redigeret" }),
    ).toBeVisible();
    await checkDocuments();
    console.log("Testing offline");
    await context.setOffline(true);
    await page.reload();
    await page.locator(".journey-card").click();
    await expect(page.locator(".meeting")).toContainText("13:30");
    await checkDocuments();
    await page.getByRole("button", { name: "Rediger rejse" }).click();
    await page
      .locator("#itinerary")
      .setInputFiles("tests/fixtures/rejseplan.doc");
    await page
      .locator(".document")
      .nth(1)
      .getByRole("button", { name: "Fjern" })
      .click();
    await page.getByRole("button", { name: "Gem rejse" }).click();
    await expect(
      page.getByRole("button", { name: "Rediger rejse" }),
    ).toBeVisible();
    await expect(page.locator(".filename")).toHaveText("rejseplan.doc");
    await page.reload();
    await page.locator(".journey-card").click();
    await expect(page.locator(".filename")).toHaveText("rejseplan.doc");
    await expect(page.locator("a[download]")).toHaveAttribute("href", /^blob:/);
    const doc = await page.evaluate(
      async () =>
        await (
          await fetch(
            document.querySelector<HTMLAnchorElement>("a[download]")!.href,
          )
        ).text(),
    );
    expect(doc).toBe(await readFile("tests/fixtures/rejseplan.doc", "utf8"));
    await page.getByRole("button", { name: "Slet rejse", exact: true }).click();
    await expect(page.locator(".journey-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Annuller", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Besøg mor i København – redigeret" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Slet rejse", exact: true }).click();
    await page.getByRole("button", { name: "Ja, slet rejse" }).click();
    await expect(page.getByText("0 rejser", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "＋ Opret rejse" }).click();
    await page.getByLabel("Rejsens navn").fill("Ufærdig rejse");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Gem rejse" }).click();
    await expect(
      page.getByRole("heading", { name: "Ufærdig rejse" }),
    ).toBeVisible();
    await expect(page.locator(".meeting")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".journey-card")).toContainText("Ufærdig rejse");
    expect(errors).toEqual([]);
    console.log(
      "Verified: CRUD, incomplete save, interval/midnight, actual document bytes, replacement/removal, browser restart, offline CRUD/documents, mobile layout, manifest and icons.",
    );
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
