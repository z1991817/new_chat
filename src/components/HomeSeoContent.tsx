import { ChevronDown } from 'lucide-react'

const examples = [
  {
    title: '电商主图',
    text: '输入产品、材质和光线要求，快速生成商品视觉草图。',
  },
  {
    title: '社媒封面',
    text: '为小红书、公众号、短视频生成有明确主题的封面图。',
  },
]

const useCases = ['产品视觉迭代', '内容配图', '广告草稿']

const faqs = [
  {
    question: '需要会写复杂提示词吗？',
    answer: '不需要。先用自然语言描述主体、风格和用途，再按结果补细节即可。',
  },
  {
    question: '生成失败后怎么办？',
    answer: '失败任务会保留错误信息和重试入口，可调整提示词或参数后再次生成。',
  },
]

export default function HomeSeoContent() {
  return (
    <section
      aria-labelledby="home-seo-title"
      className="mt-10 border-t border-gray-200/70 pt-6 pb-10 text-gray-700 dark:border-white/[0.08] dark:text-gray-300"
    >
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          AI image workbench
        </p>
        <h2 id="home-seo-title" className="mt-2 text-xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Art Image AI 图片生成工作台
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Art Image 专注于提示词到图片生成。输入提示词，选择模型和比例，即可快速生成并继续迭代。
        </p>
      </div>

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium leading-none text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.08]">
          查看详细说明
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 translate-y-[0.5px] transition-transform duration-200 group-open:rotate-180"
          />
        </summary>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white/70 p-4 dark:border-white/[0.08] dark:bg-gray-900/50">
          <div className="grid gap-4 md:grid-cols-2">
            {examples.map((example) => (
              <article key={example.title}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{example.title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{example.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">常见用途</h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {useCases.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">FAQ</h3>
              <div className="mt-2 space-y-3">
                {faqs.map((item) => (
                  <article key={item.question}>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.question}</h4>
                    <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  )
}
