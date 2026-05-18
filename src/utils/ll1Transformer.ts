import type { Production } from '../parsers/grammar'
import { parseGrammar } from '../parsers/grammar'

export interface TransformationStep {
  name: string
  description: string
  details: string[]
}

export interface TransformationResult {
  success: boolean
  isLL1: boolean
  originalGrammar: Production[]
  transformedGrammar: Production[]
  steps: TransformationStep[]
  leftRecursiveProductions: Production[]
  newProductions: Production[]
  conflicts?: string[]
}

/**
 * Detectar si un símbolo es no terminal en el contexto sin símbolo aumentado
 */


/**
 * Detectar producciones con recursión izquierda directa: A → A α...
 */
function detectDirectLeftRecursion(
  productions: Production[],
): Map<string, Production[]> {
  const leftRecursive = new Map<string, Production[]>()

  for (const prod of productions) {
    if (prod.body.length > 0 && prod.body[0] === prod.head) {
      // Esta producción tiene recursión izquierda directa
      if (!leftRecursive.has(prod.head)) {
        leftRecursive.set(prod.head, [])
      }
      leftRecursive.get(prod.head)!.push(prod)
    }
  }

  return leftRecursive
}

/**
 * Eliminar recursión izquierda directa usando el algoritmo estándar:
 * Si A → A α1 | A α2 | β1 | β2
 * Reemplazar con:
 *   A → β1 A' | β2 A'
 *   A' → α1 A' | α2 A' | ε
 */
function eliminateDirectLeftRecursion(
  productions: Production[],
  nonTerminals: Set<string>
): { transformed: Production[]; newProductions: Production[]; details: string[] } {
  const transformed: Production[] = []
  const newProductions: Production[] = []
  const details: string[] = []
  const leftRecursive = detectDirectLeftRecursion(productions)

  const processed = new Set<string>()

  for (const prod of productions) {
    const nt = prod.head

    // Si ya procesamos este no terminal, saltarlo
    if (processed.has(nt)) continue

    const leftRecProds = leftRecursive.get(nt)
    if (!leftRecProds || leftRecProds.length === 0) {
      // No tiene recursión izquierda, mantener como está
      if (!processed.has(nt)) {
        transformed.push(prod)
      }
    } else {
      // Tiene recursión izquierda directa: separar en recursivos y no recursivos
      const allProds = productions.filter((p) => p.head === nt)
      const recursive = allProds.filter((p) => p.body.length > 0 && p.body[0] === nt)
      const nonRecursive = allProds.filter((p) => !p.body.length || p.body[0] !== nt)

      details.push(`No terminal "${nt}" tiene ${recursive.length} producciones recursivas izquierdas`)

      if (nonRecursive.length === 0) {
        // Todas recursivas: no hay forma de eliminar
        details.push(`⚠ "${nt}" solo tiene producciones recursivas (no terminales bases)`)
        allProds.forEach((p) => transformed.push(p))
      } else {
        // Crear A' (nuevo símbolo)
        const prime = nt + "'"
        nonTerminals.add(prime)

        // A → β A' | β' A' ...
        for (const np of nonRecursive) {
          transformed.push({ head: nt, body: [...np.body, prime] })
        }
        details.push(`${nt} → ${nonRecursive.map((p) => p.body.join(' ')).join(' | ')} ${prime}`)

        // A' → α A' | α' A' ... | ε
        for (const rp of recursive) {
          const alpha = rp.body.slice(1) // Quitar el A inicial
          newProductions.push({ head: prime, body: [...alpha, prime] })
        }
        newProductions.push({ head: prime, body: ['ε'] })
        details.push(
          `${prime} → ${recursive.map((p) => p.body.slice(1).join(' ')).join(' | ')} | ε`
        )
      }

      processed.add(nt)
    }
  }

  return { transformed, newProductions, details }
}

/**
 * Calcular FIRST(w) para una secuencia de símbolos
 */
function calculateFirst(
  sequence: string[],
  firstSets: Map<string, Set<string>>
): Set<string> {
  const result = new Set<string>()

  for (const sym of sequence) {
    if (firstSets.has(sym)) {
      const first = firstSets.get(sym)!
      for (const item of first) {
        if (item !== 'ε') result.add(item)
      }
      if (!first.has('ε')) break
    } else {
      // Terminal: agregar a FIRST y parar
      result.add(sym)
      break
    }
  }

  // Si todos tienen ε, agregar ε
  if (sequence.every((sym) => firstSets.has(sym) && firstSets.get(sym)!.has('ε'))) {
    result.add('ε')
  }

  return result
}

/**
 * Calcular FIRST sets para toda la gramática
 */
