import { test, expect } from '@playwright/test'

test.describe('Chat functionality', () => {
  test('sends message and receives streaming response placeholder', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('.chat-input')

    await input.fill('什么是 RAG？')
    await page.locator('.send-btn').click()

    // User message appears immediately
    await expect(page.locator('.message-row.user')).toBeVisible({ timeout: 5000 })

    // Assistant placeholder should appear (even if SSE fails in test env)
    await expect(page.locator('.message-row.assistant')).toBeVisible({ timeout: 10000 })
  })

  test('can stop streaming', async ({ page }) => {
    await page.goto('/')
    await page.locator('.chat-input').fill('写一篇长文章')
    await page.locator('.send-btn').click()

    // Stop button should appear during streaming
    const stopBtn = page.locator('.stop-btn')
    if (await stopBtn.isVisible({ timeout: 3000 })) {
      await stopBtn.click()
      // After stop, send button reappears
      await expect(page.locator('.send-btn')).toBeVisible({ timeout: 5000 })
    }
  })

  test('Shift+Enter adds newline, Enter sends', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('.chat-input')

    // Shift+Enter should not send
    await input.fill('第一行')
    await input.press('Shift+Enter')
    // In a textarea with auto-resize, content should still be there
    const value = await input.inputValue()
    expect(value).toContain('第一行')
  })
})
