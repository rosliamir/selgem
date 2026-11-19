<template>
  <div>
    <div class="ins-row">
      <div v-for="(t, i) in insights" :key="i" class="ins"><i :class="t.i"></i><span v-html="t.t"></span></div>
    </div>
    <div class="g">
      <section class="ess-card">
        <h6 class="mb-1"><i class="fa-solid fa-people-carry-box me-2 text-primary"></i>Pekerja di tapak vs pengeluaran harian</h6>
        <p class="hint">Setiap titik = satu tapak · paksi X = purata pekerja kontraktor sehari (F001) · paksi Y = purata MT sehari · saiz = produktiviti · klik untuk butiran</p>
        <div class="ch"><canvas ref="sc"></canvas></div>
      </section>
      <section class="ess-card">
        <h6 class="mb-1"><i class="fa-solid fa-chart-line me-2 text-success"></i>{{ sel ? sel.site_code : 'Pilih tapak' }} — pekerja & jualan harian</h6>
        <p class="hint">{{ sel ? `Korelasi pekerja↔jualan r = ${sel.r_crew ?? '—'} · ${sel.mt_per_crew_day ?? '—'} MT setiap pekerja-hari` : 'Klik satu tapak pada carta atau jadual' }}</p>
        <div class="ch"><canvas ref="ln"></canvas></div>
      </section>
    </div>
    <section class="ess-card mt-3">
      <div class="d-flex align-items-center gap-2 mb-2 flex-wrap"><h6 class="m-0 flex-grow-1">Jadual produktiviti tapak · {{ data?.from }} – {{ data?.to }}</h6>
        <div class="ess-tabs"><button v-for="d in [60, 90, 180]" :key="d" :class="{ on: days === d }" @click="days = d">{{ d }} hari</button></div></div>
      <div class="table-responsive"><table class="table tb">
        <thead><tr><th v-for="c in COLS" :key="c.k" @click="sortBy(c.k)" :title="c.t">{{ c.l }} <i v-if="sort.k === c.k" class="fa-solid" :class="sort.d > 0 ? 'fa-caret-up' : 'fa-caret-down'"></i></th></tr></thead>
        <tbody><tr v-for="s in rows" :key="s.site_id" :class="{ on: sel?.site_id === s.site_id }" @click="pick(s)">
          <td><b>{{ s.site_code }}</b></td><td>{{ s.days }}</td><td>{{ s.avg_crew }}</td><td>{{ s.avg_staff }}</td><td>{{ s.avg_mt.toLocaleString() }}</td>
          <td><span class="pill-p" :style="{ background: prodColor(s.mt_per_crew_day) }">{{ s.mt_per_crew_day ?? '—' }}</span></td>
          <td><span class="rbar"><i :style="{ width: Math.max(0, (s.r_crew || 0)) * 100 + '%' }"></i></span>{{ s.r_crew ?? '—' }}</td>
          <td :class="{ warn: s.idle_days >= 5 }">{{ s.idle_days }}</td>
          <td :class="{ bad: s.unsupervised_days / s.days > .3 }">{{ s.unsupervised_days }}<small v-if="s.unsupervised_days"> ({{ Math.round(s.unsupervised_days / s.days * 100) }}%)</small></td>
        </tr></tbody>
      </table></div>
      <div class="tiny muted">Pekerja kontraktor = jumlah operator, pemandu, mekanik & pekerja am dalam laporan harian F001. Staf KSSB = staf yang hadir di tapak (rekod kehadiran / clock-in dalam geofence). Jualan tidak termasuk entri luar biasa (&gt;100 MT/trip).</div>
    </section>
  </div>
</template>
<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import { apiGet } from '../../services/api'
const COLS = [{ k: 'site_code', l: 'Tapak' }, { k: 'days', l: 'Hari' }, { k: 'avg_crew', l: 'Pekerja/hari', t: 'Purata pekerja kontraktor (F001)' },
  { k: 'avg_staff', l: 'Staf KSSB/hari' }, { k: 'avg_mt', l: 'MT/hari' }, { k: 'mt_per_crew_day', l: 'MT/pekerja-hari', t: 'Produktiviti' },
  { k: 'r_crew', l: 'Korelasi r', t: 'Pekerja vs jualan harian (1 = sangat berkait)' }, { k: 'idle_days', l: 'Hari tanpa jualan', t: 'Ada pekerja tetapi tiada jualan' },
  { k: 'unsupervised_days', l: 'Jualan tanpa staf KSSB', t: 'Hari ada jualan tetapi tiada staf KSSB hadir' }]
