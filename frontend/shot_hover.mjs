import { chromium } from 'playwright'
const OUT = process.argv[2]; const B = 'http://localhost:5178'
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage()
const errs = []; p.on('pageerror', e => errs.push(e.message))
async function login(id, dest) { await p.goto(`${B}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  await p.fill('.glass input >> nth=0', id); await p.fill('.glass input[type=password]', 'password'); await p.click('button:has-text("Submit")'); await p.waitForURL(dest); await p.waitForTimeout(2500) }
await login('admin@kssb.local', '**/map')
await p.goto(`${B}/monitoring`); await p.waitForTimeout(3500); await p.hover('.rail'); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/hover-console.png` })
await p.click('.rail-foot button >> nth=0'); await p.waitForTimeout(2500); await p.mouse.move(800, 500); await p.waitForTimeout(500)
console.log('theme after toggle:', await p.evaluate(() => document.documentElement.dataset.theme)); await p.screenshot({ path: `${OUT}/toggle-dark.png` })
await p.goto(`${B}/ess/hr`); await p.waitForTimeout(4000); await p.hover('.rail'); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/hover-ess.png` })
console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close()
