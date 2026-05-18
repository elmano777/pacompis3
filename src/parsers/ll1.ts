import { parseGrammar } from './grammar';
import { computeFirst, computeFollow } from './first-follow';
import { tokenize } from './tokenizer';
import type { ParseResult, ParseStep, TreeNode, CompiledParser } from '../types';

type ParseTable = Record<string, Record<string, string[]>>;

function buildLL1Table(
  grammar: ReturnType<typeof parseGrammar>,
  first: Record<string, Set<string>>,
  follow: Record<string, Set<string>>
): { table: ParseTable; conflicts: string[] } {
  const table: ParseTable = {};
  const conflicts: string[] = [];

  for (const nt of grammar.nonTerminals) table[nt] = {};

  for (const { head, body } of grammar.productions) {
    let bodyFirst = new Set<string>();
    let allNullable = true;

    if (body[0] === 'ε') {
      bodyFirst.add('ε');
      allNullable = true;
    } else {
      for (const sym of body) {
        const sf = grammar.nonTerminals.has(sym) ? first[sym] : new Set([sym]);
        for (const f of sf) if (f !== 'ε') bodyFirst.add(f);
        if (!sf.has('ε')) { allNullable = false; break; }
      }
      if (allNullable) bodyFirst.add('ε');
    }

    for (const t of bodyFirst) {
      if (t === 'ε') continue;
      if (table[head][t]) conflicts.push(`Conflicto en M[${head}, ${t}]`);
      else table[head][t] = body;
    }

    if (bodyFirst.has('ε')) {
      for (const t of follow[head]) {
        if (table[head][t]) conflicts.push(`Conflicto en M[${head}, ${t}]`);
        else table[head][t] = body;
      }
    }
  }

  return { table, conflicts };
}

/**
 * Compile LL(1) grammar into predictive table.
 */
