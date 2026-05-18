#!/usr/bin/env bun
import { compile, parse } from './src/parsers/recursive-descent'

const grammar1 = `
E → T E'
E' → + T E' | ε
T → id
`

console.log('=== Test 1: grammar without left recursion ===')
const compiled1 = compile(grammar1)
console.log('compile:', compiled1)
if (compiled1.isValid) {
  const res = parse(compiled1, grammar1, 'id + id')
  console.log('parse result:', res.accepted)
  console.log('steps:')
  res.steps.slice(0,20).forEach(s => console.log(s))
}

console.log('\n=== Test 2: grammar WITH left recursion ===')
const grammar2 = `
E → E + T | T
T → id
`
const compiled2 = compile(grammar2)
console.log('compile:', compiled2)
