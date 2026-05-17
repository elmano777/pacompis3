import { create } from 'zustand'
import type {
  ParserType,
  CenterTab,
  ParseResult,
  ChatMessage,
  CompiledParser,
} from '../types'

const DEFAULT_GRAMMAR = `S → E
E → E + T | T
T → T * F | F
F → ( E ) | id`

const DEFAULT_INPUT = ''

interface AppStore {
  // State
  grammar: string
  inputString: string
  activeParser: ParserType
  activeTab: CenterTab
  parseResult: ParseResult | null
  compiledParser: CompiledParser | null
  isRunning: boolean
  isCompiling: boolean
  chatMessages: ChatMessage[]
  isChatLoading: boolean

  // Actions
  setGrammar: (g: string) => void
  setInputString: (s: string) => void
  setActiveParser: (p: ParserType) => void
  setActiveTab: (t: CenterTab) => void
  setParseResult: (r: ParseResult | null) => void
  setCompiledParser: (c: CompiledParser | null) => void
  setIsRunning: (v: boolean) => void
  setIsCompiling: (v: boolean) => void
  addChatMessage: (m: ChatMessage) => void
  setChatLoading: (v: boolean) => void
  clearChat: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  grammar: DEFAULT_GRAMMAR,
  inputString: DEFAULT_INPUT,
  activeParser: 'slr1',
  activeTab: 'steps',
  parseResult: null,
  compiledParser: null,
  isRunning: false,
  isCompiling: false,
  chatMessages: [
    {
      role: 'ai',
      content:
        'Hola! Ingresa una gramática, selecciona un parser y presiona Run. Puedo explicarte cada paso, conflictos shift/reduce, FIRST/FOLLOW, y más.',
    },
  ],
  isChatLoading: false,

  setGrammar: (grammar) => set({ grammar }),
  setInputString: (inputString) => set({ inputString }),
  setActiveParser: (activeParser) =>
    set({ activeParser, parseResult: null, activeTab: 'steps' }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setParseResult: (parseResult) => set({ parseResult }),
  setCompiledParser: (compiledParser) => set({ compiledParser }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),
  addChatMessage: (m) =>
    set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  setChatLoading: (isChatLoading) => set({ isChatLoading }),
  clearChat: () =>
    set({
      chatMessages: [
        { role: 'ai', content: 'Chat reiniciado. ¿En qué puedo ayudarte?' },
      ],
    }),
}))