function calculateFirstSets(
  productions: Production[],
  nonTerminals: Set<string>
): Map<string, Set<string>> {
  const firstSets = new Map<string, Set<string>>()

  // Inicializar
  for (const nt of nonTerminals) {
    firstSets.set(nt, new Set<string>())
  }

  // Reglas de FIRST para terminales
  for (const prod of productions) {
    if (prod.body[0] === 'ε') {
      firstSets.get(prod.head)!.add('ε')
    } else if (prod.body[0] !== prod.head) {
      const first = prod.body[0]
      if (!nonTerminals.has(first)) {
        firstSets.get(prod.head)!.add(first)
      }
    }
  }

  // Punto fijo: iterar hasta que no haya cambios
  let changed = true
  while (changed) {
    changed = false

    for (const prod of productions) {
      if (prod.head === prod.body[0]) continue // Ignorar recursión (ya procesada)

      const first = calculateFirst(prod.body, firstSets)
      for (const item of first) {
        if (!firstSets.get(prod.head)!.has(item)) {
          firstSets.get(prod.head)!.add(item)
          changed = true
        }
      }
    }
  }

  return firstSets
}

/**
 * Calcular FOLLOW sets
 */
function calculateFollowSets(
  productions: Production[],
  nonTerminals: Set<string>,
  startSymbol: string,
  firstSets: Map<string, Set<string>>
): Map<string, Set<string>> {
  const followSets = new Map<string, Set<string>>()

  // Inicializar: FOLLOW(S) incluye $
  for (const nt of nonTerminals) {
    followSets.set(nt, new Set<string>())
  }
  followSets.get(startSymbol)!.add('$')

  // Punto fijo
  let changed = true
  while (changed) {
    changed = false

    for (const prod of productions) {
      for (let i = 0; i < prod.body.length; i++) {
        const sym = prod.body[i]
        if (!nonTerminals.has(sym)) continue

        const beta = prod.body.slice(i + 1)
        const firstBeta = calculateFirst(beta, firstSets)

        for (const term of firstBeta) {
          if (term !== 'ε' && !followSets.get(sym)!.has(term)) {
            followSets.get(sym)!.add(term)
            changed = true
          }
        }

        // Si FIRST(β) contiene ε, agregar FOLLOW(A)
        if (firstBeta.has('ε')) {
          for (const item of followSets.get(prod.head)!) {
            if (!followSets.get(sym)!.has(item)) {
              followSets.get(sym)!.add(item)
              changed = true
            }
          }
        }
      }
    }
  }

  return followSets
}

/**
 * Verificar si la gramática es LL(1)
 * No debe haber conflictos en FIRST o FOLLOW
 */
function isLL1Grammar(
  productions: Production[],
  firstSets: Map<string, Set<string>>,
  followSets: Map<string, Set<string>>
): { valid: boolean; conflicts: string[] } {
  const conflicts: string[] = []

  // Agrupar producciones por no terminal
  const prodsMap = new Map<string, Production[]>()
  for (const prod of productions) {
    if (!prodsMap.has(prod.head)) {
      prodsMap.set(prod.head, [])
    }
    prodsMap.get(prod.head)!.push(prod)
  }

  // Para cada no terminal, verificar que no haya conflictos
  for (const [nt, prods] of prodsMap) {
    const firsts: Map<number, Set<string>> = new Map()

    for (let i = 0; i < prods.length; i++) {
      const prod = prods[i]
      const first = calculateFirst(prod.body, firstSets)
      firsts.set(i, first)
    }

    // Verificar que los FIRST no se intersecten
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const fi = firsts.get(i)!
        const fj = firsts.get(j)!

        // Buscar intersección
        for (const term of fi) {
          if (term !== 'ε' && fj.has(term)) {
            conflicts.push(
              `Conflicto en "${nt}": producciones ${i + 1} y ${j + 1} pueden empezar con "${term}"`
            )
          }
        }

        // Si ambas producen ε, verificar FOLLOW
        if (fi.has('ε') && fj.has('ε')) {
          const follow = followSets.get(nt) || new Set()
          for (const term of follow) {
            conflicts.push(
              `Conflicto en "${nt}": ambas producciones pueden derivar ε y FOLLOW contiene "${term}"`
            )
          }
        }
      }
    }
  }

  return { valid: conflicts.length === 0, conflicts }
}

/**
 * Detectar prefijos comunes entre producciones de un mismo no terminal
 * Retorna un map donde la clave es el prefijo común y el valor es la lista de producciones
 */
