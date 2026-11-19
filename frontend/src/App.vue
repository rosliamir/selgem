<template>
  <div v-if="isLogin"><router-view/></div>
  <div v-else class="shell">
    <!-- ICON RAIL — collapsed to icons, opens on hover / focus. Each entry owns a colour. -->
    <aside class="rail" :class="{ pinned }" @mouseenter="hover = true" @mouseleave="hover = false">
      <button class="rail-logo" :title="essOnly ? 'Layan Diri Pekerja' : 'Smart Monitoring System'" @click="go(essOnly ? '/ess' : '/map')">
        <img src="/img/kssb.png" alt="KSSB" /><span class="rl-txt"><b>Smart Monitoring</b><small>KSSB · KSMM</small></span>
      </button>
      <nav class="rail-nav" :class="{ dense: inEss }">
        <template v-if="!inEss">
          <router-link v-for="m in MODULES" :key="m.key" :to="m.to" class="ri" :class="{ on: mod.key === m.key }" :style="{ '--mc': m.color }" :title="m.label">
            <span class="ri-ic"><i :class="m.icon"></i></span><span class="ri-l">{{ m.label }}</span>
          </router-link>
        </template>
        <template v-else>
          <router-link v-if="!essOnly" to="/dashboard" class="ri back" style="--mc:#475569" title="Operations console">
            <span class="ri-ic"><i class="fa-solid fa-arrow-left"></i></span><span class="ri-l">Operations console</span>
          </router-link>
          <template v-for="g in groups" :key="g.t">
            <div v-if="g.items.length" class="rail-grp"><span>{{ g.t }}</span></div>
            <router-link v-for="n in g.items" :key="n.to" :to="n.to" class="ri" :class="{ on: essOn(n, route.path) }" :style="{ '--mc': n.color }" :title="n.l">
              <span class="ri-ic"><i :class="n.i"></i><em v-if="n.badge" class="ri-dot"></em></span><span class="ri-l">{{ n.l }}</span>
              <span v-if="n.badge" class="ri-b">{{ n.badge }}</span>
            </router-link>
          </template>
        </template>
      </nav>
      <div class="rail-foot">
        <template v-if="!inEss && !essOnly">
          <router-link v-for="m in SETTINGS" :key="m.key" :to="m.to" class="ri sm" :class="{ on: mod.key === m.key }" :style="{ '--mc': m.color }" :title="m.title">
            <span class="ri-ic"><i :class="m.icon"></i></span><span class="ri-l">{{ m.title }}</span>
          </router-link>
        </template>
        <button class="ri sm" style="--mc:#475569" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
          <span class="ri-ic"><i class="fa-solid" :class="theme === 'dark' ? 'fa-sun' : 'fa-moon'"></i></span><span class="ri-l">{{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}</span>
        </button>
        <button class="ri sm" style="--mc:#475569" :title="pinned ? 'Unpin menu' : 'Keep menu open'" @click="togglePin">
          <span class="ri-ic"><i class="fa-solid" :class="pinned ? 'fa-angles-left' : 'fa-thumbtack'"></i></span><span class="ri-l">{{ pinned ? 'Collapse menu' : 'Keep menu open' }}</span>
        </button>
      </div>
    </aside>

    <div class="body" :class="{ pinned }">
      <!-- HEADER — page title, the page's own controls, then global actions. Tinted with the module colour. -->
      <header ref="hdr" class="hdr">
        <img src="/img/kssb.png" class="hdr-logo d-lg-none" alt="KSSB" @click="go(essOnly ? '/ess' : '/map')" />
        <div class="hdr-title min0">
          <span class="hdr-ic"><i :class="page.icon"></i></span>
          <div class="min0">
            <h1>{{ page.title }}</h1>
            <p class="d-none d-md-block">{{ page.sub }}</p>
          </div>
        </div>
        <div id="hdr-tools" class="hdr-tools"></div>
        <div class="hdr-actions">
          <div id="hdr-slot" class="d-flex align-items-center gap-2"></div>
          <button class="hbtn d-lg-none" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme"><i class="fa-solid" :class="theme === 'dark' ? 'fa-sun' : 'fa-moon'"></i></button>
          <button class="hbtn kb-btn" @click="essOnly ? go('/ess/policies') : openKb()" title="Knowledge base"><i class="fa-solid fa-book-open"></i></button>
          <div class="dropdown">
            <button class="havatar profile-btn" data-bs-toggle="dropdown" :title="userName">{{ userInitials }}</button>
            <ul class="dropdown-menu dropdown-menu-end" style="min-width:280px">
              <li class="user-box mx-2 my-1">
                <div class="fw-bold">{{ userName }}</div>
                <div class="small text-muted2">{{ userEmail }}</div>
                <span class="pill pill-gray mt-2 d-inline-block">{{ userRole.toUpperCase() }}</span>
              </li>
              <li><hr class="dropdown-divider"></li>
              <template v-if="!essOnly">
                <li><router-link class="dropdown-item" to="/account"><i class="fa-solid fa-gear me-2"></i>Account Settings</router-link></li>
                <li><router-link class="dropdown-item" to="/site-management"><i class="fa-solid fa-location-dot me-2"></i>Site Management</router-link></li>
                <li><router-link class="dropdown-item" to="/user-management"><i class="fa-solid fa-users me-2"></i>User Management</router-link></li>
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item" @click="openKb()"><i class="fa-solid fa-book-open me-2"></i>Knowledge Base</button></li>
                <li><button class="dropdown-item" @click="openSync"><i class="fa-solid fa-rotate me-2"></i>Sync Data</button></li>
              </template>
              <li v-else><router-link class="dropdown-item" to="/ess/profile"><i class="fa-solid fa-id-badge me-2"></i>Profil &amp; Akaun</router-link></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-danger" @click="logout"><i class="fa-solid fa-right-from-bracket me-2"></i>Sign out</button></li>
            </ul>
          </div>
        </div>
      </header>

      <main class="app-main" :class="{ 'in-ess': inEss }"><router-view :key="themeKey"/></main>
    </div>

    <!-- MOBILE BOTTOM NAV for the console (self-service has its own tab bar) -->
    <nav v-if="!inEss" class="mnav d-lg-none">
      <router-link v-for="m in MODULES" :key="m.key" :to="m.to" class="mnav-link" :class="{ active: mod.key === m.key }" :style="{ '--mc': m.color }">
        <i :class="m.icon"></i><span>{{ m.label }}</span>
      </router-link>
    </nav>

    <KnowledgeBaseModal/>
    <AskAssistant/>

    <!-- Sync Data modal -->
    <div v-if="syncOpen" class="sync-backdrop" @click.self="!syncing && (syncOpen=false)">
      <div class="sync-card">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center gap-2"><span class="sync-ic"><i class="fa-solid fa-rotate"></i></span><h5 class="fw-bold mb-0">Sync Data</h5></div>
          <button class="btn-x" @click="!syncing && (syncOpen=false)"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p class="text-muted2">Pull the latest data from the live system into this database, so your records stay in sync.</p>
        <div v-if="syncResult" class="sync-ok"><i class="fa-solid fa-circle-check me-2"></i>
          Synced <b>{{ syncResult.attendances?.toLocaleString() }}</b> attendance records,
          <b>{{ syncResult.daily_reports?.toLocaleString() }}</b> daily reports and
          <b>{{ syncResult.sales_records?.toLocaleString() }}</b> sales records.
          <div class="small mt-1">Latest attendance {{ syncResult.latest_date }} · sales range {{ syncResult.sales_date_range }}.</div></div>
        <div v-if="syncError" class="sync-err"><i class="fa-solid fa-triangle-exclamation me-2"></i>{{ syncError }}</div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-light px-3" :disabled="syncing" @click="syncOpen=false">Close</button>
          <button class="btn btn-primary px-3" :disabled="syncing" @click="runSync">
            <span v-if="syncing"><i class="fa-solid fa-spinner fa-spin me-2"></i>Pulling latest…</span>
            <span v-else><i class="fa-solid fa-cloud-arrow-down me-2"></i>Pull Latest Data</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiPost, currentUser } from './services/api'
