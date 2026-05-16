import { parseGrammar } from './grammar';
import { computeFirst, computeFollow } from './first-follow';
import type { ParseResult, ParseStep, TreeNode } from '../types';

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
      if (table[head][t]) conflicts.push(`Conflict at M[${head}, ${t}]`);
      else table[head][t] = body;
    }

    if (bodyFirst.has('ε')) {
      for (const t of follow[head]) {
        if (table[head][t]) conflicts.push(`Conflict at M[${head}, ${t}]`);
        else table[head][t] = body;
      }
    }
  }

  return { table, conflicts };
}

export function parse(grammarStr: string, inputStr: string): ParseResult {
  const steps: ParseStep[] = [];

  let grammar;
  try {
    grammar = parseGrammar(grammarStr);
  } catch {
    return { accepted: false, steps, error: 'Error al parsear la gramática.' };
  }

  if (!grammar.startSymbol) {
    return { accepted: false, steps, error: 'Gramática vacía o inválida.' };
  }

  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const { table, conflicts } = buildLL1Table(grammar, first, follow);

  if (conflicts.length > 0) {
    return {
      accepted: false, steps,
      error: `La gramática no es LL(1). Conflictos: ${conflicts.join('; ')}`,
      firstSets: first, followSets: follow, parseTable: table,
    };
  }

  const tokens = inputStr.trim().split(/\s+/).filter(t => t.length > 0);
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
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: 'Límite de pasos alcanzado', actionType: 'error' });
      return { accepted: false, steps, error: 'Demasiados pasos (posible loop).', firstSets: first, followSets: follow, parseTable: table };
    }

    const top = stack[stack.length - 1];
    const lookahead = tokens[cursor];

    if (top.sym === '$' && lookahead === '$') {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: 'Aceptar', actionType: 'accept' });
      return { accepted: true, steps, treeRoot: root, firstSets: first, followSets: follow, parseTable: table };
    }

    if (top.sym === '$' || lookahead === undefined) {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: 'Error: input agotado', actionType: 'error' });
      return { accepted: false, steps, error: 'Error: input inesperadamente agotado.', firstSets: first, followSets: follow, parseTable: table };
    }

    if (!grammar.nonTerminals.has(top.sym)) {
      // Terminal
      if (top.sym === lookahead) {
        steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Match '${top.sym}'`, actionType: 'match' });
        stack.pop();
        cursor++;
      } else {
        steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Error: se esperaba '${top.sym}', se encontró '${lookahead}'`, actionType: 'error' });
        return { accepted: false, steps, error: `Se esperaba '${top.sym}', se encontró '${lookahead}'.`, firstSets: first, followSets: follow, parseTable: table };
      }
    } else {
      // No terminal
      const production = table[top.sym]?.[lookahead];
      if (!production) {
        steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Error: M[${top.sym}, ${lookahead}] vacío`, actionType: 'error' });
        return { accepted: false, steps, error: `No hay producción en M[${top.sym}, ${lookahead}].`, firstSets: first, followSets: follow, parseTable: table };
      }

      const bodyStr = production[0] === 'ε' ? 'ε' : production.join(' ');
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Expandir ${top.sym} → ${bodyStr}`, actionType: 'expand' });

      // Crear nodos hijos y agregarlos al nodo actual
      const currentNode = top.node;
      stack.pop();

      if (production[0] === 'ε') {
        currentNode.children.push({ label: 'ε', children: [] });
      } else {
        const childNodes: TreeNode[] = production.map(sym => ({ label: sym, children: [] }));
        for (const child of childNodes) currentNode.children.push(child);

        // Empujar en reversa
        for (let i = childNodes.length - 1; i >= 0; i--) {
          stack.push({ sym: production[i], node: childNodes[i] });
        }
      }
    }
  }
}
