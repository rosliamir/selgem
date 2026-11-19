// Review screenshots after the SGDS redesign. Usage: node shot_sgds.mjs <out dir> [only-prefix]
import { chromium } from 'playwright'
const OUT = process.argv[2], ONLY = process.argv[3] || '', THEME = process.argv[4] || 'light'; const B = 'http://localhost:5178'; const errs = []
const b = await chromium.launch()
async function login(ctx, id, dest) {
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(`${id}: ${e.message}`)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text())) errs.push(`${id} console: ${m.text().slice(0, 200)}`) })
  await p.goto(`${B}/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  await p.screenshot({ path: `${OUT}/00-login-${ctx._w}.png` })
  await p.fill('.glass input >> nth=0', id); await p.fill('.glass input[type=password]', 'password'); await p.click('button:has-text("Submit")')
  await p.waitForURL(dest, { timeout: 45000 }); await p.waitForTimeout(2000); return p
}
async function run(tag, vp, id, dest, pages) {
  if (ONLY && !tag.startsWith(ONLY)) return
  const ctx = await b.newContext(vp); await ctx.addInitScript(t => { try { localStorage.setItem('sm_theme', t) } catch {} }, THEME); ctx._w = vp.viewport.width; const p = await login(ctx, id, dest)
  for (const [name, path, wait, full] of pages) {
    try { await p.goto(B + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait || 3500)
      await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: !!full && !process.env.NOFULL })
      const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1] + 1) console.log('OVERFLOW', tag, name, w)
      console.log('ok', tag, name) } catch (e) { console.log('FAIL', tag, name, e.message.split('\n')[0]) }
  }
  await ctx.close()
}
const D = { viewport: { width: 1440, height: 900 } }, M = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
const consolePages = [['map', '/map', 5000], ['dash', '/dashboard', 4500, 1], ['mon', '/monitoring', 4500, 1], ['att', '/attendance', 5000, 1], ['sitemgmt', '/site-management', 3000], ['users', '/user-management', 3000], ['account', '/account', 2500], ['ess', '/ess', 3500, 1]]
const essPages = [['home', '/ess', 3500, 1], ['att', '/ess/attendance', 4000, 1], ['leave', '/ess/leave', 3000], ['req', '/ess/requests', 3000], ['memos', '/ess/memos', 3000], ['notif', '/ess/notifications', 2500], ['policy', '/ess/policies', 3000], ['team', '/ess/team', 3000], ['reports', '/ess/reports', 3000, 1], ['profile', '/ess/profile', 2500]]
const hrPages = [['approvals', '/ess/approvals', 3000], ['hr', '/ess/hr', 4500], ['heat', '/ess/hr?tab=heat', 4500, 1], ['manpower', '/ess/hr?tab=manpower', 4500], ['geofence', '/ess/hr?tab=geofence', 4500]]
await run('d-adm', D, 'admin@kssb.local', '**/map', consolePages)
await run('d-ess', D, 'KS0294', '**/ess', essPages)
await run('d-hr', D, 'KS0197', '**/ess', hrPages)
await run('m-adm', M, 'admin@kssb.local', '**/map', consolePages.slice(0, 4))
await run('m-ess', M, 'KS0294', '**/ess', essPages.slice(0, 4))
console.log(errs.length ? [...new Set(errs)].join('\n') : 'no page errors'); await b.close()
