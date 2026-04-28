import WorkbenchShell from "@/components/workbench/WorkbenchShell";

export default function HomePage() {
  return (
    <main>
      <WorkbenchShell />
      <section className="sr-only">
        <h2>AI 图片生成器</h2>
        <p>输入文字提示词，快速生成海报、封面、电商图和创意视觉。</p>
        <p>常见用途：电商主图、小红书封面、头像写真、室内设计、产品海报。</p>
      </section>
    </main>
  );
}
