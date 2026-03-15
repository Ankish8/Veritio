import { Newspaper } from "lucide-react"
import updates from "./updates.json"

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  feature: { label: 'New Feature', className: 'bg-primary/10 text-primary' },
  improvement: { label: 'Improvement', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  fix: { label: 'Bug Fix', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
}

export default function UpdatesPage() {
  return (
    <div className="flex flex-1 flex-col items-center p-4 sm:p-6 bg-background overflow-y-auto">
      <div className="w-full max-w-[720px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
            <Newspaper className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">What's New</h1>
            <p className="text-sm text-muted-foreground">Latest updates and improvements to Veritio</p>
          </div>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {updates.map((entry, index) => (
              <div key={index} className="relative pl-14">
                {/* Timeline dot */}
                <div className="absolute left-[13px] top-5 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-border">
                  <div className="h-2 w-2 rounded-full bg-foreground/40" />
                </div>

                <div className="rounded-xl border border-border/60 p-5 transition-colors hover:bg-muted/30">
                  <span className="text-sm text-muted-foreground">{entry.date}</span>

                  <div className={entry.changes.length > 1 ? 'mt-3 space-y-4 divide-y divide-border/40' : 'mt-0'}>
                    {entry.changes.map((change, ci) => {
                      const typeStyle = TYPE_STYLES[change.type]
                      return (
                        <div key={ci} className={ci > 0 ? 'pt-4' : ''}>
                          <div className="flex items-center gap-2 mt-2">
                            <h3 className="text-sm font-semibold text-foreground">{change.title}</h3>
                            {typeStyle && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${typeStyle.className}`}>
                                {typeStyle.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {change.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
