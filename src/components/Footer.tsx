export default function Footer() {
  return (
    <footer className="mt-8 border-t border-gray-200/70 py-6 text-xs text-gray-500 dark:border-white/[0.08] dark:text-gray-400 sm:fixed sm:inset-x-0 sm:bottom-0 sm:z-20 sm:mt-0 sm:bg-white/85 sm:py-0 sm:pb-[var(--safe-area-bottom)] sm:pl-[var(--safe-area-left)] sm:pr-[var(--safe-area-right)] sm:backdrop-blur-xl sm:dark:bg-gray-950/85">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 px-3 py-2 text-center sm:flex-row sm:gap-3 sm:px-4">
        <p>© 2026 Art Image. 保留所有权利。</p>
        <p className="leading-5">AI 也可能会犯错。请核查重要信息。</p>
      </div>
    </footer>
  )
}
