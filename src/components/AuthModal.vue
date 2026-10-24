<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

const auth = useAuthStore()
const ui = useUiStore()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const error = ref('')

const isRegister = computed(() => mode.value === 'register')

function switchMode(next: 'login' | 'register') {
  mode.value = next
  error.value = ''
}

async function submit() {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    if (isRegister.value) {
      if (password.value !== confirmPassword.value) {
        error.value = '两次输入的密码不一致'
        return
      }
      await auth.register({ username: username.value, nickname: nickname.value || username.value, password: password.value, confirmPassword: confirmPassword.value })
      ui.showToast('注册成功，已登录')
    } else {
      await auth.login(username.value, password.value)
      ui.showToast('登录成功')
    }
    ui.closeAuth()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    submitting.value = false
  }
}

function close() {
  if (submitting.value) return
  ui.closeAuth()
}
</script>

<template>
  <div class="overlay" :class="{ show: ui.authOpen }" @click.self="close">
    <div class="modal auth-modal">
      <div class="modal-head">
        <div>
          <h3>{{ isRegister ? '注册账号' : '登录' }}</h3>
          <p class="auth-sub">{{ isRegister ? '创建账号后即可提交福利与关键词' : '登录后可进入管理后台（管理员）' }}</p>
        </div>
        <button class="modal-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <button type="button" :class="{ active: !isRegister }" @click="switchMode('login')">登录</button>
          <button type="button" :class="{ active: isRegister }" @click="switchMode('register')">注册</button>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <div class="field">
            <label>用户名</label>
            <input v-model="username" class="input" autocomplete="username" placeholder="3-20 位小写字母、数字或下划线" />
          </div>
          <div v-if="isRegister" class="field">
            <label>昵称</label>
            <input v-model="nickname" class="input" autocomplete="nickname" placeholder="展示名称（可留空，默认同用户名）" />
          </div>
          <div class="field">
            <label>密码</label>
            <input v-model="password" type="password" class="input" :autocomplete="isRegister ? 'new-password' : 'current-password'" placeholder="至少 6 位" />
          </div>
          <div v-if="isRegister" class="field">
            <label>确认密码</label>
            <input v-model="confirmPassword" type="password" class="input" autocomplete="new-password" placeholder="再次输入密码" />
          </div>

          <p v-if="error" class="auth-error">{{ error }}</p>

          <button class="btn btn-primary auth-submit" type="submit" :disabled="submitting">
            {{ submitting ? '处理中…' : isRegister ? '注册并登录' : '登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-modal { max-width: 420px; }
.auth-sub { font-size: 12px; color: var(--sub); margin-top: 4px; }
.auth-tabs { display: flex; gap: 4px; background: var(--accent-bg); padding: 4px; border-radius: 10px; margin-bottom: 18px; }
.auth-tabs button { flex: 1; padding: 8px 0; border-radius: 7px; font-size: 13px; font-weight: 600; color: var(--sub); cursor: pointer; }
.auth-tabs button.active { background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(40, 44, 40, .1); }
.auth-form .field { margin-bottom: 14px; }
.auth-error { color: var(--red); font-size: 13px; margin: 4px 0 12px; }
.auth-submit { width: 100%; justify-content: center; }
</style>
