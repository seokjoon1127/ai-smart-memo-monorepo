import { test, expect } from "@playwright/test";

test.describe("STEP 2 일정 충돌 표시 동작", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("ai-smart-memo-guest-mode", "true");
    });
    await page.goto("/memo");
  });

  test("추천 시간 chip을 누르면 ⚠ 충돌 배지가 사라지고 시간이 갱신된다", async ({
    page,
  }) => {
    const editorTextarea = page.getByPlaceholder(
      "예: 내일 3시 김팀장 회의, 금요일까지 보고서 제출",
    );
    await expect(editorTextarea).toHaveValue(/김팀장/);

    await page.getByRole("button", { name: "AI 파싱 시작" }).click();

    await expect(page.getByText("STEP 2 / 3")).toBeVisible({ timeout: 10_000 });

    const conflictCard = page
      .locator(".bg-white.rounded-2xl")
      .filter({ hasText: "김팀장 회의" });

    await expect(conflictCard.getByText("⚠ 충돌")).toBeVisible();
    await expect(
      conflictCard.getByText("팀 스탠드업 15:00~15:30"),
    ).toBeVisible();

    const startInput = conflictCard.locator('input[type="time"]').first();
    await expect(startInput).toHaveValue("15:00");

    await conflictCard.getByRole("button", { name: "15:30으로 변경" }).click();

    await expect(conflictCard.getByText("충돌 없음")).toBeVisible();
    await expect(conflictCard.getByText("⚠ 충돌")).toHaveCount(0);
    await expect(
      conflictCard.getByText("팀 스탠드업 15:00~15:30"),
    ).toHaveCount(0);

    await expect(startInput).toHaveValue("15:30");
  });

  test("시작 시간을 직접 바꿔도 충돌 표시가 사라진다", async ({ page }) => {
    await page.getByRole("button", { name: "AI 파싱 시작" }).click();
    await expect(page.getByText("STEP 2 / 3")).toBeVisible({ timeout: 10_000 });

    const conflictCard = page
      .locator(".bg-white.rounded-2xl")
      .filter({ hasText: "김팀장 회의" });

    await expect(conflictCard.getByText("⚠ 충돌")).toBeVisible();

    const startInput = conflictCard.locator('input[type="time"]').first();
    await startInput.fill("17:00");
    await startInput.blur();

    await expect(conflictCard.getByText("충돌 없음")).toBeVisible();
    await expect(conflictCard.getByText("⚠ 충돌")).toHaveCount(0);
  });
});
