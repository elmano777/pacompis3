import { useState } from 'react'
import { useAppStore } from '../../store/parserStore'
import { transformToLL1, productionsToString, type TransformationResult, type ConflictReport } from '../../utils/ll1Transformer'

interface LL1TransformerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LL1TransformerModal({ isOpen, onClose }: LL1TransformerModalProps) {
  const { grammar, setGrammar } = useAppStore()
  const [result, setResult] = useState<TransformationResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleTransform = async () => {
    setIsLoading(true)
    try {
      const res = await new Promise<TransformationResult>((resolve) => {
        setTimeout(() => {
          resolve(transformToLL1(grammar))
        }, 100)
      })
      setResult(res)
      setCurrentStep(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadGrammar = () => {
    if (!result) return
    const newGrammar = productionsToString(result.transformedGrammar)
    setGrammar(newGrammar)
    onClose()
  }

  const handleReset = () => {
    setResult(null)
    setCurrentStep(0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-surface border border-border-base rounded-lg w-11/12 max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-dim sticky top-0 bg-bg-surface">
          <h2 className="text-sm font-semibold text-text-primary">Transformar a LL(1)</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!result ? (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">
                Se analizará la gramática para detectar y eliminar recursión izquierda directa
              </p>
              <button
                onClick={handleTransform}
                disabled={isLoading}
                className="bg-accent-green text-black text-sm font-bold px-4 py-2 rounded disabled:opacity-50"
              >
                {isLoading ? '⟳ Analizando...' : 'Iniciar Transformación'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Steps navigation */}
              <div className="flex gap-2 flex-wrap">
                {result.steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={[
                      'px-3 py-1.5 rounded text-xs font-mono',
                      currentStep === idx
                        ? 'bg-accent-cyan text-black font-bold'
                        : 'bg-bg-raised border border-border-base text-text-secondary hover:border-accent-cyan',
                    ].join(' ')}
                  >
                    Paso {idx + 1}
                  </button>
                ))}
              </div>

              {/* Current step details */}
              {result.steps[currentStep] && (
                <div className="bg-bg-raised rounded p-4 border border-border-dim">
                  <h3 className="font-semibold text-text-primary mb-1 text-sm">
                    {result.steps[currentStep].name}
                  </h3>
                  <p className="text-xs text-text-secondary mb-3">
                    {result.steps[currentStep].description}
                  </p>
                  <ul className="space-y-1 text-xs font-mono">
                    {result.steps[currentStep].details.map((detail, i) => (
                      <li key={i} className={getDetailColor(detail)}>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resultado LL(1) */}
              {result.isLL1 ? (
                <div className="bg-accent-green/10 border border-accent-green/30 rounded p-3">
                  <p className="text-xs text-accent-green font-semibold">
                    ✓ La gramática transformada es LL(1)
                  </p>
                </div>
              ) : result.conflictReport ? (
                <div className="bg-accent-orange/10 border border-accent-orange/30 rounded p-3">
                  <p className="text-xs text-accent-orange font-semibold mb-2">
                    ⚠ La gramática aún tiene conflictos
                  </p>
                  <pre className="text-xs text-accent-orange whitespace-pre-wrap break-words font-mono">
                    {result.conflictReport.formattedMessage}
                  </pre>
                </div>
              ) : null}

              {/* Original vs Transformed */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-raised rounded p-3 border border-border-dim">
                  <p className="text-[10px] text-text-muted uppercase mb-2 font-semibold">
                    Producciones Originales
                  </p>
                  <pre className="text-[10px] text-text-secondary overflow-auto max-h-32">
                    {productionsToString(result.originalGrammar)}
                  </pre>
                </div>
                <div className="bg-bg-raised rounded p-3 border border-border-dim">
                  <p className="text-[10px] text-text-muted uppercase mb-2 font-semibold">
                    Producciones Transformadas
                  </p>
                  <pre className="text-[10px] text-text-secondary overflow-auto max-h-32">
                    {productionsToString(result.transformedGrammar)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-dim bg-bg-raised">
          <button
            onClick={result ? handleReset : onClose}
            className="px-3 py-1.5 rounded border border-border-base text-xs text-text-secondary hover:text-text-primary"
          >
            {result ? 'Nueva transformación' : 'Cancelar'}
          </button>

          {result && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-3 py-1.5 bg-bg-base border border-border-base rounded text-xs disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1))}
                disabled={currentStep === result.steps.length - 1}
                className="px-3 py-1.5 bg-bg-base border border-border-base rounded text-xs disabled:opacity-50"
              >
                Siguiente →
              </button>
              <button
                onClick={handleLoadGrammar}
                className="px-3 py-1.5 bg-accent-green text-black rounded text-xs font-bold hover:opacity-85"
              >
                Cargar Gramática
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getDetailColor(detail: string): string {
  if (detail.startsWith('✓')) return 'text-accent-green'
  if (detail.startsWith('⚠')) return 'text-accent-orange'
  if (detail.includes('→')) return 'text-accent-cyan'
  return 'text-text-secondary'
}
