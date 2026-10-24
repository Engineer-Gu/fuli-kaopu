<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AboutView from './components/AboutView.vue'
import AdminView from './components/AdminView.vue'
import AuthModal from './components/AuthModal.vue'
import DetailModal from './components/DetailModal.vue'
import DictView from './components/DictView.vue'
import DispatchView from './components/DispatchView.vue'
import GuideView from './components/GuideView.vue'
import HomeView from './components/HomeView.vue'
import ProfileModal from './components/ProfileModal.vue'
import SearchBox from './components/SearchBox.vue'
import SelfCheckView from './components/SelfCheckView.vue'
import SubmitModal from './components/SubmitModal.vue'
import { THEMES, type ViewName } from './constants/app'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import { useWelfareStore } from './stores/welfare'

const ui = useUiStore()
const welfare = useWelfareStore()
const auth = useAuthStore()

const NAV_ITEMS: { view: ViewName; label: string; badge: boolean }[] = [
  { view: 'home', label: '首页', badge: true },
  { view: 'guide', label: '省钱攻略', badge: false },
  { view: 'dispatch', label: '搜索调度', badge: false },
  { view: 'dict', label: '词典管理', badge: false },
  { view: 'selfcheck', label: '活动自查', badge: false },
  { view: 'about', label: '关于说明', badge: false },
]

function goLogin() {
  ui.openAuth()
}

function goAdmin() {
  ui.navigate('admin')
}

const rocketVisible = ref(false)
let scroller: HTMLElement | null = null

function onScroll() {
  if (scroller) rocketVisible.value = scroller.scrollTop > 300
}

function scrollTop() {
  scroller?.scrollTo({ top: 0, behavior: 'smooth' })
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const isTyping = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

  // Ctrl/Cmd + F 或 Ctrl/Cmd + K：唤起全局搜索（阻止浏览器默认查找）
  if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'k')) {
    e.preventDefault()
    ui.openSearch()
    return
  }
  // 「/」唤起搜索（不在输入框内时）
  if (e.key === '/' && !isTyping) {
    e.preventDefault()
    ui.openSearch()
    return
  }
  if (e.key === 'Escape') {
    if (ui.searchOpen) {
      ui.closeSearch()
    } else {
      ui.closeDetail()
      ui.closeSubmit()
    }
  }
}

function dotStyle(colors: readonly string[]) {
  return { background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }
}

const themeOpen = ref(false)

const activeThemeName = computed(() => {
  return THEMES.find(t => t.id === ui.theme)?.name ?? THEMES[0].name
})

const activeTheme = computed(() => {
  return THEMES.find(t => t.id === ui.theme) ?? THEMES[0]
})

onMounted(() => {
  ui.initTheme()
  auth.fetchMe()
  welfare.loadAll()
  welfare.visitOnce()
  scroller = document.querySelector('.content')
  scroller?.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  scroller?.removeEventListener('scroll', onScroll)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app">
    <header class="topnav">
      <div class="logo">
        <div class="logo-mark">靠</div>
        <div>
          <div class="logo-name">这福利很靠谱！</div>
          <div class="logo-sub">每日福利情报站</div>
        </div>
      </div>
      <nav class="nav">
        <div
          v-for="item in NAV_ITEMS"
          :key="item.view"
          class="nav-item"
          :class="{ active: ui.currentView === item.view }"
          @click="ui.navigate(item.view)"
        >
          <span class="dot-ico"></span><span>{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ welfare.activities.length }}</span>
        </div>
        <div
          v-if="auth.user?.role === 'admin'"
          class="nav-item"
          :class="{ active: ui.currentView === 'admin' }"
          @click="goAdmin"
        >
          <span class="dot-ico"></span><span>管理后台</span>
        </div>
      </nav>
      <div class="topnav-right">
        <div class="day-pill"><span class="dot"></span>每日 06:00 自动更新</div>
        <button class="btn-submit" @click="ui.openSubmit()">＋ 我要提交</button>
      </div>
    </header>

    <div class="main">
      <div class="content">
        <div class="content-inner">
          <div class="view" :class="{ active: ui.currentView === 'home' }"><HomeView /></div>
          <div class="view" :class="{ active: ui.currentView === 'guide' }"><GuideView /></div>
          <div class="view" :class="{ active: ui.currentView === 'dispatch' }"><DispatchView /></div>
          <div class="view" :class="{ active: ui.currentView === 'dict' }"><DictView /></div>
          <div class="view" :class="{ active: ui.currentView === 'selfcheck' }"><SelfCheckView /></div>
          <div class="view" :class="{ active: ui.currentView === 'about' }"><AboutView /></div>
          <div v-if="auth.user?.role === 'admin'" class="view" :class="{ active: ui.currentView === 'admin' }"><AdminView /></div>
        </div>
      </div>
    </div>

    <DetailModal />
    <SubmitModal />
    <SearchBox />
    <AuthModal />
    <ProfileModal />

    <div class="my-panel">
      <div v-if="auth.user" class="my-user" @click="ui.openProfile()" title="点击修改个人信息">
        <div class="my-info">
          <div class="my-name">{{ auth.user.nickname }}</div>
          <div class="my-meta">{{ auth.user.username }}</div>
        </div>
        <span class="my-user-edit">编辑</span>
      </div>
      <button v-else class="my-login" @click="goLogin">
        <span class="my-login-ico"></span>登录 / 注册
      </button>
      <div class="my-theme">
        <button class="my-theme-label" :aria-expanded="themeOpen" @click="themeOpen = !themeOpen">
          <span class="my-theme-current-dot" :style="dotStyle(activeTheme.colors)"></span>
          <span class="my-theme-current-name">{{ activeThemeName }}</span>
          <span class="my-theme-arrow" :class="{ open: themeOpen }">▾</span>
        </button>
        <div v-show="themeOpen" class="my-theme-list">
          <button
            v-for="t in THEMES"
            :key="t.id"
            class="my-theme-item"
            :class="{ active: ui.theme === t.id }"
            @click="ui.setTheme(t.id)"
          >
            <span class="my-theme-dot" :style="dotStyle(t.colors)"></span>
            <span class="my-theme-name">{{ t.name }}</span>
            <span v-if="ui.theme === t.id" class="my-theme-check">✓</span>
          </button>
        </div>
      </div>
    </div>

    <div class="toast" :class="{ show: ui.toastVisible }">{{ ui.toastMessage }}</div>

    <button class="rocket" :class="{ show: rocketVisible }" aria-label="回到顶部" @click="scrollTop">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.5c.3 0 .6.1.8.3l5.4 5.4c.4.4.4 1 0 1.4-.4.4-1 .4-1.4 0L13 5.8V17a1 1 0 1 1-2 0V5.8L7.2 9.6c-.4.4-1 .4-1.4 0-.4-.4-.4-1 0-1.4l5.4-5.4c.2-.2.5-.3.8-.3zM4 20a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z" />
      </svg>
    </button>
  </div>
</template>
