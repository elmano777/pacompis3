import { parseGrammar } from './grammar';
import { computeFirst, firstOfSequence } from './first-follow';
import { tokenize } from './tokenizer';
import type { AutomataData, ParseResult, ParseStep, TreeNode, CompiledParser } from '../types';

// ── Tipos LR(1) ──────────────────────────────────────────────────────────────

interface LR1Item {
  head: string;
  body: string[];
  dot: number;
  prodIndex: number;
  lookahead: string;
}

interface LR1State {
  id: number;
  items: LR1Item[];
}

type Action =
  | { type: 'shift'; state: number }
  | { type: 'reduce'; prodIndex: number }
  | { type: 'accept' };

type ActionTable = Map<number, Map<string, Action>>;
type GotoTable = Map<number, Map<string, number>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function item1Key(item: LR1Item): string {
  const b = [...item.body];
  b.splice(item.dot, 0, '•');
  return `${item.head} → ${b.join(' ')}, ${item.lookahead}`;
}

function coreKey(item: LR1Item): string {
  const b = [...item.body];
  b.splice(item.dot, 0, '•');
  return `${item.head} → ${b.join(' ')}`;
}

function stateCore(items: LR1Item[]): string {
  return items.map(coreKey).sort().join('\n');
}

// ── Closure LR(1) ─────────────────────────────────────────────────────────────

function closure1(
  items: LR1Item[],
  grammar: ReturnType<typeof parseGrammar>,
  first: Record<string, Set<string>>
): LR1Item[] {
  const result: LR1Item[] = [...items];
  const seen = new Set(items.map(item1Key));

  let i = 0;
  while (i < result.length) {
    const item = result[i++];
    const B = item.body[item.dot];
    if (!B || !grammar.nonTerminals.has(B)) continue;

    // beta = símbolos después de B + lookahead actual
    const beta = [...item.body.slice(item.dot + 1), item.lookahead];
    const lookaheads = firstOfSequence(beta, first, grammar);
    lookaheads.delete('ε');

    grammar.productions.forEach((prod, idx) => {
      if (prod.head !== B) return;
      for (const la of lookaheads) {
        const newItem: LR1Item = {
          head: prod.head,
          body: prod.body,
          dot: 0,
          prodIndex: idx,
          lookahead: la,
        };
        const key = item1Key(newItem);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(newItem);
        }
      }
    });
  }

  return result;
}

// ── GOTO LR(1) ────────────────────────────────────────────────────────────────

function goto1(
  items: LR1Item[],
  symbol: string,
  grammar: ReturnType<typeof parseGrammar>,
  first: Record<string, Set<string>>
): LR1Item[] {
  const moved = items
    .filter(item => item.body[item.dot] === symbol)
    .map(item => ({ ...item, dot: item.dot + 1 }));
  return moved.length > 0 ? closure1(moved, grammar, first) : [];
}

// ── Construcción del autómata LR(1) ──────────────────────────────────────────

function buildLR1Automaton(grammar: ReturnType<typeof parseGrammar>, first: Record<string, Set<string>>) {
  const startItem: LR1Item = {
    head: grammar.augmentedStart,
    body: grammar.productions[0].body,
    dot: 0,
    prodIndex: 0,
    lookahead: '$',
  };

  const startState: LR1State = { id: 0, items: closure1([startItem], grammar, first) };
  const states: LR1State[] = [startState];
  const transitions = new Map<number, Map<string, number>>();
  const stateMap = new Map<string, number>();
  stateMap.set(states[0].items.map(item1Key).sort().join('\n'), 0);

  let i = 0;
  while (i < states.length) {
    const state = states[i++];
    transitions.set(state.id, new Map());

    const symbols = new Set<string>();
    for (const item of state.items) {
      const sym = item.body[item.dot];
      if (sym && sym !== 'ε') symbols.add(sym);
    }

    for (const sym of symbols) {
      const nextItems = goto1(state.items, sym, grammar, first);
      if (nextItems.length === 0) continue;

      const key = nextItems.map(item1Key).sort().join('\n');
      let nextId: number;

      if (stateMap.has(key)) {
        nextId = stateMap.get(key)!;
      } else {
        nextId = states.length;
        states.push({ id: nextId, items: nextItems });
        stateMap.set(key, nextId);
      }

      transitions.get(state.id)!.set(sym, nextId);
    }
  }

  // En lalr1.ts, después del merge:
  return { states, transitions };
}



