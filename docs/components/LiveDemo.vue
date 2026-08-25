<script setup lang="ts">
// Live feel-bar demo: the PUBLIC <ShipGraph> Vue component mounted on
// StackMap's real graph.json (645 nodes / 755 links). Every feel primitive is
// exercised through reactive props + emits:
//   - hover halo   -> automatic (the core drives the 1-hop halo on node hover)
//   - focus camera -> click a node (or pick one) sets the reactive `focus` prop
//   - edge filters -> per-relation checkboxes drive the `hiddenRelations` prop
//   - community    -> a <select> drives the `focusCommunity` prop
import { computed, onMounted, ref, shallowRef } from 'vue';
import { ShipGraph } from '@shipgraph/vue';
import type { RawGraph, ShipGraphInstance } from '@shipgraph/vue';

const raw = shallowRef<RawGraph | null>(null);
const loadError = ref<string | null>(null);

// Reactive props driving the component (mutating these proves reactivity).
const hiddenRelations = ref<string[]>([]);
const focus = ref<string | null>(null);
const focusCommunity = ref<number | null>(null);
const draggable = ref(true);
const reducedMotion = ref(false);
const nodeQuery = ref('');

const instance = shallowRef<ShipGraphInstance | null>(null);
const lastHover = ref<string | null>(null);

// Relation classes present in the data (for the edge-filter checkboxes).
const relations = computed<string[]>(() => {
  const g = raw.value;
  if (!g) return [];
  return [...new Set(g.links.map((l) => l.relation))].sort();
});

// Communities present in the data (id -> human name) for the focus dropdown.
const communities = computed<Array<{ id: number; name: string }>>(() => {
  const g = raw.value;
  if (!g) return [];
  const seen = new Map<number, string>();
  for (const n of g.nodes) {
    const c = n.community;
    if (c == null || seen.has(c)) continue;
    seen.set(c, n.community_name ?? `Community ${c}`);
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.id - b.id);
});

// Node picker options, filtered by the search box (cap the list for perf).
const nodeOptions = computed<Array<{ id: string; label: string }>>(() => {
  const g = raw.value;
  if (!g) return [];
  const q = nodeQuery.value.trim().toLowerCase();
  const matches = g.nodes.filter(
    (n) => !q || (n.label ?? n.id).toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
  );
  return matches.slice(0, 200).map((n) => ({ id: n.id, label: n.label ?? n.id }));
});

function toggleRelation(rel: string, on: boolean): void {
  const set = new Set(hiddenRelations.value);
  if (on) set.delete(rel);
  else set.add(rel);
  hiddenRelations.value = [...set];
}

function onReady(g: ShipGraphInstance): void {
  instance.value = g;
}

function fit(): void {
  instance.value?.fit();
}

function reset(): void {
  hiddenRelations.value = [];
  focus.value = null;
  focusCommunity.value = null;
  nodeQuery.value = '';
  fit();
}

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}graph.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw.value = (await res.json()) as RawGraph;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
});
</script>

<template>
  <div class="sg-demo">
    <div v-if="loadError" class="sg-demo__loading">Failed to load graph.json: {{ loadError }}</div>
    <div v-else-if="!raw" class="sg-demo__loading">Loading real graph.json…</div>

    <template v-else>
      <ShipGraph
        class="sg-demo__graph"
        :data="raw"
        :hidden-relations="hiddenRelations"
        :focus="focus"
        :focus-community="focusCommunity"
        :draggable="draggable"
        :reduced-motion="reducedMotion"
        :deep-link="false"
        @node="(id: string) => (focus = id)"
        @hover="(id: string | null) => (lastHover = id)"
        @ready="onReady"
      />

      <div class="sg-demo__panel">
        <h3>shipgraph · live</h3>

        <h4>Focus camera</h4>
        <input v-model="nodeQuery" type="search" placeholder="Search nodes…" />
        <select v-model="focus">
          <option :value="null">— pick a node —</option>
          <option v-for="n in nodeOptions" :key="n.id" :value="n.id">{{ n.label }}</option>
        </select>

        <h4>Community focus</h4>
        <select v-model="focusCommunity">
          <option :value="null">— all communities —</option>
          <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>

        <h4>Edge filters ({{ relations.length }})</h4>
        <label v-for="rel in relations" :key="rel">
          <input
            type="checkbox"
            :checked="!hiddenRelations.includes(rel)"
            @change="toggleRelation(rel, ($event.target as HTMLInputElement).checked)"
          />
          {{ rel }}
        </label>

        <h4>Options</h4>
        <label><input v-model="draggable" type="checkbox" /> Draggable (spring-back)</label>
        <label><input v-model="reducedMotion" type="checkbox" /> Reduced motion</label>

        <h4>Actions</h4>
        <button type="button" @click="fit">Fit</button>
        <button type="button" @click="reset">Reset</button>
      </div>

      <div class="sg-demo__hint">
        Hover a node for its 1-hop halo · click to focus{{ lastHover ? ` · hovering ${lastHover}` : '' }}
      </div>
    </template>
  </div>
</template>
