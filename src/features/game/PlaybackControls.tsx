import { Gauge, Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { Button, IconButton } from '../../components/Button'
import { useT } from '../../i18n'
import { runLabel } from './status'
import type { GameRunner } from './useGameRunner'

export function PlaybackControls({ g, size = 'lg' }: { g: GameRunner; size?: 'lg' | 'xl' }) {
  const t = useT()
  const running = g.status === 'running'
  const empty = g.nodes.length === 0
  return (
    <div className="flex items-center gap-2" role="toolbar" aria-label={t.game.controls}>
      <Button
        size={size}
        variant={running ? 'secondary' : 'primary'}
        onClick={running ? g.pause : g.run}
        disabled={empty && !running}
        icon={running ? <Pause size={22} aria-hidden fill="currentColor" /> : <Play size={22} aria-hidden fill="currentColor" />}
        className="min-w-[150px] flex-1 sm:flex-none"
        sound={false}
        data-testid="run-button"
        aria-keyshortcuts="Space"
      >
        {runLabel(g, t)}
      </Button>
      <IconButton label={t.game.step} variant="secondary" size={size} onClick={g.stepOnce} disabled={empty} data-testid="step-button">
        <StepForward size={22} aria-hidden />
      </IconButton>
      <IconButton label={t.game.reset} variant="secondary" size={size} onClick={g.reset} disabled={g.status === 'idle'} data-testid="reset-button">
        <RotateCcw size={22} aria-hidden />
      </IconButton>
      <Button
        variant="ghost"
        size={size}
        onClick={() => g.setSpeed(g.speed === 1 ? 2 : 1)}
        aria-label={t.game.speed(g.speed)}
        icon={<Gauge size={20} aria-hidden />}
        className="hidden sm:inline-flex"
      >
        <span className="tabular">{g.speed}x</span>
      </Button>
    </div>
  )
}
