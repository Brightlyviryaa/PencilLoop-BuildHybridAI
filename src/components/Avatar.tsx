/** Friendly initial-in-a-badge avatar. No photos of children are ever used. */
export function Avatar({ name, size = 44, className = '' }: { name: string | undefined; size?: number; className?: string }) {
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || 'P'
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-[32%] bg-gradient-to-br from-primary to-[#4f86ff] font-display font-black text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      aria-hidden
    >
      {initial}
      <span className="absolute -bottom-1 -right-1 h-[38%] w-[38%] rounded-full border-2 border-white bg-orange" />
    </span>
  )
}
