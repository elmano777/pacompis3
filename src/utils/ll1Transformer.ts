import type { Production } from '../parsers/grammar'
import { parseGrammar } from '../parsers/grammar'

export interface TransformationStep {
  name: string
  description: string
  details: string[]
}

export interface FirstFirstConflict {
  nonTerminal: string
  terminal: string
  production1: Production
  production2: Production
  prodIndex1: number
  prodIndex2: number
}

export interface FirstFollowConflict {
  nonTerminal: string
  terminal: string
  production: Production
  prodIndex: number
  epsilonIndices: number[]
  followSet: Set<string>
}

export interface ConflictReport {
  valid: boolean
  firstFirstConflicts: FirstFirstConflict[]
  firstFollowConflicts: FirstFollowConflict[]
  formattedMessage: string
}

export interface TransformationResult {
  success: boolean
  isLL1: boolean
  originalGrammar: Production[]
  transformedGrammar: Production[]
  steps: TransformationStep[]
  leftRecursiveProductions: Production[]
  newProductions: Production[]
  conflictReport?: ConflictReport
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
 * Verificar si la gramática es LL(1) con reporte estructurado
 * Retorna conflictos organizados por tipo (FIRST/FIRST y FIRST/FOLLOW)
 */
function isLL1Grammar(
  productions: Production[],
  firstSets: Map<string, Set<string>>,
  followSets: Map<string, Set<string>>
): ConflictReport {
  const firstFirstConflicts: FirstFirstConflict[] = []
  const firstFollowConflicts: FirstFollowConflict[] = []

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
    if (prods.length < 2) continue // Un solo símbolo, sin conflictos posibles

    const firsts: Map<number, Set<string>> = new Map()
    const hasEpsilon: boolean[] = new Array(prods.length)
    const epsIndices: number[] = []

    // Calcular FIRST para cada producción
    for (let i = 0; i < prods.length; i++) {
      const prod = prods[i]
      const first = calculateFirst(prod.body, firstSets)
      firsts.set(i, first)
      hasEpsilon[i] = first.has('ε')
      if (hasEpsilon[i]) {
        epsIndices.push(i)
      }
    }

    const follow = followSets.get(nt) || new Set()

    // ───────────────────────────────────────────────────────────────
    // Verificación 1: FIRST/FIRST
    // Para todo i ≠ j: FIRST(αi) ∩ FIRST(αj) = ∅ (sin contar ε)
    // ───────────────────────────────────────────────────────────────
    const reportedFF = new Set<string>() // Para evitar reportes duplicados
    
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const fi = firsts.get(i)!
        const fj = firsts.get(j)!

        // Construir conjuntos sin epsilon para FIRST/FIRST
        const fiNoEps = new Set([...fi].filter(t => t !== 'ε'))
        const fjNoEps = new Set([...fj].filter(t => t !== 'ε'))

        // Buscar intersección FIRST/FIRST
        for (const term of fiNoEps) {
          if (fjNoEps.has(term)) {
            const key = `FF:${nt}:${term}:${i}:${j}`
            if (!reportedFF.has(key)) {
              reportedFF.add(key)
              firstFirstConflicts.push({
                nonTerminal: nt,
                terminal: term,
                production1: prods[i],
                production2: prods[j],
                prodIndex1: i,
                prodIndex2: j,
              })
            }
          }
        }
      }
    }

    // ───────────────────────────────────────────────────────────────
    // Verificación 2: FIRST/FOLLOW
    // Si ε ∈ FIRST(αi) para algún i:
    //   Para cada j ≠ i: FIRST(αj) ∩ FOLLOW(A) = ∅
    // ───────────────────────────────────────────────────────────────
    if (epsIndices.length > 0) {
      // Hay al menos una ε-producción
      // Para cada producción NO-epsilon, verificar conflicto con FOLLOW
      const reportedFFoll = new Set<string>()
      
      for (let i = 0; i < prods.length; i++) {
        if (hasEpsilon[i]) continue // Saltear la producción ε

        const fi = firsts.get(i)!
        const fiNoEps = new Set([...fi].filter(t => t !== 'ε'))

        // Verificar que FIRST(αi) ∩ FOLLOW(nt) = ∅
        for (const term of fiNoEps) {
          if (follow.has(term)) {
            const key = `FFoll:${nt}:${term}:${i}`
            if (!reportedFFoll.has(key)) {
              reportedFFoll.add(key)
              firstFollowConflicts.push({
                nonTerminal: nt,
                terminal: term,
                production: prods[i],
                prodIndex: i,
                epsilonIndices: epsIndices,
                followSet: follow,
              })
            }
          }
        }
      }
    }
  }

  const valid = firstFirstConflicts.length === 0 && firstFollowConflicts.length === 0
  const formattedMessage = formatConflictReport(firstFirstConflicts, firstFollowConflicts)

  return { valid, firstFirstConflicts, firstFollowConflicts, formattedMessage }
}