// ── Merge LALR: fusionar estados con mismo core ───────────────────────────────

function mergeToLALR(
  states: LR1State[],
  transitions: Map<number, Map<string, number>>
): { states: LR1State[]; transitions: Map<number, Map<string, number>>; mergeMap: Map<number, number> } {
  // Agrupar estados por core
  const coreGroups = new Map<string, number[]>();
  for (const state of states) {
    const core = stateCore(state.items);
    if (!coreGroups.has(core)) coreGroups.set(core, []);
    coreGroups.get(core)!.push(state.id);
  }

  // mergeMap: id original → id del representante del grupo
  const mergeMap = new Map<number, number>();
  for (const group of coreGroups.values()) {
    const rep = group[0];
    for (const id of group) mergeMap.set(id, rep);
  }

  // Crear estados mergeados
  const mergedStates = new Map<number, LR1State>();
  for (const group of coreGroups.values()) {
    const rep = group[0];
    const allItems: LR1Item[] = [];
    const seen = new Set<string>();

    for (const id of group) {
      for (const item of states[id].items) {
        const key = item1Key(item);
        if (!seen.has(key)) {
          seen.add(key);
          allItems.push(item);
        }
      }
    }

    mergedStates.set(rep, { id: rep, items: allItems });
  }

  // Reescribir transiciones
  const mergedTransitions = new Map<number, Map<string, number>>();
  for (const [from, map] of transitions) {
    const newFrom = mergeMap.get(from)!;
    if (!mergedTransitions.has(newFrom)) mergedTransitions.set(newFrom, new Map());
    for (const [sym, to] of map) {
      mergedTransitions.get(newFrom)!.set(sym, mergeMap.get(to)!);
    }
  }

  return {
    states: [...mergedStates.values()].sort((a, b) => a.id - b.id),
    transitions: mergedTransitions,
    mergeMap,
  };
}

function serializeActionTable(at: ActionTable): Record<number, Record<string, string>> {
  const result: Record<number, Record<string, string>> = {};
  for (const [state, map] of at) {
    result[state] = {};
    for (const [sym, action] of map) {
      if (action.type === 'shift') result[state][sym] = `s${action.state}`;
      else if (action.type === 'reduce') result[state][sym] = `r${action.prodIndex}`;
      else if (action.type === 'accept') result[state][sym] = 'acc';
    }
  }
  return result;
}

function serializeGotoTable(gt: GotoTable): Record<number, Record<string, number>> {
  const result: Record<number, Record<string, number>> = {};
  for (const [state, map] of gt) {
    result[state] = {};
    for (const [sym, next] of map) {
      result[state][sym] = next;
    }
  }
  return result;
}

// ── Parse principal ───────────────────────────────────────────────────────────

/**
 * Compile LALR(1) grammar.
 */