import { openKb } from './services/kbStore'
import { essState } from './services/ess'
import { MODULES, SETTINGS, essGroups, essOn, moduleFor } from './services/nav'
import { theme, themeKey, toggleTheme, setAccent, chartDefaults } from './services/theme'
import KnowledgeBaseModal from './components/KnowledgeBaseModal.vue'
import AskAssistant from './components/AskAssistant.vue'
const route = useRoute(); const router = useRouter()
// read the user on every navigation so the shell is right after login / logout without a reload
const user = computed(()=> { route.path; return currentUser() })
const essOnly = computed(()=> !!user.value?.ess_only)
const userEmail = computed(()=> user.value?.email || '')
const userName = computed(()=> user.value?.name || user.value?.username || userEmail.value || 'User')
const userInitials = computed(()=> userName.value.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'U')
const userRole = computed(()=> (user.value?.roles?.[0] || (essOnly.value ? 'staff' : 'super_admin')).replace(/_/g,' '))

const isLogin = computed(()=> route.path==='/login')
const inEss = computed(()=> route.path.startsWith('/ess'))
const mod = computed(()=> moduleFor(route.path))
const groups = computed(()=> essGroups(essState))
// the page shown in the header: a self-service item, or the console module
const page = computed(()=> {
  if (inEss.value) {
    const n = groups.value.flatMap(g => g.items).filter(n => essOn(n, route.path)).sort((a, b) => b.to.length - a.to.length)[0]
    if (n) return { title: n.l, sub: 'Layan Diri Pekerja', icon: n.i, color: n.color }
  }
  if (route.path.startsWith('/site/')) return { ...mod.value, title: 'Site Details', sub: 'Permit, reports, media and documents' }
  return mod.value
})
// module colour → --pri. Set before the next page mounts so its charts pick up the right colour.
const accentFor = path => {
  if (path.startsWith('/ess')) { const n = essGroups(essState).flatMap(g => g.items).filter(n => essOn(n, path)).sort((a, b) => b.to.length - a.to.length)[0]; if (n) return n.color }
  return moduleFor(path).color
}
setAccent(accentFor(location.pathname))
const offNav = router.beforeEach(to => { setAccent(accentFor(to.path)) })
watch(() => page.value.color, c => { if (c) setAccent(c) })   // self-service roles load after the first paint
watch(theme, () => chartDefaults(), { immediate: true })

