<script setup lang="ts">
import { computed } from 'vue'
import { useWelfareStore } from '../stores/welfare'
import type { Guide } from '../types'

const welfare = useWelfareStore()

type GuideGroup = { category: string; items: Guide[] }

// 按 category 分组，保持后端返回的先后顺序
const groups = computed<GuideGroup[]>(() => {
  const map = new Map<string, Guide[]>()
  for (const g of welfare.guides) {
    if (!map.has(g.category)) map.set(g.category, [])
    map.get(g.category)!.push(g)
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
})

function displayTitle(g: Guide) {
  return g.status === 'pending' ? `（待审核）${g.title}` : g.title
}
</script>

<template>
  <div>
    <h2 class="h2">省钱攻略</h2>
    <p class="desc">整合站内站外的省钱经验与货源信息，多为用户分享、需自行甄别。</p>

    <div v-for="group in groups" :key="group.category" class="card panel mt">
      <div class="panel-title"><span class="pt-dot"></span>{{ group.category }}</div>
      <div v-for="g in group.items" :key="g.id" class="guide-item" :class="{ warn: g.tone === 'warn' }">
        <div class="gi-t">{{ displayTitle(g) }}</div>
        <div class="gi-d">{{ g.content }}</div>
      </div>
    </div>

    <p class="desc mt" style="font-size: 12px">
      提示：以上多为用户经验与货源分享，涉及先款后货、二手交易有风险；下单前注意甄别，价格以实际为准。
    </p>
  </div>
</template>
