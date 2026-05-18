/**
 * Improved tokenizer for handling input strings.
 * Supports both space-separated and concatenated tokens.
 */

export interface TokenizeOptions {
  /**
   * If true and no spaces found, attempt character-by-character splitting.
   * Useful for inputs like "aab" -> ["a", "a", "b"]
   */
  autoSplit?: boolean
  /**
   * Known terminals from the grammar. When provided and no spaces are found,
   * the tokenizer will try to match these terminals greedily (longest-match)
   * before falling back to character-by-character splitting.
   * This correctly handles inputs like "aea" with grammar terminals {a, e}.
   */
  knownTerminals?: Set<string>
}

export function tokenize(input: string, options: TokenizeOptions = {}): string[] {
  if (!input || input.trim().length === 0) {
    return []
  }

  const trimmed = input.trim()

  // Try space-separated first
  const spaceSplit = trimmed.split(/\s+/).filter(t => t.length > 0)

  // If we got multiple tokens from space-split, use it
  if (spaceSplit.length > 1) {
    return spaceSplit
  }

  // Single token or no spaces found
  if (spaceSplit.length === 1) {
    const token = spaceSplit[0]

    if (options.autoSplit && token.length > 1) {
      // If we know the grammar terminals, use greedy longest-match tokenization
      if (options.knownTerminals && options.knownTerminals.size > 0) {
        const result = greedyTokenize(token, options.knownTerminals)
        // Only use greedy result if it covers the entire input without leftovers
        if (result !== null) {
          return result
        }
      }

      // Fallback: if every char is a single-char terminal (or all are symbols), split char by char
      const allSimple = /^[+\-*\/\(\)\$\.,;:\[\]\{\}ε0-9a-zA-Z]+$/.test(token)
      if (allSimple) {
        return token.split('')
      }
    }

    return [token]
  }

  return []
}

/**
 * Greedy longest-match tokenization using known terminals.
 * Returns an array of tokens if the entire string is consumed, null otherwise.
 */
function greedyTokenize(input: string, terminals: Set<string>): string[] | null {
  const tokens: string[] = []
  let pos = 0

  // Sort terminals by length descending for longest-match
  const sortedTerminals = [...terminals].sort((a, b) => b.length - a.length)

  while (pos < input.length) {
    let matched = false
    for (const term of sortedTerminals) {
      if (input.startsWith(term, pos)) {
        tokens.push(term)
        pos += term.length
        matched = true
        break
      }
    }
    if (!matched) {
      // Character not recognized as any terminal — fall back
      return null
    }
  }

  return tokens}

/**
 * Add end-of-input marker
 */
export function addEndMarker(tokens: string[]): string[] {
  return [...tokens, '$']
}