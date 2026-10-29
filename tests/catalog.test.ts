import { expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { guitars } from '../app/data/guitars'
it('maps all 23 source recordings and pickup positions exactly to supplied configs', () => {
  let count = 0
  for (const guitar of guitars)
    for (const tone of guitar.tones) {
      const source = JSON.parse(readFileSync(`tests/fixtures/${guitar.slug}/${tone.id}.json`, 'utf8'))
      for (const [index, position] of guitar.positions.entries()) {
        expect(position.label).toBe(source.positions[index].label)
        expect(position.activePickups).toEqual(
          source.positions[index].active.map((p: { pickup: string }) => p.pickup),
        )
        expect(existsSync(`public${tone.tracks[position.id]}`)).toBe(true)
        count++
      }
    }
  expect(count).toBe(23)
})
