"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Bell,
  BookImage,
  ChevronDown,
  Download,
  House,
  Menu,
  Paperclip,
  PencilLine,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ASPECT_RATIOS,
  DEFAULT_FORM_VALUES,
  MODEL_PRESETS,
  QUALITY_LEVELS,
  QUANTITY_OPTIONS,
  STYLE_PRESETS,
} from "@/lib/constants";
import { type GeneratedImage, runMockImageTask, type TaskStatus } from "@/lib/image-task";
import { type PromptInput, promptSchema } from "@/lib/prompt-schema";

type GenerationOptions = Omit<PromptInput, "prompt">;
type ActivePanel = "model" | "parameters" | null;
type ComposerImage = {
  id: string;
  url: string;
  name: string;
};
type ConversationTurn = {
  id: string;
  prompt: string;
  attachments: ComposerImage[];
  status: TaskStatus;
  images: GeneratedImage[];
  errorMessage: string | null;
};

const topicButtons = [
  { label: "电商主图", icon: ShoppingBag },
  { label: "头像写真", icon: UserRound },
  { label: "小红书封面", icon: BookImage },
  { label: "室内设计", icon: House },
] as const;

const historyGroups = [
  { title: "今天", items: ["香水海报", "小红书封面", "产品图重绘"] },
  { title: "昨天", items: ["咖啡店室内设计", "电商主页生成", "游戏场景概念图"] },
  { title: "更早", items: ["宠物写真", "简约海报设计"] },
] as const;

const starterPrompt = "请生成一组高端香水海报，水面反射，光影氛围，4张";

const starterImages: GeneratedImage[] = [
  {
    id: "starter-1",
    url: "https://picsum.photos/seed/perfume-a/1280/960",
    alt: "香水海报样例图 1",
  },
  {
    id: "starter-2",
    url: "https://picsum.photos/seed/perfume-b/1280/960",
    alt: "香水海报样例图 2",
  },
  {
    id: "starter-3",
    url: "https://picsum.photos/seed/perfume-c/1280/960",
    alt: "香水海报样例图 3",
  },
  {
    id: "starter-4",
    url: "https://picsum.photos/seed/perfume-d/1280/960",
    alt: "香水海报样例图 4",
  },
];

function resizePromptTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight);
  const maxHeight = Number.isFinite(lineHeight) ? lineHeight * 3 : 84;

  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function Avatar() {
  return (
    <div className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#b8d2ff] to-[#8eb7ff] text-xs font-bold text-[#111]">
      ZQ
    </div>
  );
}

function ImageCard({ image }: { image: GeneratedImage }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-strong)]">
      <Image
        src={image.url}
        alt={image.alt}
        width={960}
        height={720}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/55 p-1 text-white backdrop-blur-sm">
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md hover:bg-white/10"
          aria-label="下载图片"
        >
          <Download size={14} />
        </button>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md hover:bg-white/10"
          aria-label="编辑图片"
        >
          <PencilLine size={14} />
        </button>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md hover:bg-white/10"
          aria-label="重新生成"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </article>
  );
}

function ToolbarTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip.Root delayDuration={160}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-50 rounded-md bg-[#151821] px-2.5 py-1.5 text-xs font-medium text-white shadow-[0_10px_28px_rgba(15,18,24,0.2)]"
        >
          {label}
          <Tooltip.Arrow className="fill-[#151821]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function ParameterSummaryButton({
  values,
  onClick,
  active,
  compact,
}: {
  values: GenerationOptions;
  onClick: () => void;
  active: boolean;
  compact?: boolean;
}) {
  const summary = `${values.aspectRatio} · ${values.quality} · ${values.style} · ${values.quantity}张`;

  return (
    <button
      type="button"
      onClick={onClick}
      data-panel-trigger="true"
      className={`inline-flex items-center rounded-lg border transition duration-150 ${
        active
          ? "border-[#151821] bg-[#151821] text-white"
          : "border-[var(--line)] bg-white text-[var(--text-soft)] hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
      } ${compact ? "h-8 px-3 text-xs" : "h-10 px-3 text-sm"}`}
      aria-label={`当前参数：${summary}`}
      aria-expanded={active}
    >
      {summary}
    </button>
  );
}