const data = ref(null), days = ref(90), sel = ref(null), sc = ref(null), ln = ref(null), sort = reactive({ k: 'avg_mt', d: -1 }); let c1, c2
const rows = computed(() => [...(data.value?.sites || [])].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (x == null) - (y == null) || (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.d }))
function sortBy(k) { sort.d = sort.k === k ? -sort.d : -1; sort.k = k }
const prodColor = v => v == null ? '#f3f3f3' : v >= 200 ? '#b1edcb' : v >= 130 ? '#e3f9ed' : v >= 100 ? '#fef4cb' : '#f8d7d7'
const insights = computed(() => {
  const s = data.value?.sites || []; if (!s.length) return []
  const prod = s.filter(x => x.mt_per_crew_day && x.avg_crew >= 5), hi = [...prod].sort((a, b) => b.mt_per_crew_day - a.mt_per_crew_day)[0], lo = [...prod].sort((a, b) => a.mt_per_crew_day - b.mt_per_crew_day)[0]
  const uns = s.filter(x => x.unsupervised_days / x.days > .5).map(x => x.site_code)
  const rs = s.map(x => x.r_crew).filter(x => x != null), avgR = rs.reduce((a, b) => a + b, 0) / (rs.length || 1)
  return [
    hi && { i: 'fa-solid fa-trophy', t: `Paling produktif: <b>${hi.site_code}</b> ${hi.mt_per_crew_day} MT/pekerja-hari` },
    lo && { i: 'fa-solid fa-arrow-trend-down', t: `Paling rendah: <b>${lo.site_code}</b> ${lo.mt_per_crew_day} MT/pekerja-hari — semak penggunaan tenaga kerja` },
    { i: 'fa-solid fa-link', t: `Purata korelasi pekerja↔jualan <b>r = ${avgR.toFixed(2)}</b> — ${avgR > .5 ? 'tenaga kerja ialah pemacu utama jualan' : 'faktor lain (permintaan, cuaca, mesin) lebih dominan'}` },
    uns.length && { i: 'fa-solid fa-user-shield', t: `<b>${uns.length} tapak</b> menjual lebih separuh hari tanpa staf KSSB hadir: ${uns.slice(0, 5).join(', ')}${uns.length > 5 ? '…' : ''}` },
  ].filter(Boolean)
})
function drawScatter() {
  c1?.destroy(); const s = data.value?.sites || []
  c1 = new Chart(sc.value, { type: 'bubble', data: { datasets: [{ data: s.map(x => ({ x: x.avg_crew, y: x.avg_mt, r: Math.max(4, Math.min(22, (x.mt_per_crew_day || 0) / 15)), site: x })),
      backgroundColor: s.map(x => (x.unsupervised_days / x.days > .5 ? 'rgba(207,35,35,.45)' : 'rgba(107,79,235,.45)')), borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => { const x = c.raw.site; return `${x.site_code}: ${x.avg_crew} pekerja, ${x.avg_mt.toLocaleString()} MT/hari, ${x.mt_per_crew_day} MT/pekerja` } } } },
      onClick: (e, el) => el.length && pick(el[0].element.$context.raw.site),
      scales: { x: { title: { display: true, text: 'Purata pekerja kontraktor / hari' }, grid: { color: '#f3f3f3' } }, y: { title: { display: true, text: 'Purata MT / hari' }, grid: { color: '#f3f3f3' } } } } })
}
function drawLine() {
  c2?.destroy(); if (!sel.value) return; const s = sel.value.series
  c2 = new Chart(ln.value, { data: { labels: s.map(x => x.date.slice(5)), datasets: [
    { type: 'bar', label: 'Jualan (MT)', data: s.map(x => x.mt), backgroundColor: '#c8bdf7', borderRadius: 3, yAxisID: 'y' },
    { type: 'line', label: 'Pekerja kontraktor', data: s.map(x => x.crew), borderColor: '#0e7c3d', tension: .3, pointRadius: 0, yAxisID: 'y2' },
    { type: 'line', label: 'Staf KSSB', data: s.map(x => x.staff), borderColor: '#e5bf29', stepped: true, pointRadius: 0, yAxisID: 'y2' }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: { y: { grid: { color: '#f3f3f3' } }, y2: { position: 'right', grid: { display: false } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } } } } })
}
function pick(s) { sel.value = s; nextTick(drawLine) }
async function load() { data.value = await apiGet(`hr/manpower?days=${days.value}`); await nextTick(); drawScatter(); pick(rows.value[0]) }
watch(days, load); onMounted(load); onBeforeUnmount(() => { c1?.destroy(); c2?.destroy() })
</script>
<style scoped>
.ins-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.ins{display:flex;gap:10px;align-items:flex-start;background:var(--pri-soft);border-radius:8px;padding:10px 12px;font-size:12.5px;color:var(--ok-fg)}.ins i{color:var(--ok);margin-top:2px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.hint{font-size:12px;color:var(--g600);margin-bottom:6px}.ch{position:relative;height:320px}
.tb th{font-size:11px;text-transform:uppercase;color:var(--g500);cursor:pointer;white-space:nowrap}.tb td{font-size:13px;vertical-align:middle}
.tb tbody tr{cursor:pointer}.tb tbody tr.on td{background:var(--pri-soft)}
.pill-p{border-radius:4px;padding:2px 8px;font-weight:700}
.rbar{display:inline-block;width:50px;height:6px;background:var(--g100);border-radius:99px;margin-right:6px;vertical-align:middle;overflow:hidden}.rbar i{display:block;height:100%;background:var(--ok)}
.warn{color:var(--warn-fg);font-weight:700}.bad{color:var(--bad);font-weight:700}
@media (max-width:1199.98px){ .ins-row{grid-template-columns:1fr 1fr} .g{grid-template-columns:1fr} }
@media (max-width:767.98px){ .ins-row{grid-template-columns:1fr} }
</style>
