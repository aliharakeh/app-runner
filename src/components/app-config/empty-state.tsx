export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="app-panel flex min-h-44 flex-col items-center justify-center gap-1 rounded-lg border-dashed p-6 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
