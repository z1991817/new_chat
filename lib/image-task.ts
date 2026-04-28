import type { PromptInput } from "./prompt-schema";

export type TaskStatus = "idle" | "submitting" | "queued" | "generating" | "success" | "failed";

export interface GeneratedImage {
  id: string;
  url: string;
  alt: string;
}

export interface ImageTaskResult {
  images: GeneratedImage[];
}

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const aspectSizeMap: Record<PromptInput["aspectRatio"], { width: number; height: number }> = {
  "1:1": { width: 960, height: 960 },
  "3:4": { width: 900, height: 1200 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
};

const buildSeed = (input: PromptInput) =>
  encodeURIComponent(
    `${input.prompt.slice(0, 32)}-${input.model}-${input.aspectRatio}-${input.quality}-${input.style}`,
  );

export async function runMockImageTask(
  input: PromptInput,
  onStatusChange: (status: TaskStatus) => void,
): Promise<ImageTaskResult> {
  onStatusChange("queued");
  await wait(800);
  onStatusChange("generating");
  await wait(29200);

  const unstable = input.prompt.toLowerCase().includes("error") || input.prompt.includes("失败");
  if (unstable) {
    throw new Error("生成失败：任务服务暂时不可用，请点击重试。");
  }

  const seed = buildSeed(input);
  const size = aspectSizeMap[input.aspectRatio];
  return {
    images: Array.from({ length: input.quantity }, (_, index) => ({
      id: `${seed}-${index}`,
      url: `https://picsum.photos/seed/${seed}-${index}/${size.width}/${size.height}`,
      alt: `AI 生成图 ${index + 1}，风格：${input.style}，提示词：${input.prompt}`,
    })),
  };
}
