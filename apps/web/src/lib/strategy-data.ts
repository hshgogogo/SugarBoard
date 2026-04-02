import type { ChartSpec } from '@/lib/api-contract';

export type StrategyBoardSlug =
  | 'macro-industry'
  | 'platform-watch'
  | 'marketing-radar'
  | 'external-tech'
  | 'domestic-tech';

export type StrategyNavIcon =
  | 'home'
  | 'macro'
  | 'platform'
  | 'marketing'
  | 'external'
  | 'domestic';

export type StrategyMetric = {
  label: string;
  value: string;
  note: string;
};

export type StrategyWatchItem = {
  title: string;
  description: string;
  metric: string;
};

export type StrategyFeature = {
  slug: string;
  title: string;
  englishTitle: string;
  summary: string;
  status: '重点跟踪' | '机会窗口' | '保持观察';
  updatedAt: string;
  metrics: StrategyMetric[];
  charts: ChartSpec[];
  keyQuestions: string[];
  watchItems: StrategyWatchItem[];
  actions: string[];
};

export type StrategyBoard = {
  slug: StrategyBoardSlug;
  title: string;
  englishTitle: string;
  summary: string;
  accent: string;
  icon: StrategyNavIcon;
  statusLine: string;
  metrics: StrategyMetric[];
  features: StrategyFeature[];
};

export const DASHBOARD_TIMESTAMP = '2026/04/02 | 08:30';

export const tickerItems = [
  '流量风向标：角色热度扩散开始快于艺人热度爬升。',
  '长视频平台矩阵：爱奇艺与腾讯视频在都市悬疑赛道上继续拉锯。',
  '营销策略雷达：角色与演员联动物料的站外转评比提升 18%。',
  '影视前沿技术：生成式 AI 视频工具进入“提效优先”的应用窗口。',
  '国产技术生态：可灵与通义在影视制作协同链路上的讨论热度升温。',
];

function lineChart(
  title: string,
  unit: string,
  labels: string[],
  series: Array<{ name: string; values: number[]; color: string }>,
  note: string,
): ChartSpec {
  return {
    chart_type: 'line',
    title,
    unit,
    x_axis_label: '时间',
    y_axis_label: unit,
    note,
    series: series.map((item) => ({
      name: item.name,
      color: item.color,
      points: labels.map((label, index) => ({
        x: label,
        y: item.values[index] ?? 0,
      })),
    })),
  };
}

function barChart(
  title: string,
  unit: string,
  entries: Array<{ label: string; value: number; color?: string }>,
  note: string,
): ChartSpec {
  return {
    chart_type: 'bar',
    title,
    unit,
    x_axis_label: '维度',
    y_axis_label: unit,
    note,
    series: [
      {
        name: title,
        color: entries[0]?.color ?? '#d7b46a',
        points: entries.map((entry) => ({
          x: entry.label,
          y: entry.value,
        })),
      },
    ],
  };
}

function feature(
  input: Omit<StrategyFeature, 'updatedAt'> & {
    charts: StrategyFeature['charts'];
  },
): StrategyFeature {
  return {
    ...input,
    updatedAt: DASHBOARD_TIMESTAMP,
  };
}

