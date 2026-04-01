# Canva 旁白与自动翻页导入清单

适用设计：
- Canva 编辑稿：[演示文稿 - SSBoard PRD 汇报](https://www.canva.com/d/mbDFRYb5Pb9xo4W)

当前采用的免费方案：
- 使用 macOS 本地语音 `Tingting`
- 不需要 OpenAI Key
- 不需要额外付费服务

本地素材位置：
- 音频目录：[voiceover/audio](/Users/hsh/Desktop/ssboard/voiceover/audio)
- 时序文件：[ssboard_voiceover_timeline.json](/Users/hsh/Desktop/ssboard/voiceover/meta/ssboard_voiceover_timeline.json)
- Canva 资产清单：[canva-audio-assets.json](/Users/hsh/Desktop/ssboard/voiceover/meta/canva-audio-assets.json)

## 导入步骤

1. 打开 Canva 编辑稿。
2. 进入对应页面。
3. 上传本地 `.m4a` 音频文件。
4. 将音频放到对应页。
5. 在该页的播放/切页设置中，填写“建议自动翻页秒数”。
6. 对 14 页重复以上动作。

## 逐页导入表

| 页码 | 页面标题 | 音频文件 | 语音时长（秒） | 建议自动翻页（秒） |
|---|---|---|---:|---:|
| 1 | 封面 | `/Users/hsh/Desktop/ssboard/voiceover/audio/01-封面.m4a` | 18.78 | 21.58 |
| 2 | 项目概览 | `/Users/hsh/Desktop/ssboard/voiceover/audio/02-项目概览.m4a` | 22.28 | 25.08 |
| 3 | 为什么现在要做 | `/Users/hsh/Desktop/ssboard/voiceover/audio/03-为什么现在要做.m4a` | 20.14 | 22.94 |
| 4 | 目标用户与价值 | `/Users/hsh/Desktop/ssboard/voiceover/audio/04-目标用户与价值.m4a` | 16.38 | 19.18 |
| 5 | v1 产品边界 | `/Users/hsh/Desktop/ssboard/voiceover/audio/05-v1-产品边界.m4a` | 17.43 | 20.23 |
| 6 | 核心业务流程 | `/Users/hsh/Desktop/ssboard/voiceover/audio/06-核心业务流程.m4a` | 18.06 | 20.86 |
| 7 | 首页原型 | `/Users/hsh/Desktop/ssboard/voiceover/audio/07-首页原型.m4a` | 20.20 | 23.00 |
| 8 | 榜单页与详情页原型 | `/Users/hsh/Desktop/ssboard/voiceover/audio/08-榜单页与详情页原型.m4a` | 20.28 | 23.08 |
| 9 | 数据体系设计 | `/Users/hsh/Desktop/ssboard/voiceover/audio/09-数据体系设计.m4a` | 21.07 | 23.87 |
| 10 | 数据来源策略 | `/Users/hsh/Desktop/ssboard/voiceover/audio/10-数据来源策略.m4a` | 19.51 | 22.31 |
| 11 | AI 能力设计 | `/Users/hsh/Desktop/ssboard/voiceover/audio/11-ai-能力设计.m4a` | 19.80 | 22.60 |
| 12 | 技术架构与实施路径 | `/Users/hsh/Desktop/ssboard/voiceover/audio/12-技术架构与实施路径.m4a` | 20.90 | 23.70 |
| 13 | 风险与决策建议 | `/Users/hsh/Desktop/ssboard/voiceover/audio/13-风险与决策建议.m4a` | 17.71 | 20.51 |
| 14 | 下一步建议 | `/Users/hsh/Desktop/ssboard/voiceover/audio/14-下一步建议.m4a` | 19.73 | 22.53 |

## 备注

- 建议自动翻页时间已经包含开场留白和结尾缓冲。
- 如果你希望节奏更快，可以每页再减 1 到 1.5 秒。
- 如果你希望更自然的停顿，可以保留当前推荐值。
- 这 14 条旁白已经全部导入到你的 Canva 账号素材库中，可直接在 Canva 素材搜索里用 `SSBoard 旁白` 检索。
