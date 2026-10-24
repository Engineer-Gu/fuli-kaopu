export type User = {
  id: string
  username: string
  nickname: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled'
  createdAt: string
}

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

export type TodayVisits = { visits: number }

export type SearchHit = {
  title: string
  url: string
  passage: string
  date: string
  source: string
  // 来源可信度分级（由后端 classifySource 生成）
  tier?: 'official' | 'media' | 'community' | 'marketing' | 'unknown'
  tierLabel?: string
  trustworthy?: boolean
  tierReason?: string
}

// 自查接口返回结构（后端 selfCheck 生成）
export type SelfCheckResult = {
  query: string
  verdict: 'trust' | 'doubt' | 'unclear'
  verdictLabel: string
  verdictReason: string
  officialCount: number
  // 交叉验证发现的负面风险信号数
  riskCount: number
  riskQuery: string
  hits: SearchHit[]
}

export type VerifyCount = { verifiedCount: number; invalidCount: number }