export function compile(grammarStr: string): CompiledParser {
  try {
    const grammar = parseGrammar(grammarStr);
    const first = computeFirst(grammar);
    const { states: lr1States, transitions: lr1Transitions } = buildLR1Automaton(grammar, first);
    const { states, transitions } = mergeToLALR(lr1States, lr1Transitions);

    const actionTable: ActionTable = new Map();
    const gotoTable: GotoTable = new Map();
    const conflicts: string[] = [];

    for (const state of states) {
      actionTable.set(state.id, new Map());
      gotoTable.set(state.id, new Map());

      for (const item of state.items) {
        const symAfterDot = item.body[item.dot];

        if (symAfterDot && symAfterDot !== 'ε') {
          const nextState = transitions.get(state.id)?.get(symAfterDot);
          if (nextState === undefined) continue;

          if (grammar.terminals.has(symAfterDot) || symAfterDot === '$') {
            const existing = actionTable.get(state.id)!.get(symAfterDot);
            if (existing && existing.type !== 'shift') {
              conflicts.push(`Conflicto shift/reduce en estado ${state.id} con '${symAfterDot}'`);
            } else {
              actionTable.get(state.id)!.set(symAfterDot, { type: 'shift', state: nextState });
            }
          } else if (grammar.nonTerminals.has(symAfterDot)) {
            gotoTable.get(state.id)!.set(symAfterDot, nextState);
          }
        } else {
          const isEpsilon = item.body[0] === 'ε' && item.body.length === 1;
          const dotAtEnd = item.dot >= item.body.length || isEpsilon;
          if (!dotAtEnd) continue;

          if (item.head === grammar.augmentedStart) {
            actionTable.get(state.id)!.set('$', { type: 'accept' });
          } else {
            const existing = actionTable.get(state.id)!.get(item.lookahead);
            if (existing) {
              conflicts.push(`Conflicto en estado ${state.id} con '${item.lookahead}': ${existing.type}/reduce`);
            } else {
              actionTable.get(state.id)!.set(item.lookahead, { type: 'reduce', prodIndex: item.prodIndex });
            }
          }
        }
      }
    }

    const isValid = conflicts.length === 0;

    if (!isValid) {
      return {
        isValid: false,
        error: `Gramática no es LALR(1). Conflictos detectados.`,
        conflicts,
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
      };
    }

    return {
      isValid: true,
      actionTable: serializeActionTable(actionTable),
      gotoTable: serializeGotoTable(gotoTable),
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Error al compilar gramática: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Execute parsing on a compiled LALR(1) parser.
 */
export function parse(
  compiled: CompiledParser,
  grammarStr: string,
  inputStr: string
): ParseResult {
  const steps: ParseStep[] = [];

  if (!compiled.isValid || !compiled.actionTable || !compiled.gotoTable) {
    return {
      accepted: false,
      steps,
      error: compiled.error || 'Parser compilado inválido',
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
    };
  }

  if (!inputStr || inputStr.trim().length === 0) {
    return {
      accepted: false,
      steps,
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
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
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
    };
  }

  const tokens = tokenize(inputStr, { autoSplit: true });
  if (tokens.length === 0) {
    return {
      accepted: false,
      steps,
      error: 'Cadena de entrada vacía o inválida',
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
    };
  }

  tokens.push('$');

  const stateStack: number[] = [0];
  const nodeStack: TreeNode[] = [];
  let cursor = 0;
  let stepNum = 0;
  const MAX_STEPS = 500;

  const stackStr = () => stateStack.join(' ');
  const inputLeft = () => tokens.slice(cursor).join(' ');

  while (true) {
    if (stepNum++ > MAX_STEPS) {
      return {
        accepted: false,
        steps,
        error: 'Demasiados pasos (posible ciclo infinito)',
        actionTable: compiled.actionTable,
        gotoTable: compiled.gotoTable,
      };
    }

    const state = stateStack[stateStack.length - 1];
    const lookahead = tokens[cursor];
    const action = compiled.actionTable[state]?.[lookahead];

    if (!action) {
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: `Error: no hay acción en [${state}, '${lookahead}']`,
        actionType: 'error',
      });
      return {
        accepted: false,
        steps,
        error: `Error sintáctico en estado ${state} con token '${lookahead}'`,
        actionTable: compiled.actionTable,
        gotoTable: compiled.gotoTable,
      };
    }

    if (action.startsWith('s')) {
      const nextState = parseInt(action.slice(1));
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: `Shift ${nextState} (lee '${lookahead}')`,
        actionType: 'shift',
      });
      stateStack.push(nextState);
      nodeStack.push({ label: lookahead, children: [] });
      cursor++;
    } else if (action.startsWith('r')) {
      const prodIndex = parseInt(action.slice(1));
      const prod = grammar.productions[prodIndex];
      const isEpsilon = prod.body[0] === 'ε' && prod.body.length === 1;
      const popCount = isEpsilon ? 0 : prod.body.length;
      const bodyStr = isEpsilon ? 'ε' : prod.body.join(' ');

      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: `Reduce ${prod.head} → ${bodyStr}`,
        actionType: 'reduce',
      });

      const children: TreeNode[] = [];
      for (let i = 0; i < popCount; i++) {
        stateStack.pop();
        const node = nodeStack.pop();
        if (node) children.unshift(node);
      }
      if (isEpsilon) children.push({ label: 'ε', children: [] });

      const newNode: TreeNode = { label: prod.head, children };
      nodeStack.push(newNode);

      const topState = stateStack[stateStack.length - 1];
      const nextState = compiled.gotoTable[topState]?.[prod.head];

      if (nextState === undefined) {
        steps.push({
          step: stepNum + 1,
          stack: stackStr(),
          input: inputLeft(),
          action: `Error: GOTO[${topState}, ${prod.head}] indefinido`,
          actionType: 'error',
        });
        return {
          accepted: false,
          steps,
          error: 'Error en GOTO',
          actionTable: compiled.actionTable,
          gotoTable: compiled.gotoTable,
        };
      }

      stateStack.push(nextState);
    } else if (action === 'acc') {
      steps.push({
        step: stepNum,
        stack: stackStr(),
        input: inputLeft(),
        action: 'Accept ✓',
        actionType: 'accept',
      });
      return {
        accepted: true,
        steps,
        treeRoot: nodeStack[nodeStack.length - 1],
        actionTable: compiled.actionTable,
        gotoTable: compiled.gotoTable,
      };
    }
  }
}

