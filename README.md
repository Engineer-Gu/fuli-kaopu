# 这福利很靠谱！· 每日福利情报站

从海量福利信息里筛出真实、可信的活动，帮你「防骗 + 领福利」。核心能力是用**元宝搜索**做全网检索，再结合**来源可信度分级**和**交叉验证**，把福利活动查证清楚后呈现到榜单。

## 功能特性

- **福利榜单**：按 19 个分类（技术资源 / 话费充值 / 外卖券 / 学生优惠…）聚合活动，标注「已核验 / 存疑」与靠谱度评分，支持跳官网领取。
- **活动自查（防骗）**：粘贴活动链接或文案，自动拆出承诺、条件、地区、有效期，再用元宝搜索核对来源、做「XX 是真的吗 / 骗局 / 套路」交叉验证，给出「可信 / 存疑」结论。
- **搜索调度**：词典关键词 → 元宝全网检索 → 去重 → 分类 → 剔除 SEO 标题党 → 入库待审核，每日 06:00 定时执行，支持手动触发与实时日志。
- **词典管理**：维护检索关键词词典，管理员审核后生效，驱动搜索调度。
- **省钱攻略**：整理省钱技巧 / 好物来源 / App 工具，含风险提示（warn 语气）。
- **用户体系**：注册 / 登录（bcrypt 加密 + HttpOnly session），管理员后台审核活动、攻略、词典。
- **全局搜索**：`Cmd/Ctrl + K` 或 `/` 唤起，元宝搜索兜底百度 / 必应。
- **众包维护**：用户可对活动「验证有效 / 反馈失效」，共同维护榜单真实度。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + Pinia + TypeScript + Vite |
| 后端 | Cloudflare Workers（边缘函数） |
| 数据库 | Cloudflare D1（SQLite） |
| 搜索 | 腾讯元宝搜索 API（WSA SearchPro） |
| 校验 / 加密 | zod、bcryptjs |

## 目录结构

```
server/                # 后端（Cloudflare Workers）
  config/              # 常量、分类映射
  domains/             # 业务域：activities / search / dispatch / auth / admin ...
  lib/                 # 元宝搜索封装、来源可信度分级、HTTP 工具
  index.ts             # 路由入口
src/                   # 前端（Vue 3）
  components/          # 各视图与组件
  stores/              # Pinia 状态
  services/            # API 调用
  constants/           # 分类规则（前后端共享）
  utils/deeplink.ts    # App Scheme 唤起
migrations/            # D1 数据库迁移 + 种子数据
```

## 快速开始

### 本地开发

```bash
npm install

# 1. 配置元宝搜索 key（.dev.vars 已被 gitignore，需手动创建）
echo "WSA_API_KEY=你的元宝搜索_key" > .dev.vars

# 2. 初始化本地 D1 数据库（含种子数据）
npm run db:migrate:local

# 3. 同时启动 worker(:8787) 与前端(:3000)
npm run dev
```

访问 http://localhost:3000

### 部署

```bash
npm run build
npm run db:migrate:remote   # 应用远程 D1 迁移
wrangler deploy             # 部署到 Cloudflare Workers
```

部署前需在 Cloudflare 配置 `WSA_API_KEY` 环境变量、并把 `wrangler.toml` 中的 D1 `database_id` 替换为真实值。

## 实现思路

核心是一条五步链路：

```
词典 → 全网检索 → 过滤 → 判断 → 榜单
```

- **词典**：`dict_words` 表维护关键词（seed 含 77 个，覆盖现金 / 实物 / 额度 / 话费 / 技术资源）。
- **检索**：`lib/yuanbao.ts` 封装元宝 `SearchPro`（含超时、业务错误识别），`domains/search.ts` 用词典词拼「关键词 活动 福利」去搜。
- **过滤**：`looksLikeActivity` 命中福利词、`JUNK_TITLE_MARKERS` 剔除标题党，按 link 去重，按时效过滤过期。
- **判断**：`lib/credibility.ts` 把来源分五级（official / media / community / marketing / unknown）并汇总结论；自查时 `extractSelfCheckQuery` 智能提取检索词（处理纯链接、whois 噪声），并用风险词做逆向交叉验证。
- **榜单**：审核通过后展示；`deeplink.ts` 通过白名单校验的 App Scheme 唤起美团 / 抖音 / 携程等直达领取。

活动自查采用「**本地规则快速打分 + 网络来源交叉核验**」双重判定，两条独立结论相互印证。

## 默认账号

种子数据内置管理员账号：`admin` / `Admin@123456`（登录后请在后台修改）。

## 说明

- 技术资源（云服务器 / 数据库 / tokens / 学生包）与话费充值来自真实全网检索、多为官方页面，标「已核验」；外卖「口令搜券」类第三方转述无法官方核实，标「存疑」，请自行尝试。
- 元宝搜索需有效 `WSA_API_KEY`，未配置时搜索 / 调度 / 自查相关功能会提示错误。
