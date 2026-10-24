import { defineStore } from 'pinia'
import { THEMES, type ViewName } from '../constants/app'
import type { Activity } from '../types'

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUiStore = defineStore('ui', {
  state: () => ({
    currentView: 'home' as ViewName,
    theme: 'ink' as string,
    toastMessage: '',
    toastVisible: false,
    detailActivity: null as Activity | null,
    submitOpen: false,
    searchOpen: false,
    authOpen: false,
    profileOpen: false,
  }),
  actions: {
    navigate(view: ViewName) {
      this.currentView = view
    },
    initTheme() {
      let saved = 'ink'
      try {
        saved = localStorage.getItem('fuli:theme') || 'ink'
      } catch {
        /* 忽略 localStorage 不可用 */
      }
      if (!THEMES.some((t) => t.id === saved)) saved = 'ink'
      this.theme = saved
      this.applyTheme()
    },
    setTheme(id: string) {
      this.theme = id
      this.applyTheme()
      try {
        localStorage.setItem('fuli:theme', id)
      } catch {
        /* 忽略 localStorage 不可用 */
      }
    },
    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme)
    },
    showToast(message: string) {
      this.toastMessage = message
      this.toastVisible = true
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        this.toastVisible = false
      }, 2200)
    },
    openDetail(activity: Activity) {
      this.detailActivity = activity
    },
    closeDetail() {
      this.detailActivity = null
    },
    openSubmit() {
      this.submitOpen = true
    },
    closeSubmit() {
      this.submitOpen = false
    },
    openSearch() {
      this.searchOpen = true
    },
    closeSearch() {
      this.searchOpen = false
    },
    openAuth() {
      this.authOpen = true
    },
    closeAuth() {
      this.authOpen = false
    },
    openProfile() {
      this.profileOpen = true
    },
    closeProfile() {
      this.profileOpen = false
    },
  },
})