export const strategyBoards: StrategyBoard[] = [
  {
    slug: 'macro-industry',
    title: '行业宏观雷达台',
    englishTitle: 'Macro-Industry Radar',
    summary: '从流量风向、内容热榜、宏观侦测到题材趋势变化，先判断“大盘怎么走”，再决定后续选题和宣发动作。',
    accent: '#6cb7ff',
    icon: 'macro',
    statusLine: '优先观察跨平台流量与题材切换速度',
    metrics: [
      { label: '宏观预警', value: '3 条', note: '平台热区与题材结构同步出现拐点。' },
      { label: '趋势窗口', value: '14 天', note: '都市悬疑与现实成长题材连续抬升。' },
      { label: '大盘样本', value: '124 组', note: '覆盖热榜、题材、流量、宏观观测四层。' },
    ],
    features: [
      feature({
        slug: 'traffic-indicators',
        title: '流量风向标',
        englishTitle: 'Traffic Indicators',
        summary: '追踪艺人、角色、内容三层流量的实时偏移，识别平台与站外声量的联动节奏。',
        status: '重点跟踪',
        metrics: [
          { label: '热度上升对象', value: '12 个', note: '以角色和内容项为主。' },
          { label: '跨平台扩散率', value: '68%', note: '站外扩散带动站内点击。' },
          { label: '异常波峰', value: '4 次', note: '集中在晚间档宣发节点。' },
        ],
        charts: [
          lineChart(
            '近 7 日流量风向',
            '热度指数',
            ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            [
              { name: '艺人热度', values: [62, 66, 67, 71, 76, 78, 80], color: '#7dc6ff' },
              { name: '角色热度', values: [54, 58, 63, 68, 73, 77, 84], color: '#d7b46a' },
            ],
            '角色线在周末阶段首次超过艺人线，说明素材传播更偏剧情驱动。',
          ),
          barChart(
            '平台流量承接能力',
            '%',
            [
              { label: '爱奇艺', value: 81, color: '#7dc6ff' },
              { label: '腾讯视频', value: 78 },
              { label: '优酷', value: 61 },
              { label: '芒果TV', value: 57 },
            ],
            '承接能力综合站外传播回流、收藏转化和追更意愿。',
          ),
        ],
        keyQuestions: [
          '哪一类信号最早预示“内容热度先于艺人热度起量”？',
          '哪些平台对站外爆点的承接效率更高？',
          '异常波峰是由内容事件、角色切片还是明星动态触发？',
        ],
        watchItems: [
          { title: '角色切片扩散', description: '角色名场面在二创社区的传播速度继续高于演员单人素材。', metric: '24h 扩散 +19%' },
          { title: '站内搜索回流', description: '悬疑类长视频内容在站内搜索和收藏两端同步增长。', metric: '收藏率 +11%' },
          { title: '晚间峰值转移', description: '峰值窗口从 20:00 向 21:30 延后，适合调整物料发布节奏。', metric: '峰值延后 90 分钟' },
        ],
        actions: [
          '把流量突变对象同步给营销策略页，联动角色与话题素材。',
          '标记承接效率连续 3 天低于阈值的平台，作为内容调度预警。',
          '在首页保留“大盘拐点”快照，方便制片人快速判断是否追热点。',
        ],
      }),
      feature({
        slug: 'content-charts',
        title: '内容热榜',
        englishTitle: 'Content Charts',
        summary: '拆出长剧、电影、短剧等内容形态的热榜表现，用于快速判断当前内容供给结构。',
        status: '重点跟踪',
        metrics: [
          { label: '长剧强势档', value: '3 个', note: '头部长剧稳定占据讨论中心。' },
          { label: '电影拉新项', value: '5 部', note: '院线与流媒体联动素材带来补量。' },
          { label: '短剧试探项', value: '8 组', note: '短剧带动碎片化传播持续活跃。' },
        ],
        charts: [
          barChart(
            '内容形态热度分布',
            '榜单热度',
            [
              { label: '长剧', value: 92 },
              { label: '电影', value: 84 },
              { label: '短剧', value: 71 },
              { label: '综艺衍生', value: 55 },
            ],
            '长剧和电影依然是制片决策的主要观察对象，但短剧信号在传播端持续增强。',
          ),
          lineChart(
            '头部内容轮换速度',
            '上榜次数',
            ['第1周', '第2周', '第3周', '第4周'],
            [
              { name: 'Top10 长剧', values: [8, 7, 7, 6], color: '#8ae0b0' },
              { name: 'Top10 电影', values: [4, 5, 5, 6], color: '#d7b46a' },
            ],
            '电影热榜在月末阶段轮换加快，适合做补档与联动素材预判。',
          ),
        ],
        keyQuestions: [
          '不同内容形态之间的热榜位置有没有发生明显轮换？',
          '长剧、电影、短剧各自的增量逻辑是什么？',
          '哪些形态更适合当前项目的宣发资源配置？',
        ],
        watchItems: [
          { title: '长剧供给稳定', description: '头部长剧热榜稳定性较高，但腰部内容竞争变强。', metric: 'Top10 留存 60%' },
          { title: '电影二轮传播', description: '电影在上映后一周进入第二传播窗口。', metric: '站外互动 +14%' },
          { title: '短剧试水题材', description: '悬疑和现实成长题材短剧更容易形成次生传播。', metric: '完播率 1.3x' },
        ],
        actions: [
          '保留按内容形态切分的热榜页，方便不同团队快速进入。',
          '让选题讨论先看内容结构，再看平台和营销资源投放。',
          '把热榜轮换速度作为资源重新分配的前置信号。',
        ],
      }),
      feature({
        slug: 'macro-detection',
        title: '宏观侦测',
        englishTitle: 'Macro Detection',
        summary: '把平台、题材、档期和外部舆情做成宏观侦测视图，帮助判断是否进入新一轮竞争窗口。',
        status: '机会窗口',
        metrics: [
          { label: '竞争窗口', value: '2 段', note: '五一档与暑期档前哨期。' },
          { label: '外部舆情事件', value: '9 条', note: '包含政策、奖项与热点事件。' },
          { label: '档期拥挤度', value: '偏高', note: '重点项目集中在同一宣传周期。' },
        ],
        charts: [
          lineChart(
            '档期拥挤度变化',
            '拥挤指数',
            ['2月', '3月', '4月', '5月', '6月', '7月'],
            [
              { name: '大盘拥挤度', values: [48, 56, 63, 81, 78, 69], color: '#ff9d7a' },
            ],
            '五一档前后拥挤指数显著抬升，适合提前锁定差异化题材位置。',
          ),
          barChart(
            '宏观风险来源',
            '影响值',
            [
              { label: '档期撞车', value: 84 },
              { label: '题材扎堆', value: 76 },
              { label: '突发舆情', value: 61 },
              { label: '平台排播波动', value: 58 },
            ],
            '用于判断风险来自供给端、传播端还是平台分发端。',
          ),
        ],
        keyQuestions: [
          '未来 4 到 8 周有哪些宏观因素会影响项目排播或宣发节奏？',
          '档期拥挤度高时，题材差异化能否形成防守优势？',
          '哪些突发事件需要提前纳入运营剧本？',
        ],
        watchItems: [
          { title: '档期重叠', description: '同类型项目可能在同一阶段争夺同一批核心观众。', metric: '重叠项目 6 个' },
          { title: '平台排播弹性', description: '平台对新上线窗口的调整频率开始增加。', metric: '调整频率 +22%' },
          { title: '舆情挤压', description: '站外热点对内容传播窗口形成明显挤压。', metric: '热点占位 3 次/周' },
        ],
        actions: [
          '把宏观侦测结果同步给平台与竞对页，建立联动预警。',
          '在项目立项讨论阶段补看未来 8 周的竞争密度。',
          '对高拥挤档期给出“延后宣发/差异化物料”建议。',
        ],
      }),
      feature({
        slug: 'subject-trend-change',
        title: '题材趋势变化数据',
        englishTitle: 'Subject Trend Change Data',
        summary: '识别题材热度的早期转折，避免立项讨论只停留在已经过热的赛道。',
        status: '重点跟踪',
        metrics: [
          { label: '上升题材', value: '悬疑 / 现实成长', note: '两条题材曲线持续抬升。' },
          { label: '回落题材', value: '古装甜宠', note: '站外讨论度开始回撤。' },
          { label: '题材新组合', value: '4 个', note: '现实+悬疑、青春+职场等组合活跃。' },
        ],
        charts: [
          lineChart(
            '题材动能对比',
            '趋势指数',
            ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
            [
              { name: '悬疑', values: [52, 55, 61, 68, 74, 79], color: '#7dc6ff' },
              { name: '现实成长', values: [48, 50, 56, 63, 70, 76], color: '#8ae0b0' },
              { name: '古装甜宠', values: [71, 69, 66, 62, 58, 53], color: '#ff8b8b' },
            ],
            '用于判断题材组合是否仍有新增量空间。',
          ),
          barChart(
            '题材组合机会值',
            '机会分',
            [
              { label: '现实+悬疑', value: 88 },
              { label: '青春+职场', value: 77 },
              { label: '女性成长+行业剧', value: 74 },
              { label: '古装+奇幻', value: 52 },
            ],
            '机会值综合题材热度变化、竞品拥挤度和平台供给缺口。',
          ),
        ],
        keyQuestions: [
          '哪些题材仍有增量空间，哪些题材已进入内卷区？',
          '题材组合的机会值是否高于单一老赛道？',
          '平台当前缺什么，不只是市场热什么？',
        ],
        watchItems: [
          { title: '悬疑持续升温', description: '悬疑题材在多个平台保持高讨论密度。', metric: '动能指数 79' },
          { title: '现实成长回暖', description: '现实成长题材在口碑端表现稳定。', metric: '正向口碑 72%' },
          { title: '古装甜宠回落', description: '高频供给带来审美疲劳。', metric: '回撤 -18%' },
        ],
        actions: [
          '在立项评审前先看题材动能图，再讨论演员与宣发配置。',
          '把题材机会值作为平台沟通时的辅助论据。',
          '增加“题材组合”视角，避免只看单标签赛道。',
        ],
      }),
    ],
  },
  {
    slug: 'platform-watch',
    title: '平台与竞对洞察',
    englishTitle: 'Platform & Competitor Watch',
    summary: '把长视频平台矩阵、核心竞对追踪、竞品侦测和内容素材表现打通，用于判断平台打法与同档期压力。',
    accent: '#79e0c3',
    icon: 'platform',
    statusLine: '优先识别平台差异化与核心竞对动作',
    metrics: [
      { label: '平台矩阵', value: '4 个', note: '聚焦爱奇艺、腾讯视频、优酷、芒果TV。' },
      { label: '核心竞对', value: '11 个', note: '含剧集、电影与宣发动作对象。' },
      { label: '素材样本', value: '186 组', note: '短视频、海报、片花、路演物料。' },
    ],
    features: [
      feature({
        slug: 'ott-strategy',
        title: '长视频平台矩阵',
        englishTitle: 'OTT Strategy',
        summary: '比较各长视频平台在题材、宣发节奏和爆款承接上的差异化策略。',
        status: '重点跟踪',
        metrics: [
          { label: '平台强势题材', value: '悬疑 / 都市', note: '两类题材在核心平台上竞争最激烈。' },
          { label: '首屏曝光位', value: '28 个', note: '高价值曝光资源集中在重点档期。' },
          { label: '排播波动', value: '中等', note: '部分平台存在临时档期调整。' },
        ],
        charts: [
          barChart(
            '平台策略强度',
            '策略分',
            [
              { label: '腾讯视频', value: 86, color: '#79e0c3' },
              { label: '爱奇艺', value: 83 },
              { label: '优酷', value: 71 },
              { label: '芒果TV', value: 66 },
            ],
            '策略分综合排播密度、题材覆盖、宣传位资源和平台承接能力。',
          ),
          lineChart(
            '平台题材切换速度',
            '切换指数',
            ['W1', 'W2', 'W3', 'W4', 'W5'],
            [
              { name: '爱奇艺', values: [52, 58, 61, 69, 73], color: '#7dc6ff' },
              { name: '腾讯视频', values: [49, 56, 62, 67, 71], color: '#d7b46a' },
            ],
            '题材切换速度越快，越适合用差异化项目补位。',
          ),
        ],
        keyQuestions: [
          '各平台目前主打什么题材与什么叙事人群？',
          '哪个平台更适合承接当前项目？',
          '平台之间的策略差异能否形成排播谈判空间？',
        ],
        watchItems: [
          { title: '悬疑资源倾斜', description: '爱奇艺与腾讯视频继续加码悬疑赛道。', metric: '悬疑项目 6 个' },
          { title: '都市剧补量', description: '优酷与芒果TV在都市现实题材上提升配置。', metric: '曝光位 +9' },
          { title: '平台排播灵活性', description: '重点平台更频繁使用预热窗口试探市场。', metric: '试探排播 3 次' },
        ],
        actions: [
          '把平台矩阵页做成制片人与发行沟通时的对照面板。',
          '同步平台强势题材与题材趋势页，避免逆势推进。',
          '将平台排播波动与宣发时间表联动显示。',
        ],
      }),
      feature({
        slug: 'key-competitors',
        title: '核心竞对追踪',
        englishTitle: 'Key Competitors',
        summary: '持续跟踪同档期、同题材和同受众项目，避免竞对信息只靠手工整理。',
        status: '重点跟踪',
        metrics: [
          { label: '重点竞对', value: '6 项', note: '覆盖宣发最激进的一批项目。' },
          { label: '动作频次', value: '日均 3.2 次', note: '竞对物料和路演动作密集。' },
          { label: '冲突档期', value: '2 个窗口', note: '与我方目标窗口高度重叠。' },
        ],
        charts: [
          barChart(
            '核心竞对压力值',
            '压力分',
            [
              { label: '红果', value: 88, color: '#ff8b8b' },
              { label: '抖音', value: 81 },
              { label: '小红书', value: 64 },
              { label: '微博', value: 57 },
            ],
            '压力值综合竞对强度、用户讨论与宣发资源覆盖。',
          ),
          lineChart(
            '竞对动作频次',
            '动作次数',
            ['周一', '周二', '周三', '周四', '周五', '周六'],
            [
              { name: '核心竞对', values: [2, 3, 3, 4, 5, 4], color: '#ff8b8b' },
              { name: '我方项目', values: [1, 1, 2, 2, 3, 2], color: '#79e0c3' },
            ],
            '用于判断我方在舆论战中的主动性是否足够。',
          ),
        ],
        keyQuestions: [
          '哪些项目是真正需要盯住的“核心竞对”？',
          '竞对的动作是常规宣发，还是有针对性的抢位？',
          '我方需要在什么节点做回应或错位？',
        ],
        watchItems: [
          { title: '红果强攻短视频', description: '短视频分发加速，带来更高频次的站外触达。', metric: '投放频次 +23%' },
          { title: '抖音话题抢位', description: '话题启动点更早，占用注意力窗口。', metric: '提前 2 天' },
          { title: '微博热搜冲刺', description: '热点位集中在周末晚间时段。', metric: '热搜占位 4 次' },
        ],
        actions: [
          '建立竞对档期和动作的每日快照，减少口头同步损耗。',
          '对重叠窗口给出“正面应战/错位放量”建议。',
          '把竞对动作频次与我方营销节奏同屏对照。',
        ],
      }),
      feature({
        slug: 'competition-detection',
        title: '竞品侦测',
        englishTitle: 'Competition Detection',
        summary: '自动识别新出现的竞品与同赛道替代品，补足只盯头部对手的视野盲区。',
        status: '机会窗口',
        metrics: [
          { label: '新增竞品', value: '7 个', note: '多为中腰部项目或短视频内容。' },
          { label: '相似度阈值', value: '0.73', note: '题材、受众、宣发方式综合相似。' },
          { label: '高危替代品', value: '2 个', note: '与我方定位高度重叠。' },
        ],
        charts: [
          barChart(
            '竞品相似度',
            '相似度',
            [
              { label: '题材', value: 82, color: '#79e0c3' },
              { label: '受众', value: 77 },
              { label: '物料打法', value: 71 },
              { label: '平台重叠', value: 68 },
            ],
            '相似度越高，越需要提前做叙事与物料差异化。',
          ),
          lineChart(
            '新增竞品出现节奏',
            '新增数',
            ['1周前', '5天前', '3天前', '昨天', '今天'],
            [
              { name: '新增竞品', values: [1, 1, 2, 1, 2], color: '#79e0c3' },
            ],
            '识别是否进入“突然拥挤”的竞争局面。',
          ),
        ],
        keyQuestions: [
          '最近新冒出来的项目里，哪些会真正分走注意力？',
          '我方与新增竞品有哪些容易被误认为同类的点？',
          '应该在哪些叙事标签上主动做区隔？',
        ],
        watchItems: [
          { title: '题材重叠', description: '新项目在题材和受众上与我方更接近。', metric: '相似度 0.79' },
          { title: '平台重叠', description: '相同平台和相似物料窗口增加替代风险。', metric: '平台重叠 3 家' },
          { title: '物料套路相似', description: '片花和海报风格容易互相覆盖。', metric: '物料相似 71%' },
        ],
        actions: [
          '把竞品侦测结果提前给营销策略页，避免物料撞车。',
          '对高危替代品增加“差异化标签”提醒。',
          '在竞品页增加“最近新出现”筛选，方便日常巡检。',
        ],
      }),
      feature({
        slug: 'material-performance',
        title: '内容素材表现数据',
        englishTitle: 'Material Performance Data',
        summary: '比较海报、片花、切条、路演、直播等素材的表现，用于指导下一轮创意和投放。',
        status: '重点跟踪',
        metrics: [
          { label: '高表现素材', value: '18 组', note: '人物关系与冲突型标题表现更好。' },
          { label: '低效素材', value: '6 组', note: '世界观解释型素材转化较差。' },
          { label: '素材半衰期', value: '36 小时', note: '过时后需快速换新。' },
        ],
        charts: [
          barChart(
            '素材类型表现',
            '表现分',
            [
              { label: '冲突切条', value: 91, color: '#79e0c3' },
              { label: '人物关系海报', value: 84 },
              { label: '花絮直播', value: 74 },
              { label: '世界观说明', value: 49 },
            ],
            '用于指导物料团队的主次投入。',
          ),
          lineChart(
            '素材半衰期',
            '互动率',
            ['0h', '12h', '24h', '36h', '48h'],
            [
              { name: '高表现素材', values: [92, 85, 76, 63, 54], color: '#d7b46a' },
              { name: '低效素材', values: [61, 48, 36, 24, 18], color: '#7dc6ff' },
            ],
            '半衰期越短，越需要更密集的迭代节奏。',
          ),
        ],
        keyQuestions: [
          '哪些素材形式真正带来讨论和转化，而不是表面播放？',
          '素材疲劳出现在哪个时间点？',
          '下一波创意该继续放大什么，而不是平均用力？',
        ],
        watchItems: [
          { title: '冲突型切条', description: '最能带动转评和评论区讨论。', metric: '互动率 91' },
          { title: '人物关系海报', description: '对站内收藏与预约更友好。', metric: '收藏率 +16%' },
          { title: '世界观说明素材', description: '解释型信息过重，传播效率明显偏低。', metric: '表现分 49' },
        ],
        actions: [
          '保留素材半衰期曲线，帮助团队安排换新节奏。',
          '让高表现素材直接回流到营销策略页的动作建议。',
          '支持按平台、素材类型、发布时间筛选素材表现。',
        ],
      }),
    ],
  },
  {
    slug: 'marketing-radar',
    title: '营销策略雷达台',
    englishTitle: 'Marketing Strategy Radar',
    summary: '把角色与演员热度、话题传播、口碑反馈、二创生态、社区反馈和渠道结点放在一起，帮助制片人判断“该怎么打”。',
    accent: '#f0b24d',
    icon: 'marketing',
    statusLine: '先看传播势能，再调资源和物料',
    metrics: [
      { label: '传播线索', value: '42 条', note: '覆盖角色、话题、口碑、社区和渠道。' },
      { label: '内容素材', value: '86 组', note: '支持营销团队快速回看打法。' },
      { label: '策略节点', value: '8 个', note: '建议放量、守势和转向时点。' },
    ],
    features: [
      feature({
        slug: 'character-actor-heat',
        title: '角色与演员热度数据',
        englishTitle: 'Character & Actor Heat Data',
        summary: '判断热度究竟来自角色、演员还是两者共同放大，避免宣发重点放错。',
        status: '重点跟踪',
        metrics: [
          { label: '角色领先项', value: '5 个', note: '角色热度明显高于演员。' },
          { label: '演员驱动项', value: '3 个', note: '演员本人带动内容关注。' },
          { label: '耦合强度', value: '0.71', note: '角色与演员热度联动度高。' },
        ],
        charts: [
          lineChart(
            '角色 / 演员耦合曲线',
            '热度指数',
            ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
            [
              { name: '角色线', values: [58, 62, 69, 74, 77, 82], color: '#f0b24d' },
              { name: '演员线', values: [61, 63, 66, 69, 72, 74], color: '#7dc6ff' },
            ],
            '角色线后段明显加速，适合把宣发重点转向剧情与角色物料。',
          ),
          barChart(
            '热度来源拆解',
            '%',
            [
              { label: '角色内容', value: 44, color: '#f0b24d' },
              { label: '演员个人', value: 32 },
              { label: 'CP / 关系线', value: 24 },
            ],
            '帮助判断宣发重点到底该落在谁身上。',
          ),
        ],
        keyQuestions: [
          '当前热度是角色带人，还是人带角色？',
          '营销资源该押在剧情关系、角色切片，还是演员本体内容？',
          '角色与演员热度错位时，应该如何纠偏？',
        ],
        watchItems: [
          { title: '角色势能更强', description: '角色线后段更强，说明用户更吃剧情与人物关系。', metric: '角色线 +8' },
          { title: '演员势能平稳', description: '演员本体热度仍有稳定底盘。', metric: '演员线 +3' },
          { title: '关系线可放大', description: 'CP / 对手戏素材有继续抬升空间。', metric: '关系线 24%' },
        ],
        actions: [
          '让角色与演员耦合曲线进入营销例会固定页。',
          '对“角色领先”的项目优先增加剧情与关系物料。',
          '对“演员驱动”的项目加强艺人行程与站外联动。',
        ],
      }),
      feature({
        slug: 'topic-dissemination',
        title: '话题传播数据',
        englishTitle: 'Topic Dissemination Data',
        summary: '看话题从谁发起、在哪扩散、何时转化，帮助调整宣发发力点。',
        status: '重点跟踪',
        metrics: [
          { label: '核心话题', value: '9 个', note: '其中 3 个具备持续扩散能力。' },
          { label: '扩散节点', value: '27 个', note: '站内外节点共同形成传播链。' },
          { label: '二跳转化', value: '18%', note: '用户从讨论转向内容页。' },
        ],
        charts: [
          barChart(
            '话题扩散节点',
            '触达分',
            [
              { label: '短视频', value: 88, color: '#f0b24d' },
              { label: '微博', value: 79 },
              { label: '小红书', value: 67 },
              { label: '社区论坛', value: 53 },
            ],
            '短视频是起爆点，微博是放大量，小红书承担情绪巩固。',
          ),
          lineChart(
            '话题生命周期',
            '热度指数',
            ['0h', '6h', '12h', '24h', '36h', '48h'],
            [
              { name: '主话题', values: [31, 56, 84, 79, 63, 48], color: '#f0b24d' },
              { name: '衍生话题', values: [18, 29, 47, 58, 55, 41], color: '#7dc6ff' },
            ],
            '主话题在 12h 左右达到峰值，适合在此时补投第二轮素材。',
          ),
        ],
        keyQuestions: [
          '话题传播链路里，哪些节点最关键？',
          '热点该怎么续住，而不是只打一枪？',
          '衍生话题是天然长尾，还是需要人工扶持？',
        ],
        watchItems: [
          { title: '短视频起爆', description: '主话题首先在短视频端起量。', metric: '触达分 88' },
          { title: '微博放大', description: '热点转发链条在微博端形成第二波放大。', metric: '放大效率 +17%' },
          { title: '小红书沉淀', description: '心得型内容带来更长尾的讨论。', metric: '长尾占比 21%' },
        ],
        actions: [
          '把话题生命周期做成固定模板，方便团队直接照着排第二波素材。',
          '为“主话题”和“衍生话题”准备不同的持续运营策略。',
          '增加从话题到内容页的转化监控，避免只看声量。',
        ],
      }),
      feature({
        slug: 'reputation-feedback',
        title: '口碑反馈数据',
        englishTitle: 'Reputation Feedback Data',
        summary: '把正负反馈拆解到剧情、角色、制作和营销层面，为内容和宣发复盘提供证据。',
        status: '重点跟踪',
        metrics: [
          { label: '正向反馈', value: '72%', note: '集中在角色和质感。' },
          { label: '负向集中点', value: '节奏 / 设定', note: '批评主要聚焦在叙事节奏。' },
          { label: '舆情修复时机', value: '24h 内', note: '负向舆情需要快速回应。' },
        ],
        charts: [
          barChart(
            '口碑维度拆解',
            '提及占比',
            [
              { label: '角色塑造', value: 79, color: '#8ae0b0' },
              { label: '制作质感', value: 71 },
              { label: '剧情节奏', value: 55 },
              { label: '营销预期差', value: 41 },
            ],
            '帮助分清内容问题和营销问题。',
          ),
          lineChart(
            '舆情修复窗口',
            '负向声量',
            ['0h', '6h', '12h', '24h', '36h'],
            [
              { name: '负向声量', values: [73, 81, 67, 48, 39], color: '#ff8b8b' },
            ],
            '若 24h 内没有修复动作，负面印象更容易固化。',
          ),
        ],
        keyQuestions: [
          '用户不满意的是内容本身，还是营销造成的预期错位？',
          '哪些负向点需要立刻回应，哪些适合放掉？',
          '正向口碑要怎么反哺到后续物料？',
        ],
        watchItems: [
          { title: '角色受好评', description: '角色与情感线是正向口碑的主要来源。', metric: '正向 79%' },
          { title: '节奏被吐槽', description: '剧情节奏问题是主要负向集中点。', metric: '负向主因 55%' },
          { title: '营销预期差', description: '部分用户觉得预告与正片体验不完全一致。', metric: '预期差 41%' },
        ],
        actions: [
          '把口碑维度拆解接进物料复盘会议。',
          '给负向集中点设计“回应 / 放弃 / 迭代”三类策略。',
          '及时把正向评论沉淀成新一轮素材文案。',
        ],
      }),
      feature({
        slug: 'secondary-creation',
        title: '二创生态数据',
        englishTitle: 'Secondary Creation Ecosystem Data',
        summary: '跟踪剪辑、混剪、表情包、安利帖等二创生态的繁荣度，判断项目是否具备自传播能力。',
        status: '机会窗口',
        metrics: [
          { label: '二创增长', value: '+26%', note: '角色与关系线素材最易被二创。' },
          { label: '头部创作者', value: '32 位', note: '带来稳定放大量。' },
          { label: '内容寿命', value: '5.6 天', note: '二创让内容保持更长热度。' },
        ],
        charts: [
          lineChart(
            '二创增速',
            '增速',
            ['周一', '周二', '周三', '周四', '周五', '周六'],
            [
              { name: '二创内容数', values: [24, 28, 35, 41, 46, 52], color: '#f0b24d' },
            ],
            '内容情绪越明确，二创增速越快。',
          ),
          barChart(
            '二创类型分布',
            '占比',
            [
              { label: '混剪', value: 37, color: '#f0b24d' },
              { label: '名场面剪辑', value: 31 },
              { label: '表情包', value: 18 },
              { label: '安利长帖', value: 14 },
            ],
            '不同二创形态对应不同传播目标。',
          ),
        ],
        keyQuestions: [
          '项目是否具备天然二创土壤？',
          '哪些人物关系和情绪点最适合被二创放大？',
          '二创该如何反哺官方物料策略？',
        ],
        watchItems: [
          { title: '混剪强势', description: '混剪与名场面剪辑带动最大传播量。', metric: '占比 68%' },
          { title: '头部创作者联动', description: '头部创作者入场能迅速抬高话题层级。', metric: '头部 32 位' },
          { title: '情绪点最关键', description: '强情绪转折比世界观解释更容易形成二创。', metric: '二创增速 +26%' },
        ],
        actions: [
          '把二创高频素材提前准备好官方高清素材包。',
          '建立二创活跃度与营销节奏的联动规则。',
          '不要只追求播放量，重点看二创后的二次扩散。',
        ],
      }),
      feature({
        slug: 'user-community-feedback',
        title: '用户社区反馈数据',
        englishTitle: 'User Community Feedback Data',
        summary: '观察用户在社区里的真实讨论与情绪，判断项目传播是否形成持续参与。',
        status: '保持观察',
        metrics: [
          { label: '社区正向情绪', value: '64%', note: '偏理性讨论，利于长尾。' },
          { label: '争议议题', value: '4 个', note: '集中在人物关系和结局猜测。' },
          { label: '深度互动', value: '+13%', note: '长帖与复盘帖增加。' },
        ],
        charts: [
          barChart(
            '社区反馈来源',
            '反馈量',
            [
              { label: '论坛长帖', value: 72, color: '#f0b24d' },
              { label: '站内评论', value: 65 },
              { label: '社交问答', value: 54 },
              { label: '粉丝群', value: 42 },
            ],
            '越偏深度讨论的社区，越适合观察真实口碑走向。',
          ),
          lineChart(
            '深度互动变化',
            '互动量',
            ['W1', 'W2', 'W3', 'W4'],
            [
              { name: '复盘帖', values: [18, 24, 31, 36], color: '#7dc6ff' },
              { name: '讨论串', values: [27, 29, 33, 35], color: '#f0b24d' },
            ],
            '深度互动增加意味着内容已超出“看完即走”的状态。',
          ),
        ],
        keyQuestions: [
          '用户到底在认真讨论什么，而不是只在刷梗？',
          '社区争议会不会演变成更大范围的口碑风险？',
          '哪些深度内容适合被官方再加工？',
        ],
        watchItems: [
          { title: '复盘帖增长', description: '说明用户愿意投入更多时间参与讨论。', metric: '+13%' },
          { title: '争议议题集中', description: '争议尚可控，但需要持续观察。', metric: '4 个议题' },
          { title: '情绪整体平稳', description: '正向与理性讨论仍占上风。', metric: '正向 64%' },
        ],
        actions: [
          '把社区反馈页作为制片和宣发的“真实声音面板”。',
          '对争议议题建立升级阈值提醒。',
          '筛选可二次加工的高质量社区内容。',
        ],
      }),
      feature({
        slug: 'channel-characteristics',
        title: '渠道结点数据',
        englishTitle: 'Channel Characteristics Data',
        summary: '比较不同传播渠道在起爆、放大、沉淀和转化上的角色，为资源投放做拆分。',
        status: '重点跟踪',
        metrics: [
          { label: '核心渠道', value: '4 类', note: '短视频、微博、社区、垂类站点。' },
          { label: '渠道分工', value: '已成型', note: '起爆、放大、沉淀、转化各自不同。' },
          { label: '预算效率差', value: '2.1x', note: '高效渠道与低效渠道差异明显。' },
        ],
        charts: [
          barChart(
            '渠道角色分工',
            '效率分',
            [
              { label: '起爆', value: 91, color: '#f0b24d' },
              { label: '放大', value: 83 },
              { label: '沉淀', value: 71 },
              { label: '转化', value: 64 },
            ],
            '起爆不等于转化，渠道需要按角色拆开看。',
          ),
          lineChart(
            '预算效率差',
            'ROI 指数',
            ['Q1', 'Q2', 'Q3', 'Q4'],
            [
              { name: '高效渠道', values: [66, 73, 77, 81], color: '#8ae0b0' },
              { name: '低效渠道', values: [43, 45, 41, 39], color: '#ff8b8b' },
            ],
            '预算越晚调整，效率差越难追回。',
          ),
        ],
        keyQuestions: [
          '不同渠道分别负责什么，不要一把尺子看所有渠道。',
          '预算该补到哪里，砍掉哪里？',
          '哪些渠道适合提前做预热，哪些适合冲刺？',
        ],
        watchItems: [
          { title: '短视频起爆最强', description: '承担最主要的首轮触达任务。', metric: '效率分 91' },
          { title: '微博放大量稳定', description: '适合热点承接与放大。', metric: '效率分 83' },
          { title: '社区沉淀更长尾', description: '更适合承接口碑与复盘。', metric: '沉淀分 71' },
        ],
        actions: [
          '按渠道角色拆预算，不再平均分配。',
          '让营销周会固定看渠道分工页。',
          '对高效渠道建立“优先保量”规则。',
        ],
      }),
    ],
  },
  {
    slug: 'external-tech',
    title: '影视前沿技术',
    englishTitle: 'Film & TV Tech Frontier - External',
    summary: '跟踪生成式 AI 视频、实时生成与世界模型、Google / Nano Banana 等外部技术前沿，判断哪些技术已经进入可落地阶段。',
    accent: '#ff8fb6',
    icon: 'external',
    statusLine: '关注“能不能真实提效”，不只看技术热闹',
    metrics: [
      { label: '外部技术主题', value: '4 个', note: '围绕生成式视频与实时生成场景。' },
      { label: '应用窗口', value: '提效优先', note: '当前更适合解决流程问题。' },
      { label: '实验案例', value: '22 条', note: '覆盖 prompt、镜头、预演和轻应用。' },
    ],
    features: [
      feature({
        slug: 'generative-ai-video',
        title: '生成式 AI & 视频',
        englishTitle: 'Generative AI & Video',
        summary: '观察生成式视频工具在预演、分镜、物料扩写、风格探索上的真实可用度。',
        status: '重点跟踪',
        metrics: [
          { label: '可落地场景', value: '4 类', note: '预演、分镜、概念片、素材扩写。' },
          { label: '提效幅度', value: '1.7x', note: '适用于探索性阶段。' },
          { label: '一致性风险', value: '偏高', note: '角色与镜头一致性仍需人工兜底。' },
        ],
        charts: [
          barChart(
            '生成视频可用度',
            '可用分',
            [
              { label: '概念预演', value: 86, color: '#ff8fb6' },
              { label: '分镜草稿', value: 78 },
              { label: '营销短片', value: 69 },
              { label: '正片镜头', value: 41 },
            ],
            '目前更适合前期和营销辅助，不适合直接替代正片镜头制作。',
          ),
          lineChart(
            '一致性风险走势',
            '风险分',
            ['V1', 'V2', 'V3', 'V4', 'V5'],
            [
              { name: '角色一致性', values: [71, 68, 63, 61, 59], color: '#ff8b8b' },
              { name: '镜头一致性', values: [76, 72, 70, 66, 63], color: '#7dc6ff' },
            ],
            '虽然在下降，但仍需人工镜头设计与审核。',
          ),
        ],
        keyQuestions: [
          '生成式视频到底适合替代哪一步，而不是“全都想替代”？',
          '一致性和可控性还差在哪？',
          '对于制片流程，最值得先接的环节是什么？',
        ],
        watchItems: [
          { title: '概念预演成熟', description: '最适合当前制片讨论场景。', metric: '可用分 86' },
          { title: '营销辅助可行', description: '营销短片可作为创意预演和风格试探。', metric: '可用分 69' },
          { title: '正片替代仍远', description: '正片镜头仍不具备稳定替代能力。', metric: '可用分 41' },
        ],
        actions: [
          '优先把生成式视频用于概念预演和营销创意前测。',
          '把一致性风险显式显示给制片人，避免误判成熟度。',
          '用“提效幅度 / 一致性风险”双轴评估新工具。',
        ],
      }),
      feature({
        slug: 'realtime-generation',
        title: '实时生成 & 世界模型',
        englishTitle: 'Real-time Generation',
        summary: '观察实时生成、世界模型和交互式创作链路，判断是否能改变影视制作与预演方式。',
        status: '机会窗口',
        metrics: [
          { label: '交互延迟', value: '< 2 秒', note: '达到创作试用门槛。' },
          { label: '世界一致性', value: '中等', note: '世界观连续性仍在提升中。' },
          { label: '试验价值', value: '高', note: '适合前期故事世界探索。' },
        ],
        charts: [
          lineChart(
            '实时生成反馈速度',
            '反馈分',
            ['T1', 'T2', 'T3', 'T4', 'T5'],
            [
              { name: '反馈速度', values: [52, 59, 68, 74, 81], color: '#ff8fb6' },
            ],
            '反馈速度越快，越接近真正的“创作陪跑”工具。',
          ),
          barChart(
            '世界模型应用前景',
            '前景分',
            [
              { label: '世界观预演', value: 85, color: '#ff8fb6' },
              { label: '交互叙事', value: 73 },
              { label: '实时导演辅助', value: 69 },
              { label: '正片生成', value: 38 },
            ],
            '目前仍然偏前期探索，不适合直接进入正式成片流程。',
          ),
        ],
        keyQuestions: [
          '实时生成能否真正改变前期创作沟通？',
          '世界模型最适合进入哪个创作环节？',
          '哪些想象空间很大，但短期不应高估？',
        ],
        watchItems: [
          { title: '前期探索价值高', description: '更适合故事世界和镜头氛围试验。', metric: '前景分 85' },
          { title: '实时导演辅助试探中', description: '可用于快速模拟镜头和场景。', metric: '前景分 69' },
          { title: '正片生成暂不现实', description: '不应作为短期主流程替代方案。', metric: '前景分 38' },
        ],
        actions: [
          '把实时生成放进前期美术和导演讨论，而不是后期制作主线。',
          '为“世界观预演”单独设置评估指标。',
          '持续观察交互延迟与世界一致性两项核心能力。',
        ],
      }),
      feature({
        slug: 'nano-banana',
        title: 'Google / Nano Banana',
        englishTitle: 'Google / Nano Banana',
        summary: '跟踪轻量级 AI 视频应用如何进入影视日常工作流，重点看真实可用度而非概念展示。',
        status: '保持观察',
        metrics: [
          { label: '轻量应用场景', value: '5 个', note: '适合创意脚本、简易预演和素材试制。' },
          { label: '接入门槛', value: '低', note: '更适合团队快速试点。' },
          { label: '成片能力', value: '有限', note: '适合轻量而非重制作环节。' },
        ],
        charts: [
          barChart(
            '轻量 AI 视频场景价值',
            '价值分',
            [
              { label: '快速试片', value: 81, color: '#ff8fb6' },
              { label: '脚本可视化', value: 77 },
              { label: '社媒短素材', value: 72 },
              { label: '成片替代', value: 33 },
            ],
            '适合“先试再决定”的轻量场景。',
          ),
          lineChart(
            '试点上手时间',
            '上手指数',
            ['第1天', '第2天', '第3天', '第4天'],
            [
              { name: '上手速度', values: [38, 57, 71, 79], color: '#7dc6ff' },
            ],
            '接入门槛低，适合作为团队轻量试点。',
          ),
        ],
        keyQuestions: [
          '轻量工具到底能解决哪些日常创意问题？',
          '它的低门槛是否能换来稳定收益？',
          '试点时应该用什么标准判断值不值得继续？',
        ],
        watchItems: [
          { title: '脚本可视化友好', description: '适合把抽象概念快速变成可讨论的画面。', metric: '价值分 77' },
          { title: '社媒素材适配', description: '更适合快速生成社媒短内容。', metric: '价值分 72' },
          { title: '不适合重成片', description: '不应作为高质量成片生产工具。', metric: '价值分 33' },
        ],
        actions: [
          '把这类工具放进“轻量试点池”，快速验证即可。',
          '用“上手时间 / 价值分”双指标筛选是否继续深挖。',
          '避免团队把轻量工具误当成重生产工具。',
        ],
      }),
      feature({
        slug: 'jimeng',
        title: '字节跳动 / 即梦',
        englishTitle: 'ByteDance / Jimeng',
        summary: '跟踪字节系创意生成工具在 prompt、创意片、素材生产中的落地节奏。',
        status: '重点跟踪',
        metrics: [
          { label: '素材试制效率', value: '1.9x', note: '在短素材和情绪片上提效明显。' },
          { label: '平台协同', value: '较强', note: '更容易贴合短视频传播链路。' },
          { label: '稳定性', value: '中等', note: '风格和一致性仍需人工约束。' },
        ],
        charts: [
          barChart(
            '即梦落地场景',
            '适配分',
            [
              { label: '短视频素材', value: 88, color: '#ff8fb6' },
              { label: '情绪预告', value: 76 },
              { label: '镜头预演', value: 68 },
              { label: '长片生产', value: 34 },
            ],
            '仍应把它视为创意与传播辅助工具。',
          ),
          lineChart(
            '创意试制效率',
            '效率分',
            ['阶段1', '阶段2', '阶段3', '阶段4'],
            [
              { name: '素材试制效率', values: [44, 59, 73, 81], color: '#ff8fb6' },
            ],
            '在短视频和情绪片层面已有较明显的提效空间。',
          ),
        ],
        keyQuestions: [
          '字节系工具最适合为影视团队解决什么问题？',
          '它与短视频传播链路的协同优势在哪里？',
          '哪些环节必须保留人工控制？',
        ],
        watchItems: [
          { title: '短视频素材强', description: '最适合情绪化、节奏快的短素材。', metric: '适配分 88' },
          { title: '镜头预演可用', description: '适合预演镜头氛围，但不宜替代正式镜头设计。', metric: '适配分 68' },
          { title: '长片生产不适合', description: '不要把它直接推入重制作流程。', metric: '适配分 34' },
        ],
        actions: [
          '把即梦作为“营销短素材”和“情绪预告”试制工具。',
          '关注其与短视频分发平台的协同优势。',
          '对稳定性和一致性保持保守预期。',
        ],
      }),
    ],
  },
  {
    slug: 'domestic-tech',
    title: '国产技术生态',
    englishTitle: 'Domestic Tech Ecosystem - Internal',
    summary: '聚焦阿里巴巴、通义、可灵以及国产影视技术生态数据，判断哪些国产能力可以优先进入内部工作流。',
    accent: '#b48cff',
    icon: 'domestic',
    statusLine: '以内部可落地、可协同、可控为优先标准',
    metrics: [
      { label: '国产能力节点', value: '4 类', note: '围绕模型、工具、生态与视频生成。' },
      { label: '内部协同潜力', value: '高', note: '更利于合规与流程集成。' },
      { label: '优先试点', value: '可灵 / 通义', note: '更适合率先接入原型链路。' },
    ],
    features: [
      feature({
        slug: 'alibaba',
        title: '阿里巴巴',
        englishTitle: 'Alibaba',
        summary: '跟踪阿里在内容产业和 AI 能力上的布局，判断其对影视制作和分发的协同价值。',
        status: '保持观察',
        metrics: [
          { label: '生态协同', value: '较强', note: '适合看平台化与协同化机会。' },
          { label: '内容工具潜力', value: '中高', note: '偏向流程整合能力。' },
          { label: '直接提效', value: '中等', note: '需结合内部场景落地。' },
        ],
        charts: [
          barChart(
            '阿里生态价值',
            '价值分',
            [
              { label: '平台协同', value: 84, color: '#b48cff' },
              { label: '流程整合', value: 79 },
              { label: '内容工具', value: 67 },
              { label: '创意生成', value: 54 },
            ],
            '更适合作为生态和流程协同的观察对象。',
          ),
          lineChart(
            '协同落地优先级',
            '优先级',
            ['P1', 'P2', 'P3', 'P4'],
            [
              { name: '生态协同', values: [52, 63, 71, 78], color: '#b48cff' },
            ],
            '内部集成与流程协同是比单点工具更值得观察的方向。',
          ),
        ],
        keyQuestions: [
          '阿里的价值更偏平台协同，还是单点创意工具？',
          '哪些能力适合内部流程接入？',
          '需要避免哪些“看上去很全，实际上不落地”的判断？',
        ],
        watchItems: [
          { title: '平台协同价值高', description: '更适合做流程与资源协同。', metric: '价值分 84' },
          { title: '内容工具仍待验证', description: '需结合具体内部场景。', metric: '价值分 67' },
          { title: '创意生成一般', description: '不应过高期待其单点创意替代。', metric: '价值分 54' },
        ],
        actions: [
          '优先从生态协同角度评估阿里，而不是只看单点模型能力。',
          '把流程整合和资源配置视为其重点潜力。',
          '保持对具体影视落地案例的持续跟踪。',
        ],
      }),
      feature({
        slug: 'tongyi',
        title: '通义',
        englishTitle: 'Tongyi',
        summary: '观察通义在脚本、创意、角色生成与内容辅助方面的能力，评估其能否嵌入制片流程。',
        status: '重点跟踪',
        metrics: [
          { label: '脚本辅助', value: '成熟', note: '适合脚本草案与结构辅助。' },
          { label: '角色生成', value: '可试点', note: '可用于人设和视觉概念探索。' },
          { label: '内部适配', value: '较高', note: '适合原型阶段内嵌。' },
        ],
        charts: [
          barChart(
            '通义影视适配度',
            '适配分',
            [
              { label: '脚本辅助', value: 87, color: '#b48cff' },
              { label: '角色概念', value: 74 },
              { label: '创意扩写', value: 71 },
              { label: '长视频生成', value: 38 },
            ],
            '最适合脚本与角色概念阶段，而非复杂视频生成。',
          ),
          lineChart(
            '内部适配上升曲线',
            '适配指数',
            ['第1轮', '第2轮', '第3轮', '第4轮'],
            [
              { name: '内部适配', values: [46, 58, 69, 77], color: '#b48cff' },
            ],
            '随着流程梳理，适配度会继续提高。',
          ),
        ],
        keyQuestions: [
          '通义在制片流程中最值得先接的是哪几步？',
          '脚本和角色辅助是不是足够成熟？',
          '哪些高预期能力还不适合过早承诺？',
        ],
        watchItems: [
          { title: '脚本辅助成熟', description: '最适合当前内部快速落地。', metric: '适配分 87' },
          { title: '角色概念可试点', description: '适合美术和人设探索。', metric: '适配分 74' },
          { title: '视频生成仍弱', description: '不要把它当成视频生成主工具。', metric: '适配分 38' },
        ],
        actions: [
          '优先把通义接入脚本辅助和角色概念探索环节。',
          '对通义的影视应用建立清晰边界，不高估视频生成能力。',
          '用内部适配度做持续追踪，而不是只看通用模型宣传。',
        ],
      }),
      feature({
        slug: 'tech-ecosystem-data',
        title: '技术生态数据',
        englishTitle: 'Tech Ecosystem Data',
        summary: '观察国产影视技术生态的合作、案例和能力分布，帮助判断内部应该和谁连接。',
        status: '保持观察',
        metrics: [
          { label: '合作节点', value: '17 个', note: '覆盖模型、工具、制作、分发伙伴。' },
          { label: '能力密度', value: '逐步成型', note: '多环节已有可接能力。' },
          { label: '空白环节', value: '3 类', note: '仍有关键环节缺失。' },
        ],
        charts: [
          barChart(
            '生态能力分布',
            '覆盖分',
            [
              { label: '脚本与文本', value: 83, color: '#b48cff' },
              { label: '视觉概念', value: 77 },
              { label: '视频生成', value: 59 },
              { label: '后期工业化', value: 46 },
            ],
            '帮助判断内部合作优先级。',
          ),
          lineChart(
            '合作节点增长',
            '节点数',
            ['Q1', 'Q2', 'Q3', 'Q4'],
            [
              { name: '合作节点', values: [8, 11, 14, 17], color: '#b48cff' },
            ],
            '生态节点增长说明可选合作对象越来越多。',
          ),
        ],
        keyQuestions: [
          '国产生态里哪些环节已经可以接，哪些还只是概念？',
          '内部应该优先连哪些合作方？',
          '有没有关键能力空白需要提前准备兜底？',
        ],
        watchItems: [
          { title: '文本与脚本能力最成熟', description: '更适合首先纳入工作流。', metric: '覆盖分 83' },
          { title: '视觉概念紧随其后', description: '适合美术和前期提案。', metric: '覆盖分 77' },
          { title: '后期工业化仍薄弱', description: '暂不适合重度依赖。', metric: '覆盖分 46' },
        ],
        actions: [
          '把技术生态数据页作为合作对象筛选器。',
          '优先补齐空白能力，而不是堆已有优势环节。',
          '对每类能力建立“可接 / 观察 / 不接”状态。',
        ],
      }),
      feature({
        slug: 'kling',
        title: '快手 / 可灵',
        englishTitle: 'Kuaishou / Kling',
        summary: '跟踪可灵在视频生成和影视类应用上的落地情况，重点看其对原型制作、创意验证和短物料的价值。',
        status: '重点跟踪',
        metrics: [
          { label: '视频生成表现', value: '较强', note: '在短视频生成上更有竞争力。' },
          { label: '影视应用适配', value: '偏营销 / 预演', note: '适合短物料与前期实验。' },
          { label: '部署优先级', value: '高', note: '国产生态中更值得先接。' },
        ],
        charts: [
          barChart(
            '可灵影视适配度',
            '适配分',
            [
              { label: '短物料生成', value: 89, color: '#b48cff' },
              { label: '镜头预演', value: 76 },
              { label: '概念片试制', value: 73 },
              { label: '长片生产', value: 35 },
            ],
            '短物料与预演更适合优先接入。',
          ),
          lineChart(
            '试点价值曲线',
            '价值分',
            ['阶段1', '阶段2', '阶段3', '阶段4'],
            [
              { name: '试点价值', values: [54, 66, 74, 82], color: '#b48cff' },
            ],
            '随着案例增加，试点价值持续抬升。',
          ),
        ],
        keyQuestions: [
          '可灵在国产生态里是不是最值得先接入的视频能力？',
          '它更适合短物料还是更重的视频流程？',
          '制片团队该从哪个试点切入最稳？',
        ],
        watchItems: [
          { title: '短物料生成强', description: '非常适合营销短素材和预热视频。', metric: '适配分 89' },
          { title: '镜头预演可用', description: '可作为导演和制片前期讨论工具。', metric: '适配分 76' },
          { title: '长片生产仍不合适', description: '不建议过早进入重流程。', metric: '适配分 35' },
        ],
        actions: [
          '将可灵列为国产视频生成试点优先项。',
          '先在营销短物料和镜头预演场景里验证价值。',
          '与通义等文本能力组合，形成国产技术协同链路。',
        ],
      }),
    ],
  },
];

export const strategyNavItems = [
  { href: '/', label: '总览', icon: 'home' as const },
  ...strategyBoards.map((board) => ({
    href: `/boards/${board.slug}`,
    label: board.title,
    icon: board.icon,
  })),
];

export function getBoardBySlug(boardSlug: string): StrategyBoard | undefined {
  return strategyBoards.find((board) => board.slug === boardSlug);
}

export function getFeatureBySlug(
  boardSlug: string,
  featureSlug: string,
): { board: StrategyBoard; feature: StrategyFeature } | undefined {
  const board = getBoardBySlug(boardSlug);
  if (!board) return undefined;
  const feature = board.features.find((item) => item.slug === featureSlug);
  if (!feature) return undefined;
  return { board, feature };
}
