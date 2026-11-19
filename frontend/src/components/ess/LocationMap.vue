<template>
  <div class="lm" :style="{ height }">
    <div ref="el" class="lm-map"></div>
    <div class="lm-tools">
      <button :class="{ on: view === 'pins' }" @click="view = 'pins'" title="Pin lokasi"><i class="fa-solid fa-location-dot"></i><span>Pin</span></button>
      <button :class="{ on: view === 'heat' }" @click="view = 'heat'" title="Heatmap kepadatan"><i class="fa-solid fa-fire"></i><span>Heat</span></button>
      <button :class="{ on: fence }" @click="fence = !fence" title="Geofence 1 km di sekeliling tapak"><i class="fa-solid fa-draw-polygon"></i><span>Geofence</span></button>
      <button :class="{ on: sat }" @click="sat = !sat" title="Satelit"><i class="fa-solid fa-satellite"></i></button>
    </div>
    <div class="lm-legend">
      <span><i class="d ok"></i>Tepat masa</span><span><i class="d late"></i>Lewat</span><span><i class="d out"></i>Luar geofence</span>
      <span><i class="d ring"></i>Lokasi tapak (anggaran)</span><span><i class="d gps"></i>GPS</span>
    </div>
    <div v-if="!points.length" class="lm-empty"><i class="fa-solid fa-map-location-dot"></i>Tiada lokasi direkod untuk tempoh ini</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
const props = defineProps({ points: { type: Array, default: () => [] }, sites: { type: Array, default: () => [] }, offices: { type: Array, default: () => [] }, height: { type: String, default: '420px' },
  showNames: { type: Boolean, default: false }, fenceM: { type: Number, default: 1000 } })
const emit = defineEmits(['pick'])
const el = ref(null), view = ref('pins'), fence = ref(false), sat = ref(false)
let map, base, pins, heat, siteLayer, fenceLayer
const L = () => window.L
const ESRI = p => `https://server.arcgisonline.com/ArcGIS/rest/services/${p}/MapServer/tile/{z}/{y}/{x}`

