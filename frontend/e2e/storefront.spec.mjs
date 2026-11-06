import { expect, test } from "@playwright/test";

test("product selection, cart quantity, and unauthenticated checkout", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/#home");
  await expect(page.locator(".card").first()).toBeVisible();
  await page.locator(".card .product-link").first().click();
  await expect(page.locator(".product-page")).toBeVisible();

  await page.getByRole("button", { name: "加入購物車" }).click();
  await expect(page.getByText("已加入購物車")).toBeVisible();
  await page.getByRole("button", { name: "開啟購物車" }).click();

  const cartRow = page.locator(".cart-row");
  await expect(cartRow).toHaveCount(1);
  const quantity = cartRow.locator(".qty-control span");
  await expect(quantity).toHaveText("1");
  await page.getByRole("button", { name: "增加數量" }).click();
  await expect(quantity).toHaveText("2");
  await page.getByRole("button", { name: "減少數量" }).click();
  await expect(quantity).toHaveText("1");

  await page.getByRole("button", { name: "前往結帳" }).click();
  await expect(page).toHaveURL(/#member/);
  await expect(page.getByRole("heading", { name: "登入" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("storefront stays within a 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  await expect(page.locator(".card").first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);

  await page.locator(".card .product-link").first().click();
  await expect(page.locator(".product-page")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);

  await page.getByRole("button", { name: "加入購物車" }).click();
  await page.getByRole("button", { name: "開啟購物車" }).click();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
});