// rail: hover to open; can be pinned open
const hover = ref(false), pinned = ref(false)
try { pinned.value = localStorage.getItem('sm_rail') === '1' } catch { /* ignore */ }
function togglePin(){ pinned.value = !pinned.value; try { localStorage.setItem('sm_rail', pinned.value ? '1' : '0') } catch { /* ignore */ } }

// header height → --hdr-h (the header grows on phones when a page adds tools)
const hdr = ref(null); let ro
function watchHdr(){ ro?.disconnect(); if (!hdr.value) return
  ro = new ResizeObserver(() => document.documentElement.style.setProperty('--hdr-h', hdr.value.offsetHeight + 'px')); ro.observe(hdr.value) }
onMounted(watchHdr); watch(isLogin, () => nextTick(watchHdr))
onBeforeUnmount(() => { ro?.disconnect(); offNav() })

const syncOpen=ref(false), syncing=ref(false), syncResult=ref(null), syncError=ref('')
function openSync(){ syncOpen.value=true; syncResult.value=null; syncError.value='' }
async function runSync(){
  syncing.value=true; syncResult.value=null; syncError.value=''
  try { const d=await apiPost('sync'); if(d.ok) syncResult.value=d; else syncError.value=d.error||'Sync failed' }
  catch(e){ syncError.value=e.message||'Sync failed' }
  finally { syncing.value=false }
}
function go(p){ router.push(p) }
function logout(){ ['sm_auth','sm_token','sm_user','sm_ask'].forEach(k=>{ localStorage.removeItem(k); sessionStorage.removeItem(k) }); router.push('/login') }
</script>

<style scoped>
.shell{min-height:100vh}
/* ── rail ── */
.rail{position:fixed;left:0;top:0;bottom:0;width:var(--rail-w);background:var(--surface);border-right:1px solid var(--line);z-index:1200;display:flex;flex-direction:column;padding:10px;overflow:hidden;
  transition:width .2s cubic-bezier(.3,.7,.2,1),box-shadow .2s}
