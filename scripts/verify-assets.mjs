import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const manifest = JSON.parse(readFileSync('docs/asset-manifest.json', 'utf8'))
for (const file of manifest) {
  const hash = createHash('sha256').update(readFileSync(file.path)).digest('hex')
  if (hash !== file.sha256) throw new Error(`Asset changed: ${file.path}`)
}
console.log(`${manifest.length} assets verified against their recorded hashes.`)
