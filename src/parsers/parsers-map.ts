import { parse as ll1 } from './ll1'
import { parse as lr0 } from './lr0'
import { parse as slr1 } from './slr1'
import { parse as lalr1 } from './lalr1'
import { parse as lr1 } from './lr1'
import { parse as recursiveDescent } from './recursive-descent'
import type { ParseResult } from '../types'
import type { ParserType } from '../types'

export const parsers: Record<ParserType, (grammar: string, input: string) => ParseResult> = {
  'll1': ll1,
  'lr0': lr0,
  'slr1': slr1,
  'lalr1': lalr1,
  'lr1': lr1,
  'recursive-descent': recursiveDescent,
}