export function compile(grammarStr: string): CompiledParser {
  try {
    const grammar = parseGrammar(grammarStr);

    if (!grammar.startSymbol) {
      return { isValid: false, error: 'Gramática vacía o inválida.' };
    }

    const first = computeFirst(grammar);
    const follow = computeFollow(grammar, first);
    const { table, conflicts } = buildLL1Table(grammar, first, follow);

    const isValid = conflicts.length === 0;

    if (!isValid) {
      return {
        isValid: false,
        error: `La gramática no es LL(1). Conflictos detectados.`,
        conflicts,
        firstSets: first,
        followSets: follow,
        parseTable: table,
      };
    }

    return {
      isValid: true,
      firstSets: first,
      followSets: follow,
      parseTable: table,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Error al compilar gramática: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Execute parsing on a compiled LL(1) parser.
 */
export function parse(
  compiled: CompiledParser,
  grammarStr: string,
  inputStr: string
): ParseResult {
  const steps: ParseStep[] = [];

  if (!compiled.isValid || !compiled.parseTable) {
    return {
      accepted: false,
      steps,
      error: compiled.error || 'Parser compilado inválido',
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
      parseTable: compiled.parseTable,
    };
  }

  if (!inputStr || inputStr.trim().length === 0) {
    return {
      accepted: false,
      steps,
      parseTable: compiled.parseTable,
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
      grammarOnly: true,
    };
  }

  let grammar;
  try {
    grammar = parseGrammar(grammarStr);
  } catch {
    return {
      accepted: false,
      steps,
      error: 'Error al parsear la gramática',
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
      parseTable: compiled.parseTable,
    };
  }

  if (!grammar.startSymbol) {
    return {
      accepted: false,
      steps,
      error: 'Gramática vacía o inválida',
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
      parseTable: compiled.parseTable,
    };
  }

  const tokens = tokenize(inputStr, { autoSplit: true, knownTerminals: grammar.terminals });
  if (tokens.length === 0) {
    return {
      accepted: false,
      steps,
      error: 'Cadena de entrada vacía o inválida',
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
      parseTable: compiled.parseTable,
    };
  }

  tokens.push('$');

  // ── Árbol ────────────────────────────────────────────────────────────────
  const root: TreeNode = { label: grammar.startSymbol, children: [] }

  // Stack paralela: [símbolo, nodo del árbol]
  const stack: Array<{ sym: string; node: TreeNode }> = [
    { sym: '$', node: { label: '$', children: [] } },
    { sym: grammar.startSymbol, node: root },
  ]

  let cursor = 0;
  let stepNum = 0;
  const MAX_STEPS = 500;

  const stackStr = () => [...stack].reverse().map(e => e.sym).join(' ');
  const inputLeft = () => tokens.slice(cursor).join(' ');

  while (true) {
    if (stepNum++ > MAX_STEPS) {
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: 'Límite de pasos alcanzado',
        actionType: 'error',
      });
      return {
        accepted: false,
        steps,
        error: 'Demasiados pasos (posible ciclo infinito)',
        firstSets: compiled.firstSets,
        followSets: compiled.followSets,
        parseTable: compiled.parseTable,
      };
    }

    const top = stack[stack.length - 1];
    const lookahead = tokens[cursor];

    if (top.sym === '$' && lookahead === '$') {
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: 'Aceptar',
        actionType: 'accept',
      });
      return {
        accepted: true,
        steps,
        treeRoot: root,
        firstSets: compiled.firstSets,
        followSets: compiled.followSets,
        parseTable: compiled.parseTable,
      };
    }

    if (top.sym === '$' || lookahead === undefined) {
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: 'Error: input agotado',
        actionType: 'error',
      });
      return {
        accepted: false,
        steps,
        error: 'Error: input inesperadamente agotado',
        firstSets: compiled.firstSets,
        followSets: compiled.followSets,
        parseTable: compiled.parseTable,
      };
    }

    if (!grammar.nonTerminals.has(top.sym)) {
      // Terminal
      if (top.sym === lookahead) {
        steps.push({
          step: stepNum,
          stack: stackStr(),
          input: inputLeft(),
          action: `Match '${top.sym}'`,
          actionType: 'match',
        });
        stack.pop();
        cursor++;
      } else {
        steps.push({
          step: stepNum,
          stack: stackStr(),
          input: inputLeft(),
          action: `Error: esperado '${top.sym}', obtuvo '${lookahead}'`,
          actionType: 'error',
        });
        return {
          accepted: false,
          steps,
          error: `Error sintáctico: esperado '${top.sym}' pero obtuvo '${lookahead}'`,
          firstSets: compiled.firstSets,
          followSets: compiled.followSets,
          parseTable: compiled.parseTable,
        };
      }
    } else {
      // Non-terminal
      const production = compiled.parseTable[top.sym]?.[lookahead];

      if (!production) {
        steps.push({
          step: stepNum,
          stack: stackStr(),
          input: inputLeft(),
          action: `Error: no hay producción para M[${top.sym}, ${lookahead}]`,
          actionType: 'error',
        });
        return {
          accepted: false,
          steps,
          error: `Error sintáctico: no hay producción LL(1) para M[${top.sym}, ${lookahead}]`,
          firstSets: compiled.firstSets,
          followSets: compiled.followSets,
          parseTable: compiled.parseTable,
        };
      }

      const bodyStr = production[0] === 'ε' ? 'ε' : production.join(' ');
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: `Expand ${top.sym} → ${bodyStr}`,
        actionType: 'expand',
      });

      stack.pop();

      if (production[0] !== 'ε') {
        for (let i = production.length - 1; i >= 0; i--) {
          const sym = production[i];
          const child: TreeNode = { label: sym, children: [] };
          stack.push({ sym, node: child });
          top.node.children.unshift(child);
        }
      } else {
        top.node.children.push({ label: 'ε', children: [] });
      }
    }
  }
}