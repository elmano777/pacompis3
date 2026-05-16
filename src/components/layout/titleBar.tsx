// src/components/layout/Titlebar.tsx

import { useAppStore } from '../../store/parserStore'
import type { ParserType } from '../../types'

const TABS: { id: ParserType; label: string }[] = [
  { id: 'recursive-descent', label: 'Rec. Descent' },
  { id: 'll1', label: 'LL(1)' },
  { id: 'lr0', label: 'LR(0)' },
  { id: 'slr1', label: 'SLR(1)' },
  { id: 'lalr1', label: 'LALR(1)' },
  { id: 'lr1', label: 'LR(1)' },
]

export function Titlebar() {
  const { activeParser, setActiveParser } = useAppStore()

  return (
    <header className="flex items-center h-[42px] bg-bg-surface border-b border-border-dim px-4 gap-0 flex-shrink-0 select-none">
      {/* Traffic lights */}
      <div className="flex gap-1.5 mr-4 flex-shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>

      {/* Parser tabs */}
      <nav className="flex gap-0.5 overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveParser(t.id)}
            className={[
              'flex items-center gap-1.5 px-3.5 h-[42px]',
              'font-mono text-[11px] font-medium whitespace-nowrap',
              'border-b-2 border-transparent bg-transparent',
              'transition-colors duration-150 cursor-pointer',
              activeParser === t.id
                ? 'text-accent-green border-b-accent-green'
                : 'text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            {activeParser === t.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0" />
            )}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Logo */}
      <div className="ml-auto pl-4 font-mono text-[11px] text-text-muted flex-shrink-0">
        <span className="text-accent-green">ultimate</span>parser.app
      </div>
    </header>
  )
}
