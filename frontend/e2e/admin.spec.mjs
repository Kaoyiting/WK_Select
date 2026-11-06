import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function localAdminCredentials() {
  const username = process.env.E2E_ADMIN_USERNAME;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (username && password) return { username, password };

  const credentialsPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../.secrets/local-admins.json",
  );
  try {
    const accounts = JSON.parse(readFileSync(credentialsPath, "utf8"));
    return accounts.find((account) => account.username === "owner") ?? null;
  } catch {
    return null;
  }
}

test("admin can sign in and open product and order management", async ({ page }) => {
  const credentials = localAdminCredentials();
  test.skip(!credentials, "Run scripts/setup_local.py or provide E2E admin credentials.");

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/admin");
  await page.getByLabel("管理員帳號").fill(credentials.username);
  await page.getByLabel("密碼").fill(credentials.password);
  await page.getByRole("button", { name: "登入" }).click();
  await expect(page.locator(".shell")).toBeVisible();

  await page.getByRole("button", { name: "商品管理" }).click();
  await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
  await expect(page.locator(".product-table tbody tr").first()).toBeVisible();

  await page.getByRole("button", { name: "訂單管理" }).click();
  await expect(page.getByRole("heading", { name: "訂單管理" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
