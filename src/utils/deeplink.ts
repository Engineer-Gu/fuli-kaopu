// 平台 App 唤起（URL Scheme / 小程序）跳转工具。
// 用于把「去领取 / 去官网」升级为：点击后经浏览器唤起对应平台 App（需已安装），
// 未安装或桌面端无法唤起时降级为网页链接 / 入口自寻。

// —— 支持的 App Scheme 白名单（按前缀校验，防止任意协议注入）——
export const APP_SCHEME_PREFIXES = [
  'snssdk1128://', // 抖音
  'kwai://', // 快手
  'dianping://', // 大众点评
  'xhsdiscover://', // 小红书
  'ctrip://', // 携程
  'amapuri://', // 高德地图
  'imeituan://', // 美团
  'weixin://', // 微信
] as const

// —— 普通场景 scheme 映射（平台 → 场景 → scheme 模板）——
export const APP_SCENE_SCHEMES: Record<string, Record<string, string>> = {
  抖音: {
    关注抖音: 'snssdk1128://user/profile/',
    发抖音评价: 'snssdk1128://poi/detail/?id=',
    打开抖音: 'snssdk1128://',
  },
  大众点评: {
    收藏打卡: 'dianping://shopinfo?shopuuid=',
    发点评内容: 'dianping://shopinfo?shopuuid=',
    写点评笔记: 'dianping://home',
    打开点评: 'dianping://home',
  },
  小红书: {
    关注小红书: 'xhsdiscover://user/',
    小红书团购: 'xhsdiscover://rn/poi/detail?poiId=',
    打开小红书: 'xhsdiscover://',
  },
  快手: {
    关注快手: 'kwai://profile/',
    写快手评价: 'kwai://home/local/',
    打开快手: 'kwai://',
  },
  携程: {
    写携程评价: 'ctrip://wireless',
    打开携程: 'ctrip://wireless',
  },
  高德地图: {
    写高德评价: 'amapuri://poi/detail?poiid=',
    打开高德: 'amapuri://poi/detail?poiid=',
  },
  美团: {
    打开美团: 'imeituan://www.meituan.com/homepage',
  },
}

// —— 团购场景 scheme（跳转到具体团购/商品）——
export const GROUP_BUY_SCHEMES: Record<string, string> = {
  美团: 'imeituan://www.meituan.com/food/deal',
  大众点评: 'dianping://tuandeal?id=',
  抖音: 'snssdk1128://poi/goodsdetail/?activity_id=',
  小红书: 'xhsdiscover://rn/lancer-life/camping/product-details/',
}

// —— 点评自动打卡收藏模板 ——
export function buildDianpingDakaUrl(shopId: string) {
  return `dianping://picassobox?id=${shopId}&picassoid=pexus-friends-popover/auto-record-prepage-bundle.js&activitytype=2&type=2`
}

// —— 携程评价 scheme（pageUrl 经 base64 编码）——
function toBase64(value: string) {
  // 浏览器 btoa 仅支持 Latin1，中文先做 encodeURIComponent 再编码
  return btoa(encodeURIComponent(value))
}

export function buildCtripUrl(pageUrl: string) {
  return `ctrip://wireless/h5?type=5&url=${toBase64(pageUrl)}`
}

// —— 微信 / 支付宝小程序跳转构建 ——
export function buildWeixinUrl(appid: string, path: string, query: string) {
  return `weixin://dl/business/?appid=${appid}&path=${path}&query=${query}`
}

export function buildAlipayUrl(appid: string, path: string, query: string) {
  return `alipays://platformapi/startapp?appId=${appid}&page=${path}&query=${query}`
}

// —— 小程序 ID 与路径 ——
export const MINIPROGRAM = {
  weixinAppId: 'wx27f9648a4ab76d7f', // 碰碰贴微信小程序
  alipayAppId: '2021005154655721', // 支付宝小程序
  paths: ['/pages/home/index', '/pages/index/index', '/pages/scan/index', '/pages/auth/index', '/pages/jump/index', '/pages/gallery/index'] as const,
}

// —— 激活跳转 Scheme ——
export function buildActivateWeixinUrl(code: string) {
  return buildWeixinUrl(MINIPROGRAM.weixinAppId, 'pages/auth/index', `code=${code}`)
}

export function buildActivateAlipayUrl(code: string) {
  return buildAlipayUrl(MINIPROGRAM.alipayAppId, 'pages/auth/index', `code=${code}`)
}

// —— 校验与唤起 ——

/** 判断给定地址是否为受白名单允许的 App Scheme */
export function isAllowedScheme(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return APP_SCHEME_PREFIXES.some((p) => lower.startsWith(p))
}

/**
 * 尝试通过浏览器唤起对应平台 App。
 * 移动端已安装 App 时可拉起；桌面端 / 未安装时通常无法唤起，需由调用方给出降级提示。
 * @returns 是否发起了唤起尝试（即 scheme 通过白名单校验）
 */
export function openApp(scheme: string): boolean {
  if (!isAllowedScheme(scheme)) return false
  // 优先用 location.href 唤起；部分场景（如 iOS Safari）也可借助隐藏 iframe
  try {
    location.href = scheme
  } catch {
    // 忽略唤起异常，交由调用方降级
  }
  return true
}
