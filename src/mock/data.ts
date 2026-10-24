// 前端演示用内置数据：后端未接入时，所有接口返回这里的默认数据
// 数据来自项目 migrations 中的真实种子数据，与产品一致
import type {
  Activity,
  AdminActivity,
  AdminDashboard,
  AdminDictWord,
  AdminGuide,
  DictWord,
  DictWordStat,
  DispatchState,
  Guide,
  SearchHit,
  SelfCheckResult,
  User,
  VerifyCount,
} from '../types'

const now = new Date().toISOString()

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act-057', title: '大众点评「免费试」报名抽奖 到店免费体验', category: '平台福利', type: 'platform', hot: true,
    description: '大众点评 App「免费试」报名抽奖，中签后到店免费体验，需按要求写真实评价；覆盖餐饮、美容、健身、剧本杀、密室等品类。',
    source: '大众点评（官方）', deadline: '长期（随期次）', verify: 'verified', score: 78,
    conditions: ['大众点评App内报名', '中签后到店', '需写评价'], doubts: ['中签率不确定', '需按要求写评价'],
    link: '#', value: '到店免单', entry: '大众点评App → 免费试', appScheme: '', status: 'approved', verifiedCount: 12, invalidCount: 1, createdAt: now,
  },
  {
    id: 'act-058', title: '美团「免单」/「试吃官」 到店免单、外卖试吃返现', category: '外卖券', type: 'right', hot: true,
    description: '美团 App 搜「美团免单」「试吃官」，报名或领任务到店免单、外卖试吃返现；具体活动与城市供给相关。',
    source: '美团（官方入口）', deadline: '长期滚动', verify: 'doubt', score: 66,
    conditions: ['美团App搜索入口', '按活动报名'], doubts: ['名额有限', '活动随城市/供给变化'],
    link: '#', value: '免单/返现', entry: '美团App → 搜「美团免单」「试吃官」', appScheme: '', status: 'approved', verifiedCount: 8, invalidCount: 2, createdAt: now,
  },
  {
    id: 'act-059', title: '歪麦霸王餐 外卖返现/到店券', category: '外卖券', type: 'right', hot: false,
    description: '第三方外卖返现平台，下单后按比例返现或领到店券；杭州等城市外卖/到店优惠较多。属第三方返现，需自行甄别。',
    source: '歪麦（第三方）', deadline: '长期', verify: 'doubt', score: 60,
    conditions: ['注册使用第三方App/小程序'], doubts: ['第三方返现，非官方直降', '返现比例/额度随时变'],
    link: '#', value: '返现/券', entry: '歪麦 App/小程序', appScheme: '', status: 'approved', verifiedCount: 3, invalidCount: 0, createdAt: now,
  },
  {
    id: 'act-060', title: '小蚕 App 外卖+团购返现（霸王餐）', category: '外卖券', type: 'right', hot: false,
    description: '外卖+团购返现工具，分外卖、到店两部分，不同返现比例与额度；常点外卖可省。',
    source: '小蚕（第三方）', deadline: '长期', verify: 'doubt', score: 60,
    conditions: ['注册使用'], doubts: ['第三方返现'],
    link: '#', value: '返现', entry: '小蚕 App', appScheme: '', status: 'approved', verifiedCount: 2, invalidCount: 0, createdAt: now,
  },
  {
    id: 'act-065', title: '美团 肯德基「疯狂星期四」外卖券', category: '外卖券', type: 'right', hot: true,
    description: '每周四美团搜「领领领777」领肯德基外卖券，部分地区可领 28-18、可叠 40-20 券。',
    source: '美团（需自助验证）', deadline: '每周四', verify: 'doubt', score: 62,
    conditions: ['美团App搜索口令', '每周四'], doubts: ['口令为第三方归纳', '地区/名额有限'],
    link: '#', value: '满28减18等', entry: '美团App → 搜「领领领777」', appScheme: '', status: 'approved', verifiedCount: 5, invalidCount: 1, createdAt: now,
  },
  {
    id: 'act-066', title: '支付宝 双11红包（搜「1111」整点抢）', category: '平台福利', type: 'platform', hot: false,
    description: '双11期间支付宝搜「1111」整点抢红包，每点限量。以支付宝官方活动为准。',
    source: '支付宝（需自助验证）', deadline: '双11期间', verify: 'doubt', score: 64,
    conditions: ['支付宝App搜索', '整点'], doubts: ['口令第三方归纳', '限量抢'],
    link: '#', value: '红包', entry: '支付宝App → 搜「1111」', appScheme: '', status: 'approved', verifiedCount: 4, invalidCount: 0, createdAt: now,
  },
  {
    id: 'act-068', title: '华为云 300元优惠券 / 新用户免费试用', category: '技术资源', type: 'quota', hot: false,
    description: '华为云活动页常发放 300 元优惠券及新用户免费试用资源；具体额度与产品以华为云官网活动页为准。',
    source: '华为云（官方）', deadline: '随活动', verify: 'doubt', score: 70,
    conditions: ['华为云新用户/实名'], doubts: ['优惠券有使用门槛', '以官网活动页为准'],
    link: 'https://www.huaweicloud.com', value: '¥300券', entry: '华为云 → 活动页', appScheme: '', status: 'approved', verifiedCount: 9, invalidCount: 0, createdAt: now,
  },
  {
    id: 'act-069', title: '免费 SSL 证书（OHTTPS / 青桔SSL）', category: '技术资源', type: 'quota', hot: false,
    description: 'OHTTPS 提供由 Let\'s Encrypt 颁发的免费 SSL/HTTPS 证书并支持自动续期部署。',
    source: 'OHTTPS/青桔SSL（第三方服务）', deadline: '长期（自动续期）', verify: 'verified', score: 72,
    conditions: ['注册/验证域名'], doubts: ['为第三方服务', '注意隐私'],
    link: 'https://ohttps.com', value: '免费HTTPS', entry: 'ohttps.com / 青桔SSL', appScheme: '', status: 'approved', verifiedCount: 15, invalidCount: 0, createdAt: now,
  },
  {
    id: 'act-072', title: 'TRAE（字节 AI 编程）新用户赠送积分', category: '技术资源', type: 'quota', hot: false,
    description: '字节旗下 AI 编程工具 TRAE，新用户注册赠送积分；以 TRAE 官方活动为准。',
    source: 'TRAE（字节，官方）', deadline: '新用户活动', verify: 'doubt', score: 62,
    conditions: ['新用户注册'], doubts: ['积分数额以官方为准', '活动可能调整'],
    link: 'https://www.trae.ai', value: '积分', entry: 'trae.ai', appScheme: '', status: 'approved', verifiedCount: 6, invalidCount: 1, createdAt: now,
  },
]

