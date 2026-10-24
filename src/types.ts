export type Activity = {
  id: string
  title: string
  category: string
  type: string
  hot: boolean
  description: string
  source: string
  deadline: string
  verify: 'verified' | 'doubt'
  score: number
  conditions: string[]
  doubts: string[]
  link: string
  value: string
  entry: string
  appScheme: string
  status: 'approved' | 'pending'
  verifiedCount: number
  invalidCount: number
  createdAt: string
}

export type Guide = {
  id: string
  title: string
  content: string
  category: string
  tone: 'normal' | 'warn'
  status: 'approved' | 'pending'
  createdAt: string
}

export type DictWord = {
  id: string
  kw: string
  cat: string
  status: 'approved' | 'pending'
  createdAt: string
}

export type DispatchTask = {
  id: string
  name: string
  cron: string
  description: string
  enabled: boolean
  updatedAt: string
}

export type DispatchLog = {
  id: string
  level: 'ok' | 'info' | 'warn'
  message: string
  createdAt: string
}

export type ScanRun = {
  id: string
  sourcesTotal: number
  sourcesOk: number
  keywords: number
  hits: number
  verified: number
  unverified: number
  createdAt: string
}

export type DispatchState = {
  tasks: DispatchTask[]
  logs: DispatchLog[]
  lastRun: ScanRun | null
  today: { scans: number; verified: number; unverified: number; keywords: number; hits: number }
}

export type DictWordStat = { kw: string; n: number }

export type SearchHit = {
  title: string
  url: string
  passage: string
  date: string
  source: string
  tier?: 'official' | 'media' | 'community' | 'marketing' | 'unknown'
  tierLabel?: string
  trustworthy?: boolean
  tierReason?: string
}

export type SelfCheckResult = {
  query: string
  verdict: 'trust' | 'doubt' | 'unclear'
  verdictLabel: string
  verdictReason: string
  officialCount: number
  riskCount: number
  riskQuery: string
  hits: SearchHit[]
}

export type VerifyCount = { verifiedCount: number; invalidCount: number }

export type User = {
  id: string
  username: string
  nickname: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled'
  createdAt: string
}

export type AdminDashboard = {
  dictWords: { total: number; pending: number }
  activities: { total: number; pending: number }
  guides: { total: number; pending: number }
  users: number
}

export type AdminDictWord = { id: string; kw: string; cat: string; status: 'approved' | 'pending'; createdAt: string }
export type AdminActivity = { id: string; title: string; category: string; source: string; status: 'approved' | 'pending'; createdAt: string }
export type AdminGuide = { id: string; title: string; category: string; tone: 'normal' | 'warn'; status: 'approved' | 'pending'; createdAt: string }