function parseCompiled(
  compiled: CompiledParser,
  grammarStr: string,
  inputStr: string
): ParseResult {
  const steps: ParseStep[] = [];

  let grammar;
  try {
    grammar = parseGrammar(grammarStr);
  } catch {
    return { accepted: false, steps, error: 'Error al parsear la gramática.' };
  }

  const first = computeFirst(grammar);
  const { states: lr1States, transitions: lr1Transitions } = buildLR1Automaton(grammar, first);
  const { states, transitions } = mergeToLALR(lr1States, lr1Transitions);

  // ── Construir ACTION y GOTO ────────────────────────────────────────────────
  const actionTable: ActionTable = new Map();
  const gotoTable: GotoTable = new Map();
  const conflicts: string[] = [];

  for (const state of states) {
    actionTable.set(state.id, new Map());
    gotoTable.set(state.id, new Map());

    for (const item of state.items) {
      const symAfterDot = item.body[item.dot];

      if (symAfterDot && symAfterDot !== 'ε') {
        const nextState = transitions.get(state.id)?.get(symAfterDot);
        if (nextState === undefined) continue;

        if (grammar.terminals.has(symAfterDot) || symAfterDot === '$') {
          const existing = actionTable.get(state.id)!.get(symAfterDot);
          if (existing && existing.type !== 'shift') {
            conflicts.push(`Conflicto shift/reduce en estado ${state.id} con '${symAfterDot}'`);
          } else {
            actionTable.get(state.id)!.set(symAfterDot, { type: 'shift', state: nextState });
          }
        } else if (grammar.nonTerminals.has(symAfterDot)) {
          gotoTable.get(state.id)!.set(symAfterDot, nextState);
        }
      } else {
        // Dot al final
        const isEpsilon = item.body[0] === 'ε' && item.body.length === 1;
        const dotAtEnd = item.dot >= item.body.length || isEpsilon;
        if (!dotAtEnd) continue;

        if (item.head === grammar.augmentedStart) {
          actionTable.get(state.id)!.set('$', { type: 'accept' });
        } else {
          // LALR: reduce solo en el lookahead del item
          const existing = actionTable.get(state.id)!.get(item.lookahead);
          if (existing) {
            conflicts.push(`Conflicto en estado ${state.id} con '${item.lookahead}': ${existing.type}/reduce`);
          } else {
            actionTable.get(state.id)!.set(item.lookahead, { type: 'reduce', prodIndex: item.prodIndex });
          }
        }
      }
    }
  }

  const automataData: AutomataData = {
    states: states.map(state => ({
      id: state.id,
      items: state.items.map(item => {
        const b = [...item.body]
        b.splice(item.dot, 0, '•')
        return `${item.head} → ${b.join(' ')}, ${item.lookahead}`
      }),
    })),
    transitions: [...transitions.entries()].flatMap(([from, map]) =>
      [...map.entries()].map(([symbol, to]) => ({ from, to, symbol }))
    ),
  }

  if (conflicts.length > 0) {
    return {
      accepted: false,
      steps,
      error: `Gramática no es LALR(1). ${conflicts.join('; ')}`,
      actionTable: serializeActionTable(actionTable),
      gotoTable: serializeGotoTable(gotoTable),
    };
  }

  // ── Simulación ────────────────────────────────────────────────────────────
  // ── Simulación con árbol ──────────────────────────────────────────────────
  const tokens = inputStr.trim().split(/\s+/).filter(t => t.length > 0);
  tokens.push('$');

  const stateStack: number[] = [0];
  const nodeStack: TreeNode[] = [];
  let cursor = 0;
  let stepNum = 0;
  const MAX_STEPS = 500;

  const stackStr = () => stateStack.join(' ');
  const inputLeft = () => tokens.slice(cursor).join(' ');

  while (true) {
    if (stepNum++ > MAX_STEPS) {
      return { accepted: false, steps, error: 'Demasiados pasos.' };
    }

    const state = stateStack[stateStack.length - 1];
    const lookahead = tokens[cursor];
    const action = actionTable.get(state)?.get(lookahead);

    if (!action) {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Error: no hay acción en [${state}, '${lookahead}']`, actionType: 'error' });
      return {
        accepted: false, steps,
        error: `Error sintáctico en estado ${state} con token '${lookahead}'.`,
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
        automata: automataData,
      };
    }

    if (action.type === 'shift') {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Shift ${action.state} (lee '${lookahead}')`, actionType: 'shift' });
      stateStack.push(action.state);
      nodeStack.push({ label: lookahead, children: [] });
      cursor++;

    } else if (action.type === 'reduce') {
      const prod = grammar.productions[action.prodIndex];
      const isEpsilon = prod.body[0] === 'ε' && prod.body.length === 1;
      const popCount = isEpsilon ? 0 : prod.body.length;
      const bodyStr = isEpsilon ? 'ε' : prod.body.join(' ');

      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Reduce ${prod.head} → ${bodyStr}`, actionType: 'reduce' });

      const children: TreeNode[] = [];
      for (let i = 0; i < popCount; i++) {
        stateStack.pop();
        children.unshift(nodeStack.pop()!);
      }
      if (isEpsilon) children.push({ label: 'ε', children: [] });

      const newNode: TreeNode = { label: prod.head, children };
      nodeStack.push(newNode);

      const topState = stateStack[stateStack.length - 1];
      const nextState = gotoTable.get(topState)?.get(prod.head);

      if (nextState === undefined) {
        steps.push({ step: stepNum + 1, stack: stackStr(), input: inputLeft(), action: `Error: GOTO[${topState}, ${prod.head}] indefinido`, actionType: 'error' });
        return { accepted: false, automata: automataData, steps, error: 'Error en GOTO.', actionTable: serializeActionTable(actionTable), gotoTable: serializeGotoTable(gotoTable) };
      }

      stateStack.push(nextState);

    } else if (action.type === 'accept') {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: 'Accept ✓', actionType: 'accept' });
      return {
        accepted: true, steps,
        treeRoot: nodeStack[nodeStack.length - 1],
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
        automata: automataData,
      };
    }
  }
}
