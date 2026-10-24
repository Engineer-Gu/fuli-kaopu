import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authLogin, authLogout, authMe, authRegister, authUpdateProfile } from '../services/api'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loaded = ref(false)

  async function fetchMe() {
    try {
      const result = await authMe()
      user.value = result.user
    } finally {
      loaded.value = true
    }
  }

  async function login(username: string, password: string) {
    const result = await authLogin(username, password)
    user.value = result.user
    return result.user
  }

  async function register(input: { username: string; nickname: string; password: string; confirmPassword: string }) {
    const result = await authRegister(input)
    user.value = result.user
    return result.user
  }

  async function logout() {
    await authLogout()
    user.value = null
  }

  async function updateProfile(nickname: string) {
    const result = await authUpdateProfile(nickname)
    user.value = result.user
    return result.user
  }

  const isAdmin = () => user.value?.role === 'admin'

  return { user, loaded, fetchMe, login, register, logout, updateProfile, isAdmin }
})