function detectCommonPrefixes(
  productions: Production[]
): Map<string, { prefix: string; productions: Production[] }> {
  const prodsMap = new Map<string, Production[]>()

  // Agrupar por no terminal
  for (const prod of productions) {
    if (!prodsMap.has(prod.head)) {
      prodsMap.set(prod.head, [])
    }
    prodsMap.get(prod.head)!.push(prod)
  }

  const commonPrefixes = new Map<string, { prefix: string; productions: Production[] }>()

  // Para cada no terminal, buscar prefijos comunes
  for (const [nt, prods] of prodsMap) {
    if (prods.length < 2) continue

    // Comparar cada par de producciones
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const prod1 = prods[i]
        const prod2 = prods[j]

        // Encontrar prefijo común
        let prefixLen = 0
        for (let k = 0; k < Math.min(prod1.body.length, prod2.body.length); k++) {
          if (prod1.body[k] === prod2.body[k]) {
            prefixLen++
          } else {
            break
          }
        }

        if (prefixLen > 0) {
          const prefix = prod1.body.slice(0, prefixLen).join(' ')
          const key = `${nt}::${prefix}`

          if (!commonPrefixes.has(key)) {
            commonPrefixes.set(key, { prefix, productions: [] })
          }
        }
      }
    }
  }

  return commonPrefixes
}

/**
 * Aplicar factorización izquierda
 * A → α β1 | α β2 | γ  →  A → α A' | γ  y  A' → β1 | β2
 */
function applyLeftFactoring(
  productions: Production[],
  nonTerminals: Set<string>
): { transformed: Production[]; newProductions: Production[]; details: string[] } {
  const transformed: Production[] = []
  const newProductions: Production[] = []
  const details: string[] = []

  const prodsMap = new Map<string, Production[]>()
  for (const prod of productions) {
    if (!prodsMap.has(prod.head)) {
      prodsMap.set(prod.head, [])
    }
    prodsMap.get(prod.head)!.push(prod)
  }

  const processed = new Set<string>()

  for (const [nt, prods] of prodsMap) {
    if (processed.has(nt)) continue

    // Buscar todos los prefijos comunes para este no terminal
    const prefixGroups = new Map<string, Production[]>()

    for (const prod of prods) {
      let longestPrefix = ''
      let longestGroup: Production[] | null = null

      // Buscar el prefijo más largo que comparta con otra producción
      for (const other of prods) {
        if (prod === other) continue

        let prefixLen = 0
        for (let k = 0; k < Math.min(prod.body.length, other.body.length); k++) {
          if (prod.body[k] === other.body[k]) {
            prefixLen++
          } else {
            break
          }
        }

        if (prefixLen > 0) {
          const prefix = prod.body.slice(0, prefixLen).join(' ')
          if (prefix.length > longestPrefix.length) {
            longestPrefix = prefix
            if (!prefixGroups.has(prefix)) {
              prefixGroups.set(prefix, [])
            }
            longestGroup = prefixGroups.get(prefix)!
          }
        }
      }

      // Agregar la producción al grupo si encontró prefijo
      if (longestGroup && !longestGroup.includes(prod)) {
        longestGroup.push(prod)
      }
    }

    // Procesar grupos de prefijos
    let primeCounter = 1
    const handledProds = new Set<Production>()

    for (const [prefix, group] of prefixGroups) {
      if (group.length < 2) continue

      details.push(
        `No terminal "${nt}" tiene ${group.length} producciones con prefijo común: "${prefix}"`
      )

      const prime = nt + (primeCounter > 1 ? primeCounter.toString() : "'")
      primeCounter++
      nonTerminals.add(prime)

      const prefixSymbols = prefix.split(' ')

      // Marcar estas producciones como procesadas
      for (const p of group) {
        handledProds.add(p)
      }

      // Crear: A → α A'
      transformed.push({ head: nt, body: [...prefixSymbols, prime] })

      // Crear: A' → β1 | β2 | ...
      for (const prod of group) {
        const suffix = prod.body.slice(prefixSymbols.length)
        newProductions.push({ head: prime, body: suffix.length === 0 ? ['ε'] : suffix })
      }

      details.push(`${nt} → ${prefixSymbols.join(' ')} ${prime}`)
      details.push(`${prime} → ${group.map((p) => (p.body.slice(prefixSymbols.length).length === 0 ? 'ε' : p.body.slice(prefixSymbols.length).join(' '))).join(' | ')}`)
    }

    // Agregar producciones que no fueron factorizadas
    for (const prod of prods) {
      if (!handledProds.has(prod)) {
        transformed.push(prod)
      }
    }

    processed.add(nt)
  }

  return { transformed, newProductions, details }
}

/**
 * Transformar gramática de string a LL(1)
 */
