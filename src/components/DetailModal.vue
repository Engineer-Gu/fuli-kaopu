<script setup lang="ts">
import { computed } from 'vue'
import { CAT_TAG, TYPE_TAG } from '../constants/app'
import { useUiStore } from '../stores/ui'
import { useWelfareStore } from '../stores/welfare'
import { openApp } from '../utils/deeplink'

const ui = useUiStore()
const welfare = useWelfareStore()

const activity = computed(() => ui.detailActivity)

const scoreClass = computed(() => {
  const score = activity.value?.score ?? 0
  return score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low'
})

const title = computed(() => {
  if (!activity.value) return ''
  return activity.value.status === 'pending' ? `（待审核）${activity.value.title}` : activity.value.title
})

function categoryTag() {
  const a = activity.value
  if (!a) return { c: 'cash', l: '' }
  return CAT_TAG[a.category] || TYPE_TAG[a.type] || { c: 'cash', l: a.category || '福利' }
}

function close() {
  ui.closeDetail()
}

function goClaim() {
  const a = activity.value
  if (!a) return
  if (a.appScheme) {
    const ok = openApp(a.appScheme)
    ui.showToast(ok ? `正在唤起 ${a.source}，请确认已安装该 App` : `请按入口自行前往：${a.entry}`)
    return
  }
  if (a.link && a.link !== '#') {
    window.open(a.link, '_blank')
    ui.showToast(`已打开页面：${a.entry}`)
  } else {
    ui.showToast(`请按入口自行前往：${a.entry}`)
  }
}

async function doVerify(result: 'valid' | 'invalid') {
  const a = activity.value
  if (!a) return
  try {
    await welfare.verifyActivity(a.id, result)
    ui.showToast(result === 'valid' ? '已记录验证有效，感谢反馈' : '已记录失效反馈，感谢提醒')
  } catch {
    ui.showToast('验证失败，请稍后重试')
  }
}
</script>

<template>
  <div class="overlay" :class="{ show: !!activity }" @click.self="close">
    <div class="modal" v-if="activity">
      <div class="modal-head">
        <h3>{{ title }}</h3>
        <button class="modal-close" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="verify-card">
          <div class="vc-title">
            靠谱度评分
            <span class="score-ring" :class="scoreClass">{{ activity.score }}</span>
          </div>
          <div class="kv"><div class="k">福利类型</div><div class="v"><span class="tag" :class="categoryTag().c">{{ activity.category }}</span></div></div>
          <div class="kv"><div class="k">福利价值</div><div class="v"><b>{{ activity.value }}</b></div></div>
          <div class="kv"><div class="k">活动截止</div><div class="v"><b>{{ activity.deadline }}</b></div></div>
          <div class="kv"><div class="k">信息来源</div><div class="v">{{ activity.source }}</div></div>
          <div class="kv"><div class="k">活动说明</div><div class="v" style="line-height:1.7">{{ activity.description }}</div></div>
        </div>

        <div class="verify-card" style="border-color: var(--green); background: #f4faf6">
          <div class="vc-title">真实性验证</div>
          <div class="verify-stats">
            <div class="verify-stat ok"><b>{{ activity.verifiedCount }}</b> 人验证有效</div>
            <div class="verify-stat bad"><b>{{ activity.invalidCount }}</b> 人反馈失效</div>
          </div>
          <div class="verify-actions">
            <button class="btn-verify btn-verify-ok" @click="doVerify('valid')">✓ 我验证有效</button>
            <button class="btn-verify btn-verify-bad" @click="doVerify('invalid')">✗ 反馈失效</button>
          </div>
          <div class="verify-hint">跳转参与后回来点一下，帮大家标记活动是否真实有效</div>
        </div>

        <div class="verify-card">
          <div class="vc-title">领取条件</div>
          <div v-for="(c, i) in activity.conditions" :key="i" class="kv"><div class="k"></div><div class="v">· {{ c }}</div></div>
        </div>

        <div class="verify-card" style="border-color: #f0d9a8; background: #fffaf0">
          <div class="vc-title">无法证实 / 需注意</div>
          <div v-for="(d, i) in activity.doubts" :key="i" class="kv"><div class="k"></div><div class="v">· {{ d }}</div></div>
        </div>

        <div class="verify-card">
          <div class="vc-title">领取入口</div>
          <div class="kv"><div class="k">入口</div><div class="v"><b>{{ activity.entry }}</b></div></div>
          <div v-if="activity.appScheme" class="kv"><div class="k">App 唤起</div><div class="v" style="color: var(--blue); word-break: break-all">{{ activity.appScheme }}</div></div>
          <div class="kv"><div class="k">链接</div><div class="v" style="color: var(--blue); word-break: break-all">{{ activity.link }}</div></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="close">关闭</button>
        <button class="btn btn-primary" @click="goClaim">{{ activity.appScheme ? '打开 App' : '去领取' }}</button>
      </div>
    </div>
  </div>
</template>
