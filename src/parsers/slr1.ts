import { parseGrammar } from './grammar';
import { computeFirst, computeFollow } from './first-follow';
import { buildLR0Automaton, buildAutomataData } from './lr-core';
import type { ParseResult, ParseStep, TreeNode } from '../types';

type Action =
  | { type: 'shift'; state: number }
  | { type: 'reduce'; prodIndex: number }
  | { type: 'accept' };

type ActionTable = Map<number, Map<string, Action>>;
type GotoTable = Map<number, Map<string, number>>;

export function parse(grammarStr: string, inputStr: string): ParseResult {
  const steps: ParseStep[] = [];

  let grammar;
  try {
    grammar = parseGrammar(grammarStr);
  } catch {
    return { accepted: false, steps, error: 'Error al parsear la gramática.' };
  }

  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const automaton = buildLR0Automaton(grammar);
  const automataData = buildAutomataData(automaton.states, automaton.transitions)
  const actionTable: ActionTable = new Map();
  const gotoTable: GotoTable = new Map();
  const conflicts: string[] = [];

  for (const state of automaton.states) {
    actionTable.set(state.id, new Map());
    gotoTable.set(state.id, new Map());

    for (const item of state.items) {
      const symAfterDot = item.body[item.dot];

      if (symAfterDot && symAfterDot !== 'ε') {
        if (grammar.terminals.has(symAfterDot) || symAfterDot === '$') {
          const nextState = automaton.transitions.get(state.id)?.get(symAfterDot);
          if (nextState !== undefined) {
            const existing = actionTable.get(state.id)!.get(symAfterDot);
            if (existing && existing.type !== 'shift') {
              conflicts.push(`Conflicto shift/reduce en estado ${state.id} con '${symAfterDot}'`);
            }
            actionTable.get(state.id)!.set(symAfterDot, { type: 'shift', state: nextState });
          }
        }
        if (grammar.nonTerminals.has(symAfterDot)) {
          const nextState = automaton.transitions.get(state.id)?.get(symAfterDot);
          if (nextState !== undefined) {
            gotoTable.get(state.id)!.set(symAfterDot, nextState);
          }
        }
      } else {
        const isEpsilonProd = item.body[0] === 'ε' && item.body.length === 1;
        const dotAtEnd = item.dot >= item.body.length || isEpsilonProd;
        if (!dotAtEnd) continue;

        if (item.head === grammar.augmentedStart) {
          actionTable.get(state.id)!.set('$', { type: 'accept' });
        } else {
          const followSet = follow[item.head] ?? new Set();
          for (const t of followSet) {
            const existing = actionTable.get(state.id)!.get(t);
            if (existing) {
              conflicts.push(`Conflicto en estado ${state.id} con '${t}': ${existing.type}/reduce`);
            } else {
              actionTable.get(state.id)!.set(t, { type: 'reduce', prodIndex: item.prodIndex });
            }
          }
        }
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      accepted: false, steps,
      error: `Gramática no es SLR(1). ${conflicts.join('; ')}`,
      firstSets: first, followSets: follow,
      actionTable: serializeActionTable(actionTable),
      gotoTable: serializeGotoTable(gotoTable),
    };
  }

  // ── Simulación con árbol ──────────────────────────────────────────────────
  const tokens = inputStr.trim().split(/\s+/).filter(t => t.length > 0);
  tokens.push('$');

  const stateStack: number[] = [0];
  const nodeStack: TreeNode[] = [];  // paralela al stateStack
  let cursor = 0;
  let stepNum = 0;
  const MAX_STEPS = 500;

  const stackStr = () => stateStack.join(' ');
  const inputLeft = () => tokens.slice(cursor).join(' ');

  while (true) {
    if (stepNum++ > MAX_STEPS) {
      return { accepted: false, steps, error: 'Demasiados pasos.', firstSets: first, followSets: follow, actionTable: serializeActionTable(actionTable), gotoTable: serializeGotoTable(gotoTable) };
    }

    const state = stateStack[stateStack.length - 1];
    const lookahead = tokens[cursor];
    const action = actionTable.get(state)?.get(lookahead);

    if (!action) {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Error: no hay acción en [${state}, '${lookahead}']`, actionType: 'error' });
      return {
        accepted: false, steps,
        error: `Error sintáctico en estado ${state} con token '${lookahead}'.`,
        firstSets: first, followSets: follow,
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
      };
    }

    if (action.type === 'shift') {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Shift ${action.state} (lee '${lookahead}')`, actionType: 'shift' });
      stateStack.push(action.state);
      // Nodo hoja para el terminal
      nodeStack.push({ label: lookahead, children: [] });
      cursor++;

    } else if (action.type === 'reduce') {
      const prod = grammar.productions[action.prodIndex];
      const isEpsilon = prod.body[0] === 'ε' && prod.body.length === 1;
      const popCount = isEpsilon ? 0 : prod.body.length;
      const bodyStr = isEpsilon ? 'ε' : prod.body.join(' ');

      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: `Reduce ${prod.head} → ${bodyStr}`, actionType: 'reduce' });

      // Crear nodo interno con los hijos popeados
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
        return { accepted: false, steps, error: 'Error en GOTO.', firstSets: first, followSets: follow, actionTable: serializeActionTable(actionTable), gotoTable: serializeGotoTable(gotoTable) };
      }

      stateStack.push(nextState);

    } else if (action.type === 'accept') {
      steps.push({ step: stepNum, stack: stackStr(), input: inputLeft(), action: 'Accept ✓', actionType: 'accept' });

      // El nodo raíz es el último en nodeStack
      const treeRoot = nodeStack[nodeStack.length - 1];

      return {
        accepted: true, steps,
        treeRoot,
        automata: automataData,
        firstSets: first, followSets: follow,
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
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
