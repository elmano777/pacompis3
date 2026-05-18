#!/usr/bin/env bun
import { compile } from './src/parsers/lalr1'

const grammar = `
E → E + T
  | T
T → T * F
  | F
F → ( E )
  | id
`

const res = compile(grammar)
console.log(JSON.stringify(res, null, 2))