export function transformToLL1(grammarStr: string): TransformationResult {
  const steps: TransformationStep[] = []

  try {
    // Paso 1: Parsear y detectar recursión izquierda
    const parsed = parseGrammar(grammarStr)
    // Remover símbolo aumentado para la transformación
    const productions = parsed.productions.filter((p) => !p.head.endsWith("'"))
    const nonTerminals = new Set(parsed.nonTerminals)
    for (const nt of Array.from(nonTerminals)) {
      if (nt.endsWith("'")) nonTerminals.delete(nt)
    }

    const leftRecursive = detectDirectLeftRecursion(productions)
    const leftRecursiveProds = Array.from(leftRecursive.values()).flat()

    steps.push({
      name: 'Paso 1: Detección de Recursión Izquierda',
      description: `Se detectó recursión izquierda directa en ${leftRecursive.size} no terminal(es)`,
      details: leftRecursive.size > 0
        ? Array.from(leftRecursive.keys()).map((nt) => `${nt} → ${nt} ...`)
        : ['✓ Sin recursión izquierda directa'],
    })

    let afterElimination = productions

    if (leftRecursive.size > 0) {
      // Paso 2: Eliminar recursión izquierda
      const { transformed, newProductions, details } = eliminateDirectLeftRecursion(
        productions,
        nonTerminals
      )
      afterElimination = [...transformed, ...newProductions]

      steps.push({
        name: 'Paso 2: Eliminación de Recursión Izquierda',
        description: 'Se aplicó el algoritmo estándar de eliminación',
        details,
      })
    } else {
      steps.push({
        name: 'Paso 2: Eliminación de Recursión Izquierda',
        description: 'No es necesaria eliminación',
        details: ['La gramática no tiene recursión izquierda directa'],
      })
    }

    // Paso 3: Detectar prefijos comunes
    const commonPrefixes = detectCommonPrefixes(afterElimination)
    const hasCommonPrefixes = commonPrefixes.size > 0

    const prefixDetails: string[] = []
    for (const { prefix, productions: prods } of commonPrefixes.values()) {
      prefixDetails.push(
        `Prefijo común: "${prefix}" en ${prods.length} producciones`
      )
    }

    steps.push({
      name: 'Paso 3: Detección de Prefijos Comunes',
      description: hasCommonPrefixes
        ? `Se detectaron ${commonPrefixes.size} prefijo(s) común(es)`
        : 'Sin prefijos comunes detectados',
      details: prefixDetails.length > 0 ? prefixDetails : ['✓ Sin factorización necesaria'],
    })

    // Paso 4: Aplicar factorización izquierda si es necesaria
    let afterFactoring = afterElimination
    if (hasCommonPrefixes) {
      const { transformed, newProductions, details } = applyLeftFactoring(afterElimination, nonTerminals)
      afterFactoring = [...transformed, ...newProductions]

      steps.push({
        name: 'Paso 4: Factorización Izquierda',
        description: 'Se aplicó factorización izquierda a prefijos comunes',
        details,
      })
    } else {
      steps.push({
        name: 'Paso 4: Factorización Izquierda',
        description: 'No es necesaria factorización',
        details: ['Sin prefijos comunes para factorizar'],
      })
    }

    // Paso 5: Verificar LL(1) final
    const firstSets = calculateFirstSets(afterFactoring, nonTerminals)
    const followSets = calculateFollowSets(
      afterFactoring,
      nonTerminals,
      parsed.startSymbol,
      firstSets
    )
    const { valid, conflicts } = isLL1Grammar(
      afterFactoring,
      firstSets,
      followSets
    )

    if (valid) {
      steps.push({
        name: 'Paso 5: Verificación LL(1) Final',
        description: '✓ La gramática transformada es LL(1)',
        details: ['Sin conflictos FIRST/FOLLOW'],
      })

      return {
        success: true,
        isLL1: true,
        originalGrammar: productions,
        transformedGrammar: afterFactoring,
        steps,
        leftRecursiveProductions: leftRecursiveProds,
        newProductions: afterFactoring.filter((p) => !productions.includes(p)),
      }
    } else {
      steps.push({
        name: 'Paso 5: Verificación LL(1) Final',
        description: '⚠ La gramática aún tiene conflictos',
        details: conflicts,
      })

      return {
        success: true,
        isLL1: false,
        originalGrammar: productions,
        transformedGrammar: afterFactoring,
        steps,
        leftRecursiveProductions: leftRecursiveProds,
        newProductions: afterFactoring.filter((p) => !productions.includes(p)),
        conflicts,
      }
    }
  } catch (err) {
    steps.push({
      name: 'Error',
      description: 'Error parseando la gramática',
      details: [String(err)],
    })

    return {
      success: false,
      isLL1: false,
      originalGrammar: [],
      transformedGrammar: [],
      steps,
      leftRecursiveProductions: [],
      newProductions: [],
    }
  }
}

/**
 * Convertir producciones de vuelta a string
 */
export function productionsToString(productions: Production[]): string {
  const groups = new Map<string, string[]>()

  for (const prod of productions) {
    if (!groups.has(prod.head)) {
      groups.set(prod.head, [])
    }
    groups.get(prod.head)!.push(prod.body.join(' '))
  }

  const lines: string[] = []
  for (const [head, bodies] of groups) {
    lines.push(`${head} → ${bodies.join(' | ')}`)
  }

  return lines.join('\n')
}
