'use client'

const categoryColor: Record<string, string> = {
  'Descartáveis':            'bg-blue-100 text-blue-500',
  'Material Clínico':        'bg-green-100 text-green-500',
  'Materiais Odontológicos': 'bg-purple-100 text-purple-500',
  'Assepsia':                'bg-amber-100 text-amber-500',
}

const categoryIcon: Record<string, string> = {
  'Descartáveis':            '🧤',
  'Material Clínico':        '🩺',
  'Materiais Odontológicos': '🦷',
  'Assepsia':                '🧴',
}

type Props = {
  imageUrl?: string | null
  name: string
  category?: string | null
  className?: string
}

export function ProductImage({ imageUrl, name, category, className = 'h-40 w-full' }: Props) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${className} object-cover rounded-t-lg`}
      />
    )
  }

  const color = categoryColor[category ?? ''] ?? 'bg-slate-100 text-slate-400'
  const icon = categoryIcon[category ?? ''] ?? '📦'

  return (
    <div className={`${className} ${color} flex flex-col items-center justify-center rounded-t-lg gap-1`}>
      <span className="text-4xl">{icon}</span>
      <span className="text-xs font-medium opacity-60 px-2 text-center line-clamp-1">{category ?? 'Produto'}</span>
    </div>
  )
}
