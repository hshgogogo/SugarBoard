# SSBoard 免费旁白方案

当前机器没有可用的 `OPENAI_API_KEY`，因此这套旁白采用 macOS 自带的免费中文语音来生成，不依赖付费接口。

## 已选方案

- 语音引擎：macOS `say`
- 默认声音：`Tingting`
- 输出格式：
  - 原始音频：`voiceover/audio/*.aiff`
  - 压缩音频：`voiceover/audio/*.m4a`
- 时长元数据：`voiceover/meta/ssboard_voiceover_timeline.json`

## 一键生成

```bash
python3 /Users/hsh/Desktop/ssboard/tools/generate_macos_voiceover.py
```

## 自动翻页建议

1. 使用 `voiceover/meta/ssboard_voiceover_timeline.json` 中的 `recommended_auto_advance_seconds` 作为每页建议停留时间。
2. 在 Canva 或其他演示工具中，为每页手动设置自动前进时间。
3. 如果后续装上 `ffmpeg`，可以进一步把页面导出视频和旁白音轨自动拼接。

## 说明

- 免费本地 TTS 无需联网，适合先做审批版和内部试讲。
- 如果后面补上 OpenAI key，可以再切换到官方 `Speech API` 的 `gpt-4o-mini-tts` 方案，获得更自然的旁白音色。
