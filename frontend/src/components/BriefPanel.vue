<template>
  <!-- Briefing as a flow: WHAT → WHY → DO. Each item is an icon, one figure and a few words; the full sentence is the tooltip. -->
  <section class="bp">
    <header class="bp-head">
      <span class="bp-ic"><i :class="icon"></i></span>
      <div class="min0">
        <div class="bp-t">{{ title }}<span v-if="tag" class="bp-tag">{{ tag }}</span></div>
        <div class="bp-s">{{ sub }}</div>
      </div>
      <div class="ms-auto d-flex gap-2 align-items-center flex-wrap">
        <button v-for="s in SEV" :key="s.k" v-show="summary.counts?.[s.k]" class="bp-sev" :class="`s-${s.k}`" :title="`Show ${s.l.toLowerCase()} actions`" @click="$emit('sev', s.k)">
          <i :class="s.i"></i><b>{{ summary.counts?.[s.k] }}</b>{{ s.l }}</button>
        <slot name="extra" />
      </div>
    </header>
    <div class="bp-flow">
      <div v-for="(l, li) in lanes" :key="l.k" class="bp-lane" :class="`l-${l.k}`">
        <div class="bp-lh"><span class="bp-step"><i :class="l.i"></i></span>{{ l.t }}<i v-if="li < 2" class="fa-solid fa-chevron-right bp-arrow"></i></div>
        <div class="bp-items">
          <component :is="l.k === 'do' ? 'button' : 'div'" v-for="(c, i) in l.items" :key="i" class="bp-item" :class="`t-${c.tone}`" :title="c.tip || undefined"
                     @click="l.k === 'do' && $emit('actions')">
            <span class="bp-chip"><i :class="c.icon"></i></span>
            <span class="min0"><b>{{ c.value }}</b><small>{{ c.label }}</small></span>
          </component>
          <div v-if="!l.items.length" class="bp-none"><i class="fa-regular fa-circle-check"></i>Nothing to flag</div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ icon: { type: String, default: 'fa-solid fa-brain' }, title: String, tag: String, sub: String, summary: { type: Object, required: true }, whatLabel: { type: String, default: 'What happened' } })
defineEmits(['sev', 'actions'])
const SEV = [{ k: 'critical', l: 'Critical', i: 'fa-solid fa-circle-exclamation' }, { k: 'high', l: 'High', i: 'fa-solid fa-triangle-exclamation' },
  { k: 'medium', l: 'Medium', i: 'fa-solid fa-circle-info' }, { k: 'low', l: 'Low', i: 'fa-regular fa-lightbulb' }]
// older API responses have sentences only — fall back to them as plain items
const plain = (a, icon) => (a || []).map(t => ({ icon, value: t, label: '', tone: 'neutral', tip: '' }))
const lanes = computed(() => {
  const c = props.summary.cards, s = props.summary
  return [
    { k: 'what', t: props.whatLabel, i: 'fa-solid fa-chart-simple', items: c?.what || plain(s.what, 'fa-solid fa-chart-simple') },
    { k: 'why', t: 'Why', i: 'fa-solid fa-magnifying-glass', items: c?.why || plain(s.why, 'fa-solid fa-magnifying-glass') },
    { k: 'do', t: 'What to do', i: 'fa-solid fa-bolt', items: c?.do || plain(s.do, 'fa-solid fa-bolt') },
  ]
})
</script>
<style scoped>
.bp{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-sm)}
.bp-head{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line);background:var(--pri-soft)}
.bp-ic{width:40px;height:40px;border-radius:12px;background:var(--pri);color:#fff;display:grid;place-items:center;font-size:17px;flex-shrink:0}
.bp-t{font-weight:700;font-size:16px;color:var(--heading)}
.bp-tag{font-size:11px;font-weight:700;background:var(--pri);color:#fff;padding:2px 8px;border-radius:999px;margin-left:8px;vertical-align:middle}
.bp-s{font-size:12.5px;color:var(--muted)}
.bp-sev{display:inline-flex;gap:6px;align-items:center;border:1px solid transparent;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;transition:transform .15s}
.bp-sev:hover{transform:translateY(-1px)}
.s-critical{background:var(--bad-bg);color:var(--bad-fg);border-color:var(--bad-line)}.s-high{background:var(--hot-bg);color:var(--hot-fg);border-color:var(--hot-line)}
.s-medium{background:var(--warn-bg);color:var(--warn-fg);border-color:var(--warn-line)}.s-low{background:var(--g100);color:var(--g700);border-color:var(--line)}
.bp-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.bp-lane{padding:14px 18px 16px}
.bp-lane+.bp-lane{border-left:1px solid var(--line)}
.bp-lh{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
.bp-step{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:11px;background:var(--g100);color:var(--g700)}
.l-do .bp-step{background:var(--pri);color:#fff}
.bp-arrow{margin-left:auto;font-size:11px;color:var(--g400)}
.bp-items{display:flex;flex-direction:column;gap:8px}
.bp-item{display:flex;gap:10px;align-items:center;text-align:left;width:100%;border:1px solid transparent;background:transparent;border-radius:10px;padding:4px 6px;margin:0 -6px;color:var(--ink);transition:background .15s,border-color .15s}
button.bp-item:hover{background:var(--pri-soft);border-color:var(--pri-200)}
.bp-chip{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:14px;flex-shrink:0;background:var(--g100);color:var(--g700)}
.t-bad .bp-chip{background:var(--bad-bg);color:var(--bad)}.t-warn .bp-chip{background:var(--warn-bg);color:var(--warn-fg)}.t-good .bp-chip{background:var(--ok-bg);color:var(--ok)}
.bp-item b{display:block;font-size:15px;line-height:1.25;color:var(--heading)}
.bp-item small{display:block;font-size:12.5px;color:var(--muted);line-height:1.3}
.bp-none{font-size:13px;color:var(--muted);display:flex;gap:8px;align-items:center}
@media (max-width:991.98px){ .bp-flow{grid-template-columns:1fr} .bp-lane+.bp-lane{border-left:0;border-top:1px solid var(--line)} .bp-arrow{display:none} }
</style>
