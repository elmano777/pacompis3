import { parseGrammar } from './grammar';
import { computeFirst, computeFollow } from './first-follow';
import { buildLR0Automaton, buildAutomataData } from './lr-core';
import { tokenize } from './tokenizer';
import type { ParseResult, ParseStep, TreeNode, CompiledParser } from '../types';

type Action =
  | { type: 'shift'; state: number }
  | { type: 'reduce'; prodIndex: number }
  | { type: 'accept' };

type ActionTable = Map<number, Map<string, Action>>;
type GotoTable = Map<number, Map<string, number>>;

export function compile(grammarStr: string): CompiledParser {
  try {
    const grammar = parseGrammar(grammarStr);

    const first = computeFirst(grammar);
    const follow = computeFollow(grammar, first);

    const automaton = buildLR0Automaton(grammar);
    const automataData = buildAutomataData(
      automaton.states,
      automaton.transitions
    );

    const actionTable: ActionTable = new Map();
    const gotoTable: GotoTable = new Map();

    const conflicts: string[] = [];

    for (const state of automaton.states) {
      actionTable.set(state.id, new Map());
      gotoTable.set(state.id, new Map());

      // =========================
      // 1. SHIFT + GOTO (solo LR0)
      // =========================
      for (const item of state.items) {
        const sym = item.body[item.dot];

        if (!sym || sym === 'ε') continue;

        const nextState =
          automaton.transitions.get(state.id)?.get(sym);

        if (nextState === undefined) continue;

        if (grammar.terminals.has(sym)) {
          const existing = actionTable.get(state.id)!.get(sym);

          if (existing && existing.type !== 'shift') {
            conflicts.push(
              `Conflicto shift/reduce en estado ${state.id} con '${sym}'`
            );
          }

          actionTable.get(state.id)!.set(sym, {
            type: 'shift',
            state: nextState,
          });
        }

        if (grammar.nonTerminals.has(sym)) {
          gotoTable.get(state.id)!.set(sym, nextState);
        }
      }

      // =========================
      // 2. REDUCTIONS (SLR LOGIC)
      // =========================
      for (const item of state.items) {
        const isEpsilon =
          item.body.length === 1 && item.body[0] === 'ε';

        const atEnd =
          item.dot >= item.body.length || isEpsilon;

        if (!atEnd) continue;

        // ACCEPT
        if (item.head === grammar.augmentedStart) {
          actionTable.get(state.id)!.set('$', {
            type: 'accept',
          });
          continue;
        }

        // REDUCE con FOLLOW
        const followSet = follow[item.head] ?? new Set();

        for (const t of followSet) {
          const existing =
            actionTable.get(state.id)!.get(t);

          if (existing) {
            // solo conflicto si realmente choca con shift
            if (existing.type === 'shift') {
              conflicts.push(
                `Conflicto shift/reduce en estado ${state.id} con '${t}'`
              );
            }
          } else {
            actionTable.get(state.id)!.set(t, {
              type: 'reduce',
              prodIndex: item.prodIndex,
            });
          }
        }
      }
    }

    const isValid = conflicts.length === 0;

    if (!isValid) {
      return {
        isValid: false,
        error: `Gramática no es SLR(1). Conflictos detectados.`,
        conflicts,
        firstSets: first,
        followSets: follow,
        automata: automataData,
        actionTable: serializeActionTable(actionTable),
        gotoTable: serializeGotoTable(gotoTable),
      };
    }

    return {
      isValid: true,
      firstSets: first,
      followSets: follow,
      automata: automataData,
      actionTable: serializeActionTable(actionTable),
      gotoTable: serializeGotoTable(gotoTable),
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Error al compilar gramática: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/**
 * Execute parsing on a compiled SLR(1) parser.
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
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
    };
  }

  if (!inputStr || inputStr.trim().length === 0) {
    return {
      accepted: false,
      steps,
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
      grammarOnly: true,
    };
  }

  let grammarForTokens;
  try { grammarForTokens = parseGrammar(grammarStr); } catch { grammarForTokens = null; }
  const tokens = tokenize(inputStr, { autoSplit: true, knownTerminals: grammarForTokens?.terminals });
  if (tokens.length === 0) {
    return {
      accepted: false,
      steps,
      error: 'Cadena de entrada vacía o inválida',
      actionTable: compiled.actionTable,
      gotoTable: compiled.gotoTable,
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
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
      firstSets: compiled.firstSets,
      followSets: compiled.followSets,
    };
  }

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
        firstSets: compiled.firstSets,
        followSets: compiled.followSets,
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
        firstSets: compiled.firstSets,
        followSets: compiled.followSets,
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
          firstSets: compiled.firstSets,
          followSets: compiled.followSets,
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
        firstSets: compiled.firstSets,
        followSets: compiled.followSets,
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