export const MOCK_GUIDES: Guide[] = [
  { id: 'guide-001', title: '外卖免单怎么找？先看官方入口再碰第三方', content: '优先用美团/饿了么官方「免单」「试吃官」入口，第三方返现平台只作补充，返现比例随时变，下单前截图留证。', category: '省钱攻略', tone: 'normal', status: 'approved', createdAt: now },
  { id: 'guide-002', title: '学生优惠别只认「学生」二字', content: '话费、流量、视频会员、云资源都有学生价，但大多需要学信网认证或校园邮箱；先确认身份门槛再上车。', category: '学生优惠', tone: 'normal', status: 'approved', createdAt: now },
  { id: 'guide-003', title: '警惕「免费送」背后的信息收集', content: '很多「免费送」活动本质是收集手机号/身份信息，参与前看清隐私条款，别为几块钱交出过多权限。', category: '风险提示', tone: 'warn', status: 'approved', createdAt: now },
  { id: 'guide-004', title: '大额用免息分期，现金留手边', content: '买大件时用「0 手续费、免息」的分期，把现金留手边；有利息的分期一律不碰。', category: '支付立减', tone: 'normal', status: 'approved', createdAt: now },
]

export const MOCK_DICT_WORDS: DictWord[] = [
  { id: 'dict-001', kw: '立减金', cat: '现金红包', status: 'approved', createdAt: now },
  { id: 'dict-002', kw: '微信红包', cat: '现金红包', status: 'approved', createdAt: now },
  { id: 'dict-003', kw: '满减券', cat: '现金红包', status: 'approved', createdAt: now },
  { id: 'dict-004', kw: '免单', cat: '现金红包', status: 'approved', createdAt: now },
  { id: 'dict-005', kw: '返现', cat: '现金红包', status: 'approved', createdAt: now },
  { id: 'dict-006', kw: '话费充值', cat: '话费流量', status: 'approved', createdAt: now },
  { id: 'dict-007', kw: '话费券', cat: '话费流量', status: 'approved', createdAt: now },
  { id: 'dict-008', kw: '流量包', cat: '话费流量', status: 'approved', createdAt: now },
  { id: 'dict-009', kw: '外卖券', cat: '外卖餐饮', status: 'approved', createdAt: now },
  { id: 'dict-010', kw: '外卖红包', cat: '外卖餐饮', status: 'approved', createdAt: now },
  { id: 'dict-011', kw: '饮品券', cat: '外卖餐饮', status: 'approved', createdAt: now },
  { id: 'dict-012', kw: '视频会员', cat: '会员权益', status: 'approved', createdAt: now },
  { id: 'dict-013', kw: '会员体验券', cat: '会员权益', status: 'approved', createdAt: now },
  { id: 'dict-014', kw: '云服务器免费', cat: '技术资源', status: 'approved', createdAt: now },
  { id: 'dict-015', kw: '免费额度', cat: '技术资源', status: 'approved', createdAt: now },
  { id: 'dict-016', kw: '大模型tokens', cat: '技术资源', status: 'approved', createdAt: now },
  { id: 'dict-017', kw: '学生优惠', cat: '技术资源', status: 'approved', createdAt: now },
]

