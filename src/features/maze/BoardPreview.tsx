import { useElementSize } from '../game/useElementSize'
import { MazeBoard } from './MazeBoard'
import { idleFrame } from './missionText'
import type { Mission } from './types'

/** A static board preview that fills its container width (never overflows). */
export function BoardPreview({ mission, max = 340, className = '' }: { mission: Mission; max?: number; className?: string }) {
  const [ref, box] = useElementSize<HTMLDivElement>()
  const size = Math.min(max, Math.floor(box.width))
  return (
    <div ref={ref} className={`grid w-full place-items-center ${className}`} style={{ minHeight: size > 0 ? size : undefined }}>
      {size > 40 && <MazeBoard mission={mission} frame={idleFrame(mission)} size={size} reduced speed={1} showGoalPulse={false} />}
    </div>
  )
}
