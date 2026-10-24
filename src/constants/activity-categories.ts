// 依据词典关键词按使用场景分类；现金、实物、额度仍作为福利类型保留。
export const ACTIVITY_CATEGORIES = [
  '学生优惠', '话费充值', '流量套餐', '外卖券', '餐饮饮品',
  '购物优惠', '支付立减', '消费券补贴', '出行打车', '机票酒店',
  '会员订阅', '签到红包', '积分实物', '创作激励', '学习社群',
  '开发者赛事', 'AI工具额度', '技术资源', '平台福利',
] as const

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]

export const ACTIVITY_CATEGORY_TO_TYPE: Record<ActivityCategory, string> = {
  学生优惠: 'student', 话费充值: 'cash', 流量套餐: 'right', 外卖券: 'right',
  餐饮饮品: 'right', 购物优惠: 'platform', 支付立减: 'cash', 消费券补贴: 'cash',
  出行打车: 'right', 机票酒店: 'right', 会员订阅: 'right', 签到红包: 'cash',
  积分实物: 'right', 创作激励: 'cash', 学习社群: 'right', 开发者赛事: 'right',
  AI工具额度: 'quota', 技术资源: 'quota', 平台福利: 'platform',
}

// 按明确场景优先匹配，避免仅凭“免费”“额度”“会员”等泛词归类。
const RULES: { category: ActivityCategory; pattern: RegExp }[] = [
  { category: '学生优惠', pattern: /学生|大学生|教育优惠|校园认证/ },
  { category: '开发者赛事', pattern: /黑客松|开发者大赛|编程大赛|hackathon/i },
  { category: '创作激励', pattern: /创作激励|创作者|创作奖励|创作计划|投稿奖励/ },
  { category: 'AI工具额度', pattern: /大模型|tokens?\b|AI工具|AI免费|AI额度|免费AI|模型API|人工智能|通义|DeepSeek/i },
  { category: '技术资源', pattern: /云服务器|云数据库|云存储|对象存储|图床|域名|开发者计划|数据库|云主机|ECS\b|轻量应用服务器/i },
  { category: '话费充值', pattern: /话费/ },
  { category: '流量套餐', pattern: /流量包|流量券|流量套餐|手机流量|通信套餐/ },
  { category: '外卖券', pattern: /外卖|饿了么|美团神券|天天神券/ },
  { category: '餐饮饮品', pattern: /饮品|咖啡|奶茶|瑞幸|星巴克|肯德基|麦当劳|餐饮|到店团购/ },
  { category: '机票酒店', pattern: /机票|酒店|住宿|航司|航班|携程|飞猪|同程旅行/ },
  { category: '出行打车', pattern: /打车|网约车|顺风车|乘车|公交|地铁|骑行|单车|火车票|高铁/ },
  { category: '消费券补贴', pattern: /消费券|政府补贴|国补|以旧换新/ },
  { category: '支付立减', pattern: /立减金|首绑|绑卡|支付立减|银行.*立减|数字人民币|碰友节|微信小程序立减/ },
  { category: '会员订阅', pattern: /会员体验|视频会员|音乐会员|联合会员|会员订阅|爱奇艺|腾讯视频|优酷|绿钻|网盘会员/ },
  { category: '学习社群', pattern: /知识星球|免费星球|课程|学习资源|电子书|训练营/ },
  { category: '积分实物', pattern: /矿石兑换|签到实物|积分兑|实物奖|实物兑换/ },
  { category: '签到红包', pattern: /签到|口令红包|微信红包|快手红包|极速版|摇一摇|超级金币/ },
  { category: '购物优惠', pattern: /满减券|免单|返现|双11|双十一|超级18|拍拍乐|京东|淘宝|拼多多/ },
]

const LEGACY_CATEGORIES = new Set(['学生优惠', '话费充值', '外卖券', '技术资源', '平台福利'])
type CategoryInput = { category?: string; title: string; description?: string }

export function classifyActivity(activity: CategoryInput): ActivityCategory {
  const category = activity.category as ActivityCategory
  // 已明确选择的新分类不被关键词覆盖；旧的大类允许细分。
  if (ACTIVITY_CATEGORIES.includes(category) && !LEGACY_CATEGORIES.has(category)) return category
  if (category === '学生优惠') return category
  const titleMatch = RULES.find(rule => rule.pattern.test(activity.title))
  if (titleMatch) return titleMatch.category
  const descriptionMatch = RULES.find(rule => rule.pattern.test(activity.description ?? ''))
  if (descriptionMatch) return descriptionMatch.category
  return ACTIVITY_CATEGORIES.includes(category) ? category : '平台福利'
}
