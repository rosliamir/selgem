<template>
  <div class="ess ess-shell">
    <!-- header actions live in the shared top bar; navigation lives in the shared rail -->
    <Teleport v-if="mounted" to="#hdr-slot">
      <button class="hbtn d-none d-md-grid" title="Mohon baharu" @click="openForm()"><i class="fa-solid fa-plus"></i></button>
      <div class="pos-rel" ref="bellWrap">
        <button class="hbtn" title="Notifikasi" @click="toggleBell"><i class="fa-solid fa-bell"></i>
          <span v-if="essState.unread" class="dot">{{ essState.unread > 9 ? '9+' : essState.unread }}</span></button>
        <transition name="pop">
          <div v-if="bell" class="bell ess">
            <div class="d-flex justify-content-between align-items-center px-3 pt-3 pb-2"><b>Notifikasi</b>
              <button class="link" @click="readAll">Tandakan semua dibaca</button></div>
            <div class="bell-list">
              <button v-for="n in notes" :key="n.id" class="bn" :class="{ unread: !n.read_at }" @click="goNote(n)">
                <span class="ic sm" :class="noteColor(n.type)"><i :class="n.icon || 'fa-solid fa-bell'"></i></span>
                <span class="min0 text-start"><b>{{ n.title }}</b><small>{{ n.body }}</small><em>{{ ago(n.created_at) }}</em></span>
              </button>
              <div v-if="!notes.length" class="empty"><i class="fa-regular fa-bell-slash"></i>Tiada notifikasi</div>
            </div>
            <router-link to="/ess/notifications" class="bell-all" @click="bell = false">Lihat semua</router-link>
          </div>
        </transition>
      </div>
    </Teleport>

    <main><router-view v-slot="{ Component }"><transition name="page" mode="out-in"><component :is="Component" :key="$route.path" /></transition></router-view></main>

    <!-- mobile tab bar -->
    <nav class="tabbar">
      <router-link to="/ess" class="tab" :class="{ on: $route.path === '/ess' }"><i class="fa-solid fa-house"></i><span>Utama</span></router-link>
      <router-link to="/ess/attendance" class="tab" active-class="on"><i class="fa-solid fa-fingerprint"></i><span>Kehadiran</span></router-link>
      <button class="tab plus" @click="openForm()"><i class="fa-solid fa-plus"></i></button>
      <router-link to="/ess/requests" class="tab" active-class="on"><i class="fa-solid fa-folder-open"></i><span>Permohonan</span></router-link>
      <button class="tab" :class="{ on: more }" @click="more = !more"><i class="fa-solid fa-grip"></i><span>Lagi</span>
        <span v-if="essState.approvals + essState.memos" class="tdot"></span></button>
    </nav>
    <transition name="sheet">
      <div v-if="more" class="sheet-bg" @click.self="more = false">
        <div class="sheet">
          <div class="grab"></div>
          <div class="more-grid">
            <router-link v-for="n in allItems" :key="n.to" :to="n.to" class="mg" :style="{ '--mc': n.color }" @click="more = false">
              <span class="mg-ic"><i :class="n.i"></i></span><span>{{ n.l }}</span>
              <span v-if="n.badge" class="bdg abs">{{ n.badge }}</span></router-link>
            <router-link v-if="!essOnly" to="/dashboard" class="mg" style="--mc:#475569" @click="more = false"><span class="mg-ic"><i class="fa-solid fa-display"></i></span><span>Konsol Admin</span></router-link>
            <button class="mg" style="--mc:#d12b2b" @click="logout"><span class="mg-ic"><i class="fa-solid fa-right-from-bracket"></i></span><span>Log keluar</span></button>
          </div>
        </div>
      </div>
    </transition>

    <RequestForm />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentUser } from '../services/api'
import { ess, essState, refreshHome, openForm, ago } from '../services/ess'
import { essGroups } from '../services/nav'
import RequestForm from '../components/ess/RequestForm.vue'

const route = useRoute(), router = useRouter()
const user = currentUser()
const essOnly = computed(() => !!user?.ess_only)
const more = ref(false), bell = ref(false), notes = ref([]), bellWrap = ref(null), mounted = ref(false)
const allItems = computed(() => essGroups(essState).flatMap(g => g.items).filter(n => n.to !== '/ess'))
const noteColor = t => ({ approved: 'ic-green', rejected: 'ic-rose', approval: 'ic-orange', memo: 'ic-amber', progress: 'ic-blue' }[t] || 'ic-slate')

