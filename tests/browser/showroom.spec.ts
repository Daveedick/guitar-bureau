import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio
    const audios: HTMLAudioElement[] = []
    Object.defineProperty(window, '__testAudios', { value: audios })
    const starts: { src: string; time: number }[] = []
    Object.defineProperty(window, '__testStarts', { value: starts })
    window.Audio = function (...args: ConstructorParameters<typeof Audio>) {
      const audio = new OriginalAudio(...args)
      audios.push(audio)
      audio.addEventListener('playing', () =>
        starts.push({ src: audio.src, time: audio.currentTime }),
      )
      return audio
    } as typeof Audio
  })
})
const activeAudio = () => {
  const audios = (window as unknown as { __testAudios: HTMLAudioElement[] }).__testAudios
  return audios
    .filter((a) => !a.paused)
    .map((a) => ({ src: a.src, time: a.currentTime, duration: a.duration }))
}

for (const slug of ['black-strat', 'blue-strat']) {
  test(`${slug}: all 10 recordings, pickup mapping, play/pause, seek and cleanup`, async ({
    page,
  }) => {
    const audioRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('.mp3')) audioRequests.push(request.url())
    })
    await page.goto(`/guitars/${slug}`)
    await expect(page.getByRole('radio', { name: 'Clean', exact: true })).toBeChecked()
    await expect(page.getByRole('radio', { name: '1 — Bridge', exact: true })).toBeChecked()
    expect(audioRequests).toHaveLength(0)
    await page.getByRole('button', { name: 'Play — воспроизвести', exact: true }).click()
    const labels = ['Bridge', 'Bridge + Middle', 'Middle', 'Middle + Neck', 'Neck']
    const pickups = [['bridge'], ['middle', 'bridge'], ['middle'], ['neck', 'middle'], ['neck']]
    for (const tone of ['Clean', 'Crunch']) {
      await page.getByRole('radio', { name: tone, exact: true }).check()
      for (let i = 0; i < 5; i++) {
        await page.getByRole('radio', { name: `${i + 1} — ${labels[i]}`, exact: true }).check()
        await expect(page.getByRole('status')).toHaveText('Воспроизведение')
        await expect
          .poll(async () => (await page.evaluate(activeAudio))[0]?.time ?? 0)
          .toBeGreaterThan(0)
        const active = await page.evaluate(activeAudio)
        expect(active).toHaveLength(1)
        expect(active[0]!.src).toContain(`/audio/${slug}/${tone.toLowerCase()}/${i + 1}.mp3`)
        expect(active[0]!.duration).toBeGreaterThan(1)
        expect(
          await page
            .locator('[data-active="true"]')
            .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-pickup'))),
        ).toEqual(pickups[i])
      }
    }
    await page.getByRole('button', { name: 'Пауза', exact: true }).click()
    expect(await page.evaluate(activeAudio)).toHaveLength(0)
    await page.getByRole('radio', { name: 'Clean', exact: true }).check()
    await page.getByRole('radio', { name: '1 — Bridge', exact: true }).check()
    await expect(
      page.getByRole('button', { name: 'Play — воспроизвести', exact: true }),
    ).toBeVisible()
    expect(await page.evaluate(activeAudio)).toHaveLength(0)
    await page.getByRole('button', { name: 'Play — воспроизвести', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Воспроизведение')
    await page.getByRole('slider').focus()
    await page.keyboard.press('End')
    await expect
      .poll(async () => Number(await page.getByRole('slider').getAttribute('max')))
      .toBeGreaterThan(1)
    await page.getByRole('slider').press('Home')
    await page.getByRole('radio', { name: '1 — Bridge', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByRole('radio', { name: '2 — Bridge + Middle', exact: true }),
    ).toBeChecked()
    await page.locator('.next-instrument').click()
    await expect(page).toHaveURL(`/guitars/${slug === 'black-strat' ? 'blue-strat' : 'gibson-sg'}`)
    await expect.poll(async () => (await page.evaluate(activeAudio)).length).toBe(0)
    if (slug === 'black-strat')
      await expect(page.getByRole('radio', { name: 'Clean', exact: true })).toBeChecked()
    else await expect(page.locator('.single-tone')).toContainText('Demo')
    await page.reload()
    await expect(page.getByRole('radio', { name: '1 — Bridge', exact: true })).toBeChecked()
    expect(await page.evaluate(activeAudio)).toHaveLength(0)
  })
}

