<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

const auth = useAuthStore()
const ui = useUiStore()

const nickname = ref('')
const submitting = ref(false)
const error = ref('')

watch(
  () => ui.profileOpen,
  (open) => {
    if (open) {
      nickname.value = auth.user?.nickname ?? ''
      error.value = ''
    }
  },
)

async function submit() {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    await auth.updateProfile(nickname.value)
    ui.showToast('个人信息已更新')
    ui.closeProfile()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '更新失败'
  } finally {
    submitting.value = false
  }
}

function close() {
  if (submitting.value) return
  ui.closeProfile()
}

async function logout() {
  await auth.logout()
  if (ui.currentView === 'admin') ui.navigate('home')
  ui.closeProfile()
  ui.showToast('已退出登录')
}
</script>

<template>
  <div class="overlay" :class="{ show: ui.profileOpen }" @click.self="close">
    <div class="modal profile-modal">
      <div class="modal-head">
        <div>
          <h3>个人信息</h3>
          <p class="profile-sub">修改你的展示昵称</p>
        </div>
        <button class="modal-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
      <div class="modal-body">
        <form class="profile-form" @submit.prevent="submit">
          <div class="field">
            <label>账号</label>
            <input class="input" :value="auth.user?.username" disabled />
            <div class="hint">账号不可修改</div>
          </div>
          <div class="field">
            <label>昵称</label>
            <input v-model="nickname" class="input" placeholder="2-20 个字" maxlength="20" />
          </div>
          <p v-if="error" class="profile-error">{{ error }}</p>
          <button class="btn btn-primary profile-submit" type="submit" :disabled="submitting">
            {{ submitting ? '保存中…' : '保存' }}
          </button>
        </form>
        <button class="btn btn-ghost profile-logout" type="button" @click="logout">退出登录</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-modal { max-width: 400px; }
.profile-sub { font-size: 12px; color: var(--sub); margin-top: 4px; }
.profile-form .field { margin-bottom: 14px; }
.profile-error { color: var(--red); font-size: 13px; margin: 4px 0 12px; }
.profile-submit { width: 100%; justify-content: center; }
.profile-logout { width: 100%; justify-content: center; margin-top: 10px; }
</style>