function ComposerImageStrip({
  images,
  onRemove,
}: {
  images: ComposerImage[];
  onRemove: (imageId: string) => void;
}) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex max-w-full gap-2 overflow-x-auto pb-1">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm sm:h-24 sm:w-24"
        >
          <Image
            src={image.url}
            alt={image.name}
            fill
            unoptimized
            sizes="96px"
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/80 text-white transition hover:bg-black"
            aria-label="移除上传图片"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TurnAttachmentStrip({ images }: { images: ComposerImage[] }) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 flex justify-end gap-2">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--line)] shadow-sm"
        >
          <Image
            src={image.url}
            alt={image.name}
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

const waitingCopy: Record<TaskStatus, { label: string; title: string; hint: string }> = {
  idle: {
    label: "准备中",
    title: "等待提示词",
    hint: "输入画面描述后开始生成。",
  },
  submitting: {
    label: "正在运算",
    title: "正在生成图片",
    hint: "系统正在理解提示词，完成后会自动显示结果。",
  },
  queued: {
    label: "准备生成",
    title: "正在生成图片",
    hint: "任务已进入生成队列，请稍等片刻。",
  },
  generating: {
    label: "生图中",
    title: "生图中",
    hint: "正在绘制最终图像，完成后会自动显示结果。",
  },
  success: {
    label: "已完成",
    title: "图片已生成",
    hint: "可以继续编辑或重新生成。",
  },
  failed: {
    label: "未完成",
    title: "这次没有生成成功",
    hint: "调整提示词后可以重试。",
  },
};

function GenerationWaitingCard({ status }: { status: TaskStatus }) {
  const copy = waitingCopy[status];

  return (
    <article
      className="generation-waiting-card relative min-h-[132px] w-full overflow-hidden rounded-xl border border-[#dedfe3] bg-white/72 text-[var(--text-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_30px_rgba(16,18,24,0.045)] backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="generation-waiting-glow" aria-hidden="true" />
      <div className="generation-waiting-sweep" aria-hidden="true" />
      <div className="relative z-10 px-5 py-5 text-left sm:px-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#7a808d]">
          <span className="generation-pulse-dot" aria-hidden="true" />
          {copy.label}
        </div>
        <p className="text-lg font-semibold tracking-normal text-[var(--text)] sm:text-xl">
          {copy.title}
        </p>
        <p className="mt-2 max-w-[360px] text-sm leading-6 text-[#747987]">{copy.hint}</p>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          <span className="generation-breath-dot" />
          <span className="generation-breath-dot" />
          <span className="generation-breath-dot" />
        </div>
      </div>
    </article>
  );
}

