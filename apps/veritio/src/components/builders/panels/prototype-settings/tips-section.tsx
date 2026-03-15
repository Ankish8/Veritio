'use client'

export function TipsSection() {
  const tips = [
    'Re-sync after making changes in Figma',
    'Set a starting frame in your prototype',
    'Use a "Present" mode link for interactivity',
  ]

  return (
    <section className="p-4">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3">
        Tips for best results
      </h3>
      <ul className="space-y-2.5 text-[13px] text-muted-foreground">
        {tips.map((tip, index) => (
          <li key={index} className="flex gap-2.5">
            <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
