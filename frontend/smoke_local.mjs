import { chromium } from 'playwright'
const b = await chromium.launch(); const p = await b.newPage()
await p.goto('http://localhost:5178/login', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
await p.fill('.glass input >> nth=0', 'admin@kssb.local'); await p.fill('.glass input[type=password]', 'password'); await p.click('button:has-text("Submit")')
await p.waitForURL('**/map', { timeout: 45000 }); await p.waitForTimeout(5000)
console.log('markers', (await p.$$('.leaflet-marker-icon')).length)
await p.goto('http://localhost:5178/dashboard'); await p.waitForSelector('.brief', { timeout: 30000 }); console.log('dashboard ok:', (await p.textContent('.brief')).slice(0, 60))
await p.evaluate(() => fetch('http://127.0.0.1:8008/api/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('sm_token'), Accept: 'application/json' } }))
await b.close()