test('loading races only leave the final track active and navigation stops a pending load', async ({
  page,
}) => {
  await page.route('**/*.mp3', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.continue().catch(() => {})
  })
  await page.goto('/guitars/black-strat')
  await page.getByRole('button', { name: 'Play — воспроизвести' }).click()
  await expect(page.getByRole('status')).toHaveText('Загрузка записи…')
  for (let i = 1; i <= 5; i++)
    await page
      .locator('input[name="position"]')
      .nth(i - 1)
      .check()
  await page.getByRole('radio', { name: 'Crunch', exact: true }).check()
  await expect(page.getByRole('status')).toHaveText('Воспроизведение')
  const active = await page.evaluate(activeAudio)
  expect(active).toHaveLength(1)
  expect(active[0]!.src).toContain('/crunch/5.mp3')
  await page.getByRole('radio', { name: 'Clean', exact: true }).check()
  await page.locator('.back-link').click()
  await expect(page).toHaveURL('/')
  await expect.poll(async () => (await page.evaluate(activeAudio)).length).toBe(0)
})

test('network error has retry and recovery', async ({ page }) => {
  await page.route('**/*.mp3', (route) => route.abort('failed'))
  await page.goto('/guitars/blue-strat')
  await page.getByRole('button', { name: 'Play — воспроизвести' }).click()
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeVisible()
  expect(await page.evaluate(activeAudio)).toHaveLength(0)
  await page.unroute('**/*.mp3')
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Воспроизведение')
})

test('static routes, responsive layouts and accessibility', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const width of [1440, 390, 320, 768]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
    for (const [name, route] of [
      ['catalog', '/'],
      ['black', '/guitars/black-strat'],
      ['blue', '/guitars/blue-strat'],
      ['gibson', '/guitars/gibson-sg'],
    ]) {
      const response = await page.goto(route!)
      expect(response?.status()).toBe(200)
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('h1')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: `.impeccable/review/${name}-${width === 1440 ? 'desktop' : 'mobile'}.png`,
          fullPage: true,
          animations: 'disabled',
        })
        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
        expect(scan.violations).toEqual([])
      }
      await page.reload()
      await expect(page.locator('h1')).toBeVisible()
    }
  }
  expect(errors).toEqual([])
})

