<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { selfCheck } from '../services/api'
import { useUiStore } from '../stores/ui'
import type { SearchHit, SelfCheckResult } from '../types'

const ui = useUiStore()

const STEPS = ['提取活动文字', '拆出承诺', '检索核对来源', '判断真伪']

const input = ref('')
const step = ref(0)
const showResult = ref(false)
const result = ref<CheckResult | null>(null)
const webSources = ref<SearchHit[]>([])
const webChecking = ref(false)
const webQuery = ref('')
// 打字机效果：检索词逐字打出
const typedQuery = ref('')
const typingDone = ref(false)
// 后端返回的完整查证结论（基于来源可信度）
const verify = ref<SelfCheckResult | null>(null)

let timer: ReturnType<typeof setInterval> | undefined

type CheckResult = {
  score: number
  verdict: string
  scoreClass: string
  kindLabel: string
  kindClass: string
  hasLimit: boolean
  hasArea: boolean
  hasDate: boolean
  hasSource: boolean
  isLink: boolean
}

function buildResult(text: string): CheckResult {
  const isLink = /^https?:\/\//i.test(text)
  const hasMoney = /(满\s*\d+.*减|立减|红包|返现|免单|津贴)/.test(text)
  const isTech = /(云服务器|云数据库|数据库|对象存储|OSS|免费额度|tokens|学生机|ECS|RDS|Redis|PolarDB|大模型|云主机)/.test(text)
  const isPhone = /(话费|充值|流量|运营商|移动|联通|电信)/.test(text)
  const isFood = /(外卖|美团|饿了么|闪购|京东秒送|餐补)/.test(text)
  const hasArea = /(广东|仅限|地区|指定商户|门店)/.test(text)
  const hasLimit = /(先到先得|名额有限|限|专属|新客|会员|学生|认证|学信网)/.test(text)
  const hasDate = /(有效期|至\s*\d|截止|30天|7天|一年|1年|三个月|3个月)/.test(text)
  const hasSource = isLink || /(银行|工会|官方|App|小程序|官网|阿里云|腾讯云|华为云)/.test(text)

  let score = 60
  if (hasMoney) score += 16
  if (isTech) score += 14
  if (hasSource) score += 15
  if (hasDate) score += 7
  if (hasArea) score -= 8
  if (!hasSource) score -= 25
  if (!hasMoney && !isTech && !isPhone && !isFood) score -= 20
  score = Math.max(15, Math.min(95, score))

  const kind = isTech
    ? { label: '技术资源', c: 'quota' }
    : isPhone
      ? { label: '话费充值', c: 'cash' }
      : isFood
        ? { label: '外卖券', c: 'right' }
        : hasMoney
          ? { label: '现金', c: 'cash' }
          : { label: '未识别到明确类型', c: 'quota' }

  return {
    score,
    verdict: score >= 80 ? '真实可靠，可直接参加' : score >= 55 ? '基本可信，但需注意条件' : '存疑，建议不要参加',
    scoreClass: score >= 80 ? 'score-high' : score >= 55 ? 'score-mid' : 'score-low',
    kindLabel: kind.label,
    kindClass: kind.c,
    hasLimit,
    hasArea,
    hasDate,
    hasSource,
    isLink,
  }
}

function clear() {
  if (timer) clearInterval(timer)
  input.value = ''
  step.value = 0
  showResult.value = false
  result.value = null
  webSources.value = []
  webChecking.value = false
  webQuery.value = ''
  verify.value = null
}

async function run() {
  const text = input.value.trim()
  if (!text) {
    ui.showToast('请先粘贴活动链接或文字')
    return
  }
  if (timer) clearInterval(timer)
  showResult.value = true
  result.value = null
  webSources.value = []
  webChecking.value = true
  webQuery.value = ''
  typedQuery.value = ''
  typingDone.value = false
  verify.value = null
  step.value = 0
  let s = 1
  timer = setInterval(() => {
    step.value = s
    s += 1
    if (s > 4) {
      if (timer) clearInterval(timer)
      result.value = buildResult(text)
    }
  }, 500)
  // 调用元宝搜索核对来源，后端返回「来源可信度分级 + 交叉验证结论」
  try {
    const res = await selfCheck(text)
    webQuery.value = res.query
    // 打字机效果：检索词逐字打出
    typeWriter(res.query)
    verify.value = res
    // 来源结果逐条延迟加入（第 4 层逐条落位）
    webSources.value = []
    res.hits.forEach((hit, i) => {
      setTimeout(() => { webSources.value = [...webSources.value, hit] }, i * 120)
    })
  } catch {
    webSources.value = []
    verify.value = null
  } finally {
    webChecking.value = false
  }
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (typeTimer) clearInterval(typeTimer)
})

// 打字机效果：逐字打出检索词
let typeTimer: ReturnType<typeof setInterval> | undefined
function typeWriter(text: string) {
  if (typeTimer) clearInterval(typeTimer)
  typedQuery.value = ''
  typingDone.value = false
  let i = 0
  typeTimer = setInterval(() => {
    typedQuery.value = text.slice(0, ++i)
    if (i >= text.length) {
      clearInterval(typeTimer)
      typingDone.value = true
    }
  }, 50)
}

// 来源可信度 → 标签样式类
function tierClass(tier?: string): string {
  if (tier === 'official') return 'official'
  if (tier === 'media') return 'media'
  if (tier === 'marketing') return 'marketing'
  if (tier === 'community') return 'community'
  return 'unknown'
}
</script>

