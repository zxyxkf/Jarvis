import { test, expect } from '@playwright/test'

test.describe('Jarvis Home Page', () => {
  test('renders the app shell', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.home-page')).toBeVisible()
  })

  test('displays Jarvis branding', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.welcome-title')).toHaveText('Jarvis')
  })

  test('shows chat input', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.chat-input')).toBeVisible()
  })

  test('can type and send a message', async ({ page }) => {
    await page.goto('/')
    const input = page.locator('.chat-input')
    await input.fill('你好')
    await page.locator('.send-btn').click()
    await expect(page.locator('.message-row.user')).toBeVisible()
  })

  test('sidebar is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.chat-sidebar')).toBeVisible()
  })
})