for (const slug of ['black-strat', 'blue-strat']) {
  test(`${slug}: pickup timeline stays at 8.5 seconds while playing, paused and loading`, async ({
    page,
  }) => {
    await page.goto(`/guitars/${slug}`)
    await page.getByRole('button', { name: 'Play — воспроизвести' }).click()
    await expect(page.getByRole('status')).toHaveText('Воспроизведение')
    for (const tone of ['Clean', 'Crunch']) {
      await page.getByRole('radio', { name: tone, exact: true }).check()
      await expect(page.getByRole('status')).toHaveText('Воспроизведение')
      if (tone === 'Crunch') expect((await page.evaluate(activeAudio))[0]!.time).toBeLessThan(2)
      await page.getByRole('button', { name: 'Пауза', exact: true }).click()
      await page.getByRole('slider').evaluate((element: HTMLInputElement) => {
        element.value = '8.5'
        element.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await page.evaluate(() => {
        ;(window as unknown as { __testStarts: unknown[] }).__testStarts.length = 0
      })
      // Position selection remains silent and lazy on pause, with its requested offset displayed.
      await page.getByRole('radio', { name: '3 — Middle', exact: true }).check()
      expect(await page.evaluate(activeAudio)).toHaveLength(0)
      await expect(page.locator('.time')).toContainText('0:08')
      await page.getByRole('button', { name: 'Play — воспроизвести' }).click()
      await expect(page.getByRole('status')).toHaveText('Воспроизведение')
      expect((await page.evaluate(activeAudio))[0]!.time).toBeGreaterThanOrEqual(8.5)
      // Delayed responses and rapid pickup changes must not send the timeline back to zero.
      await page.route('**/*.mp3', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 180))
        await route.continue().catch(() => {})
      })
      const minimumTime = (await page.evaluate(activeAudio))[0]!.time
      for (const index of [0, 1, 3, 4])
        await page.locator('input[name="position"]').nth(index).check()
      await expect(page.getByRole('status')).toHaveText('Воспроизведение')
      const active = await page.evaluate(activeAudio)
      expect(active).toHaveLength(1)
      expect(active[0]!.src).toContain(`/${tone.toLowerCase()}/5.mp3`)
      expect(active[0]!.time).toBeGreaterThanOrEqual(minimumTime)
      expect(active[0]!.time).toBeLessThan(minimumTime + 3)
      const starts = await page.evaluate(
        () => (window as unknown as { __testStarts: { src: string; time: number }[] }).__testStarts,
      )
      const replacementStarts = starts.filter(
        (start) => start.src.includes(`/${tone.toLowerCase()}/`) && !start.src.endsWith('/1.mp3'),
      )
      expect(replacementStarts.length).toBeGreaterThanOrEqual(2)
      expect(replacementStarts.every((start) => start.time >= 8.5)).toBe(true)
      await page.unroute('**/*.mp3')
    }
  })
}

test('gibson-sg: three recorded humbucker positions with one tone', async ({ page }) => {
  const audioRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('.mp3')) audioRequests.push(request.url())
  })
  await page.goto('/guitars/gibson-sg')
  await expect(page.getByRole('heading', { name: 'Gibson SG.' })).toBeVisible()
  await expect(page.locator('.single-tone')).toContainText('Demo')
  await expect(page.getByRole('radio', { name: '1 — Bridge', exact: true })).toBeChecked()
  await expect(page.locator('input[name="tone"]')).toHaveCount(0)
  await expect(page.locator('input[name="position"]')).toHaveCount(3)
  expect(audioRequests).toHaveLength(0)
  await page.getByRole('button', { name: 'Play — воспроизвести' }).click()
  await expect(page.getByRole('status')).toHaveText('Воспроизведение')
  for (const [index, label, pickups] of [
    [1, 'Bridge', ['bridge']],
    [2, 'Bridge + Neck', ['neck', 'bridge']],
    [3, 'Neck', ['neck']],
  ] as const) {
    await page.getByRole('radio', { name: `${index} — ${label}`, exact: true }).check()
    await expect(page.getByRole('status')).toHaveText('Воспроизведение')
    const active = await page.evaluate(activeAudio)
    expect(active).toHaveLength(1)
    expect(active[0]!.src).toContain(`/audio/gibson-sg/${index}.mp3`)
    expect(active[0]!.duration).toBeGreaterThan(1)
    expect(
      await page
        .locator('[data-active="true"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-pickup'))),
    ).toEqual(pickups)
    await expect(page.locator('.pickup-coil')).toHaveCount(4)
  }
  await page.getByRole('button', { name: 'Пауза' }).click()
  await page.getByRole('slider').evaluate((element: HTMLInputElement) => {
    element.value = '8.5'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.getByRole('radio', { name: '1 — Bridge', exact: true }).check()
  await expect(page.locator('.time')).toContainText('0:08')
  expect(await page.evaluate(activeAudio)).toHaveLength(0)
  await page.getByRole('button', { name: 'Play — воспроизвести' }).click()
  await expect(page.getByRole('status')).toHaveText('Воспроизведение')
  expect((await page.evaluate(activeAudio))[0]!.time).toBeGreaterThanOrEqual(8.5)
  await page.locator('.back-link').click()
  await expect(page).toHaveURL('/')
  await expect.poll(async () => (await page.evaluate(activeAudio)).length).toBe(0)
})
