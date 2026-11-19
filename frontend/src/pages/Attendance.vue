<template>
  <div class="page-wrap">
    <PageBar>
      <span v-if="live" class="badge-live"><span class="dot"></span>Live</span>
      <div style="width:240px"><DropdownSelect v-model="siteFilter" :options="siteOptions" searchable/></div>
    </PageBar>

    <!-- decision intelligence overview -->
    <AttendanceInsights :office="siteFilter==='all' ? null : siteFilter"
      @view="openView" @office="v => siteFilter = v" @day="d => { tab='Daily'; dateStr=d; loadDaily(); scrollToDaily() }"/>

    <div class="utabs" id="att-tabs">
      <button class="utab" :class="{on:tab==='Daily'}" @click="tab='Daily'">Daily</button>
      <button class="utab" :class="{on:tab==='Monthly'}" @click="setMonthly">Monthly</button>
      <button class="utab" :class="{on:tab==='Geo'}" @click="tab='Geo'"><i class="fa-solid fa-map-location-dot me-1"></i>Lokasi & Heatmap</button>
    </div>

    <!-- LOCATION MAP + HEATMAPS + IN/OUT TREND (shared with the ESS HR page) -->
    <div v-if="tab==='Geo'" class="ess mt-3"><HrAttendanceInsights/></div>

    <!-- DAILY -->
    <template v-if="tab==='Daily'">
      <div class="row g-3 mt-2">
        <div v-for="s in cards" :key="s.k" class="col"><div class="stat-tile acc" :style="{'--c':s.c}"><div class="tile-label">{{ s.k }}</div><div class="tile-num" :style="{color:s.c}">{{ s.v }}</div></div></div>
      </div>
      <div class="card p-4 mt-3">
        <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h6 class="fw-bold mb-0 me-2">Daily Attendance</h6>
          <div class="date-box"><i class="fa-regular fa-calendar text-secondary"></i><input type="date" v-model="dateStr" @change="loadDaily"/></div>
          <div class="input-group ms-auto" style="max-width:300px"><span class="input-group-text bg-white"><i class="fa-solid fa-magnifying-glass text-secondary"></i></span><input class="form-control" v-model="q" placeholder="Enter staff name or ID"/></div>
          <div style="width:160px"><DropdownSelect v-model="statusFilter" :options="statusOptions"/></div>
          <button class="btn btn-upload" @click="showUpload=true"><i class="fa-solid fa-cloud-arrow-up me-2"></i>Upload Attendance</button>
        </div>
        <div class="table-responsive"><table class="table mb-0 align-middle">
          <thead><tr><th>Staff</th><th>Role/Site</th><th class="text-center">Check-in</th><th class="text-center">Check-out</th><th class="text-center">Duration</th><th class="text-center">Status</th><th class="text-center">Action</th></tr></thead>
          <tbody>
            <tr v-for="s in dailyRows" :key="s.id">
              <td><b>{{ s.name }}</b><div class="small text-muted2">{{ s.code }}</div></td>
              <td>{{ s.role }}<div class="small text-muted2"><span class="site-badge">{{ s.office_code }}</span>{{ s.office }}</div></td>
              <td class="text-center">{{ s.check_in || '-' }}</td><td class="text-center">{{ s.check_out || '-' }}</td><td class="text-center">{{ s.duration || '-' }}</td>
              <td class="text-center"><span class="pill" :class="stPill(s.status)">{{ labelOf(s.status) }}</span></td>
              <td class="text-center"><button class="btn btn-view" @click="openView(s)">VIEW</button></td>
            </tr>
            <tr v-if="!dailyRows.length"><td colspan="7" class="text-center text-muted2 py-4">No data found for {{ dateStr }}</td></tr>
          </tbody>
        </table></div>
      </div>
    </template>

    <!-- MONTHLY -->
    <template v-else-if="tab==='Monthly'">
      <div class="row g-3 mt-2"><div class="col-lg-3"><div class="stat-tile acc" style="--c:#6b4feb"><div class="tile-label">Total Staff</div><div class="tile-num" style="color:#6b4feb">{{ gridStaff.length }}</div></div></div></div>
      <div class="card p-4 mt-3">
        <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h6 class="fw-bold mb-0 me-2">Monthly Attendance</h6>
          <div class="month-nav"><button @click="shiftMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button><b>{{ monthLabel }}</b><button @click="shiftMonth(1)"><i class="fa-solid fa-chevron-right"></i></button></div>
          <div class="input-group ms-auto" style="max-width:300px"><span class="input-group-text bg-white"><i class="fa-solid fa-magnifying-glass text-secondary"></i></span><input class="form-control" v-model="q" placeholder="Enter staff name or ID"/></div>
        </div>
        <div class="legend mb-2"><span class="me-1 fw-bold text-muted2">LEGEND:</span>
          <span class="lg"><span class="cell P">P</span> Present</span><span class="lg"><span class="cell L">L</span> Late/Missing</span>
          <span class="lg"><span class="cell A">A</span> Absent</span><span class="lg"><span class="cell OL">OL</span> On Leave</span></div>
        <div class="grid-scroll">
          <table class="mtable">
            <thead><tr><th class="sticky stf">Staff</th><th class="sticky sr">Site/Role</th><th v-for="d in days" :key="d.n" :class="{wknd:d.weekend}">{{ d.n }} {{ d.dow }}</th></tr></thead>
            <tbody>
              <tr v-for="s in monthlyRows" :key="s.code">
                <td class="sticky stf"><div class="small text-muted2">{{ s.code }}</div><b>{{ s.name }}</b></td>
                <td class="sticky sr"><span class="site-badge">{{ s.office_code }}</span><div class="small text-muted2">{{ s.role }}</div></td>
                <td v-for="d in days" :key="d.n" :class="{wknd:d.weekend}"><span v-if="abbr(s.days[d.n])" class="cell" :class="abbr(s.days[d.n])">{{ abbr(s.days[d.n]) }}</span><span v-else class="text-muted2">-</span></td>
              </tr>
              <tr v-if="!monthlyRows.length"><td :colspan="days.length+2" class="text-center text-muted2 py-4">No data for {{ monthLabel }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- VIEW staff detail modal -->
    <div v-if="viewStaff" class="modal-backdrop-c" @click.self="viewStaff=null">
      <div class="modal-card">
        <div class="d-flex justify-content-between align-items-start">
          <div><h5 class="fw-bold mb-0 text-uppercase">{{ viewStaff.employee.name }}</h5>
            <div class="text-muted2 small">{{ viewStaff.employee.code }} · Work Days: {{ viewStaff.employee.workdays||5 }} · Clock-In: {{ firstClockIn }}</div></div>
          <button class="btn-close-x" @click="viewStaff=null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="d-flex gap-2 flex-wrap my-3">
          <span class="chip"><span class="dotc" style="background:#0b5e2f"></span>Present</span><span class="chip"><span class="dotc" style="background:#d6c84a"></span>Late</span>
          <span class="chip"><span class="dotc" style="background:#a11b1b"></span>Absent</span><span class="chip"><span class="dotc" style="background:#6b6b6b"></span>On Leave</span><span class="chip"><span class="sq"></span>Workdays</span>
        </div>
        <div class="card p-3">
          <div class="text-center fw-bold text-muted2 mb-3" style="letter-spacing:.05em">{{ monthLabel.toUpperCase() }} — ATTENDANCE CALENDAR</div>
          <div class="cal-grid">
            <div class="cal-dow" v-for="d in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="d">{{ d }}</div>
            <div v-for="(cell,i) in calMonth" :key="i" class="cal-day" :class="cell.cls"><span v-if="cell.n">{{ cell.n }}</span></div>
          </div>
        </div>
        <div class="row g-2 mt-3"><div class="col-4" v-for="st in viewStats" :key="st.k"><div class="mini-stat"><div class="mini-num" :style="{color:st.c}">{{ st.v }}</div><div class="mini-lbl">{{ st.k }}</div></div></div></div>
        <div class="text-end mt-3"><button class="btn btn-secondary px-4" @click="viewStaff=null">Close</button></div>
      </div>
    </div>

    <!-- Upload modal -->
    <div v-if="showUpload" class="modal-backdrop-c" @click.self="showUpload=false">
      <div class="modal-card" style="max-width:720px">
        <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
          <div><h5 class="fw-bold mb-0">Upload Attendance</h5><div class="text-muted2 small">Upload daily attendance data using excel</div></div>
          <button class="btn-close-x" @click="showUpload=false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="dropzone"><div class="dz-ic"><i class="fa-solid fa-cloud-arrow-up"></i></div>
          <div class="fw-bold fs-5 mt-2">Drag and drop your file here</div>
          <div class="text-muted2">or <a href="#" @click.prevent class="text-primary fw-bold">click to browse</a> from your computer</div></div>
        <div class="note mt-3">
          <div class="fw-bold text-muted2 mb-2" style="letter-spacing:.04em"><i class="fa-solid fa-circle-info me-1"></i>DOWNLOAD TEMPLATE FILE HERE</div>
          <div class="mb-1"><i class="fa-solid fa-triangle-exclamation text-warning me-2"></i><b>Do not change sheet name (Sheet1)</b></div>
          <div><i class="fa-solid fa-triangle-exclamation text-warning me-2"></i><b>Do not change header values (staff_id, staff_name etc…)</b></div>
        </div>
        <div class="d-flex justify-content-between mt-4">
          <button class="btn btn-secondary px-4" @click="showUpload=false">Cancel</button>
          <button class="btn btn-primary px-4">Process <i class="fa-solid fa-arrow-right ms-1"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import PageBar from '../components/PageBar.vue'
import { ref, computed, watch, onMounted } from 'vue'
import { load, apiGet, token } from '../services/api'
import DropdownSelect from '../components/DropdownSelect.vue'
import AttendanceInsights from '../components/AttendanceInsights.vue'
import HrAttendanceInsights from '../components/ess/HrAttendanceInsights.vue'
import '../styles/ess.css'
const scrollToDaily=()=> setTimeout(()=>document.getElementById('att-tabs')?.scrollIntoView({behavior:'smooth',block:'start'}),50)
const tab=ref('Daily'), q=ref(''), siteFilter=ref('all'), statusFilter=ref('all')
const dateStr=ref('2026-11-10'), showUpload=ref(false), viewStaff=ref(null), live=ref(false)
const daily=ref({summary:{},rows:[]}), gridStaff=ref([]), sites=ref([])
const month=ref(new Date(2026,10,1))

const statusOptions=[{value:'all',label:'All Status'},{value:'present',label:'Present'},{value:'late',label:'Late'},{value:'absent',label:'Absent'},{value:'on_leave',label:'On Leave'}]
// staff are grouped by office (hq_region) in the source, so filter by office
const siteOptions=[
  {value:'all',label:'All sites'},
  {value:'HQ',label:'[HQ] Headquarters'},
  {value:'PSU',label:'[PSU] Pejabat Satelit Utara'},
  {value:'PSS',label:'[PSS] Pejabat Satelit Selatan'},
]
const labels={present:'PRESENT',late:'LATE',absent:'ABSENT',on_leave:'ON LEAVE'}
const labelOf=s=>labels[s]||(s||'').toUpperCase()
function stPill(s){return {present:'pill-green',late:'pill-amber',absent:'pill-red',on_leave:'pill-iso'}[s]||'pill-gray'}
const abbr=s=>({present:'P',late:'L',absent:'A',on_leave:'OL'}[s]||'')

const cards=computed(()=>{ const s=daily.value.summary||{}; return [
  {k:'Total Staff',v:s.total??0,c:ACC()},{k:'Present This Day',v:s.present??0,c:'#0e7c3d'},
  {k:'Late/Missing',v:s.late??0,c:'#e5bf29'},{k:'Absent',v:s.absent??0,c:'#cf2323'},{k:'On Leave',v:s.on_leave??0,c:'#868686'}]})
const dailyRows=computed(()=> (daily.value.rows||[])
  .filter(r=> statusFilter.value==='all' || r.status===statusFilter.value)
  .filter(r=> siteFilter.value==='all' || r.office_code===siteFilter.value)
  .filter(r=> !q.value || (r.name||'').toLowerCase().includes(q.value.toLowerCase()) || (r.code||'').toLowerCase().includes(q.value.toLowerCase())))

// monthly grid
const DOW=['SUN','MON','TUE','WED','THU','FRI','SAT']
const days=computed(()=>{ const y=month.value.getFullYear(),m=month.value.getMonth(); const n=new Date(y,m+1,0).getDate(); const out=[]
  for(let d=1;d<=n;d++){const dt=new Date(y,m,d);const w=dt.getDay();out.push({n:d,dow:DOW[w],weekend:w===0||w===6})} return out })
const monthLabel=computed(()=> month.value.toLocaleDateString('en-US',{month:'long',year:'numeric'}))
const monthKey=computed(()=> `${month.value.getFullYear()}-${String(month.value.getMonth()+1).padStart(2,'0')}`)
const monthlyRows=computed(()=> gridStaff.value
  .filter(s=> siteFilter.value==='all' || s.office_code===siteFilter.value)
  .filter(s=>!q.value||(s.name||'').toLowerCase().includes(q.value.toLowerCase())||(s.code||'').toLowerCase().includes(q.value.toLowerCase())))
function shiftMonth(d){ const m=new Date(month.value); m.setMonth(m.getMonth()+d); month.value=m; loadGrid() }

// VIEW modal
const calMonth=computed(()=>{ if(!viewStaff.value) return []
  const y=month.value.getFullYear(),m=month.value.getMonth(); let lead=(new Date(y,m,1).getDay()+6)%7
  const n=new Date(y,m+1,0).getDate(); const out=[]; const D=viewStaff.value.days||{}
  for(let i=0;i<lead;i++) out.push({n:null,cls:''})
  for(let d=1;d<=n;d++){ const w=new Date(y,m,d).getDay(); const wknd=w===0||w===6
    const st=D[d]?.status; const cls= st? ({present:'P',late:'L',absent:'A',on_leave:'OL'}[st]||'') : (wknd?'wk':'')
    out.push({n:d,cls}) } return out })
const firstClockIn=computed(()=>{ const D=viewStaff.value?.days||{}; for(const k of Object.keys(D)){ if(D[k]?.check_in) return D[k].check_in+' AM' } return '—' })
const viewStats=computed(()=>{ if(!viewStaff.value) return []
  const D=viewStaff.value.days||{}; let wd=0,p=0,l=0,a=0,ol=0
  // count every recorded day (incl. weekends worked) so the tally matches the coloured cells;
  // weekdays after the last recorded day (i.e. the future) are not counted as working days yet
  const lastDay=Math.max(0,...Object.keys(D).map(Number))
  days.value.forEach(d=>{ const st=D[d.n]?.status
    if(st==='present')p++; else if(st==='late')l++; else if(st==='absent')a++; else if(st==='on_leave')ol++
    if(st || (!d.weekend && d.n<=lastDay)) wd++ })
  const pct= wd? Math.round(((p+l)/wd)*100):0
  return [{k:'WORKING DAYS',v:wd,c:ACC()},{k:'PRESENT %',v:pct+' %',c:'#1a1a1a'},{k:'PRESENT',v:p,c:'#0b5e2f'},{k:'LATE',v:l,c:'#9d841c'},{k:'ABSENT',v:a,c:'#a11b1b'},{k:'ON LEAVE',v:ol,c:'#6b6b6b'}] })

async function openView(row){
  month.value=new Date(new Date(dateStr.value).getFullYear(), new Date(dateStr.value).getMonth(), 1)
  const d=await apiGet(`attendances/monthly?code=${row.code}&month=${monthKey.value}`)
  viewStaff.value = d || {employee:{code:row.code,name:row.name,workdays:5}, days:{}}
}
async function loadDaily(){ const d=await apiGet(`attendances?date=${dateStr.value}`); if(d){ daily.value=d; live.value=true } }
async function loadGrid(){ const d=await apiGet(`attendances/grid?month=${monthKey.value}`); if(d) gridStaff.value=d.staff||[] }
function setMonthly(){ tab.value='Monthly'; if(!gridStaff.value.length) loadGrid() }

onMounted(async()=>{ sites.value=await load('sites'); await loadDaily() })
</script>
<style scoped>
.acc{border-left:3px solid var(--c)!important;border-radius:8px}
.date-box{display:flex;align-items:center;gap:8px;border:1px solid var(--g200);border-radius:8px;padding:.4rem .75rem}
.date-box input{border:0;outline:0;font:inherit;color:var(--g800)}
.btn-view{border:1px solid var(--g300);background:var(--surface);border-radius:8px;font-weight:700;font-size:12px;padding:.35rem .9rem;color:var(--g1000)}
.btn-view:hover{background:var(--inverse);color:#fff;border-color:var(--g1000)}
.badge-live{display:inline-flex;align-items:center;gap:6px;background:var(--ok-bg);color:var(--ok-fg);font-weight:700;font-size:11px;padding:.15rem .55rem;border-radius:999px}
.badge-live .dot{width:7px;height:7px;border-radius:50%;background:var(--ok-fg);animation:pulse 1.4s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.month-nav{display:flex;align-items:center;gap:14px;border:1px solid var(--g200);border-radius:8px;padding:.4rem 1rem}
.month-nav button{border:0;background:transparent;color:var(--g600)}
.legend{display:flex;align-items:center;gap:18px;background:var(--g50);border-radius:8px;padding:.5rem .9rem;font-size:12px}
.legend .lg{display:inline-flex;align-items:center;gap:6px;color:var(--g700)}
.cell{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:4px;font-size:11px;font-weight:700;color:#fff}
.cell.P{background:var(--ok-fg)}.cell.L{background:#d6c84a;color:var(--warn-fg)}.cell.A{background:var(--bad-fg)}.cell.OL{background:var(--pri)}
.grid-scroll{overflow:auto;max-height:70vh;border:1px solid var(--g200);border-radius:8px}
.mtable{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%}
.mtable th,.mtable td{padding:8px 10px;text-align:center;border-bottom:1px solid var(--g100);font-size:12px;white-space:nowrap}
.mtable thead th{position:sticky;top:0;background:var(--surface);color:var(--g500);font-size:10px;z-index:2}
.mtable th.wknd,.mtable td.wknd{background:var(--g50);color:var(--g300)}
.sticky.stf{position:sticky;left:0;background:var(--surface);text-align:left;min-width:230px;z-index:3}
.sticky.sr{position:sticky;left:230px;background:var(--surface);text-align:left;min-width:150px;z-index:3}
.mtable thead th.sticky{z-index:4}
.site-badge{display:inline-block;background:var(--pri-400);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:.1rem .5rem;margin-right:4px}
.modal-backdrop-c{position:fixed;inset:0;background:rgba(26,26,26,.45);display:grid;place-items:center;z-index:2000;padding:20px}
.modal-card{background:var(--surface);border-radius:12px;padding:24px;width:100%;max-width:620px;max-height:92vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.3)}
.btn-close-x{border:0;background:transparent;font-size:18px;color:var(--g600)}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--g200);border-radius:999px;padding:.25rem .7rem;font-size:12px;font-weight:600}
.chip .dotc{width:9px;height:9px;border-radius:50%}.chip .sq{width:11px;height:11px;border:1px solid var(--g300);border-radius:4px}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.cal-dow{text-align:center;font-weight:700;color:var(--g700);font-size:13px;padding-bottom:4px}
.cal-day{height:48px;border-radius:8px;display:grid;place-items:center;font-weight:700;color:var(--g800);background:var(--surface);border:1px solid var(--g100)}
.cal-day.P{background:var(--ok-fg);color:#fff;border-color:var(--ok-fg)}.cal-day.L{background:#d6c84a;color:var(--warn-fg);border-color:#d6c84a}
.cal-day.A{background:var(--bad-fg);color:#fff;border-color:var(--bad-fg)}.cal-day.OL{background:var(--pri);color:#fff;border-color:var(--pri)}.cal-day.wk{color:var(--g300)}
.mini-stat{background:var(--g50);border-radius:8px;padding:14px;text-align:center}
.mini-num{font-size:26px;font-weight:700}.mini-lbl{font-size:11px;font-weight:700;color:var(--g600);letter-spacing:.04em}
.dropzone{border:2px dashed var(--g300);border-radius:8px;padding:46px;text-align:center}
.dz-ic{width:72px;height:72px;border-radius:50%;background:var(--pri-soft);color:var(--pri);display:grid;place-items:center;font-size:26px;margin:0 auto}
.note{background:var(--g50);border-radius:8px;padding:16px}
</style>
