import type { Grammar } from './grammar';

export interface LRItem {
  head: string;
  body: string[];
  dot: number;       // posición del punto
  prodIndex: number; // índice en grammar.productions
}

export interface LRState {
  id: number;
  items: LRItem[];
}

export interface LRAutomaton {
  states: LRState[];
  transitions: Map<number, Map<string, number>>; // transitions[stateId][symbol] = nextStateId
}

function itemKey(item: LRItem): string {
  const b = [...item.body];
  b.splice(item.dot, 0, '•');
  return `${item.head} → ${b.join(' ')}`;
}

function stateKey(items: LRItem[]): string {
  return items.map(itemKey).sort().join('\n');
}

export function closure(items: LRItem[], grammar: Grammar): LRItem[] {
  const result: LRItem[] = [...items];
  const seen = new Set(items.map(itemKey));

  let i = 0;
  while (i < result.length) {
    const item = result[i++];
    const symAfterDot = item.body[item.dot];

    if (!symAfterDot || !grammar.nonTerminals.has(symAfterDot)) continue;

    // Agregar todas las producciones de symAfterDot con dot al inicio
    grammar.productions.forEach((prod, idx) => {
      if (prod.head !== symAfterDot) return;
      const newItem: LRItem = { head: prod.head, body: prod.body, dot: 0, prodIndex: idx };
      const key = itemKey(newItem);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(newItem);
      }
    });
  }

  return result;
}

export function gotoSet(items: LRItem[], symbol: string, grammar: Grammar): LRItem[] {
  const moved: LRItem[] = [];

  for (const item of items) {
    if (item.body[item.dot] === symbol) {
      moved.push({ ...item, dot: item.dot + 1 });
    }
  }

  return moved.length > 0 ? closure(moved, grammar) : [];
}

export function buildLR0Automaton(grammar: Grammar): LRAutomaton {
  const startItem: LRItem = {
    head: grammar.augmentedStart,
    body: grammar.productions[0].body,
    dot: 0,
    prodIndex: 0,
  };

  const startState: LRState = { id: 0, items: closure([startItem], grammar) };
  const states: LRState[] = [startState];
  const transitions = new Map<number, Map<string, number>>();
  const stateMap = new Map<string, number>();
  stateMap.set(stateKey(startState.items), 0);

  let i = 0;
  while (i < states.length) {
    const state = states[i++];
    transitions.set(state.id, new Map());

    // Todos los símbolos después del dot en este estado
    const symbols = new Set<string>();
    for (const item of state.items) {
      const sym = item.body[item.dot];
      if (sym && sym !== 'ε') symbols.add(sym);
    }

    for (const sym of symbols) {
      const nextItems = gotoSet(state.items, sym, grammar);
      if (nextItems.length === 0) continue;

      const key = stateKey(nextItems);
      let nextId: number;

      if (stateMap.has(key)) {
        nextId = stateMap.get(key)!;
      } else {
        nextId = states.length;
        const nextState: LRState = { id: nextId, items: nextItems };
        states.push(nextState);
        stateMap.set(key, nextId);
      }

      transitions.get(state.id)!.set(sym, nextId);
    }
  }

  return { states, transitions };
}

export function formatItem(item: LRItem): string {
  const b = [...item.body];
  b.splice(item.dot, 0, '•');
  return `${item.head} → ${b.join(' ')}`;
}

import type { AutomataData } from '../types'

export function buildAutomataData(
  states: LRState[],
  transitions: Map<number, Map<string, number>>
): AutomataData {
  return {
    states: states.map(state => ({
      id: state.id,
      items: state.items.map(formatItem),
    })),
    transitions: [...transitions.entries()].flatMap(([from, map]) =>
      [...map.entries()].map(([symbol, to]) => ({ from, to, symbol }))
    ),
  }
}