.rail:hover,.rail:focus-within,.rail.pinned{width:248px}
.rail:hover:not(.pinned),.rail:focus-within:not(.pinned){box-shadow:var(--shadow-lg)}
.rail-logo{display:flex;align-items:center;gap:12px;border:0;background:none;padding:6px 6px 12px;width:228px;text-align:left}
.rail-logo img{width:36px;height:36px;object-fit:contain;flex-shrink:0}
.rl-txt b{display:block;font-size:14px;color:var(--heading);white-space:nowrap}.rl-txt small{font-size:11.5px;color:var(--muted);white-space:nowrap}
.rail-nav{flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:4px;scrollbar-width:none}
.rail-nav::-webkit-scrollbar{display:none}
.rail-grp{height:18px;display:flex;align-items:center;margin-top:6px;width:228px}
.rail-grp::before{content:'';width:48px;height:1px;background:var(--line);position:absolute}
.rail-grp span{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-left:12px;background:var(--surface);position:relative;opacity:0;transition:opacity .15s;padding-right:8px}
.ri{display:flex;align-items:center;gap:12px;width:228px;padding:0;border:0;background:none;border-radius:12px;color:var(--g800);text-decoration:none;font-weight:600;font-size:14px;text-align:left;position:relative;transition:background .15s}
.ri:hover{background:color-mix(in srgb,var(--mc) 9%,var(--surface))}
.ri-ic{position:relative;width:48px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:17px;flex-shrink:0;color:var(--mc);background:color-mix(in srgb,var(--mc) 12%,var(--surface));transition:background .15s,color .15s,transform .15s}
.ri:hover .ri-ic{transform:scale(1.04)}
.ri.on .ri-ic{background:var(--mc);color:#fff;box-shadow:0 6px 14px color-mix(in srgb,var(--mc) 35%,transparent)}
.ri.on{color:var(--mc)}
.ri.sm .ri-ic{height:38px;font-size:15px;background:transparent;color:var(--g600)}
.ri.sm.on .ri-ic{background:var(--g100);color:var(--heading);box-shadow:none}
.ri.back .ri-ic{background:transparent}
.ri-l{white-space:nowrap;opacity:0;transform:translateX(-6px);transition:opacity .15s,transform .2s;flex:1}
.ri-b{background:var(--bad);color:#fff;border-radius:999px;font-size:10.5px;font-weight:700;padding:1px 7px;margin-right:10px;opacity:0;transition:opacity .15s}
.ri-dot{position:absolute;top:6px;right:8px;width:9px;height:9px;border-radius:50%;background:var(--bad);border:2px solid var(--surface)}
.rail:hover .ri-l,.rail:focus-within .ri-l,.rail.pinned .ri-l,.rail:hover .ri-b,.rail:focus-within .ri-b,.rail.pinned .ri-b,
.rail:hover .rail-grp span,.rail:focus-within .rail-grp span,.rail.pinned .rail-grp span{opacity:1;transform:none}
.rl-txt{opacity:0;transition:opacity .15s}.rail:hover .rl-txt,.rail:focus-within .rl-txt,.rail.pinned .rl-txt{opacity:1}
/* self-service has more entries: slightly shorter tiles so they all fit */
.rail-nav.dense{gap:3px}.rail-nav.dense .ri-ic{height:38px;font-size:15px}.rail-nav.dense .rail-grp{height:12px;margin-top:2px}
.rail-foot{border-top:1px solid var(--line);padding-top:8px;margin-top:8px;display:flex;flex-direction:column;gap:2px}

/* ── body + header ── */
.body{margin-left:var(--rail-w);min-height:100vh;display:flex;flex-direction:column;transition:margin-left .2s}
.body.pinned{margin-left:248px}
.hdr{position:sticky;top:0;z-index:1000;min-height:64px;display:flex;align-items:center;gap:16px;padding:8px 28px;
  background:color-mix(in srgb,var(--pri) 7%,var(--surface));border-bottom:1px solid color-mix(in srgb,var(--pri) 22%,var(--line));transition:background .25s,border-color .25s}
.hdr::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:var(--pri);transition:background .25s}
.hdr-logo{height:30px;cursor:pointer}
.hdr-title{display:flex;align-items:center;gap:12px;flex-shrink:0}
.hdr-ic{width:40px;height:40px;border-radius:12px;background:var(--pri);color:#fff;display:grid;place-items:center;font-size:17px;flex-shrink:0;transition:background .25s}
.hdr-title h1{font-size:18px;margin:0;line-height:1.2;white-space:nowrap}
.hdr-title p{font-size:12.5px;color:var(--muted);margin:0;white-space:nowrap}
.hdr-tools{flex:1;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.hdr-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.kb-btn{color:var(--pri)}
.app-main{flex:1;min-width:0}

.sync-backdrop{position:fixed;inset:0;background:rgba(10,12,16,.55);display:grid;place-items:center;z-index:3000;padding:20px}
.sync-card{background:var(--surface);border-radius:var(--r-lg);padding:24px;width:100%;max-width:480px;box-shadow:var(--shadow-lg)}
.sync-ic{width:38px;height:38px;border-radius:10px;background:var(--pri);color:#fff;display:grid;place-items:center}
.btn-x{border:0;background:transparent;font-size:18px;color:var(--muted)}
.user-box{background:var(--g50);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:14px}
.user-box .fw-bold{color:var(--heading)}
.sync-ok{background:var(--ok-bg);color:var(--ok-fg);border-radius:10px;padding:12px 14px;font-size:14px}
.sync-err{background:var(--bad-bg);color:var(--bad-fg);border-radius:10px;padding:12px 14px;font-size:14px}

@media (max-width:991.98px){
  .rail{display:none}.body,.body.pinned{margin-left:0}
  .hdr{padding:8px 14px;gap:10px;flex-wrap:wrap;min-height:56px}
  .hdr-ic{display:none}.hdr-title h1{font-size:16px}
  .hdr-title{flex:1}
  .hdr-tools{order:5;flex:0 0 100%;justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
  .hdr-tools:empty{display:none}
  .app-main:not(.in-ess){padding-bottom:62px}
}
</style>