<template>
  <div>
    <h2 class="h2">活动自查</h2>
    <p class="desc">看到一个福利活动却不确定真假？把链接或活动文字贴进来，帮你拆出承诺、核对来源、判断真实性和能否直接参与。</p>

    <div class="card panel selfcheck">
      <div class="panel-title"><span class="pt-dot"></span>输入要查证的内容</div>
      <textarea
        class="textarea"
        v-model="input"
        placeholder="粘贴活动链接 https://... 或直接粘贴活动宣传文字，例如：「满 20.01 减 20 元，微信支付立减，先到先得，限广东地区」"
      ></textarea>
      <div class="mt row" style="justify-content: flex-end">
        <button class="btn btn-ghost" @click="clear">清空</button>
        <button class="btn btn-primary" @click="run">开始查证</button>
      </div>

      <div class="sc-flow">
        <template v-for="(s, i) in STEPS" :key="s">
          <div class="sc-step" :class="{ done: step > i + 1, active: step === i + 1 }">
            <div class="n">{{ i + 1 }}</div>
            <div class="s">{{ s }}</div>
          </div>
          <div v-if="i < STEPS.length - 1" class="sc-line" :class="{ done: step > i + 1 }"></div>
        </template>
      </div>

      <div v-if="showResult" class="sc-result" :class="{ show: showResult }">
        <div v-if="!result" style="color: var(--sub); text-align: center; padding: 20px">分析中…</div>
        <template v-else>
          <div class="verify-card">
            <div class="vc-title">
              判断结论
              <span class="score-ring" :class="result.scoreClass">{{ result.score }}</span>
            </div>
            <div class="kv"><div class="k">本地判断</div><div class="v"><b>{{ result.verdict }}</b></div></div>
            <div v-if="verify" class="kv">
              <div class="k">来源核验</div>
              <div class="v">
                <b :class="verify.verdict === 'trust' ? 'verdict-trust' : verify.verdict === 'doubt' ? 'verdict-doubt' : 'verdict-unclear'">{{ verify.verdictLabel }}</b>
                <span class="vc-reason">{{ verify.verdictReason }}</span>
              </div>
            </div>
            <div v-if="verify && verify.riskCount > 0" class="kv">
              <div class="k">风险预警</div>
              <div class="v" style="color: var(--red)">交叉验证发现 {{ verify.riskCount }} 处疑似风险信号，建议谨慎</div>
            </div>
            <div v-else-if="!webChecking" class="kv"><div class="k">来源核验</div><div class="v" style="color: var(--muted)">未能完成来源核验</div></div>
          </div>
          <div class="verify-card">
            <div class="vc-title">拆出的承诺</div>
            <div class="kv"><div class="k">福利类型</div><div class="v"><span class="tag" :class="result.kindClass">{{ result.kindLabel }}</span></div></div>
            <div class="kv"><div class="k">领取条件</div><div class="v">{{ result.hasLimit ? '检测到名额/身份/认证限制' : '未检测到明显限制' }}</div></div>
            <div class="kv"><div class="k">地区限制</div><div class="v">{{ result.hasArea ? '可能限地区/门店' : '未提及地区限制' }}</div></div>
            <div class="kv"><div class="k">有效期</div><div class="v">{{ result.hasDate ? '有提及有效期' : '未提及有效期' }}</div></div>
            <div class="kv"><div class="k">来源</div><div class="v">{{ result.hasSource ? (result.isLink ? '已提供链接，可进一步打开核对' : '命中官方/权威渠道词汇') : '来源不明' }}</div></div>
          </div>
          <div class="verify-card" style="border-color: #e8e0d2; background: #faf7f0">
            <div class="vc-title">无法证实 / 需注意</div>
            <div class="kv"><div class="k"></div><div class="v">{{ result.hasSource ? '· 建议打开原链接，核对官方页面' : '· 来源不明，无法核实' }}</div></div>
            <div class="kv"><div class="k"></div><div class="v">{{ result.hasArea ? '· 存在地区/身份门槛' : '· 未发现明显门槛' }}</div></div>
            <div class="kv"><div class="k"></div><div class="v">{{ result.hasLimit ? '· 有身份/名额限制，可能轮不到' : '· 门槛较低' }}</div></div>
          </div>
          <div class="verify-card" style="border-color: var(--blue); background: #f4f8ff">
            <div class="vc-title">元宝搜索核对来源</div>
            <div v-if="webChecking" style="color: var(--sub); font-size: 13px">正在检索核对来源…</div>
            <div v-else-if="!webSources.length" style="color: var(--sub); font-size: 13px">未检索到相关来源，请核对内容后再试</div>
            <template v-else>
              <div class="sc-query">检索词：<span class="typewriter-cursor">{{ typedQuery || webQuery }}</span></div>
              <div v-for="hit in webSources" :key="hit.url" class="sc-source">
                <div class="sc-source-top">
                  <span class="sh-tag" :class="tierClass(hit.tier)">{{ hit.tierLabel || hit.source }}</span>
                  <a class="sc-source-title" :href="hit.url" target="_blank" rel="noopener">{{ hit.title }}</a>
                </div>
                <span class="sc-source-passage">{{ hit.passage }}</span>
                <div v-if="hit.tierReason" class="sc-source-reason">{{ hit.tierReason }}</div>
              </div>
            </template>
          </div>
          <p style="font-size: 12px; color: var(--muted); margin-top: 6px">「本地判断」为规则快速分析，「来源核验」为基于元宝搜索来源可信度的交叉验证结论。</p>
        </template>
      </div>
    </div>
  </div>
</template>
