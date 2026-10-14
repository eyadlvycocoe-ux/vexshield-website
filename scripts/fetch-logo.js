import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REMOTE_URL = 'https://images-ext-1.discordapp.net/external/yS-SiMITKMsEHgmK3E_U4osMSNO4aEHBzKzfO9s3Kr0/https/cdn.discordapp.com/icons/617345579189534740/de422f2ccd05215d30b74ff9df49234b.webp?format=webp'
const OUT = path.join(__dirname, '..', 'public', 'logo.png')

async function run() {
  if (fs.existsSync(OUT) && fs.statSync(OUT).size > 1024) {
    console.log('✅ Keeping existing public/logo.png')
    return
  }

  try {
    const resp = await fetch(REMOTE_URL)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const buf = Buffer.from(await resp.arrayBuffer())
    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, buf)
    console.log('✅ Saved logo to public/logo.jpg')
  } catch (e) {
    console.warn('Failed to fetch logo, writing placeholder:', e.message || e)
    const placeholder = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
      'base64'
    )
    fs.writeFileSync(OUT, placeholder)
  }
}

run()
