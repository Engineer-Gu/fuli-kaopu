<script setup lang="ts">
const steps = [
  { k: '第一步', v: '生成福利领域词典，覆盖话费充值 / 外卖券 / 技术资源等关键词' },
  { k: '第二步', v: '按词典关键词调用元宝搜索，全网检索并抓取真实活动' },
  { k: '第三步', v: '按当前时间过滤过期活动，剔除 SEO 堆砌、无法证实、来源可疑的条目' },
  { k: '第四步', v: '标记类型、领取条件，核对来源并给出靠谱度评分，支持用户验证有效 / 失效' },
  { k: '第五步', v: '呈现在榜单，可直接跳官网领取；也支持活动自查与全局全网搜索' },
]
</script>

<template>
  <div>
    <h2 class="h2">关于「这福利很靠谱！」</h2>
    <p class="desc">一个每日福利情报站，通过「词典 → 全网检索 → 过滤 → 判断 → 榜单」的完整链路，帮你从海量福利信息里筛选出真实、可信的活动。</p>

    <div class="card panel">
      <div class="panel-title"><span class="pt-dot"></span>核心逻辑</div>
      <div v-for="s in steps" :key="s.k" class="kv">
        <div class="k">{{ s.k }}</div>
        <div class="v">{{ s.v }}</div>
      </div>
    </div>

    <div class="card panel mt">
      <div class="panel-title"><span class="pt-dot"></span>说明</div>
      <p style="font-size: 13px; color: var(--sub); line-height: 1.8">
        榜单中的技术资源（云服务器 / 数据库 / 对象存储 / 大模型 tokens / 学生包）与话费充值来自真实全网检索、多为官方页面，已标「已核验」；外卖「口令搜券」类第三方转述无法官方核实，已标「存疑」，请自行尝试。全网检索已接入元宝搜索，搜索调度与活动自查均默认走元宝检索，前端另提供百度 / 必应免费引擎兜底；每个活动详情页支持「验证有效 / 反馈失效」，共同维护榜单真实度。
      </p>
    </div>
  </div>
</template>
