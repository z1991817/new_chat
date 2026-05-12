import { expect, type Page, test } from '@playwright/test'

class HomePage {
  constructor(private readonly page: Page) {}

  promptInput = this.page.getByTestId('prompt-input')
  desktopGenerateButton = this.page.getByTestId('desktop-generate-button')
  desktopContactNav = this.page.getByTestId('desktop-contact-nav')
  mobileMenuButton = this.page.getByTestId('mobile-menu-button')
  mobileContactNav = this.page.getByTestId('mobile-contact-nav')
  contactDialog = this.page.getByTestId('contact-dialog')
  authDialog = this.page.getByTestId('auth-dialog')
  taskCards = this.page.getByTestId('task-card')

  async goto() {
    await this.page.goto('/')
    await closeWelcomeBonusIfVisible(this.page)
  }

  async openDesktopContact() {
    await this.desktopContactNav.click()
  }

  async openMobileContact() {
    await this.mobileMenuButton.click()
    await this.mobileContactNav.click()
  }

  async seedAuthenticatedSession() {
    await this.page.addInitScript(() => {
      window.localStorage.setItem(
        'gpt-image-playground',
        JSON.stringify({
          state: {
            token: 'e2e-token',
            user: {
              id: 1,
              username: 'e2e-user',
              nickname: 'E2E 用户',
              points: 999,
            },
            settings: {
              baseUrl: 'http://127.0.0.1:3000/',
              apiKey: '',
              model: 'gpt-image-2',
              timeout: 300,
              apiMode: 'images',
              codexCli: false,
              apiProxy: false,
            },
            params: {
              aspectRatio: '1:1',
              size: 'auto',
              quality: 'auto',
              output_format: 'png',
              output_compression: null,
              moderation: 'auto',
              n: 1,
              negativePromptEnabled: false,
            },
            dismissedCodexCliPrompts: [],
          },
          version: 0,
        }),
      )
    })
  }

  async mockSuccessfulTextToImage() {
    await this.page.route('**/app/me', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: { id: 1, username: 'e2e-user', nickname: 'E2E 用户', points: 999 },
        }),
      })
    })

    await this.page.route('**/app/models', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: {
            list: [
              {
                id: 1,
                name: 'GPT Image 2',
                model_key: 'gpt-image-2',
                aspect_ratios: ['1:1', '16:9', '9:16'],
                default_sku_code: '1k',
                skus: [
                  {
                    id: 11,
                    sku_code: '1k',
                    sku_name: '1K',
                    image_size: '1K',
                    unit_consume_points: 1,
                    is_default: 1,
                  },
                ],
              },
            ],
          },
        }),
      })
    })

    await this.page.route('**/app/my-creations**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: { list: [], pagination: { page: 1, pageSize: 15, totalPages: 1 } },
        }),
      })
    })

    await this.page.route('**/app/text-to-image', async (route) => {
      const request = route.request()
      expect(request.method()).toBe('POST')
      const body = request.postDataJSON() as { prompt?: string; model?: string; aspectRatio?: string }
      expect(body.prompt).toContain('安静的产品海报')
      expect(body.model).toBe('gpt-image-2')
      expect(body.aspectRatio).toBe('1:1')

      await route.fulfill({
        contentType: 'application/json',
        status: 202,
        body: JSON.stringify({
          code: 202,
          data: {
            upload: {
              taskId: 'e2e-task',
              queryPath: '/app/tasks/e2e-task',
            },
          },
        }),
      })
    })

    await this.page.route('**/app/tasks/e2e-task', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 750))
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          data: {
            status: 'success',
            cosUrl: 'https://example.test/generated/e2e.png',
            previewUrl: 'https://example.test/generated/e2e.png',
            size: '1024x1024',
            quality: 'medium',
            outputFormat: 'png',
            quantity: 1,
          },
        }),
      })
    })

    await this.page.route('https://example.test/**/e2e.png', async (route) => {
      await route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
          'base64',
        ),
      })
    })
  }
}

async function closeWelcomeBonusIfVisible(page: Page) {
  const welcomeDialog = page.getByRole('dialog', { name: '新站开业' })
  await welcomeDialog.waitFor({ state: 'visible', timeout: 1_000 }).catch(() => undefined)
  if (await welcomeDialog.isVisible().catch(() => false)) {
    await welcomeDialog.getByRole('button', { name: '稍后' }).click()
    await expect(welcomeDialog).toBeHidden()
  }
}

test('home workbench supports the unauthenticated generation path', async ({ page }) => {
  const home = new HomePage(page)
  await home.goto()

  await expect(home.promptInput).toBeVisible()
  await home.promptInput.fill('一张安静的产品海报，白色背景，自然光')
  await home.desktopGenerateButton.click()

  await expect(home.authDialog).toBeVisible()
  await expect(home.authDialog.getByLabel('账号')).toBeVisible()
  await expect(home.authDialog.getByLabel('密码')).toBeVisible()
})

test('authenticated user can submit a text-to-image task and see the result', async ({ page }) => {
  const home = new HomePage(page)
  await home.seedAuthenticatedSession()
  await home.mockSuccessfulTextToImage()
  await home.goto()

  const prompt = '一张安静的产品海报，白色背景，自然光，高级电商摄影'
  await home.promptInput.fill(prompt)
  await home.desktopGenerateButton.click()

  const createdTask = home.taskCards.filter({ hasText: prompt })
  await expect(createdTask).toBeVisible()
  await expect(createdTask).toContainText('生成中')
  await expect(createdTask).toContainText('1024x1024')
  await expect(createdTask).toContainText(/png/i)
  await expect(createdTask.getByTestId('task-output-image')).toBeVisible()
})

test('desktop contact journey shows support information and copy feedback', async ({ page }) => {
  const home = new HomePage(page)
  await home.goto()
  await home.openDesktopContact()

  await expect(home.contactDialog).toBeVisible()
  await expect(home.contactDialog.getByText('客服 QQ')).toBeVisible()
  await expect(home.contactDialog.getByText('377584613')).toBeVisible()
  await home.contactDialog.getByTestId('copy-support-qq').click()
  await expect(home.contactDialog.getByTestId('copy-support-qq')).toContainText(/已复制|复制失败/)
})

test('mobile menu exposes contact entry', async ({ page }) => {
  const home = new HomePage(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await home.goto()
  await home.openMobileContact()

  await expect(home.contactDialog).toBeVisible()
  await expect(home.contactDialog.getByText('377584613')).toBeVisible()
})
