// Shows `text` with every occurrence of `query` marked in yellow.
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  // Escape regex symbols in what the user typed, then split around matches.
  const pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return (
    <>
      {text.split(pattern).map((part, index) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={index} className="rounded bg-amber-200/80 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
