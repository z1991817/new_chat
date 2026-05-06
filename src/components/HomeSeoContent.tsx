const examples = [
  {
    title: '电商主图',
    text: '输入产品、材质、背景和光线要求，快速生成适合商品展示的视觉草图。',
  },
  {
    title: '社媒封面',
    text: '为小红书、公众号、短视频封面生成有明确主题和构图方向的图片。',
  },
  {
    title: '品牌海报',
    text: '用一句提示词描述活动主题、风格和比例，生成可继续迭代的海报方案。',
  },
]

const useCases = ['产品视觉迭代', '内容配图', '头像写真', '空间概念图', '广告素材草稿']

const faqs = [
  {
    question: '需要会写复杂提示词吗？',
    answer: '不需要。先用自然语言描述主体、风格、用途和画面比例，再根据结果继续补充细节即可。',
  },
  {
    question: '可以使用参考图吗？',
    answer: '可以。工作台支持添加参考图，用于图生图、风格参考或遮罩编辑等图片生成流程。',
  },
  {
    question: '生成失败后怎么办？',
    answer: '失败任务会保留错误信息和重试入口，你可以调整提示词、模型或图片参数后再次生成。',
  },
]

export default function HomeSeoContent() {
  return (
    <section
      aria-labelledby="home-seo-title"
      className="mt-16 border-t border-gray-200/70 pb-20 pt-10 text-gray-700 dark:border-white/[0.08] dark:text-gray-300"
    >
      <div className="max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          AI image workbench
        </p>
        <h2 id="home-seo-title" className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Art Image gpt-image-2 prompt AI 图片生成工作台
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Art Image 专注于 gpt-image-2 prompt 到图片的生成流程。你可以输入文字提示词，选择模型、比例、分辨率和格式，
          并在同一个工作台里管理生成历史、复用参数和继续编辑图片。
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {examples.map((example) => (
          <article
            key={example.title}
            className="rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm shadow-gray-900/5 dark:border-white/[0.08] dark:bg-gray-900/50"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{example.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{example.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">常见用途</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {useCases.map((item) => (
              <li
                key={item}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">FAQ</h2>
          <div className="mt-3 space-y-3">
            {faqs.map((item) => (
              <article key={item.question}>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.question}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