function AssistantTurn({ turn }: { turn: ConversationTurn }) {
  const isGenerating =
    turn.status === "submitting" || turn.status === "queued" || turn.status === "generating";
  const messageText = isGenerating
    ? "正在为你生成图片："
    : turn.status === "failed" && turn.errorMessage
      ? turn.errorMessage
      : "好的，已为你生成以下图片：";

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3">
        <div className="max-w-[72%]">
          <TurnAttachmentStrip images={turn.attachments} />
          <div className="rounded-2xl bg-[#eceef2] px-6 py-4 text-lg">{turn.prompt}</div>
        </div>
        <Avatar />
      </div>

      <div className="max-w-[980px]">
        <div className="flex items-center gap-3 text-[22px]">
          <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-white">
            <Sparkles size={16} />
          </span>
          <p>{messageText}</p>
        </div>
        {isGenerating ? (
          <div className="mt-4 max-w-[620px] pl-[52px]">
            <GenerationWaitingCard status={turn.status} />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {turn.images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileAssistantTurn({ turn }: { turn: ConversationTurn }) {
  const isGenerating =
    turn.status === "submitting" || turn.status === "queued" || turn.status === "generating";
  const messageText = isGenerating
    ? "正在为你生成图片："
    : turn.status === "failed" && turn.errorMessage
      ? turn.errorMessage
      : "好的，已为你生成以下图片：";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="max-w-[82%]">
          <TurnAttachmentStrip images={turn.attachments} />
          <div className="rounded-xl bg-[#eceef2] px-3 py-2 text-sm">{turn.prompt}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--line)] bg-white">
          <Sparkles size={12} />
        </span>
        <p>{messageText}</p>
      </div>

      {isGenerating ? (
        <GenerationWaitingCard status={turn.status} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {turn.images.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      )}
    </div>
  );
}

function ParameterPanel({
  values,
  onChange,
  compact,
}: {
  values: GenerationOptions;
  onChange: (patch: Partial<GenerationOptions>) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`workbench-popover rounded-2xl border border-white/80 bg-[#fbfbfc] p-5 shadow-[0_22px_70px_rgba(20,22,30,0.18)] ring-1 ring-black/5 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <div className="space-y-2">
        <p className="text-[var(--text-soft)]">比例</p>
        <div className="grid grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => onChange({ aspectRatio: ratio })}
              className={`h-9 rounded-md border transition duration-150 ${
                values.aspectRatio === ratio
                  ? "border-[#1a1d25] bg-[#151821] text-white"
                  : "border-[var(--line)] bg-white text-[var(--text-soft)] hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[var(--text-soft)]">清晰度</p>
        <div className="grid grid-cols-3 gap-2">
          {QUALITY_LEVELS.map((quality) => (
            <button
              key={quality}
              type="button"
              onClick={() => onChange({ quality })}
              className={`h-9 rounded-md border transition duration-150 ${
                values.quality === quality
                  ? "border-[#1a1d25] bg-[#151821] text-white"
                  : "border-[var(--line)] bg-white text-[var(--text-soft)] hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
              }`}
            >
              {quality}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[var(--text-soft)]">风格</p>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_PRESETS.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ style })}
              className={`h-9 rounded-md border transition duration-150 ${
                values.style === style
                  ? "border-[#1a1d25] bg-[#151821] text-white"
                  : "border-[var(--line)] bg-white text-[var(--text-soft)] hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[var(--text-soft)]">数量</p>
        <div className="grid grid-cols-4 gap-2">
          {QUANTITY_OPTIONS.map((quantity) => (
            <button
              key={quantity}
              type="button"
              onClick={() => onChange({ quantity })}
              className={`h-9 rounded-md border transition duration-150 ${
                values.quantity === quantity
                  ? "border-[#1a1d25] bg-[#151821] text-white"
                  : "border-[var(--line)] bg-white text-[var(--text-soft)] hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
              }`}
            >
              {quantity}张
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[var(--text-soft)]">提示词增强</p>
        <button
          type="button"
          onClick={() => onChange({ promptEnhance: !values.promptEnhance })}
          className={`relative h-6 w-11 rounded-full border transition-all duration-200 ease-out hover:shadow-sm ${
            values.promptEnhance ? "border-[#151821] bg-[#151821]" : "border-[var(--line)] bg-white"
          }`}
          aria-pressed={values.promptEnhance}
          aria-label="切换提示词增强"
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-200 ease-out ${
              values.promptEnhance
                ? "left-[21px] shadow-[0_2px_8px_rgba(255,255,255,0.28)]"
                : "left-0.5 shadow-[0_2px_8px_rgba(15,18,24,0.12)]"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function ModelPanel({
  value,
  onChange,
  compact,
}: {
  value: PromptInput["model"];
  onChange: (model: PromptInput["model"]) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`workbench-popover rounded-2xl border border-white/80 bg-[#fbfbfc] p-4 shadow-[0_22px_70px_rgba(20,22,30,0.18)] ring-1 ring-black/5 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <p className="mb-2 px-1 text-[var(--text-soft)]">模型</p>
      <div className="space-y-2">
        {MODEL_PRESETS.map((model) => {
          const selected = value === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onChange(model.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition duration-150 ${
                selected
                  ? "border-[#151821] bg-[#151821] text-white"
                  : "border-[var(--line)] bg-white text-[var(--text)] hover:border-[#b8bbc4] hover:bg-[#f7f8fa]"
              }`}
              aria-pressed={selected}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{model.name}</span>
                <span
                  className={`mt-1 block leading-5 ${
                    selected ? "text-white/72" : "text-[var(--text-soft)]"
                  }`}
                >
                  {model.description}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-xs ${
                  selected ? "bg-white/15 text-white" : "bg-[var(--accent-soft)] text-[#4b5563]"
                }`}
              >
                {model.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkbenchShell() {
  const [turns, setTurns] = useState<ConversationTurn[]>([
    {
      id: "starter",
      prompt: starterPrompt,
      attachments: [],
      status: "success",
      images: starterImages,
      errorMessage: null,
    },
  ]);
  const [composerPrompt, setComposerPrompt] = useState("");
  const [composerImages, setComposerImages] = useState<ComposerImage[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const desktopConversationEndRef = useRef<HTMLDivElement>(null);
  const mobileConversationEndRef = useRef<HTMLDivElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [options, setOptions] = useState<GenerationOptions>({
    model: DEFAULT_FORM_VALUES.model,
    aspectRatio: DEFAULT_FORM_VALUES.aspectRatio,
    quality: DEFAULT_FORM_VALUES.quality,
    style: DEFAULT_FORM_VALUES.style,
    quantity: DEFAULT_FORM_VALUES.quantity,
    promptEnhance: DEFAULT_FORM_VALUES.promptEnhance,
  });

  const latestTurn = turns[turns.length - 1];
  const isGenerating =
    latestTurn?.status === "submitting" ||
    latestTurn?.status === "queued" ||
    latestTurn?.status === "generating";
  const selectedModel =
    MODEL_PRESETS.find((model) => model.id === options.model) ?? MODEL_PRESETS[0];

  useEffect(() => {
    if (turns.length <= 1) {
      return;
    }

    desktopConversationEndRef.current?.scrollIntoView({ block: "end" });
    mobileConversationEndRef.current?.scrollIntoView({ block: "end" });
  }, [turns.length]);

  useEffect(() => {
    resizePromptTextarea(desktopTextareaRef.current);
    resizePromptTextarea(mobileTextareaRef.current);
  });

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }

      objectUrls.clear();
    };
  }, []);

  const updateTurn = (turnId: string, patch: Partial<ConversationTurn>) => {
    setTurns((currentTurns) =>
      currentTurns.map((turn) => (turn.id === turnId ? { ...turn, ...patch } : turn)),
    );
  };

  const handleSubmit = async () => {
    const parsed = promptSchema.safeParse({ ...options, prompt: composerPrompt });
    if (!parsed.success) {
      setComposerError(parsed.error.issues[0]?.message ?? "请输入有效提示词。");
      return;
    }

    const turnId = `turn-${Date.now()}`;
    setComposerError(null);
    setTurns((currentTurns) => [
      ...currentTurns,
      {
        id: turnId,
        prompt: parsed.data.prompt,
        attachments: composerImages,
        status: "submitting",
        images: [],
        errorMessage: null,
      },
    ]);
    setComposerPrompt("");
    setComposerImages([]);
    setActivePanel(null);

    try {
      const result = await runMockImageTask(parsed.data, (nextStatus) => {
        updateTurn(turnId, { status: nextStatus });
      });
      updateTurn(turnId, { images: result.images, status: "success", errorMessage: null });
    } catch (error) {
      updateTurn(turnId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "生成失败，请稍后重试。",
      });
    }
  };

  const updateComposerPrompt = (value: string) => {
    setComposerPrompt(value);
    if (composerError) {
      setComposerError(null);
    }
  };

  const openImagePicker = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const availableSlots = Math.max(0, 4 - composerImages.length);
    if (availableSlots === 0) {
      setComposerError("最多上传 4 张参考图。");
      return;
    }

    const nextImages = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, availableSlots)
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        url: URL.createObjectURL(file),
        name: file.name,
      }));

    if (nextImages.length === 0) {
      setComposerError("请选择图片文件。");
      return;
    }

    setComposerError(null);
    for (const image of nextImages) {
      objectUrlsRef.current.add(image.url);
    }

    setComposerImages((currentImages) => [...currentImages, ...nextImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeComposerImage = (imageId: string) => {
    setComposerImages((currentImages) => {
      const image = currentImages.find((item) => item.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.url);
        objectUrlsRef.current.delete(image.url);
      }

      return currentImages.filter((item) => item.id !== imageId);
    });
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void handleSubmit();
  };

  const updateOptions = (patch: Partial<GenerationOptions>) => {
    setOptions((previous) => ({ ...previous, ...patch }));
  };

  const togglePanel = (panel: Exclude<ActivePanel, null>) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const handleModelChange = (model: PromptInput["model"]) => {
    updateOptions({ model });
    setActivePanel(null);
  };

  const handleWorkbenchPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!activePanel) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest('[data-workbench-popover="true"], [data-panel-trigger="true"]')) {
      return;
    }

    setActivePanel(null);
  };

  return (
    <Tooltip.Provider>
      <div className="contents" onPointerDownCapture={handleWorkbenchPointerDownCapture}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleImageUpload(event.target.files)}
        />
        <section className="hidden p-1.5 lg:block">
          <div className="mx-auto flex h-[calc(100svh-12px)] w-full max-w-[1600px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
            <aside className="flex w-[280px] flex-col border-r border-[var(--line)] bg-[#f4f5f7] p-6">
              <div className="flex items-center gap-2 text-[38px] font-black tracking-tight">
                <span>artImg</span>
                <span className="rounded-md bg-black px-2 py-1 text-xs font-bold leading-none text-white">
                  Pro
                </span>
              </div>

              <button
                type="button"
                className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#151821] text-sm font-semibold text-white"
              >
                <Plus size={16} />
                新建创作
              </button>

              <div className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
                {historyGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-sm text-[var(--text-soft)]">{group.title}</p>
                    <div className="space-y-1">
                      {group.items.map((item, index) => (
                        <button
                          key={item}
                          type="button"
                          className={`w-full rounded-lg px-3 py-2 text-left text-[15px] ${
                            group.title === "今天" && index === 0
                              ? "bg-[#e8eaee]"
                              : "text-[var(--text-soft)] hover:bg-[#eceef2]"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-soft)]"
              >
                <Trash2 size={16} />
                回收站
              </button>
            </aside>

            <div className="relative flex flex-1 flex-col">
              <header className="flex h-16 items-center justify-between border-b border-[var(--line)] px-8">
                <div className="inline-flex items-center gap-3 text-[30px] font-semibold">
                  <Sparkles size={18} />
                  <span>AI 图片创作</span>
                </div>
                <div className="flex items-center gap-5 text-[var(--text-soft)]">
                  <Bell size={18} />
                  <div className="flex items-center gap-2">
                    <Avatar />
                    <ChevronDown size={16} />
                  </div>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto px-10 pb-[360px] pt-10">
                <h1 className="text-center font-[family-name:var(--font-heading)] text-5xl font-bold">
                  今天想生成什么图片?
                </h1>

                <div className="mx-auto mt-6 flex max-w-[760px] flex-wrap items-center justify-center gap-2">
                  {topicButtons.map((topic) => (
                    <button
                      key={topic.label}
                      type="button"
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 text-sm text-[var(--text-soft)]"
                      onClick={() =>
                        setComposerPrompt(`${topic.label}，高级质感，商业级光影，4 张`)
                      }
                    >
                      <topic.icon size={15} />
                      {topic.label}
                    </button>
                  ))}
                </div>

                <div className="mx-auto mt-8 max-w-[980px] space-y-8">
                  {turns.map((turn) => (
                    <AssistantTurn key={turn.id} turn={turn} />
                  ))}
                  <div className="h-[190px]" aria-hidden="true" />
                  <div ref={desktopConversationEndRef} />
                </div>
              </main>

              {activePanel ? (
                <div
                  className="absolute bottom-[160px] left-8 z-30 w-[430px]"
                  data-workbench-popover="true"
                >
                  {activePanel === "model" ? (
                    <ModelPanel value={options.model} onChange={handleModelChange} />
                  ) : (
                    <ParameterPanel values={options} onChange={updateOptions} />
                  )}
                </div>
              ) : null}

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[285px] bg-gradient-to-t from-[var(--surface)] via-[var(--surface)] to-[rgba(242,243,245,0)]"
                aria-hidden="true"
              />

              <div className="absolute inset-x-8 bottom-6 z-20 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_10px_40px_rgba(20,22,30,0.07)]">
                <ComposerImageStrip images={composerImages} onRemove={removeComposerImage} />
                <textarea
                  ref={desktopTextareaRef}
                  value={composerPrompt}
                  onChange={(event) => updateComposerPrompt(event.target.value)}
                  onInput={(event) => resizePromptTextarea(event.currentTarget)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="描述你想生成的画面..."
                  rows={1}
                  className="max-h-[84px] min-h-10 w-full resize-none bg-transparent text-lg leading-7 outline-none placeholder:text-[#9ea3af]"
                />
                {composerError ? (
                  <p className="mt-1 rounded-lg border border-[#f6d4d2] bg-[#fef2f1] px-3 py-2 text-sm text-[var(--danger)]">
                    {composerError}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => togglePanel("model")}
                      data-panel-trigger="true"
                      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 ${
                        activePanel === "model"
                          ? "border-[#151821] bg-[#151821] text-white"
                          : "border-[var(--line)] bg-white hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
                      }`}
                      aria-label="选择模型"
                      aria-expanded={activePanel === "model"}
                    >
                      <Sparkles size={16} />
                      {selectedModel.name}
                      <ChevronDown size={14} />
                    </button>
                    <ParameterSummaryButton
                      values={options}
                      onClick={() => togglePanel("parameters")}
                      active={activePanel === "parameters"}
                    />
                    <ToolbarTooltip label="上传图片">
                      <button
                        type="button"
                        onClick={openImagePicker}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white transition duration-150 hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
                        aria-label="上传图片"
                      >
                        <Paperclip size={16} />
                      </button>
                    </ToolbarTooltip>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isGenerating}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#151821] px-6 text-lg font-semibold text-white disabled:opacity-70"
                  >
                    <Sparkles size={16} />
                    {isGenerating ? "生成中" : "生成"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:hidden">
          <div className="min-h-screen bg-[var(--surface)] pb-[190px]">
            <header className="flex h-16 items-center justify-between px-4">
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center text-[#222]"
              >
                <Menu size={20} />
              </button>
              <p className="text-lg font-semibold">AI 图片创作</p>
              <Avatar />
            </header>

            <main className="space-y-4 px-4 pb-[340px] pt-3">
              <h1 className="text-center font-[family-name:var(--font-heading)] text-4xl font-bold">
                今天想生成什么图片?
              </h1>

              <div className="grid grid-cols-4 gap-2">
                {topicButtons.map((topic) => (
                  <button
                    key={topic.label}
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-[11px] text-[var(--text-soft)]"
                    onClick={() => setComposerPrompt(`${topic.label}，高级质感，商业级光影，4 张`)}
                  >
                    <topic.icon size={12} />
                    {topic.label}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {turns.map((turn) => (
                  <MobileAssistantTurn key={turn.id} turn={turn} />
                ))}
                <div className="h-[210px]" aria-hidden="true" />
                <div ref={mobileConversationEndRef} />
              </div>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--panel)] p-3">
              {activePanel ? (
                <div className="mb-4 px-1" data-workbench-popover="true">
                  {activePanel === "model" ? (
                    <ModelPanel compact value={options.model} onChange={handleModelChange} />
                  ) : (
                    <ParameterPanel compact values={options} onChange={updateOptions} />
                  )}
                </div>
              ) : null}

              {composerError ? (
                <p className="mb-2 rounded-lg border border-[#f6d4d2] bg-[#fef2f1] px-3 py-2 text-xs text-[var(--danger)]">
                  {composerError}
                </p>
              ) : null}

              <ComposerImageStrip images={composerImages} onRemove={removeComposerImage} />

              <div className="mb-2 flex">
                <ParameterSummaryButton
                  compact
                  values={options}
                  onClick={() => togglePanel("parameters")}
                  active={activePanel === "parameters"}
                />
              </div>

              <div className="flex items-center gap-2">
                <ToolbarTooltip label="选择模型">
                  <button
                    type="button"
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border ${
                      activePanel === "model"
                        ? "border-[#151821] bg-[#151821] text-white"
                        : "border-[var(--line)] bg-white hover:border-[#b7bbc4] hover:bg-[#f7f8fa]"
                    }`}
                    onClick={() => togglePanel("model")}
                    data-panel-trigger="true"
                    aria-label="选择模型"
                    aria-expanded={activePanel === "model"}
                  >
                    <Sparkles size={16} />
                  </button>
                </ToolbarTooltip>
                <ToolbarTooltip label="上传图片">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white"
                    onClick={openImagePicker}
                    aria-label="上传图片"
                  >
                    <Paperclip size={16} />
                  </button>
                </ToolbarTooltip>
                <div className="flex min-h-11 flex-1 items-center rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                  <textarea
                    ref={mobileTextareaRef}
                    value={composerPrompt}
                    onChange={(event) => updateComposerPrompt(event.target.value)}
                    onInput={(event) => resizePromptTextarea(event.currentTarget)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="描述你想生成的画面..."
                    rows={1}
                    className="max-h-[66px] min-h-[22px] w-full resize-none bg-transparent text-sm leading-[22px] outline-none placeholder:text-[#a2a7b5]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isGenerating}
                  className="inline-flex h-11 items-center gap-1 rounded-lg bg-[#151821] px-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  <Sparkles size={14} />
                  生成
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Tooltip.Provider>
  );
}
