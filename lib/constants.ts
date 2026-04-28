export const MODEL_IDS = ["artimg-turbo", "artimg-pro", "artimg-real", "artimg-anime"] as const;

export const MODEL_PRESETS = [
  {
    id: "artimg-turbo",
    name: "ArtImg Turbo",
    description: "响应最快，适合快速试想法和批量出草图。",
    badge: "快速",
  },
  {
    id: "artimg-pro",
    name: "ArtImg Pro",
    description: "画面稳定，适合海报、封面和商业视觉。",
    badge: "推荐",
  },
  {
    id: "artimg-real",
    name: "ArtImg Real",
    description: "更偏写实质感，适合产品、人像和空间画面。",
    badge: "写实",
  },
  {
    id: "artimg-anime",
    name: "ArtImg Anime",
    description: "更适合动漫插画、角色和二次元风格。",
    badge: "插画",
  },
] as const;

export const ASPECT_RATIOS = ["1:1", "3:4", "16:9", "9:16"] as const;
export const QUALITY_LEVELS = ["1K", "2K", "4K"] as const;
export const STYLE_PRESETS = ["写实", "电商", "动漫", "电影感", "极简"] as const;
export const QUANTITY_OPTIONS = [1, 2, 3, 4] as const;

export const DEFAULT_FORM_VALUES = {
  prompt: "",
  model: "artimg-pro" as const,
  aspectRatio: "1:1" as const,
  quality: "2K" as const,
  style: "写实" as const,
  quantity: 4 as const,
  promptEnhance: false,
};