const FLAG = { same_spot: '👥 titik & masa sama dengan staf lain', low_accuracy: '📶 GPS kurang tepat', no_gps: '🚫 tiada GPS', no_photo: '📷 tiada selfie' }
function color(p) { return p.outside ? '#cf2323' : p.late ? '#e5bf29' : '#0e7c3d' }
function popup(p) {
  return `<div class="lm-pop"><b>${p.name || ''}</b>${p.code ? ` <small>${p.code} · ${p.office}</small>` : ''}
    <div>${p.date} · masuk <b>${p.tin || '—'}</b> · keluar <b>${p.tout || '—'}</b></div>
    <div class="${p.late ? 'w' : ''}">${p.late ? 'Lewat (selepas 08:30)' : p.tin ? 'Tepat masa' : (p.status || '')}</div>
    <div class="m">${p.loc.precision === 'gps' ? `📍 GPS${p.accuracy_m ? ` ±${p.accuracy_m} m` : ''}` : '🏗 Lokasi tapak (anggaran)'} — ${p.loc.label}${p.outside ? ' <b class="r">· di luar geofence</b>' : ''}</div>
    ${(p.flags || []).filter(f => f !== 'outside_fence').map(f => `<span class="fl">${FLAG[f] || f}</span>`).join('')}
    ${p.photo_in || p.photo_out ? `<div class="ph">${p.photo_in ? `<a href="${p.photo_in}" target="_blank"><img src="${p.photo_in}"/><small>masuk</small></a>` : ''}${p.photo_out ? `<a href="${p.photo_out}" target="_blank"><img src="${p.photo_out}"/><small>keluar</small></a>` : ''}</div>` : ''}</div>`
}
function draw() {
  if (!map) return
  ;[pins, heat, siteLayer, fenceLayer].forEach(l => l && map.removeLayer(l))
  siteLayer = L().layerGroup(props.sites.map(s => L().circleMarker([s.lat, s.lng], { radius: 5, color: '#525252', weight: 2, fillColor: '#fff', fillOpacity: 1 })
    .bindTooltip(`<b>${s.site_code}</b><br><small>${s.name || ''}</small>`))).addTo(map)
  const offices = props.offices.map(o => L().marker([+o.lat, +o.lng], { icon: L().divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: `<div class="lm-off"><i class="fa-solid fa-building"></i></div>` }) })
    .bindTooltip(`<b>${o.code}</b> ${o.name}<br><small>geofence ${o.radius} m</small>`))
  siteLayer.addLayer(L().layerGroup(offices))
  if (fence.value) fenceLayer = L().layerGroup([
    ...props.sites.filter(s => (s.radius ?? props.fenceM) > 0).map(s => L().circle([s.lat, s.lng], { radius: s.radius ?? props.fenceM, color: ACC(), weight: 1, dashArray: '4 4', fillOpacity: .05 })),
    ...props.offices.map(o => L().circle([+o.lat, +o.lng], { radius: o.radius, color: '#0269d0', weight: 1.5, dashArray: '4 4', fillOpacity: .08 }))]).addTo(map)
  if (view.value === 'heat' && L().heatLayer) {
    heat = L().heatLayer(props.points.map(p => [p.loc.lat, p.loc.lng, p.late ? 1 : .6]), { radius: 28, blur: 22, maxZoom: 13,
      gradient: { .2: '#49d2ef', .45: '#16bd5e', .7: '#e5bf29', 1: '#cf2323' } }).addTo(map)
  } else {
    pins = L().markerClusterGroup({ maxClusterRadius: 40, showCoverageOnHover: false, spiderfyOnMaxZoom: true,
      iconCreateFunction: c => { const n = c.getChildCount(), late = c.getAllChildMarkers().filter(m => m.options.p.late).length
        return L().divIcon({ className: '', iconSize: [40, 40], html: `<div class="lm-cl" style="background:conic-gradient(#e5bf29 0 ${late / n * 360}deg,#0e7c3d 0)"><span>${n}</span></div>` }) } })
    props.points.forEach(p => {
      const site = p.loc.precision === 'site'
      const icon = L().divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<div class="lm-pin ${site ? 'site' : 'gps'}" style="--c:${color(p)}"><i class="fa-solid ${p.outside ? 'fa-triangle-exclamation' : p.late ? 'fa-clock' : 'fa-check'}"></i>${props.showNames && p.code ? `<span>${p.code}</span>` : ''}</div>` })
      const m = L().marker([p.loc.lat + jitter(p, 0), p.loc.lng + jitter(p, 1)], { icon, p }).bindPopup(popup(p))
      m.on('click', () => emit('pick', p)); pins.addLayer(m)
      if (p.out_loc) pins.addLayer(L().marker([p.out_loc.lat, p.out_loc.lng], { p, icon: L().divIcon({ className: '', iconSize: [18, 18], html: '<div class="lm-out"><i class="fa-solid fa-right-from-bracket"></i></div>' }) }).bindPopup(`Clock-out ${p.tout || ''}`))
    })
    map.addLayer(pins)
  }
  fit()
}
// many people share one site coordinate: spread them a little so pins don't stack exactly
function jitter(p, k) { if (p.loc.precision !== 'site') return 0; const h = [...String(p.id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7); return (((h >> (k * 8)) & 255) / 255 - .5) * 0.0025 }
let fitted = ''
function fit() {
  const pts = props.points.map(p => [p.loc.lat, p.loc.lng]).concat(props.points.length ? [] : props.sites.map(s => [s.lat, s.lng]))
  const key = pts.length + ':' + (pts[0] || '')
  if (!pts.length || key === fitted) return
  fitted = key; map.fitBounds(L().latLngBounds(pts), { padding: [40, 40], maxZoom: 14 })
}
function setBase() { if (base) map.removeLayer(base); base = L().tileLayer(sat.value ? ESRI('World_Imagery') : ESRI('World_Street_Map'), { maxZoom: 19 }).addTo(map); base.bringToBack() }
watch(() => [props.points, props.sites, props.offices], () => { fitted = ''; draw() })
watch([view, fence], draw)
watch(sat, setBase)
const onResize = () => map?.invalidateSize()
onMounted(async () => {
  await nextTick()
  map = L().map(el.value, { zoomControl: true, attributionControl: false }).setView([3.2, 101.5], 9)
  setBase(); draw(); window.addEventListener('resize', onResize); setTimeout(() => map.invalidateSize(), 200)
})
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); map?.remove() })
defineExpose({ focus: (lat, lng) => map?.flyTo([lat, lng], 15) })
</script>

<style scoped>
.lm{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--line,var(--g200))}
.lm-map{position:absolute;inset:0;z-index:1}
.lm-tools{position:absolute;top:10px;right:10px;z-index:500;display:flex;gap:4px;background:color-mix(in srgb,var(--surface) 92%,transparent);border-radius:8px;padding:4px;box-shadow:0 4px 14px rgba(26,26,26,.15)}
.lm-tools button{border:0;background:transparent;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;color:var(--g700);display:flex;gap:5px;align-items:center}
.lm-tools button.on{background:var(--pri);color:#fff}
.lm-legend{position:absolute;left:10px;bottom:10px;z-index:500;display:flex;gap:10px;flex-wrap:wrap;background:color-mix(in srgb,var(--surface) 92%,transparent);border-radius:8px;padding:5px 10px;font-size:11px;color:var(--g700);max-width:calc(100% - 20px)}
.d{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.d.ok{background:var(--ok)}.d.late{background:var(--warn)}.d.out{background:var(--bad)}.d.ring{border:2px dashed var(--g700)}.d.gps{border:2px solid var(--g700)}
.lm-empty{position:absolute;inset:0;z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--g600);background:rgba(248,250,252,.7);font-weight:600;pointer-events:none}
.lm-empty i{font-size:30px;color:var(--pri-300)}
@media (max-width:767.98px){ .lm-tools span{display:none} .lm-legend{font-size:10px;gap:6px} }
</style>
<style>
.lm-pin{width:26px;height:26px;border-radius:50%;background:var(--c);color:#fff;display:grid;place-items:center;font-size:11px;border:3px solid var(--surface);box-shadow:0 2px 8px rgba(0,0,0,.35);position:relative;transition:transform .15s}
.lm-pin.site{border-style:dashed;border-color:#fff}
.lm-pin:hover{transform:scale(1.25)}
.lm-pin span{position:absolute;top:100%;left:50%;transform:translate(-50%,3px);background:var(--surface);color:var(--g1000);font-size:9.5px;font-weight:700;border-radius:4px;padding:0 4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.lm-out{width:18px;height:18px;border-radius:4px;background:var(--inverse);color:#fff;font-size:8px;display:grid;place-items:center;border:2px solid var(--surface)}
.lm-cl{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.3)}
.lm-cl span{width:30px;height:30px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font-weight:700;font-size:12px}
.lm-pop{font-family:Inter,system-ui,sans-serif;font-size:12.5px;line-height:1.45;min-width:200px}
.lm-pop small{color:var(--g600)}.lm-pop .fl{display:inline-block;font-size:11px;background:var(--hot-bg);color:var(--hot-fg);border-radius:4px;padding:1px 6px;margin:3px 3px 0 0}
.lm-pop .ph{display:flex;gap:6px;margin-top:6px}.lm-pop .ph a{text-align:center;color:var(--g600);text-decoration:none}.lm-pop .ph img{width:72px;height:72px;object-fit:cover;border-radius:8px;display:block}
.lm-off{width:30px;height:30px;border-radius:8px;background:var(--blue);color:#fff;display:grid;place-items:center;border:3px solid var(--surface);box-shadow:0 2px 8px rgba(0,0,0,.35)}.lm-pop .w{color:var(--warn-fg);font-weight:700}.lm-pop .m{color:var(--g700);margin-top:3px}.lm-pop .r{color:var(--bad)}
</style>