export const MOCK_DICT_STATS: DictWordStat[] = [
  { kw: '外卖券', n: 12 }, { kw: '话费充值', n: 9 }, { kw: '立减金', n: 7 },
  { kw: '返现', n: 6 }, { kw: '视频会员', n: 5 }, { kw: '云服务器免费', n: 4 },
  { kw: '学生优惠', n: 3 }, { kw: '满减券', n: 2 },
]

export const MOCK_DISPATCH: DispatchState = {
  tasks: [
    { id: 'dailyScan', name: '每日福利全网扫描', cron: '0 6 * * *', description: '每天 06:00 · 按词典关键词检索全网活动', enabled: true, updatedAt: now },
    { id: 'filter', name: '过期活动自动过滤', cron: '0 * * * *', description: '每小时 · 按当前时间清理失效活动', enabled: true, updatedAt: now },
    { id: 'hotScan', name: '重点关键词高频扫描', cron: '0 */2 * * *', description: '每 2 小时 · 话费券 / 外卖券 / 平台福利 / 免费额度', enabled: false, updatedAt: now },
  ],
  logs: [
    { id: 'log-1', level: 'ok', message: '扫描开始：载入 17 个词典关键词', createdAt: now },
    { id: 'log-2', level: 'ok', message: '元宝搜索「外卖券 活动 福利」命中 50 条，导入 32 条', createdAt: now },
    { id: 'log-3', level: 'ok', message: '元宝搜索「话费充值 活动 福利」命中 50 条，导入 28 条', createdAt: now },
    { id: 'log-4', level: 'warn', message: '元宝搜索「视频会员 活动 福利」命中 20 条，导入 8 条', createdAt: now },
    { id: 'log-5', level: 'ok', message: '本轮共导入 100 个活动福利（已达目标）', createdAt: now },
    { id: 'log-6', level: 'ok', message: '榜单当前 9 条：已核验 3 条，存疑 6 条', createdAt: now },
  ],
  lastRun: {
    id: 'run-1', sourcesTotal: 0, sourcesOk: 0, keywords: 17, hits: 100, verified: 3, unverified: 6, createdAt: now,
  },
  today: { scans: 1, verified: 3, unverified: 6, keywords: 17, hits: 100 },
}

