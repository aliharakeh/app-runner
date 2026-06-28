export function reorderItemsById<TItem extends { id: number }>(
  items: Array<TItem>,
  draggedId: number,
  targetId: number
) {
  const draggedIndex = items.findIndex((item) => item.id === draggedId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (
    draggedIndex === -1 ||
    targetIndex === -1 ||
    draggedIndex === targetIndex
  ) {
    return items
  }

  const nextItems = [...items]
  const [draggedItem] = nextItems.splice(draggedIndex, 1)

  nextItems.splice(targetIndex, 0, draggedItem)

  return nextItems
}
