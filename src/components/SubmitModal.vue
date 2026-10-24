<script setup lang="ts">
import { ref } from 'vue'
import { ACTIVITY_CATEGORIES } from '../constants/activity-categories'
import { DICT_CATEGORIES } from '../constants/app'
import CSelect from './CSelect.vue'
import { useUiStore } from '../stores/ui'
import { useWelfareStore } from '../stores/welfare'

const ui = useUiStore()
const welfare = useWelfareStore()

type Pane = 'welfare' | 'guide' | 'dict'

const activeTab = ref<Pane>('welfare')
const submitting = ref(false)

// 福利活动
const wfTitle = ref('')
const wfDesc = ref('')
const wfCat = ref('平台福利')

// 省钱攻略
const guideTitle = ref('')
const guideDesc = ref('')

// 词典关键词
const dictKw = ref('')
const dictCat = ref('现金红包')

const welfareCategoryOptions = ACTIVITY_CATEGORIES.map(category => ({ value: category, label: category }))

const dictCatOptions = DICT_CATEGORIES.map(category => ({ value: category, label: category }))

function close() {
  if (submitting.value) return
  ui.closeSubmit()
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  try {
    if (activeTab.value === 'welfare') {
      const title = wfTitle.value.trim()
      if (!title) {
        ui.showToast('请填写活动名称')
        return
      }
      await welfare.submitWelfare({ title, description: wfDesc.value.trim(), category: wfCat.value })
      wfTitle.value = ''
      wfDesc.value = ''
      ui.showToast('已提交福利，进入待审核队列')
    } else if (activeTab.value === 'guide') {
      const title = guideTitle.value.trim()
      const content = guideDesc.value.trim()
      if (!title) {
        ui.showToast('请填写攻略标题')
        return
      }
      if (!content) {
        ui.showToast('请填写攻略内容')
        return
      }
      await welfare.submitGuideContent({ title, content })
      guideTitle.value = ''
      guideDesc.value = ''
      ui.showToast('已提交省钱攻略，进入待审核')
    } else {
      const kw = dictKw.value.trim()
      if (!kw) {
        ui.showToast('请输入关键词')
        return
      }
      await welfare.submitKeyword({ kw, cat: dictCat.value })
      dictKw.value = ''
      ui.showToast('已提交词典关键词，审核通过后生效')
    }
    ui.closeSubmit()
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="overlay" :class="{ show: ui.submitOpen }" @click.self="close">
    <div class="modal" style="max-width: 560px">
      <div class="modal-head">
        <h3>我要提交</h3>
        <button class="modal-close" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="submit-tabs">
          <div class="submit-tab" :class="{ active: activeTab === 'welfare' }" @click="activeTab = 'welfare'">福利活动</div>
          <div class="submit-tab" :class="{ active: activeTab === 'guide' }" @click="activeTab = 'guide'">省钱攻略</div>
          <div class="submit-tab" :class="{ active: activeTab === 'dict' }" @click="activeTab = 'dict'">词典关键词</div>
        </div>

        <div v-show="activeTab === 'welfare'" class="submit-pane" :class="{ active: activeTab === 'welfare' }">
          <div class="field"><label>活动名称</label><input class="input" v-model="wfTitle" placeholder="如：某某平台新人立减券" /></div>
          <div class="field"><label>活动链接 / 说明</label><textarea class="textarea" v-model="wfDesc" placeholder="粘贴官方链接或描述福利内容、领取条件、有效期"></textarea></div>
          <div class="field">
            <label>分类</label>
            <CSelect v-model="wfCat" :options="welfareCategoryOptions" width="100%" />
          </div>
        </div>

        <div v-show="activeTab === 'guide'" class="submit-pane" :class="{ active: activeTab === 'guide' }">
          <div class="field"><label>攻略标题</label><input class="input" v-model="guideTitle" placeholder="如：1688 同源童装省钱法" /></div>
          <div class="field"><label>攻略内容</label><textarea class="textarea" v-model="guideDesc" placeholder="分享你的省钱经验、货源、工具…"></textarea></div>
        </div>

        <div v-show="activeTab === 'dict'" class="submit-pane" :class="{ active: activeTab === 'dict' }">
          <div class="field"><label>关键词</label><input class="input" v-model="dictKw" placeholder="如：学生优惠 / 免费星球 / 打车券" /></div>
          <div class="field">
            <label>分类</label>
            <CSelect v-model="dictCat" :options="dictCatOptions" width="100%" />
          </div>
          <div class="hint" style="font-size: 12px; color: var(--muted)">提交的词典关键词会进入待审核，审核通过后加入词典库。</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="submitting" @click="submit">{{ submitting ? '提交中…' : '提交' }}</button>
      </div>
    </div>
  </div>
</template>
