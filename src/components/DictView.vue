<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CSelect from './CSelect.vue'
import { DICT_CATEGORIES } from '../constants/app'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useWelfareStore } from '../stores/welfare'
import type { DictWord } from '../types'

const welfare = useWelfareStore()
const ui = useUiStore()
const auth = useAuthStore()

const folded = ref(true)
const newWord = ref('')
const newCat = ref('现金红包')

const isAdmin = computed(() => auth.user?.role === 'admin')

const catOptions = DICT_CATEGORIES.map((c) => ({ value: c, label: c }))

const dictCount = computed(() => welfare.dictWords.length)

// 关键词命中贡献：来自后端实时统计（每个关键词在榜单标题/说明中的匹配次数）
const stats = computed(() => welfare.dictStats.slice(0, 8))
const maxN = computed(() => Math.max(1, ...welfare.dictStats.map((s) => s.n)))

function toggleFold() {
  folded.value = !folded.value
}

async function removeWord(d: DictWord) {
  try {
    await welfare.removeKeyword(d.id)
    ui.showToast('已删除关键词')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : '删除失败')
  }
}

async function addWord() {
  const kw = newWord.value.trim()
  if (!kw) {
    ui.showToast('请输入关键词')
    return
  }
  try {
    await welfare.submitKeyword({ kw, cat: newCat.value })
    newWord.value = ''
    ui.showToast('已提交词典关键词，审核通过后生效')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : '提交失败')
  }
}

onMounted(() => {
  welfare.loadDictStats().catch(() => {})
})
</script>

<template>
  <div>
    <h2 class="h2">词典管理</h2>
    <p class="desc">词典是检索的探针关键词。每类一组，按关键词逐一检索，能发现更多角落里的福利。</p>

    <div class="card panel" :class="{ folded }">
      <div class="panel-title panel-fold-title" @click="toggleFold">
        <span class="pt-dot"></span><span>当前关键词{{ isAdmin ? '（管理员可点 × 删除）' : '' }}</span>
        <span class="fold-count">共 {{ dictCount }} 个关键词</span>
        <span class="fold-arrow">{{ folded ? '▸' : '▾' }}</span>
      </div>
      <div class="fold-body">
        <div class="dict-wrap">
          <span v-for="d in welfare.dictWords" :key="d.id" class="dict-tag">
            {{ d.kw }} <span v-if="isAdmin" class="x" @click="removeWord(d)">×</span>
          </span>
        </div>
        <div class="row" style="align-items: center">
          <div style="flex: 1; min-width: 200px">
            <input class="input" v-model="newWord" placeholder="输入新关键词，回车添加，如：外卖券" @keydown.enter="addWord" />
          </div>
          <CSelect v-model="newCat" :options="catOptions" />
          <button class="btn btn-primary" @click="addWord">添加</button>
        </div>
      </div>
    </div>

    <div class="card panel mt">
      <div class="panel-title"><span class="pt-dot"></span>关键词命中贡献（当前榜单实时匹配）</div>
      <div v-if="stats.length" style="display: flex; flex-direction: column; gap: 10px">
        <div v-for="s in stats" :key="s.kw" style="display: flex; align-items: center; gap: 12px">
          <div style="width: 90px; color: var(--sub); font-size: 13px; flex-shrink: 0">{{ s.kw }}</div>
          <div style="flex: 1; height: 10px; background: #eef0f3; border-radius: 6px; overflow: hidden">
            <div style="height: 100%; background: linear-gradient(90deg, #2563eb, #7c3aed); border-radius: 6px" :style="{ width: `${(s.n / maxN) * 100}%` }"></div>
          </div>
          <div style="width: 40px; font-size: 13px; font-weight: 600">{{ s.n }}次</div>
        </div>
      </div>
      <div v-else style="color: var(--sub); padding: 12px">暂无命中数据。</div>
    </div>
  </div>
</template>
