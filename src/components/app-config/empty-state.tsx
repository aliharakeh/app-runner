export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed p-6 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
