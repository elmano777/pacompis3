export interface Production {
  head: string;
  body: string[]; // ['ε'] para producciones vacías
}

export interface Grammar {
  productions: Production[];
  terminals: Set<string>;
  nonTerminals: Set<string>;
  startSymbol: string;
  augmentedStart: string;  // ← esta línea
}

/**
 * Parsea un string de gramática en el formato:
 *   S -> A B | c
 *   A -> a | ε
 */
export function parseGrammar(raw: string): Grammar {
  const productions: Production[] = [];
  const nonTerminals = new Set<string>();
  const terminals = new Set<string>();
  let startSymbol = '';

  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('//'));

  for (const line of lines) {
    // Soporta -> y →
    const arrow = line.includes('->') ? '->' : '→';
    const [headPart, bodyPart] = line.split(arrow).map(s => s.trim());
    if (!headPart || !bodyPart) continue;

    const head = headPart.trim();
    nonTerminals.add(head);
    if (!startSymbol) startSymbol = head;

    const alternatives = bodyPart.split('|').map(alt => alt.trim());
    for (const alt of alternatives) {
      const body = alt === 'ε' || alt === 'epsilon' || alt === ''
        ? ['ε']
        : alt.split(/\s+/);
      productions.push({ head, body });
    }
  }

  // Todo símbolo en el cuerpo que no sea NT es terminal
  // Todo símbolo en el cuerpo que no sea NT es terminal
  for (const p of productions) {
    for (const sym of p.body) {
      if (sym !== 'ε' && !nonTerminals.has(sym)) {
        terminals.add(sym);
      }
    }
  }

  // Símbolo aumentado (usar $ para evitar colisiones con producciones del usuario que usan X')
  const augmentedStart = `\$${startSymbol}`;
  productions.unshift({ head: augmentedStart, body: [startSymbol] });
  nonTerminals.add(augmentedStart);

  return { productions, terminals, nonTerminals, startSymbol, augmentedStart };
}

export function isNonTerminal(sym: string, grammar: Grammar): boolean {
  return grammar.nonTerminals.has(sym);
}

export function isTerminal(sym: string, grammar: Grammar): boolean {
  return grammar.terminals.has(sym) || sym === '$';
}
