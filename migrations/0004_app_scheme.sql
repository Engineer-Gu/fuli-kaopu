-- 为福利活动增加 App 唤起 scheme（点击可经浏览器唤起对应平台 App，需已安装）
ALTER TABLE activities ADD COLUMN app_scheme TEXT NOT NULL DEFAULT '';

-- 到店 / 团购 / 平台类活动补配「打开 App」scheme
UPDATE activities SET app_scheme = 'dianping://home' WHERE id = 'act-057';                              -- 大众点评免费试
UPDATE activities SET app_scheme = 'imeituan://www.meituan.com/food/deal' WHERE id = 'act-058';          -- 美团免单/试吃官
UPDATE activities SET app_scheme = 'imeituan://www.meituan.com/food/deal' WHERE id = 'act-065';          -- 美团疯狂星期四
UPDATE activities SET app_scheme = 'xhsdiscover://' WHERE id = 'act-025';                                 -- 小红书创作激励
UPDATE activities SET app_scheme = 'snssdk1128://' WHERE id = 'act-026';                                  -- 抖音现金激励
UPDATE activities SET app_scheme = 'kwai://' WHERE id = 'act-027';                                        -- 快手现金激励
UPDATE activities SET app_scheme = 'ctrip://wireless' WHERE id = 'act-028';                               -- 携程消费券
