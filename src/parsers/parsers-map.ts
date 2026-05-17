import { compile as ll1Compile, parse as ll1Parse } from './ll1'
import { compile as lr0Compile, parse as lr0Parse } from './lr0'
import { compile as slr1Compile, parse as slr1Parse } from './slr1'
import { compile as lalr1Compile, parse as lalr1Parse } from './lalr1'
import { compile as lr1Compile, parse as lr1Parse } from './lr1'
import { compile as recursiveDescentCompile, parse as recursiveDescentParse } from './recursive-descent'
import type { ParseResult, CompiledParser } from '../types'
import type { ParserType } from '../types'

export interface ParserModule {
  compile: (grammar: string) => CompiledParser
  parse: (compiled: CompiledParser, grammar: string, input: string) => ParseResult
}

export const parsers: Record<ParserType, ParserModule> = {
  'll1': { compile: ll1Compile, parse: ll1Parse },
  'lr0': { compile: lr0Compile, parse: lr0Parse },
  'slr1': { compile: slr1Compile, parse: slr1Parse },
  'lalr1': { compile: lalr1Compile, parse: lalr1Parse },
  'lr1': { compile: lr1Compile, parse: lr1Parse },
  'recursive-descent': { compile: recursiveDescentCompile, parse: recursiveDescentParse },
}