/**
 * Formatear el reporte de conflictos de forma pedagógica y clara
 */
export function formatConflictReport(
  firstFirstConflicts: FirstFirstConflict[],
  firstFollowConflicts: FirstFollowConflict[]
): string {
  if (firstFirstConflicts.length === 0 && firstFollowConflicts.length === 0) {
    return '✓ La gramática ES LL(1)'
  }

  const lines: string[] = []
  lines.push('⚠ La gramática NO es LL(1)\n')

  // Agrupar conflictos FIRST/FIRST por no terminal
  if (firstFirstConflicts.length > 0) {
    const grouped = new Map<string, FirstFirstConflict[]>()
    for (const conflict of firstFirstConflicts) {
      if (!grouped.has(conflict.nonTerminal)) {
        grouped.set(conflict.nonTerminal, [])
      }
      grouped.get(conflict.nonTerminal)!.push(conflict)
    }

    lines.push('Conflictos FIRST/FIRST:')
    for (const [nt, conflicts] of grouped) {
      lines.push(`\nEn ${nt}:`)
      
      // Eliminar duplicados por terminal (múltiples pares pueden compartir mismo terminal)
      const byTerminal = new Map<string, FirstFirstConflict[]>()
      for (const conf of conflicts) {
        if (!byTerminal.has(conf.terminal)) {
          byTerminal.set(conf.terminal, [])
        }
        byTerminal.get(conf.terminal)!.push(conf)
      }

      for (const [term, confs] of byTerminal) {
        // Mostrar todas las producciones que comparten este terminal
        const prodStrings = new Set<string>()
        for (const conf of confs) {
          prodStrings.add(`${conf.nonTerminal} → ${conf.production1.body.join(' ')}`)
          prodStrings.add(`${conf.nonTerminal} → ${conf.production2.body.join(' ')}`)
        }
        
        const prods = Array.from(prodStrings).sort()
        lines.push(`  • Comparten terminal "${term}":`)
        for (const prod of prods) {
          lines.push(`      ${prod}`)
        }
      }
    }
    lines.push('')
  }

  // Agrupar conflictos FIRST/FOLLOW por no terminal
  if (firstFollowConflicts.length > 0) {
    const grouped = new Map<string, FirstFollowConflict[]>()
    for (const conflict of firstFollowConflicts) {
      if (!grouped.has(conflict.nonTerminal)) {
        grouped.set(conflict.nonTerminal, [])
      }
      grouped.get(conflict.nonTerminal)!.push(conflict)
    }

    lines.push('Conflictos FIRST/FOLLOW:')
    for (const [nt, conflicts] of grouped) {
      lines.push(`\nEn ${nt}:`)
      lines.push(`  • La ε-producción entra en conflicto con:`)
      
      // Agrupar por terminal para evitar redundancia
      const byTerminal = new Map<string, Production[]>()
      for (const conf of conflicts) {
        if (!byTerminal.has(conf.terminal)) {
          byTerminal.set(conf.terminal, [])
        }
        byTerminal.get(conf.terminal)!.push(conf.production)
      }

      for (const [term, prods] of byTerminal) {
        const prodSet = new Set(prods.map(p => `${p.head} → ${p.body.join(' ')}`))
        for (const prod of prodSet) {
          lines.push(`      ${prod}  (token: ${term})`)
        }
      }

      // Mostrar FOLLOW(nt) una sola vez
      const followArray = Array.from(conflicts[0]!.followSet).sort()
      lines.push(`\n  Porque: FOLLOW(${nt}) = { ${followArray.join(', ')} }`)
    }
  }

  return lines.join('\n')
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
 * Aplicar factorización izquierda conservadora y controlada.
 * 
 * Algoritmo:
 * 1. Agrupar producciones por no-terminal
 * 2. Para cada grupo, encontrar el prefijo común más largo entre TODOS
 * 3. Si hay prefijo, factorizar solo ese prefijo (sin expansión)
 * 4. Iterar hasta que la gramática no cambie (máx 10 iteraciones)
 * 5. Deduplicar al final
 */
function applyLeftFactoring(
  productions: Production[],
  nonTerminals: Set<string>
): { transformed: Production[]; newProductions: Production[]; details: string[] } {
  const allDetails: string[] = []
  let current = productions
  let iteration = 0
  const maxIterations = 10

  // Crear conjunto de producciones originales por valor (head|body)
  const originalKeys = new Set<string>()
  for (const prod of productions) {
    originalKeys.add(`${prod.head}|${prod.body.join(' ')}`)
  }

  while (iteration < maxIterations) {
    const { transformed, newProds, details, changed } = factorizePass(current, nonTerminals)

    if (!changed) break
    
    allDetails.push(...details)
    current = deduplicate([...transformed, ...newProds])
    iteration++
  }

  // Producciones nuevas: aquellas que no estaban en el conjunto original
  const allNewProds = current.filter(p => {
    const key = `${p.head}|${p.body.join(' ')}`
    return !originalKeys.has(key)
  })

  return {
    transformed: current,
    newProductions: allNewProds,
    details: allDetails.length > 0 ? allDetails : ['✓ Sin prefijos comunes para factorizar'],
  }
}

/**
 * Deduplicar producciones idénticas
 */
function deduplicate(productions: Production[]): Production[] {
  const seen = new Set<string>()
  const result: Production[] = []

  for (const prod of productions) {
    const key = `${prod.head}|${prod.body.join(' ')}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(prod)
    }
  }

  return result
}

/**
 * Una pasada de factorización: buscar prefijos comunes y factorizar
 * 
 * Estrategia: Agrupar producciones por su primer símbolo.
 * Si múltiples producciones comparten el primer símbolo, factorizar ese prefijo.
 */
function factorizePass(
  productions: Production[],
  nonTerminals: Set<string>
): {
  transformed: Production[]
  newProds: Production[]
  details: string[]
  changed: boolean
} {
  const transformed: Production[] = []
  const newProds: Production[] = []
  const details: string[] = []

  // Agrupar por no-terminal
  const prodsMap = new Map<string, Production[]>()
  for (const prod of productions) {
    if (!prodsMap.has(prod.head)) {
      prodsMap.set(prod.head, [])
    }
    prodsMap.get(prod.head)!.push(prod)
  }

  let changed = false

  // Para cada no-terminal
  for (const [nt, prods] of prodsMap) {
    if (prods.length < 2) {
      // Sin alternativas, no hay prefijo común
      transformed.push(...prods)
      continue
    }

    // Agrupar por primer símbolo
    const firstSymbolGroups = new Map<string, Production[]>()
    for (const prod of prods) {
      if (prod.body.length === 0) {
        if (!firstSymbolGroups.has('ε')) {
          firstSymbolGroups.set('ε', [])
        }
        firstSymbolGroups.get('ε')!.push(prod)
      } else {
        const firstSym = prod.body[0]
        if (!firstSymbolGroups.has(firstSym)) {
          firstSymbolGroups.set(firstSym, [])
        }
        firstSymbolGroups.get(firstSym)!.push(prod)
      }
    }

    // Procesar grupos: si alguno tiene 2+ elementos, factorizar TODO
    let primeCounter = 1
    let hasFactorization = false

    // Primero, detectar si hay factorización necesaria
    for (const group of firstSymbolGroups.values()) {
      if (group.length >= 2) {
        hasFactorization = true
        break
      }
    }

    if (!hasFactorization) {
      // Ningún grupo con 2+ elementos: mantener producciones originales
      transformed.push(...prods)
      continue
    }

    // Hay factorización: procesar cada grupo
    changed = true
    for (const [firstSym, group] of firstSymbolGroups) {
      if (group.length < 2) {
        // Producción singular: mantener tal cual
        transformed.push(...group)
        continue
      }

      // Grupo con 2+ producciones: factorizar
      // Encontrar prefijo común más largo en este grupo
      let longestPrefix: string[] = [firstSym]

      for (let prefixLen = 1; prefixLen < Math.min(...group.map(p => p.body.length)); prefixLen++) {
        const candidate = group[0].body.slice(0, prefixLen + 1)
        if (group.every(p =>
          p.body.length > prefixLen &&
          p.body.slice(0, prefixLen + 1).every((sym, i) => sym === candidate[i])
        )) {
          longestPrefix = candidate
        } else {
          break
        }
      }

      // Crear nuevo símbolo con sufijo único
      const prime = nt + (primeCounter === 1 ? "'" : primeCounter.toString())
      primeCounter++
      nonTerminals.add(prime)

      // A → prefijo A'
      transformed.push({ head: nt, body: [...longestPrefix, prime] })

      // A' → suffix1 | suffix2 | ...
      for (const prod of group) {
        const suffix = prod.body.slice(longestPrefix.length)
        newProds.push({ head: prime, body: suffix.length === 0 ? ['ε'] : suffix })
      }

      details.push(`${nt}: ${group.length} producciones con primer símbolo "${firstSym}"`)
      details.push(`  → ${nt} → ${longestPrefix.join(' ')} ${prime}`)
      details.push(
        `  → ${prime} → ${group.map(p => {
          const suf = p.body.slice(longestPrefix.length)
          return suf.length === 0 ? 'ε' : suf.join(' ')
        }).join(' | ')}`
      )
    }
  }

  return { transformed, newProds, details, changed }
}

/**
 * Expandir no-terminales "unitarios" dentro de los cuerpos de producciones.
 *
 * Un no-terminal N es unitario si tiene UNA SOLA producción cuyo cuerpo
 * son únicamente terminales (ej. E → e, F → e).
 * Si aparece en el cuerpo de otra producción, se sustituye directamente
 * por su cuerpo terminal, permitiendo detectar nuevos prefijos comunes.
 *
 * Ejemplo:
 *   S1 → E a | F b,  E → e,  F → e
 *   => S1 → e a | e b   (ahora factorizable)
 *
 * Solo se expanden los NT unitarios terminales para evitar explosión de reglas.
 */
function expandUnitNonTerminals(
  productions: Production[],
  nonTerminals: Set<string>
): { transformed: Production[]; details: string[]; changed: boolean } {
  const details: string[] = []

  // Encontrar NT unitarios terminales: exactamente una producción, cuerpo de puro terminales
  const unitMap = new Map<string, string[]>() // NT -> cuerpo terminal
  const prodsPerNT = new Map<string, Production[]>()
  for (const prod of productions) {
    if (!prodsPerNT.has(prod.head)) prodsPerNT.set(prod.head, [])
    prodsPerNT.get(prod.head)!.push(prod)
  }
  for (const [nt, prods] of prodsPerNT) {
    if (prods.length === 1) {
      const body = prods[0].body
      const allTerminal = body.every(sym => sym === 'ε' || !nonTerminals.has(sym))
      if (allTerminal) {
        unitMap.set(nt, body)
      }
    }
  }

  if (unitMap.size === 0) {
    return { transformed: productions, details: ['✓ Sin no-terminales unitarios para expandir'], changed: false }
  }

  // Sustituir apariciones en cuerpos de otras producciones
  let changed = false
  const transformed: Production[] = productions.map(prod => {
    const newBody: string[] = []
    let prodChanged = false
    for (const sym of prod.body) {
      if (unitMap.has(sym)) {
        newBody.push(...unitMap.get(sym)!)
        prodChanged = true
      } else {
        newBody.push(sym)
      }
    }
    if (prodChanged) {
      changed = true
      details.push(`${prod.head} → ${prod.body.join(' ')}  ⟹  ${prod.head} → ${newBody.join(' ')}`)
    }
    return prodChanged ? { head: prod.head, body: newBody } : prod
  })

  if (changed) {
    details.unshift(`No-terminales unitarios expandidos: ${[...unitMap.keys()].map(k => `${k}→${unitMap.get(k)!.join(' ')}`).join(', ')}`)
  }

  return { transformed, details, changed }
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
    let factoringDetails: string[] = []
    if (hasCommonPrefixes) {
      const { transformed, newProductions, details } = applyLeftFactoring(afterElimination, nonTerminals)
      afterFactoring = transformed

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

    // Paso 4.5: Expandir no-terminales unitarios y re-factorizar si hay nuevos prefijos
    let afterExpansion = afterFactoring
    {
      const expansionDetails: string[] = []
      let anyExpansion = false
      let maxRounds = 5

      while (maxRounds-- > 0) {
        const { transformed, details, changed } = expandUnitNonTerminals(afterExpansion, nonTerminals)
        if (!changed) break
        anyExpansion = true
        expansionDetails.push(...details)
        // Re-factorizar sobre la gramática expandida
        const { transformed: refactored, details: refactorDetails } = applyLeftFactoring(transformed, nonTerminals)
        expansionDetails.push(...refactorDetails)
        afterExpansion = refactored
      }

      if (anyExpansion) {
        steps.push({
          name: 'Paso 4.5: Expansión y Re-factorización',
          description: 'Se expandieron no-terminales unitarios y se re-factorizó',
          details: expansionDetails,
        })
      }
      afterFactoring = afterExpansion
    }

    // Paso 5: Verificar LL(1) final
    const firstSets = calculateFirstSets(afterFactoring, nonTerminals)
    const followSets = calculateFollowSets(
      afterFactoring,
      nonTerminals,
      parsed.startSymbol,
      firstSets
    )
    const conflictReport = isLL1Grammar(
      afterFactoring,
      firstSets,
      followSets
    )

    if (conflictReport.valid) {
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
        details: [conflictReport.formattedMessage],
      })

      return {
        success: true,
        isLL1: false,
        originalGrammar: productions,
        transformedGrammar: afterFactoring,
        steps,
        leftRecursiveProductions: leftRecursiveProds,
        newProductions: afterFactoring.filter((p) => !productions.includes(p)),
        conflictReport,
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