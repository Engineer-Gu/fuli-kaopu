import { defineStore } from 'pinia'
import {
  deleteDictWord,
  getDispatchState,
  getTodayVisits,
  listActivities,
  listDictWordStats,
  listDictWords,
  listGuides,
  recordVisit,
  runDispatchScan,
  setDispatchTask,
  submitActivity,
  submitDictWord,
  submitGuide,
  verifyActivity as verifyActivityApi,
} from '../services/api'
import type { Activity, DictWord, DictWordStat, DispatchState, Guide } from '../types'

export const useWelfareStore = defineStore('welfare', {
  state: () => ({
    activities: [] as Activity[],
    guides: [] as Guide[],
    dictWords: [] as DictWord[],
    dispatch: null as DispatchState | null,
    dictStats: [] as DictWordStat[],
    todayVisits: 0,
    loading: false,
  }),
  getters: {
    approvedCount: (state) => state.activities.filter((a) => a.status === 'approved').length,
  },
  actions: {
    async loadAll() {
      this.loading = true
      try {
        const [activities, guides, dictWords] = await Promise.all([listActivities(), listGuides(), listDictWords()])
        this.activities = activities
        this.guides = guides
        this.dictWords = dictWords
      } finally {
        this.loading = false
      }
    },
    async loadDispatch() {
      this.dispatch = await getDispatchState()
    },
    async runDispatch() {
      this.dispatch = await runDispatchScan()
    },
    async setDispatchTask(id: string, enabled: boolean) {
      this.dispatch = await setDispatchTask({ id, enabled })
    },
    async loadDictStats() {
      this.dictStats = await listDictWordStats()
    },
    async removeKeyword(id: string) {
      await deleteDictWord(id)
      this.dictWords = this.dictWords.filter((d) => d.id !== id)
      this.loadDictStats()
    },
    async submitWelfare(input: { title: string; description: string; category: string }) {
      // 提交后进入待审核队列，不直接回显到公共列表（需管理员审核通过后才会出现）
      return submitActivity(input)
    },
    async submitGuideContent(input: { title: string; content: string }) {
      // 提交后进入待审核队列，不直接回显到公共列表
      return submitGuide(input)
    },
    async submitKeyword(input: { kw: string; cat: string }) {
      // 提交后进入待审核队列，不直接回显到公共词典
      await submitDictWord(input)
      this.loadDictStats()
    },
    async loadTodayVisits() {
      const { visits } = await getTodayVisits()
      this.todayVisits = visits
      return visits
    },
    async visitOnce() {
      // 每次访问（刷新/进入）都 +1，由服务端记录 IP 用于统计追溯
      const { visits } = await recordVisit()
      this.todayVisits = visits
      return visits
    },
    async verifyActivity(id: string, result: 'valid' | 'invalid') {
      const counts = await verifyActivityApi(id, result)
      const activity = this.activities.find((a) => a.id === id)
      if (activity) {
        activity.verifiedCount = counts.verifiedCount
        activity.invalidCount = counts.invalidCount
      }
      return counts
    },
  },
})
