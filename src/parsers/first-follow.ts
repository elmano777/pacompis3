import { type Grammar, isNonTerminal } from './grammar';

export function computeFirst(grammar: Grammar): Record<string, Set<string>> {
  const first: Record<string, Set<string>> = {};

  // Inicializar
  for (const nt of grammar.nonTerminals) first[nt] = new Set();
  for (const t of grammar.terminals) first[t] = new Set([t]);
  first['$'] = new Set(['$']);
  first['ε'] = new Set(['ε']);

  let changed = true;
  while (changed) {
    changed = false;

    for (const { head, body } of grammar.productions) {
      const before = first[head].size;

      if (body[0] === 'ε') {
        if (!first[head].has('ε')) { first[head].add('ε'); changed = true; }
        continue;
      }

      // FIRST(body) → agregar a FIRST(head)
      let allNullable = true;
      for (const sym of body) {
        const symFirst = isNonTerminal(sym, grammar)
          ? first[sym]
          : new Set([sym]);

        for (const f of symFirst) {
          if (f !== 'ε') first[head].add(f);
        }

        if (!symFirst.has('ε')) { allNullable = false; break; }
      }

      if (allNullable) first[head].add('ε');
      if (first[head].size !== before) changed = true;
    }
  }

  return first;
}

export function computeFollow(
  grammar: Grammar,
  first: Record<string, Set<string>>
): Record<string, Set<string>> {
  const follow: Record<string, Set<string>> = {};
  for (const nt of grammar.nonTerminals) follow[nt] = new Set();
  follow[grammar.startSymbol].add('$');

  let changed = true;
  while (changed) {
    changed = false;

    for (const { head, body } of grammar.productions) {
      for (let i = 0; i < body.length; i++) {
        const sym = body[i];
        if (!grammar.nonTerminals.has(sym)) continue;

        const before = follow[sym].size;
        const beta = body.slice(i + 1);

        // FIRST(beta) \ {ε} → FOLLOW(sym)
        let betaNullable = true;
        for (const b of beta) {
          const bFirst = isNonTerminal(b, grammar)
            ? first[b]
            : new Set([b]);
          for (const f of bFirst) {
            if (f !== 'ε') follow[sym].add(f);
          }
          if (!bFirst.has('ε')) { betaNullable = false; break; }
        }

        // Si beta es nullable (o vacío), agregar FOLLOW(head)
        if (betaNullable || beta.length === 0) {
          for (const f of follow[head]) follow[sym].add(f);
        }

        if (follow[sym].size !== before) changed = true;
      }
    }
  }

  return follow;
}

/**
 * FIRST de una secuencia de símbolos (útil para construir tablas LR)
 */
export function firstOfSequence(
  symbols: string[],
  first: Record<string, Set<string>>,
  grammar: Grammar
): Set<string> {
  const result = new Set<string>();
  let allNullable = true;

  for (const sym of symbols) {
    const symFirst = isNonTerminal(sym, grammar)
      ? first[sym]
      : sym === 'ε' ? new Set(['ε']) : new Set([sym]);

    for (const f of symFirst) {
      if (f !== 'ε') result.add(f);
    }

    if (!symFirst.has('ε')) { allNullable = false; break; }
  }

  if (allNullable) result.add('ε');
  return result;
}