export const MOCK_USER: User = {
  id: 'demo-admin', username: 'admin', nickname: '平台管理员', role: 'admin', status: 'active', createdAt: now,
}

export function makeDashboard(): AdminDashboard {
  return {
    dictWords: { total: MOCK_DICT_WORDS.length, pending: 0 },
    activities: { total: MOCK_ACTIVITIES.length, pending: 0 },
    guides: { total: MOCK_GUIDES.length, pending: 0 },
    users: 1,
  }
}

export function makeAdminDictWords(): AdminDictWord[] {
  return MOCK_DICT_WORDS.map((w) => ({ id: w.id, kw: w.kw, cat: w.cat, status: w.status, createdAt: w.createdAt }))
}

export function makeAdminActivities(): AdminActivity[] {
  return MOCK_ACTIVITIES.map((a) => ({ id: a.id, title: a.title, category: a.category, source: a.source, status: a.status, createdAt: a.createdAt }))
}

export function makeAdminGuides(): AdminGuide[] {
  return MOCK_GUIDES.map((g) => ({ id: g.id, title: g.title, category: g.category, tone: g.tone, status: g.status, createdAt: g.createdAt }))
}

export function makeVerifyCount(): VerifyCount {
  return { verifiedCount: 1, invalidCount: 0 }
}

export function makeSearchHits(query: string): SearchHit[] {
  const q = query || '福利'
  return [
    { title: `${q} · 官方活动页（演示）`, url: '#', passage: `这是「${q}」相关的官方活动页面，后端接入后将返回真实的元宝搜索结果。`, date: now, source: '演示·官方', tier: 'official', tierLabel: '官方/权威', trustworthy: true, tierReason: '演示数据' },
    { title: `${q} · 官方公告（演示）`, url: '#', passage: `官方渠道发布的「${q}」活动说明与领取条件。`, date: now, source: '演示·官方', tier: 'official', tierLabel: '官方/权威', trustworthy: true, tierReason: '演示数据' },
    { title: `${q} · 媒体报道（演示）`, url: '#', passage: `主流媒体对「${q}」的报道，帮助判断活动真实性。`, date: now, source: '演示·媒体', tier: 'media', tierLabel: '媒体/门户', trustworthy: true, tierReason: '演示数据' },
    { title: `${q} · 行业解读（演示）`, url: '#', passage: `行业媒体对「${q}」的深度解读与分析。`, date: now, source: '演示·媒体', tier: 'media', tierLabel: '媒体/门户', trustworthy: true, tierReason: '演示数据' },
    { title: `${q} · 社区讨论（演示）`, url: '#', passage: `社区用户对「${q}」的讨论，需进一步核对官方来源。`, date: now, source: '演示·社区', tier: 'community', tierLabel: '社区/论坛', trustworthy: false, tierReason: '演示数据' },
    { title: `${q} · 经验分享帖（演示）`, url: '#', passage: `用户分享的「${q}」参与经验与注意事项。`, date: now, source: '演示·社区', tier: 'community', tierLabel: '社区/论坛', trustworthy: false, tierReason: '演示数据' },
    { title: `${q} · 线报站汇总（演示）`, url: '#', passage: `第三方线报站对「${q}」的汇总，需自行甄别真伪。`, date: now, source: '演示·线报', tier: 'marketing', tierLabel: '营销/导流', trustworthy: false, tierReason: '演示数据' },
    { title: `${q} · 更多相关来源（演示）`, url: '#', passage: `「${q}」相关的其他搜索来源，供参考。`, date: now, source: '演示·未知', tier: 'unknown', tierLabel: '待判断', trustworthy: false, tierReason: '演示数据' },
  ]
}

export function makeSelfCheck(text: string): SelfCheckResult {
  const q = text.slice(0, 20)
  return {
    query: q,
    verdict: 'unclear',
    verdictLabel: '存疑（演示模式）',
    verdictReason: '后端未接入，以下为演示来源，接入元宝搜索后将返回真实核验结论',
    officialCount: 1,
    riskCount: 0,
    riskQuery: `${q} 是真的吗`,
    hits: makeSearchHits(q),
  }
}