async function toggleBell() { bell.value = !bell.value; if (bell.value) notes.value = (await ess.notifications() || []).slice(0, 8) }
async function goNote(n) { if (!n.read_at) { await ess.readNotifications(n.id); refreshHome() } bell.value = false; if (n.link) router.push(n.link) }
async function readAll() { await ess.readNotifications(); notes.value = notes.value.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })); refreshHome() }
function logout() { ['sm_auth', 'sm_token', 'sm_user', 'sm_ask'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k) }); router.push('/login') }
const onDoc = e => { if (bellWrap.value && !bellWrap.value.contains(e.target)) bell.value = false }
let t2
onMounted(() => { mounted.value = true; refreshHome(); t2 = setInterval(refreshHome, 60000); document.addEventListener('click', onDoc) })
onBeforeUnmount(() => { clearInterval(t2); document.removeEventListener('click', onDoc) })
watch(() => route.path, () => { more.value = false; bell.value = false })
</script>

<style scoped>
.ess-shell{min-height:calc(100vh - var(--hdr-h));background:var(--bg)}
.bdg{background:var(--bad);color:#fff;border-radius:999px;font-size:10.5px;font-weight:700;padding:1px 7px}
.bdg.abs{position:absolute;top:0;right:8px}
.pos-rel{position:relative}
.bell{position:absolute;right:0;top:48px;width:360px;background:var(--surface);border-radius:14px;box-shadow:var(--shadow-lg);border:1px solid var(--line);overflow:hidden;z-index:1100}
.link{border:0;background:none;color:var(--pri);font-size:12px;font-weight:600}
.bell-list{max-height:380px;overflow:auto}
.bn{display:flex;gap:10px;width:100%;border:0;background:var(--surface);color:var(--ink);padding:10px 14px;transition:background .12s}
.bn:hover{background:var(--g50)}.bn.unread{background:var(--pri-soft)}
.bn b{display:block;font-size:13px;color:var(--heading)}.bn small{display:block;color:var(--muted);font-size:12px;line-height:1.3}.bn em{font-size:11px;color:var(--g500);font-style:normal}
.bell-all{display:block;text-align:center;padding:10px;font-weight:600;font-size:13px;border-top:1px solid var(--line);text-decoration:none;color:var(--pri)}
.tabbar,.sheet-bg{display:none}
.page-enter-from{opacity:0;transform:translateY(6px)}.page-leave-to{opacity:0}
.page-enter-active,.page-leave-active{transition:all .16s}
.pop-enter-from,.pop-leave-to{opacity:0;transform:translateY(-6px)}.pop-enter-active,.pop-leave-active{transition:all .15s}
@media (max-width:991.98px){
  .bell{position:fixed;left:10px;right:10px;top:var(--hdr-h);width:auto}
  .tabbar{display:flex;position:fixed;left:0;right:0;bottom:0;height:62px;background:var(--surface);border-top:1px solid var(--line);z-index:60;padding-bottom:env(safe-area-inset-bottom)}
  .tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-top:2px solid transparent;background:none;color:var(--muted);font-size:11px;font-weight:600;text-decoration:none;position:relative}
  .tab i{font-size:18px}.tab.on{color:var(--pri);border-top-color:var(--pri)}
  .tab.plus i{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--pri);color:#fff;font-size:20px;margin-top:-22px;box-shadow:var(--shadow-md)}
  .tdot{position:absolute;top:10px;right:calc(50% - 16px);width:8px;height:8px;border-radius:50%;background:var(--bad)}
  .sheet-bg{display:block;position:fixed;inset:0;background:rgba(10,12,16,.55);z-index:70}
  .sheet{position:absolute;left:0;right:0;bottom:0;background:var(--surface);border-radius:18px 18px 0 0;padding:10px 16px 90px}
  .grab{width:44px;height:5px;border-radius:99px;background:var(--g200);margin:0 auto 14px}
  .more-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 6px}
  .mg{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;font-size:11.5px;font-weight:600;color:var(--g800);text-decoration:none;border:0;background:none}
  .mg-ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:20px;color:var(--mc);background:color-mix(in srgb,var(--mc) 12%,var(--surface))}
  .sheet-enter-from,.sheet-leave-to{opacity:0}.sheet-enter-from .sheet,.sheet-leave-to .sheet{transform:translateY(40px)}
  .sheet-enter-active,.sheet-leave-active,.sheet-enter-active .sheet,.sheet-leave-active .sheet{transition:all .22s}
}
</style>
