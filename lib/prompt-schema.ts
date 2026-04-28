import { z } from "zod";

import { ASPECT_RATIOS, MODEL_IDS, QUALITY_LEVELS, STYLE_PRESETS } from "./constants";

export const promptSchema = z.object({
  prompt: z.string().trim().min(1, "请输入提示词。").max(500, "提示词最多 500 个字符。"),
  model: z.enum(MODEL_IDS, {
    error: "请选择生成模型。",
  }),
  aspectRatio: z.enum(ASPECT_RATIOS, {
    error: "请选择画幅比例。",
  }),
  quality: z.enum(QUALITY_LEVELS, {
    error: "请选择清晰度。",
  }),
  style: z.enum(STYLE_PRESETS, {
    error: "请选择风格。",
  }),
  quantity: z.number().int().min(1).max(4),
  promptEnhance: z.boolean(),
});

export type PromptInput = z.infer<typeof promptSchema>;
