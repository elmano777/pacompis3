export interface Production {
  head: string;
  body: string[];
}

export interface Grammar {
  productions: Production[];
  terminals: Set<string>;
  nonTerminals: Set<string>;
  startSymbol: string;
  augmentedStart: string;
}

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
    const sep = line.includes('->') ? '->' : '→';
    const parts = line.split(sep);
    if (parts.length < 2) continue;

    const head = parts[0].trim();
    const bodyPart = parts.slice(1).join(sep).trim();

    nonTerminals.add(head);
    if (!startSymbol) startSymbol = head;

    for (const alt of bodyPart.split('|')) {
      const trimmed = alt.trim();
      const body = (trimmed === 'ε' || trimmed === 'epsilon' || trimmed === '')
        ? ['ε']
        : trimmed.split(/\s+/);
      productions.push({ head, body });
    }
  }

  for (const p of productions) {
    for (const sym of p.body) {
      if (sym !== 'ε' && !nonTerminals.has(sym)) {
        terminals.add(sym);
      }
    }
  }

  // Símbolo aumentado
  const augmentedStart = startSymbol + "'";
  productions.unshift({ head: augmentedStart, body: [startSymbol] });
  nonTerminals.add(augmentedStart);

  return { productions, terminals, nonTerminals, startSymbol, augmentedStart };
}
