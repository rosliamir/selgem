<template>
  <div class="page-wrap mon">
    <PageBar>
      <span v-if="ins" class="badge-live"><span class="dot"></span>As of {{ fmtDate(ins.as_of) }}</span>
      <div v-if="tab === 'intel'" class="seg seg-sm">
        <button v-for="r in REGIONS" :key="r.k" :class="{ on: region === r.k }" @click="region = r.k">{{ r.l }}</button>
      </div>
    </PageBar>
    <div class="utabs mt-0">
      <button class="utab" :class="{ on: tab === 'intel' }" @click="tab = 'intel'"><i class="fa-solid fa-brain me-2"></i>Compliance intelligence</button>
      <button class="utab" :class="{ on: tab === 'repo' }" @click="tab = 'repo'"><i class="fa-regular fa-folder-open me-2"></i>Report repository <span class="tab-n">{{ all.length }}</span></button>
    </div>

    <!-- ═════════════════════ INTELLIGENCE ═════════════════════ -->
    <template v-if="tab === 'intel'">
      <div v-if="!ins" class="text-center py-5 text-muted2"><span class="spinner-border spinner-border-sm me-2"></span>Checking compliance…</div>
      <template v-else>
        <!-- briefing -->
        <BriefPanel class="mt-3" icon="fa-solid fa-shield-halved" title="Compliance briefing" what-label="Status"
                    :sub="`${region === 'all' ? 'All regions' : region} · operating sites = reported in the last 60 days`" :summary="ins.summary"
                    @sev="k => { actFilter = k; scrollTo('m-actions') }" @actions="scrollTo('m-actions')" />

        <!-- KPIs -->
        <div class="kpis mt-3">
          <div v-for="k in ins.kpis" :key="k.key" class="kpi" :class="kpiTone(k)" @click="jump(k.key)" :title="k.hint">
            <div class="kpi-l">{{ k.label }}</div>
            <div class="kpi-v">{{ k.value ?? '—' }}<small v-if="k.unit === '%'">%</small><small v-else-if="k.of"> / {{ k.of }}</small></div>
            <div v-if="k.unit === '%'" class="kpi-bar"><div :style="{ width: k.value + '%' }"></div></div>
            <div v-else class="kpi-u">{{ k.unit }}</div>
            <div class="kpi-tip">{{ k.hint }}</div>
          </div>
        </div>

        <!-- actions + coverage -->
        <div class="row g-3 mt-1" id="m-actions">
          <div class="col-xl-8">
            <div class="card p-4 h-100">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div><h5 class="fw-bold mb-0"><i class="fa-solid fa-list-check me-2 text-primary"></i>Action center</h5>
                  <p class="text-muted2 small mb-0">Rule-based findings from site documents, F001 statuses, docket reports and approvals</p></div>
                <div class="seg seg-xs">
                  <button :class="{ on: actFilter === 'all' }" @click="actFilter = 'all'">All {{ openActions.length }}</button>
                  <button v-for="s in SEV" :key="s.k" v-show="ins.summary.counts[s.k]" :class="{ on: actFilter === s.k }" @click="actFilter = s.k">{{ s.l }}</button>
                  <button :class="{ on: actFilter === 'done' }" @click="actFilter = 'done'"><i class="fa-solid fa-check"></i> {{ doneCount }}</button>
                </div>
              </div>
              <transition-group name="act" tag="div" class="acts mt-3">
                <div v-for="a in shownActions" :key="a.id" class="act" :class="[`sev-b-${a.sev}`, { done: done[a.id] }]">
                  <button class="act-check" @click="toggleDone(a)" :title="done[a.id] ? 'Mark as open' : 'Mark as done'"><i class="fa-solid fa-check"></i></button>
                  <div class="act-body" @click="a.link && $router.push(a.link)">
                    <div class="act-top"><span class="sev-dot" :class="`sev-${a.sev}`">{{ a.sev }}</span>
                      <span class="act-cat"><i :class="CAT_ICON[a.cat] || 'fa-solid fa-circle-info'"></i>{{ a.cat }}</span>
                      <span class="act-owner"><i class="fa-solid fa-user-tie"></i>{{ a.owner }}</span></div>
                    <div class="act-title">{{ a.title }}</div>
                    <div class="act-why"><b>Why:</b> {{ a.why }}</div>
                    <div class="act-do"><i class="fa-solid fa-arrow-right"></i>{{ a.action }}</div>
                  </div>
                  <i v-if="a.link" class="fa-solid fa-chevron-right act-go"></i>
                </div>
              </transition-group>
              <div v-if="!shownActions.length" class="text-center text-muted2 py-4"><i class="fa-regular fa-circle-check fa-2x d-block mb-2 text-success"></i>Nothing here.</div>
            </div>
          </div>
          <div class="col-xl-4">
            <div class="card p-4 h-100">
              <h5 class="fw-bold mb-0">Document coverage</h5>
              <p class="text-muted2 small mb-3">Operating sites per document type · hover for detail, click to filter the matrix</p>
              <div v-for="c in ins.documents.categories" :key="c.key" class="cov" :class="{ on: docFocus === c.key }" @click="docFocus = docFocus === c.key ? null : c.key">
                <div class="d-flex justify-content-between small"><b>{{ c.label }} <span v-if="!c.required" class="text-muted2 fw-normal">(optional)</span></b>
                  <span>{{ Math.round(c.ok / total(c) * 100) }}% ok</span></div>
                <div class="cov-bar">
                  <div class="c-ok" :style="{ width: c.ok / total(c) * 100 + '%' }" :title="`${c.ok} current`"></div>
                  <div class="c-stale" :style="{ width: c.stale / total(c) * 100 + '%' }" :title="`${c.stale} outdated`"></div>
                  <div class="c-miss" :style="{ width: c.missing / total(c) * 100 + '%' }" :title="`${c.missing} missing`"></div>
                </div>
                <div class="tiny text-muted2">{{ c.ok }} current · {{ c.stale }} outdated{{ c.max_age ? ` (> ${c.max_age}d)` : '' }} · {{ c.missing }} missing</div>
              </div>
              <div class="legend-row"><span><i class="lg c-ok"></i>Current</span><span><i class="lg c-stale"></i>Outdated / expired</span><span><i class="lg c-miss"></i>Missing</span></div>
            </div>
          </div>
        </div>

        <!-- compliance matrix -->
        <div class="card p-4 mt-3" id="m-matrix">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div><h5 class="fw-bold mb-0">Site compliance matrix</h5>
              <p class="text-muted2 small mb-0">Each cell is the latest document of that type · click a green/amber cell to open it · lowest score first</p></div>
            <div class="d-flex gap-2 align-items-center">
              <span v-if="docFocus" class="pill pill-iso">Showing gaps in {{ catLabel(docFocus) }} <i class="fa-solid fa-xmark ms-1" style="cursor:pointer" @click="docFocus = null"></i></span>
              <input v-model="mq" class="form-control form-control-sm" placeholder="Search site…" style="width:160px" />
            </div>
          </div>
          <div class="table-responsive mt-2">
            <table class="table matrix">
              <thead><tr><th>Site</th><th class="text-center">Score</th>
                <th v-for="c in ins.documents.categories" :key="c.key" class="text-center">{{ c.label }}</th><th class="d-none d-md-table-cell">Permit</th></tr></thead>
              <tbody>
                <tr v-for="r in (matrixAll ? matrixRows : matrixRows.slice(0, 12))" :key="r.id">
                  <td><router-link :to="`/site/${r.id}`" class="fw-bold text-decoration-none">{{ r.code }}</router-link><div class="tiny text-muted2 nm">{{ r.name }}</div></td>
                  <td class="text-center"><span class="score" :class="r.score >= 80 ? 'g-good' : r.score >= 50 ? 'g-watch' : 'g-risk'">{{ r.score }}</span></td>
                  <td v-for="c in ins.documents.categories" :key="c.key" class="text-center">
                    <span class="cell" :class="[`s-${r.cells[c.key].state}`, { opt: !c.required }]" @click="openDoc(r.cells[c.key])">
                      <i class="fa-solid" :class="STATE_ICON[r.cells[c.key].state]"></i>
                      <span class="cell-tip"><b>{{ c.label }} · {{ STATE_LABEL[r.cells[c.key].state] }}</b>
                        <template v-if="r.cells[c.key].latest"><br>{{ r.cells[c.key].name }}<br>{{ fmtDate(r.cells[c.key].latest) }} · {{ r.cells[c.key].age }} days old · {{ r.cells[c.key].count }} file(s)</template>
                        <template v-else><br>No {{ c.label }} uploaded for this site</template></span>
                    </span>
                  </td>
                  <td class="d-none d-md-table-cell"><span class="pill" :class="`pill-${r.permit}`">{{ r.days_left == null ? 'No date' : r.days_left < 0 ? 'Expired' : r.days_left + 'd' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button v-if="matrixRows.length > 12" class="btn btn-light btn-sm w-100" @click="matrixAll = !matrixAll">
            {{ matrixAll ? 'Show first 12' : `Show all ${matrixRows.length} sites` }}</button>
        </div>

        <!-- dockets -->
        <div class="row g-3 mt-1" id="m-docket">
          <div class="col-xl-4">
            <div class="card p-4 h-100">
              <h5 class="fw-bold mb-0">Why dockets get cancelled</h5>
              <p class="text-muted2 small mb-2">Root cause of {{ ins.dockets.total }} correction / cancellation reports · click to filter</p>
              <div class="dough-wrap"><canvas ref="causeEl"></canvas></div>
              <div v-if="ins.dockets.by_site.length" class="small mt-2"><b>Repeat sites:</b>
                <span v-for="s in ins.dockets.by_site.slice(0, 5)" :key="s.code" class="issue">{{ s.code }} ×{{ s.count }}</span></div>
            </div>
          </div>
          <div class="col-xl-8">
            <div class="card p-4 h-100">
              <div class="d-flex justify-content-between align-items-center">
                <div><h5 class="fw-bold mb-0">Docket incident log</h5>
                  <p class="text-muted2 small mb-0">{{ causeFilter ? causeLabel(causeFilter) : 'All causes' }} · newest first</p></div>
                <button v-if="causeFilter" class="btn btn-sm btn-light" @click="causeFilter = null">Clear filter</button>
              </div>
              <div class="log mt-2">
                <div v-for="d in docketRows" :key="d.id" class="log-row">
                  <span class="log-date" :title="d.date_inferred ? 'Date taken from the report text' : ''">{{ fmtDate(d.date) }}<sup v-if="d.date_inferred">*</sup></span>
                  <span class="pill" :class="d.type === 'Cancellation' ? 'pill-red' : 'pill-amber'">{{ d.type }}</span>
                  <b>{{ d.code || '—' }}</b>
                  <span class="log-cause"><i class="fa-solid" :class="CAUSE_ICON[d.cause_key]"></i>{{ d.cause }}</span>
                  <span class="log-txt" :title="d.issue">{{ d.issue }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- systems + anomalies + landowner -->
        <div class="row g-3 mt-1">
          <div class="col-lg-4">
            <div class="card p-4 h-100">
              <h5 class="fw-bold mb-0">System downtime <span class="text-muted2 fw-normal small">last 30 days</span></h5>
              <p class="text-muted2 small mb-3">Site-days with e-Docket, Gemma or CCTV "rosak/off"</p>
              <div v-for="d in ins.dockets.downtime" :key="d.site_id" class="down" @click="$router.push(`/site/${d.site_id}`)">
                <b>{{ d.code }}</b>
                <span class="chipx" :class="{ hot: d.edocket }"><i class="fa-solid fa-receipt"></i>{{ d.edocket }}</span>
                <span class="chipx" :class="{ hot: d.gemma }"><i class="fa-solid fa-server"></i>{{ d.gemma }}</span>
                <span class="chipx" :class="{ hot: d.cctv }"><i class="fa-solid fa-video"></i>{{ d.cctv }}</span>
              </div>
              <div v-if="!ins.dockets.downtime.length" class="text-muted2 small">No downtime recorded. 👍</div>
              <div class="tiny text-muted2 mt-2"><i class="fa-solid fa-receipt"></i> e-Docket · <i class="fa-solid fa-server"></i> Gemma · <i class="fa-solid fa-video"></i> CCTV (days)</div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card p-4 h-100">
              <h5 class="fw-bold mb-0 text-danger"><i class="fa-solid fa-triangle-exclamation me-2"></i>Suspicious sales entries</h5>
              <p class="text-muted2 small mb-3">&gt; 100 MT per lorry trip (normal ≈ 25–47 MT) — likely typing errors</p>
              <div v-for="a in ins.dockets.anomalies" :key="a.id" class="anom" @click="$router.push(`/site/${a.site_id}`)">
                <div><b>{{ a.code }}</b> <span class="text-muted2 small">{{ fmtDate(a.date) }}</span></div>
                <div class="text-end"><b>{{ Number(a.sales).toLocaleString() }} MT</b><div class="tiny text-muted2">{{ a.trips }} trips · {{ Number(a.per_trip).toLocaleString() }} MT/trip</div></div>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card p-4 h-100">
              <h5 class="fw-bold mb-0">Landowner monthly reports</h5>
              <p class="text-muted2 small mb-3">{{ ins.landowner.pending }} of {{ ins.landowner.total }} not approved · {{ ins.landowner.over_60 }} older than 60 days</p>
              <div class="lo-status">
                <div v-for="(n, st) in ins.landowner.by_status" :key="st"><b>{{ n }}</b><small>{{ st.replace('_', ' ') }}</small></div>
              </div>
              <div class="lo-list mt-2">
                <div v-for="s in ins.landowner.by_site" :key="s.code" class="lo-row" @click="$router.push(`/site/${s.site_id}`)">
                  <b>{{ s.code }}</b><span class="text-muted2 small">{{ s.count }} pending</span>
                  <span class="age" :class="s.age_days > 180 ? 'hot' : s.age_days > 60 ? 'warm' : ''">{{ s.age_days }}d</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- remarks / agency feed -->
        <div class="card p-4 mt-3">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div><h5 class="fw-bold mb-0">Site remarks &amp; agency visits <span class="text-muted2 fw-normal small">last 90 days</span></h5>
              <p class="text-muted2 small mb-0">From F001 daily remarks · agencies are detected automatically</p></div>
            <div class="d-flex gap-2 flex-wrap">
              <span v-for="(n, a) in ins.visits.by_agency" :key="a" class="pill pill-iso">{{ a }} ×{{ n }}</span>
              <span class="pill pill-gray"><i class="fa-solid fa-cloud-rain me-1"></i>rain {{ ins.visits.themes.rain }}</span>
              <span class="pill pill-gray"><i class="fa-solid fa-road me-1"></i>road {{ ins.visits.themes.road }}</span>
              <span class="pill pill-gray"><i class="fa-solid fa-plug me-1"></i>systems {{ ins.visits.themes.system }}</span>
            </div>
          </div>
          <div class="feed mt-3">
            <div v-for="(v, i) in ins.visits.items.slice(0, feedN)" :key="i" class="feed-row" :class="{ agency: v.agencies.length }">
              <span class="feed-dot"><i class="fa-solid" :class="v.agencies.length ? 'fa-building-shield' : /hujan/i.test(v.text) ? 'fa-cloud-rain' : 'fa-comment'"></i></span>
              <div><div class="small"><b>{{ v.code }}</b> · {{ fmtDate(v.date) }} <span v-for="a in v.agencies" :key="a" class="pill pill-iso ms-1">{{ a }}</span></div>
                <div class="feed-txt">{{ v.text }}</div></div>
            </div>
          </div>
          <button v-if="ins.visits.items.length > feedN" class="btn btn-light btn-sm w-100 mt-2" @click="feedN += 10">Show more</button>
        </div>
      </template>
    </template>

    <!-- ═════════════════════ REPOSITORY (original) ═════════════════════ -->
    <div v-if="tab === 'repo'" class="row g-3 mt-2">
      <div class="col-lg-8">
        <div class="card p-3">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <div class="input-group" style="max-width:280px"><span class="input-group-text bg-white"><i class="fa-solid fa-magnifying-glass text-secondary"></i></span><input class="form-control" v-model="q" placeholder="Search files by name..."/></div>
            <div class="ms-auto" style="width:190px"><DropdownSelect v-model="typeFilter" :options="typeOptions" :divider-after="0"/></div>
            <button class="btn btn-primary" @click="showUpload=true"><i class="fa-regular fa-file me-2"></i>Upload Files</button>
          </div>
          <div class="list-scroll">
            <table class="table align-middle mb-0 repo">
              <thead><tr><th>Type</th><th>File name</th><th>Date uploaded</th><th>Size</th><th class="text-end">Actions</th></tr></thead>
              <tbody>
                <tr v-for="f in filtered" :key="f.id" @dblclick="openPreview(f)">
                  <td><span class="file-ico" :class="f.isPdf?'pdf':'doc'"><i :class="f.isPdf?'fa-solid fa-file-pdf':'fa-regular fa-file'"></i></span></td>
                  <td><div class="fw-medium">{{ f.name }}</div><span class="pill" :class="typeMeta(f.type).cls">{{ typeMeta(f.type).label }}</span>
                    <span v-if="!f.has_file" class="pill pill-red ms-1" title="This record has no attached file"><i class="fa-solid fa-link-slash me-1"></i>No file</span></td>
                  <td class="text-muted2">{{ fmtDate(f.published_at) }}</td>
                  <td class="text-muted2">{{ fmtSize(f.size, f.has_file) }}</td>
                  <td class="text-end position-relative">
                    <button class="btn btn-sm btn-light rounded-circle" @click.stop="menuId = menuId===f.id?null:f.id"><i class="fa-solid fa-ellipsis"></i></button>
                    <div v-if="menuId===f.id" class="act-menu card">
                      <button class="act-item" @click="openPreview(f)"><i class="fa-regular fa-eye me-2 text-secondary"></i>View</button>
                      <button class="act-item" @click="download(f)"><i class="fa-solid fa-download me-2 text-secondary"></i>Download</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filtered.length"><td colspan="5" class="text-center text-muted2 py-4">No files found</td></tr>
              </tbody>
            </table>
          </div>
          <div class="small text-muted2 mt-2 px-1">Showing {{ filtered.length }} of {{ all.length }} files · double-click a row to preview</div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card p-4">
          <h5 class="fw-bold mb-3">Report Types</h5>
          <div v-for="t in typeBreakdown" :key="t.key" class="mb-3 rt" @click="typeFilter = typeFilter === t.key ? 'all' : t.key">
            <div class="d-flex justify-content-between"><b>{{ t.label }}</b><span class="text-muted2">{{ t.n }} files</span></div>
            <div class="progress mt-1" style="height:6px"><div class="progress-bar" :style="{width:t.pct+'%',background:t.c}"></div></div>
          </div>
          <hr/>
          <div class="d-flex justify-content-between"><span class="text-muted2">Total Files</span><h5 class="fw-bold mb-0">{{ all.length }}</h5></div>
        </div>
      </div>
    </div>

    <!-- Upload modal -->
    <div v-if="showUpload" class="modal-backdrop-c" @click.self="showUpload=false">
      <div class="modal-card">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex align-items-center gap-2"><span class="up-ic"><i class="fa-solid fa-file-arrow-up"></i></span><h5 class="fw-bold mb-0">Upload Monitoring Report</h5></div>
          <button class="btn-close-x" @click="showUpload=false"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <label class="lbl">Name <span class="text-danger">*</span></label>
        <input class="form-control mb-3" v-model="up.name" placeholder="e.g. ISO Audit 2026"/>
        <label class="lbl">Type <span class="text-danger">*</span></label>
        <div class="mb-3"><DropdownSelect v-model="up.type" :options="uploadTypeOptions" placeholder="Select type"/></div>
        <div class="row">
          <div class="col-6"><label class="lbl">Category</label><input class="form-control" v-model="up.category" placeholder="Optional"/></div>
          <div class="col-6"><label class="lbl">Version</label><input class="form-control" v-model="up.version" placeholder="Optional"/></div>
        </div>
        <label class="lbl mt-3">File <span class="text-danger">*</span></label>
        <input type="file" class="form-control" @change="onFile"/>
        <div class="small text-muted2 mt-1">Accepted: PDF, Word, Excel, PowerPoint, TXT, CSV</div>
        <div class="d-flex justify-content-end gap-2 mt-4">
          <button class="btn btn-light px-3" @click="showUpload=false">Cancel</button>
          <button class="btn btn-primary px-3" :disabled="!up.name||!up.type||!up.file" @click="doUpload"><i class="fa-solid fa-upload me-2"></i>Upload</button>
        </div>
      </div>
    </div>

    <!-- Preview modal -->
    <div v-if="preview" class="modal-backdrop-c" @click.self="preview=null">
      <div class="preview-card">
        <div class="preview-head d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2"><span class="file-ico pdf"><i class="fa-solid fa-file-pdf"></i></span>
            <div><div class="fw-bold">{{ preview.name }}</div><div class="small text-muted2">{{ (preview.ext||'PDF').toUpperCase().replace('.','') }}</div></div></div>
          <div class="d-flex gap-2"><button class="btn btn-sm btn-light" @click="download(preview)"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            <button class="btn-close-x" @click="preview=null"><i class="fa-solid fa-xmark"></i></button></div>
        </div>
        <iframe v-if="preview.url" :src="preview.url" class="preview-frame"></iframe>
        <div v-else class="preview-body d-flex flex-column align-items-center justify-content-center">
          <div class="warn-ic"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h5 class="fw-bold mt-3">Unable to Preview Document</h5>
          <p class="text-muted2 text-center" style="max-width:560px">The file '<b>{{ preview.file_name||preview.name }}</b>' has no stored file URL in this snapshot.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import PageBar from '../components/PageBar.vue'
import BriefPanel from '../components/BriefPanel.vue'
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { load, fmtDate, apiGet } from '../services/api'
import DropdownSelect from '../components/DropdownSelect.vue'
import Chart from 'chart.js/auto'

/* ── intelligence ─────────────────────────────────────────────────────── */
const REGIONS = [{ k: 'all', l: 'All regions' }, { k: 'Northern Region', l: 'Northern' }, { k: 'Southern Region', l: 'Southern' }]
const SEV = [{ k: 'critical', l: 'Critical' }, { k: 'high', l: 'High' }, { k: 'medium', l: 'Medium' }, { k: 'low', l: 'Low' }]
const CAT_ICON = { 'Data integrity': 'fa-solid fa-triangle-exclamation', Permit: 'fa-solid fa-file-signature', Documents: 'fa-solid fa-folder-open',
  Systems: 'fa-solid fa-plug-circle-xmark', Dockets: 'fa-solid fa-receipt', Landowner: 'fa-solid fa-handshake', Agency: 'fa-solid fa-building-shield', Repository: 'fa-solid fa-box-archive' }
const STATE_ICON = { ok: 'fa-check', stale: 'fa-clock-rotate-left', missing: 'fa-xmark' }
const STATE_LABEL = { ok: 'Current', stale: 'Outdated / expired', missing: 'Missing' }
const CAUSE_ICON = { wrong_entry: 'fa-user-pen', scan: 'fa-qrcode', system: 'fa-server', truck: 'fa-truck-medical', weight: 'fa-weight-scale', other: 'fa-circle-question' }
const CAUSE_COLOR = { wrong_entry: '#f97316', scan: '#1e87ef', system: ACC(), truck: '#6b6b6b', weight: '#14b8a6', other: '#c6c6c6' }

const tab = ref('intel'), region = ref('all'), ins = ref(null)
const actFilter = ref('all'), docFocus = ref(null), mq = ref(''), matrixAll = ref(false), causeFilter = ref(null), feedN = ref(10)
const done = reactive((() => { try { return JSON.parse(localStorage.getItem('sm_done_mon') || '{}') } catch { return {} } })())
const causeEl = ref(null); let causeChart

const openActions = computed(() => (ins.value?.actions || []).filter(a => !done[a.id]))
const doneCount = computed(() => (ins.value?.actions || []).filter(a => done[a.id]).length)
const shownActions = computed(() => actFilter.value === 'done' ? (ins.value?.actions || []).filter(a => done[a.id])
  : openActions.value.filter(a => actFilter.value === 'all' || a.sev === actFilter.value))
const matrixRows = computed(() => {
  const t = mq.value.toLowerCase()
  return (ins.value?.documents.rows || []).filter(r => (!t || `${r.code} ${r.name}`.toLowerCase().includes(t)) && (!docFocus.value || r.cells[docFocus.value].state !== 'ok'))
})
const docketRows = computed(() => (ins.value?.dockets.items || []).filter(d => !causeFilter.value || d.cause_key === causeFilter.value))
const total = c => (c.ok + c.stale + c.missing) || 1
const catLabel = k => ins.value.documents.categories.find(c => c.key === k)?.label
const causeLabel = k => ins.value.dockets.causes.find(c => c.key === k)?.label
function kpiTone(k) {
  if (k.unit === '%') return k.value >= 85 ? 't-good' : k.value >= 60 ? 't-warn' : 't-bad'
  if (k.good === 'down') return k.value > 0 ? 't-bad' : 't-good'
  return ''
}
function jump(key) {
  const map = { doc: 'm-matrix', full: 'm-matrix', permit: 'm-actions', docket: 'm-docket', edocket: 'm-docket', anomaly: 'm-docket', landowner: 'm-docket', visits: 'm-actions' }
  scrollTo(map[key] || 'm-actions')
}
function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
function toggleDone(a) { if (done[a.id]) delete done[a.id]; else done[a.id] = Date.now(); try { localStorage.setItem('sm_done_mon', JSON.stringify(done)) } catch {} }
function openDoc(c) { if (c.url) window.open(c.url, '_blank') }

async function loadIns() {
  const r = await apiGet(`monitoring/insights${region.value !== 'all' ? `?region=${encodeURIComponent(region.value)}` : ''}`)
  if (r) { ins.value = r; await nextTick(); drawCause() }
}
function drawCause() {
  if (!causeEl.value) return; causeChart?.destroy()
  const c = ins.value.dockets.causes
  causeChart = new Chart(causeEl.value, {
    type: 'doughnut',
    data: { labels: c.map(x => x.label), datasets: [{ data: c.map(x => x.count), backgroundColor: c.map(x => CAUSE_COLOR[x.key]), borderWidth: 3, borderColor: '#fff', hoverOffset: 10 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
      onHover: (e, el) => e.native.target.style.cursor = el.length ? 'pointer' : 'default',
      onClick: (e, el) => { if (el.length) { const k = c[el[0].index].key; causeFilter.value = causeFilter.value === k ? null : k } },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } } },
  })
}
watch(region, loadIns)
watch(tab, async t => { if (t === 'intel' && ins.value) { await nextTick(); drawCause() } })

/* ── repository (original behaviour) ──────────────────────────────────── */
const all=ref([]), q=ref(''), typeFilter=ref('all'), menuId=ref(null)
const showUpload=ref(false), preview=ref(null)
const up=ref({name:'',type:'',category:'',version:'',file:null})
const TYPES={
  iso:{label:'ISO',cls:'pill-iso',c:ACC()},
  docket_termination:{label:'Docket Cancellation',cls:'pill-amber',c:'#e5bf29'},
  complaint:{label:'Complaint',cls:'pill-red',c:'#cf2323'},
  f001:{label:'F001',cls:'pill-green',c:'#0e7c3d'},
}
const typeMeta=t=> TYPES[t] || {label:(t||'other').toUpperCase(),cls:'pill-gray',c:'#6b6b6b'}
const typeOptions=computed(()=>[{value:'all',label:'All Types'},...Object.keys(TYPES).map(k=>({value:k,label:TYPES[k].label}))])
const uploadTypeOptions=Object.keys(TYPES).map(k=>({value:k,label:TYPES[k].label}))
const filtered=computed(()=> all.value.filter(f=>(typeFilter.value==='all'||f.type===typeFilter.value)&&(!q.value||(f.name||'').toLowerCase().includes(q.value.toLowerCase()))))
const typeBreakdown=computed(()=>{ const c={}; all.value.forEach(f=>c[f.type]=(c[f.type]||0)+1); const mx=Math.max(1,...Object.values(c))
  return Object.keys(TYPES).map(k=>({key:k,label:TYPES[k].label,n:c[k]||0,pct:(c[k]||0)/mx*100,c:TYPES[k].c})) })
function fmtSize(b,h){ if(!h||b==null) return '—'; if(b<1024) return b.toFixed(2)+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(2)+' MB' }
function onFile(e){ up.value.file=e.target.files[0]||null }
function doUpload(){ // prototype: add to list locally
  all.value.unshift({ id:'new-'+Date.now(), name:up.value.name, type:up.value.type, file_name:up.value.file?.name,
    size:up.value.file?.size, has_file:!!up.value.file, published_at:new Date().toISOString(), isPdf:/pdf/i.test(up.value.file?.name||'') })
  showUpload.value=false; up.value={name:'',type:'',category:'',version:'',file:null}
}
function openPreview(f){ menuId.value=null; preview.value=f }
function download(f){ menuId.value=null; if(f?.url) window.open(f.url,'_blank') }
function onDoc(){ menuId.value=null }

onMounted(async()=>{
  document.addEventListener('click',onDoc)
  loadIns()
  const d=await load('monitoring-reports')
  all.value=(d||[]).map(r=>{ const f0=Array.isArray(r.files)&&r.files.length?r.files[0]:null
    return {...r, file_name:r.file_name??f0?.name, size:r.size??f0?.size, has_file:r.has_file??!!f0, ext:r.ext??f0?.ext, url:r.url??f0?.url, isPdf:/pdf/i.test((r.ext??f0?.ext)||(r.file_name??f0?.name)||'')} })
})
onBeforeUnmount(()=>{ document.removeEventListener('click',onDoc); causeChart?.destroy() })
</script>

<style scoped>
.badge-live{display:inline-flex;align-items:center;gap:6px;background:var(--ok-bg);color:var(--ok-fg);font-weight:700;font-size:11px;padding:.15rem .55rem;border-radius:999px}
.badge-live .dot{width:7px;height:7px;border-radius:50%;background:var(--ok-fg);animation:pulse 1.4s infinite}
@keyframes pulse{50%{opacity:.3}}
.tab-n{font-size:11px;background:var(--g100);color:var(--g600);border-radius:999px;padding:1px 7px;margin-left:4px}
.seg-sm button{padding:.4rem .9rem;font-size:13px}
.seg-xs{box-shadow:none;background:var(--g100);padding:3px}
.seg-xs button{padding:.3rem .7rem;font-size:12px}
.seg button{transition:all .15s}
.seg button:not(.on):hover{background:var(--pri-soft);color:var(--pri)}

/* briefing (shared look with dashboard) */
.brief{border-radius:12px;padding:20px 22px;background:var(--pri-deep);color:var(--g200);box-shadow:0 20px 40px rgba(30,58,138,.25);position:relative;overflow:hidden}
.brief::after{content:'';position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(96,165,250,.35),transparent 70%)}
.brief.tone-bad{background:var(--pri-deep)}
.brief.tone-good{background:var(--pri-deep)}
.brief-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;position:relative;z-index:1}
.brief-ic{width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:20px;color:#fff}
.brief-t{font-weight:700;font-size:18px;color:#fff}
.brief-s{font-size:12.5px;opacity:.75}
.sev-pills{display:flex;gap:6px;flex-wrap:wrap}
.sev-pill{cursor:pointer;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;transition:transform .15s}
.sev-pill:hover{transform:translateY(-2px)}
.brief-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px;position:relative;z-index:1}
.bcol{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px 14px;transition:background .2s}
.bcol:hover{background:rgba(255,255,255,.13)}
.bcol-h{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#96c7f7;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.bcol ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.5}
.bcol li+li{margin-top:4px}
.sev-critical{background:var(--bad);color:#fff}.sev-high{background:#f97316;color:#fff}.sev-medium{background:var(--warn);color:var(--warn-fg)}.sev-low{background:var(--g300);color:var(--g800)}

/* KPIs */
.kpis{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:12px}
.kpi{position:relative;cursor:pointer;border:1px solid var(--g200);border-top:4px solid var(--g200);background:var(--surface);border-radius:12px;padding:12px 14px;box-shadow:0 1px 2px rgba(26,26,26,.04),0 8px 24px rgba(26,26,26,.05);transition:transform .15s,box-shadow .15s}
.kpi:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(26,26,26,.1)}
.kpi.t-good{border-top-color:var(--ok)}.kpi.t-warn{border-top-color:var(--warn)}.kpi.t-bad{border-top-color:var(--bad)}
.kpi-l{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--g500);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kpi-v{font-size:24px;font-weight:700;color:var(--g1000);margin-top:4px}
.kpi-v small{font-size:13px;color:var(--g500);font-weight:600}
.kpi-u{font-size:11.5px;color:var(--g500)}
.kpi-bar{height:5px;background:var(--g100);border-radius:99px;margin-top:6px;overflow:hidden}
.kpi-bar div{height:100%;background:linear-gradient(90deg,var(--bad),var(--warn),var(--ok));background-size:300px 100%}
.kpi-tip{position:absolute;left:10px;right:10px;top:calc(100% + 6px);background:var(--inverse);color:#fff;font-size:11.5px;border-radius:8px;padding:8px 10px;opacity:0;pointer-events:none;transform:translateY(-4px);transition:all .15s;z-index:20}
.kpi:hover .kpi-tip{opacity:1;transform:none}

/* actions */
.acts{display:flex;flex-direction:column;gap:10px;max-height:560px;overflow:auto;padding-right:4px}
.act{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--g200);border-left-width:4px;border-radius:8px;padding:12px 14px;background:var(--surface);transition:transform .15s,box-shadow .15s,opacity .2s}
.act:hover{transform:translateX(3px);box-shadow:0 8px 20px rgba(26,26,26,.08)}
.act.done{opacity:.55}.act.done .act-title{text-decoration:line-through}
.sev-b-critical{border-left-color:var(--bad)}.sev-b-high{border-left-color:#f97316}.sev-b-medium{border-left-color:var(--warn)}.sev-b-low{border-left-color:var(--g300)}
.act-check{flex-shrink:0;width:26px;height:26px;border-radius:8px;border:2px solid var(--g300);background:var(--surface);color:transparent;display:grid;place-items:center;font-size:12px;transition:all .15s;margin-top:2px}
.act-check:hover{border-color:var(--ok);color:var(--ok)}
.act.done .act-check{background:var(--ok);border-color:var(--ok);color:#fff}
.act-body{flex:1;min-width:0;cursor:pointer}
.act-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:11.5px}
.sev-dot{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:4px}
.act-cat,.act-owner{color:var(--g600);display:inline-flex;gap:5px;align-items:center;font-weight:600}
.act-owner{margin-left:auto;background:var(--g100);padding:2px 8px;border-radius:999px}
.act-title{font-weight:700;color:var(--g1000);margin-top:4px;font-size:14.5px}
.act-why{font-size:12.5px;color:var(--g700);margin-top:3px;word-break:break-word}
.act-do{font-size:13px;color:var(--pri-strong);font-weight:600;margin-top:5px;display:flex;gap:7px;align-items:baseline}
.act-go{color:var(--g300);align-self:center;transition:transform .15s,color .15s}
.act:hover .act-go{color:var(--pri);transform:translateX(3px)}
.act-enter-from,.act-leave-to{opacity:0;transform:translateY(-6px)}
.act-enter-active,.act-leave-active{transition:all .2s}

/* coverage */
.cov{padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .15s;margin:0 -10px}
.cov:hover,.cov.on{background:var(--pri-soft)}
.cov-bar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--g100);margin:6px 0 3px}
.c-ok{background:var(--ok)}.c-stale{background:var(--warn)}.c-miss{background:var(--bad)}
.cov-bar>div{transition:width .5s}
.legend-row{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--g600);margin-top:10px}
.lg{display:inline-block;width:10px;height:10px;border-radius:4px;margin-right:5px;vertical-align:-1px}
.tiny{font-size:11px}

/* matrix */
.matrix th{font-size:11px;white-space:nowrap}
.matrix td{vertical-align:middle;font-size:13px}
.nm{max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.score{display:inline-grid;place-items:center;min-width:38px;height:26px;border-radius:8px;font-weight:700;font-size:12.5px;color:#fff}
.g-good{background:var(--ok)}.g-watch{background:var(--warn)}.g-risk{background:var(--bad)}
.cell{position:relative;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:8px;font-size:12px;cursor:pointer;transition:transform .15s}
.cell:hover{transform:scale(1.2);z-index:5}
.s-ok{background:var(--ok-bg);color:var(--ok-fg)}.s-stale{background:var(--warn-bg);color:var(--warn-fg)}.s-missing{background:var(--bad-line);color:var(--bad-fg)}
.cell.opt.s-missing{background:var(--g100);color:var(--g500)}
#m-matrix .table-responsive{padding-bottom:110px;margin-bottom:-100px}
.cell-tip{position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(-4px);width:240px;background:var(--inverse);color:#fff;font-size:11.5px;text-align:left;border-radius:8px;padding:8px 10px;opacity:0;pointer-events:none;transition:all .15s;z-index:30;white-space:normal;line-height:1.4}
.cell:hover .cell-tip{opacity:1;transform:translateX(-50%)}
.pill-active{background:var(--pri-200);color:var(--pri-strong)}.pill-warning{background:var(--warn-bg);color:var(--warn-fg)}.pill-expired{background:var(--bad-line);color:var(--bad-fg)}.pill-unknown{background:var(--g100);color:var(--g600)}
.pill-red{background:var(--bad-line);color:var(--bad-fg)}

/* dockets */
.dough-wrap{position:relative;height:250px}
.issue{display:inline-block;font-size:11px;background:var(--g100);color:var(--g700);border-radius:4px;padding:1px 7px;margin:2px 4px 0 0}
.log{max-height:330px;overflow:auto}
.log-row{display:grid;grid-template-columns:90px 100px 90px 190px 1fr;gap:10px;align-items:center;padding:8px 6px;border-bottom:1px solid var(--g100);font-size:12.5px;transition:background .12s}
.log-row:hover{background:var(--g50)}
.log-date{color:var(--g600)}
.log-cause{display:flex;gap:6px;align-items:center;color:var(--g800);font-weight:600}
.log-cause i{color:#f97316}
.log-txt{color:var(--g600);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.down,.anom,.lo-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .12s,transform .12s}
.down:hover,.anom:hover,.lo-row:hover{background:var(--g50);transform:translateX(2px)}
.down b{flex:1}
.chipx{font-size:11.5px;background:var(--g100);color:var(--g500);border-radius:4px;padding:2px 7px;display:inline-flex;gap:4px;align-items:center}
.chipx.hot{background:var(--bad-line);color:var(--bad-fg);font-weight:700}
.anom{justify-content:space-between;border:1px solid var(--bad-line);background:var(--bad-bg);margin-bottom:6px}
.lo-status{display:flex;gap:10px}
.lo-status div{flex:1;background:var(--g50);border-radius:8px;padding:8px 10px;display:flex;flex-direction:column}
.lo-status b{font-size:20px}.lo-status small{color:var(--g600);text-transform:capitalize}
.lo-list{max-height:220px;overflow:auto}
.lo-row b{width:90px}.lo-row .text-muted2{flex:1}
.age{font-size:11.5px;font-weight:700;border-radius:4px;padding:2px 7px;background:var(--g100);color:var(--g700)}
.age.warm{background:var(--warn-bg);color:var(--warn-fg)}.age.hot{background:var(--bad-line);color:var(--bad-fg)}

/* feed */
.feed{display:flex;flex-direction:column;gap:2px}
.feed-row{display:flex;gap:12px;padding:8px 6px;border-radius:8px;transition:background .12s}
.feed-row:hover{background:var(--g50)}
.feed-row.agency{background:var(--pri-soft)}
.feed-dot{width:30px;height:30px;border-radius:50%;background:var(--g100);color:var(--g600);display:grid;place-items:center;flex-shrink:0;font-size:12px}
.feed-row.agency .feed-dot{background:var(--pri);color:#fff}
.feed-txt{font-size:13px;color:var(--g800)}

/* repository (original) */
.file-ico{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;font-size:14px}
.file-ico.pdf{background:var(--bad-line);color:var(--bad)}.file-ico.doc{background:var(--g100);color:var(--g600)}
.repo tbody tr{transition:background .12s}
.repo tbody tr:hover{background:var(--g50)}
.rt{cursor:pointer;border-radius:8px;padding:4px 6px;margin:0 -6px;transition:background .12s}
.rt:hover{background:var(--g50)}
.list-scroll{max-height:62vh;overflow-y:auto}
.act-menu{position:absolute;right:10px;top:40px;width:170px;padding:8px;z-index:1200;text-align:left}
.act-item{display:flex;align-items:center;width:100%;border:0;background:transparent;border-radius:8px;padding:.55rem .7rem;font-weight:600;color:var(--g900)}
.act-item:hover{background:var(--g100)}
.modal-backdrop-c{position:fixed;inset:0;background:rgba(26,26,26,.45);display:grid;place-items:center;z-index:2000;padding:20px}
.modal-card{background:var(--surface);border-radius:12px;padding:24px;width:100%;max-width:560px;box-shadow:0 30px 80px rgba(0,0,0,.3)}
.lbl{font-size:13px;font-weight:700;color:var(--g800);margin-bottom:6px;display:block}
.up-ic{width:38px;height:38px;border-radius:8px;background:var(--pri);color:#fff;display:grid;place-items:center}
.btn-close-x{border:0;background:transparent;font-size:18px;color:var(--g600)}
.preview-card{background:var(--surface);border-radius:12px;width:100%;max-width:1000px;height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35)}
.preview-head{background:var(--g100);padding:16px 20px}
.preview-body{flex:1;background:var(--surface)}
.preview-frame{flex:1;width:100%;border:0}
.warn-ic{width:72px;height:72px;border-radius:50%;background:var(--pri-200);color:var(--pri);display:grid;place-items:center;font-size:26px}

@media (max-width:1399.98px){ .kpis{grid-template-columns:repeat(4,1fr)} }
@media (max-width:991.98px){ .brief-cols{grid-template-columns:1fr} .log-row{grid-template-columns:80px 1fr;}.log-row .log-txt,.log-row .log-cause{grid-column:1/-1} }
@media (max-width:767.98px){
  .page-wrap.mon{padding:16px 14px 40px}
  .kpis{grid-template-columns:repeat(2,1fr);gap:10px}
  .brief{padding:16px}
  .utabs{gap:16px;overflow-x:auto}
  .utab{white-space:nowrap}
}
</style>
