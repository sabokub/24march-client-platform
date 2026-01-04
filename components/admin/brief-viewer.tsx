interface BriefViewerProps {
  answers: Record<string, any>
}

const QUESTION_LABELS: Record<string, string> = {
  current_situation: 'État actuel de la pièce',
  main_objective: 'Objectif principal',
  must_keep: 'Éléments à conserver',
  colors_preference: 'Préférences de couleurs',
  lifestyle: 'Utilisation de la pièce',
  storage_needs: 'Besoins de rangement',
  inspiration: 'Inspirations',
  constraints: 'Contraintes',
  timeline: 'Délai souhaité',
  additional_notes: 'Notes additionnelles',
}

export function BriefViewer({ answers }: BriefViewerProps) {
  const hasAnswers = Object.keys(answers).length > 0

  if (!hasAnswers) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="font-medium">Le client n'a pas encore rempli le brief</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(answers).map(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null
        
        return (
          <div key={key} className="border-b pb-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {QUESTION_LABELS[key] || key}
            </h4>
            {Array.isArray(value) ? (
              <div className="flex flex-wrap gap-2">
                {value.map((v: string) => (
                  <span key={v} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                    {v}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">{value}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
