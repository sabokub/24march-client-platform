'use client'

import { useState } from 'react'
import { saveBrief, submitBrief } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Send, Check } from 'lucide-react'
import { toast } from 'sonner'

const BRIEF_QUESTIONS = [
  {
    id: 'current_situation',
    question: "Décrivez l'état actuel de votre pièce",
    type: 'textarea',
    placeholder: 'Ex: La pièce fait 25m², avec un parquet chêne, murs blancs...',
  },
  {
    id: 'main_objective',
    question: 'Quel est votre objectif principal ?',
    type: 'radio',
    options: [
      'Refonte complète',
      'Rafraîchissement (garder certains meubles)',
      'Aménagement d\'un espace vide',
      'Optimisation de l\'espace',
    ],
  },
  {
    id: 'must_keep',
    question: 'Y a-t-il des éléments à conserver absolument ?',
    type: 'textarea',
    placeholder: 'Ex: Le canapé gris, la bibliothèque...',
  },
  {
    id: 'colors_preference',
    question: 'Quelles couleurs souhaitez-vous ?',
    type: 'textarea',
    placeholder: 'Ex: Tons neutres avec touches de vert, pas de rouge...',
  },
  {
    id: 'lifestyle',
    question: 'Comment utilisez-vous cette pièce ?',
    type: 'checkbox',
    options: [
      'Télétravail',
      'Réceptions/invités',
      'Détente/lecture',
      'Repas en famille',
      'Jeux avec enfants',
      'Activités créatives',
    ],
  },
  {
    id: 'storage_needs',
    question: 'Avez-vous des besoins de rangement spécifiques ?',
    type: 'textarea',
    placeholder: 'Ex: Beaucoup de livres, espace de rangement pour jouets...',
  },
  {
    id: 'inspiration',
    question: 'Avez-vous des inspirations ou exemples à partager ?',
    type: 'textarea',
    placeholder: 'Ex: J\'aime le style de X, j\'ai vu une photo sur Pinterest...',
  },
  {
    id: 'constraints',
    question: 'Y a-t-il des contraintes particulières ?',
    type: 'textarea',
    placeholder: 'Ex: Locataire (pas de travaux), animaux, allergies...',
  },
  {
    id: 'timeline',
    question: 'Quel est votre délai souhaité ?',
    type: 'radio',
    options: [
      'Pas de rush, prenez votre temps',
      'Dans le mois',
      'D\'ici 2-3 mois',
      'Urgence (moins de 2 semaines)',
    ],
  },
  {
    id: 'additional_notes',
    question: 'Autre chose à ajouter ?',
    type: 'textarea',
    placeholder: 'Toute information supplémentaire...',
  },
]

interface ProjectBriefFormProps {
  projectId: string
  initialData: Record<string, any>
  projectStatus: string
}

export function ProjectBriefForm({ projectId, initialData, projectStatus }: ProjectBriefFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSubmitted = projectStatus !== 'draft'

  const handleChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || []
      return {
        ...prev,
        [questionId]: checked
          ? [...current, option]
          : current.filter((o: string) => o !== option)
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('answers', JSON.stringify(answers))
    
    const result = await saveBrief(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Brief sauvegardé')
    }
    setIsSaving(false)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('answers', JSON.stringify(answers))
    
    const result = await submitBrief(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Brief soumis ! Notre équipe va l\'analyser.')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-8">
      {isSubmitted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800">Votre brief a été soumis. Notre équipe l'analyse.</p>
        </div>
      )}

      {BRIEF_QUESTIONS.map((q, index) => (
        <div key={q.id} className="space-y-3">
          <Label className="text-base font-medium">
            {index + 1}. {q.question}
          </Label>
          
          {q.type === 'textarea' && (
            <Textarea
              placeholder={q.placeholder}
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
              disabled={isSubmitted}
              rows={3}
            />
          )}
          
          {q.type === 'radio' && (
            <RadioGroup
              value={answers[q.id] || ''}
              onValueChange={(value: string) => handleChange(q.id, value)}
              disabled={isSubmitted}
            >
              {q.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                  <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
          
          {q.type === 'checkbox' && (
            <div className="grid grid-cols-2 gap-3">
              {q.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${q.id}-${option}`}
                    checked={(answers[q.id] || []).includes(option)}
                    onCheckedChange={(checked: boolean | 'indeterminate') => 
                      handleCheckboxChange(q.id, option, checked as boolean)
                    }
                    disabled={isSubmitted}
                  />
                  <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {!isSubmitted && (
        <div className="flex gap-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Envoi...' : 'Soumettre le brief'}
          </Button>
        </div>
      )}
    </div>
  )
}
