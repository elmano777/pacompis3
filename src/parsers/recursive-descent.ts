import { parseGrammar, type Grammar } from './grammar';
import { tokenize } from './tokenizer';
import type { ParseResult, ParseStep, CompiledParser } from '../types';

/**
 * Compile recursive-descent grammar.
 * Check for left recursion.
 */
export function compile(grammarStr: string): CompiledParser {
  try {
    const grammar = parseGrammar(grammarStr);

    // Verificar que no haya recursión izquierda directa
    const conflicts: string[] = [];
    for (const prod of grammar.productions) {
      if (prod.body[0] === prod.head) {
        conflicts.push(`Recursión izquierda directa en '${prod.head}'`);
      }
    }

    if (conflicts.length > 0) {
      return {
        isValid: false,
        error: 'Recursive Descent no puede manejar recursión izquierda',
        conflicts,
      };
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      error: `Error al compilar gramática: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Execute parsing with compiled recursive-descent parser.
 */
export function parse(
  compiled: CompiledParser,
  grammarStr: string,
  inputStr: string
): ParseResult {
  const steps: ParseStep[] = [];

  if (!compiled.isValid) {
    return {
      accepted: false,
      steps,
      error: compiled.error || 'Parser compilado inválido',
    };
  }

  if (!inputStr || inputStr.trim().length === 0) {
    return {
      accepted: false,
      steps,
      grammarOnly: true,
    };
  }

  let grammar: Grammar;
  try {
    grammar = parseGrammar(grammarStr);
  } catch {
    return {
      accepted: false,
      steps,
      error: 'Error al parsear la gramática',
    };
  }

  const tokens = tokenize(inputStr, { autoSplit: true });
  if (tokens.length === 0) {
    return {
      accepted: false,
      steps,
      error: 'Cadena de entrada vacía o inválida',
    };
  }

  tokens.push('$');

  let cursor = 0;
  let stepNum = 0;
  const MAX_STEPS = 500;
  const callStack: string[] = ['$', grammar.startSymbol];

  // Agrupar producciones por cabeza para lookup rápido
  const prodsByHead = new Map<string, string[][]>();
  for (const prod of grammar.productions) {
    if (prod.head === grammar.augmentedStart) continue;
    if (!prodsByHead.has(prod.head)) prodsByHead.set(prod.head, []);
    prodsByHead.get(prod.head)!.push(prod.body);
  }

  const stackStr = () => [...callStack].reverse().join(' ');
  const inputLeft = () => tokens.slice(cursor).join(' ');

  function addStep(action: string, actionType: ParseStep['actionType']) {
    steps.push({
      step: ++stepNum,
      stack: stackStr(),
      input: inputLeft(),
      action,
      actionType,
    });
  }

  // FIRST set para elegir producción correcta
  function firstOfBody(body: string[]): Set<string> {
    const result = new Set<string>();
    for (const sym of body) {
      if (sym === 'ε') { result.add('ε'); break; }
      if (!grammar.nonTerminals.has(sym)) { result.add(sym); break; }
      // Es NT — agregar su FIRST (simplificado iterativo)
      const symProds = prodsByHead.get(sym) ?? [];
      let nullable = false;
      for (const prod of symProds) {
        if (prod[0] === 'ε') { nullable = true; continue; }
        result.add(prod[0]); // aproximación: primer símbolo
      }
      if (!nullable) break;
    }
    return result;
  }

  function parseNT(nt: string): boolean {
    if (stepNum > MAX_STEPS) return false;

    const alts = prodsByHead.get(nt);
    if (!alts) {
      addStep(`Error: no hay producciones para '${nt}'`, 'error');
      return false;
    }

    const lookahead = tokens[cursor];

    // Elegir alternativa por FIRST
    let chosen: string[] | null = null;
    for (const body of alts) {
      const f = firstOfBody(body);
      if (f.has(lookahead)) { chosen = body; break; }
      // Si body es nullable y lookahead podría seguir
      if (f.has('ε')) { chosen = body; break; }
    }

    if (!chosen) {
      addStep(`Error: no hay alternativa para '${nt}' con lookahead '${lookahead}'`, 'error');
      return false;
    }

    const bodyStr = chosen[0] === 'ε' ? 'ε' : chosen.join(' ');
    callStack.pop(); // quitar NT
    addStep(`Expandir ${nt} → ${bodyStr}`, 'expand');

    if (chosen[0] === 'ε') return true;

    // Empujar en reversa para procesar izquierda a derecha
    for (let i = chosen.length - 1; i >= 0; i--) {
      callStack.push(chosen[i]);
    }

    // Procesar cada símbolo empujado
    for (let i = 0; i < chosen.length; i++) {
      if (stepNum > MAX_STEPS) return false;

      const top = callStack[callStack.length - 1];

      if (grammar.nonTerminals.has(top)) {
        if (!parseNT(top)) return false;
      } else {
        // Terminal — match
        const current = tokens[cursor];
        callStack.pop();
        if (top === current) {
          addStep(`Match '${top}'`, 'match');
          cursor++;
        } else {
          addStep(`Error: se esperaba '${top}', se encontró '${current}'`, 'error');
          return false;
        }
      }
    }

    return true;
  }

  // Arrancar
  const ok = parseNT(grammar.startSymbol);

  if (ok && tokens[cursor] === '$') {
    addStep('Accept ✓', 'accept');
    return { accepted: true, steps };
  } else if (ok && tokens[cursor] !== '$') {
    addStep(`Error: input sobrante '${tokens[cursor]}'`, 'error');
    return { accepted: false, steps, error: `Input sobrante desde '${tokens[cursor]}'.` };
  } else {
    return { accepted: false, steps, error: steps.find(s => s.actionType === 'error')?.action ?? 'Error de parsing.' };
  }
}
