/**
 * dump-score.ts — write a named built-in score seed to a file for external use.
 * Usage: vite-node scripts/dump-score.ts <seed-name> <output-path>
 */
import defaultsRaw from '../src/defaults.ts?raw'
import fs from 'node:fs'

const [name, outPath] = process.argv.slice(2)
if (!name || !outPath) {
  console.error('Usage: vite-node scripts/dump-score.ts <seed-name> <output-path>')
  process.exit(1)
}

// Extract the named string constant from defaults.ts source.
// Constants are backtick template literals assigned to UPPER_SNAKE_CASE names.
// The OXYGENE4OLD constant is the score named 'oxygene4old'.
const constName = name.toUpperCase().replace(/-/g, '_')
const re = new RegExp(`const ${constName}\\s*=\\s*\`([\\s\\S]*?)\`\\s*(?:const|export|$)`)
const m = defaultsRaw.match(re)
if (!m) {
  console.error(`No constant '${constName}' found in defaults.ts`)
  process.exit(1)
}

fs.writeFileSync(outPath, m[1]!)
console.log(`Written: ${outPath} (${m[1]!.length} bytes)`)
