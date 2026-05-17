import { parseGrammar } from './grammar';
import { buildLR0Automaton, buildAutomataData } from './lr-core';
import { tokenize, addEndMarker } from './tokenizer';
import type { ParseResult, ParseStep, TreeNode, CompiledParser } from '../types';

type Action =
  | { type: 'shift'; state: number }
  | { type: 'reduce'; prodIndex: number }
  | { type: 'accept' };

type ActionTable = Map<number, Map<string, Action>>;
type GotoTable = Map<number, Map<string, number>>;

/**
 * Compile LR(0) grammar into tables and automata.
 * This happens once per grammar/parser change.
 */
export function compile(grammarStr: string): CompiledParser {
  try {
    const grammar = parseGrammar(grammarStr);
    const automaton = buildLR0Automaton(grammar);
    const automataData = buildAutomataData(automaton.states, automaton.transitions);
    const actionTable: ActionTable = new Map();
    const gotoTable: GotoTable = new Map();
    const conflicts: string[] = [];

    for (const state of automaton.states) {
      actionTable.set(state.id, new Map());
      gotoTable.set(state.id, new Map());

      const shiftItems = state.items.filter(
        item => item.body[item.dot] && item.body[item.dot] !== 'ε'
      );
      const reduceItems = state.items.filter(item => {
        const isEpsilon = item.body[0] === 'ε' && item.body.length === 1;
        return item.dot >= item.body.length || isEpsilon;
      });

      for (const item of shiftItems) {
        const sym = item.body[item.dot];
        const nextState = automaton.transitions.get(state.id)?.get(sym);
        if (nextState === undefined) continue;

        if (grammar.terminals.has(sym) || sym === '$') {
          actionTable.get(state.id)!.set(sym, { type: 'shift', state: nextState });
        } else if (grammar.nonTerminals.has(sym)) {
          gotoTable.get(state.id)!.set(sym, nextState);
        }
      }

      for (const item of reduceItems) {
        if (item.head === grammar.augmentedStart) {
          actionTable.get(state.id)!.set('$', { type: 'accept' });
          continue;
        }
        const allTerminals = [...grammar.terminals, '$'];
        for (const t of allTerminals) {
          const existing = actionTable.get(state.id)!.get(t);
          if (existing) {
            conflicts.push(`Conflicto ${existing.type}/reduce en estado ${state.id} con '${t}'`);
          } else {
            actionTable.get(state.id)!.set(t, { type: 'reduce', prodIndex: item.prodIndex });
          }
        }
      }
    }

    const isValid = conflicts.length === 0;

    if (!isValid) {
      return {
        isValid: false,
        error: `Gramática no es LR(0). Conflictos detectados.`,
        conflicts,
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
        automata: automataData,
      };
    }

    return {
      isValid: true,
      actionTable: serializeActionTable(actionTable),
      gotoTable: serializeGotoTable(gotoTable),
      automata: automataData,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Error al compilar gramática: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Execute parsing on a compiled LR(0) parser.
 * Only runs if compile succeeded.
 */
export function parse(
  compiled: CompiledParser,
  grammarStr: string,
  inputStr: string
): ParseResult {
  const steps: ParseStep[] = [];

  // Si el compilado falló, retornar error
  if (!compiled.isValid || !compiled.actionTable || !compiled.gotoTable) {
    return {
      accepted: false,
      steps,
      error: compiled.error || 'Parser compilado inválido',
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
      automata: compiled.automata,
    };
  }

  // Si no hay entrada, solo retornar el estado compilado (grammar-only mode)
  if (!inputStr || inputStr.trim().length === 0) {
    return {
      accepted: false,
      steps,
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
      automata: compiled.automata,
      grammarOnly: true,
    };
  }

  // Tokenizar entrada
  const tokens = tokenize(inputStr, { autoSplit: true });
  if (tokens.length === 0) {
    return {
      accepted: false,
      steps,
      error: 'Cadena de entrada vacía o inválida',
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
      automata: compiled.automata,
    };
  }

  tokens.push('$');

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
      automata: compiled.automata,
    };
  }

  // ── Simulación con árbol ──────────────────────────────────────────────────
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
        automata: compiled.automata,
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
        automata: compiled.automata,
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
          automata: compiled.automata,
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
        automata: compiled.automata,
        treeRoot: nodeStack[nodeStack.length - 1],
        actionTable: compiled.actionTable,
        gotoTable: compiled.gotoTable,
      };
    }
  }
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
