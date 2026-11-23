import { Link } from 'react-router'
import { useT } from '../i18n'

export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/assets/pencilloop-icon-192.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={`shrink-0 rounded-[22%] ${className}`}
      draggable={false}
    />
  )
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  const t = useT()
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-xl" aria-label={t.brand.home}>
      <LogoMark size={compact ? 34 : 40} />
      <span className={`font-display font-black tracking-tight ${compact ? 'text-xl' : 'text-[22px]'}`}>
        <span className="text-primary">Pencil</span>
        <span className="text-orange-600">Loop</span>
      </span>
    </Link>
  )
}
