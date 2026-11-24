import {
  closestCenter,
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronDown, ChevronUp, GripVertical, Minus, Plus, PlusCircle, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { playSfx } from '../../app/hooks'
import { haptic } from '../../app/haptics'
import { useT } from '../../i18n'
import { DUR, EASE_OUT, tweenList } from '../../styles/motion'
import { LIMITS } from '../maze/limits'
import type { TurnDirection } from '../maze/types'
import {
  allIds,
  canMoveTo,
  findNode,
  findParent,
  indexOfNode,
  repeatTargetsFor,
  type DropPosition,
  type EditorNode,
  type ListTarget,
} from './ast'
import { blockAria } from './blockMeta'
import { BlockIcon } from './blocks'

type Patch = Partial<{ steps: number; times: number; direction: TurnDirection }>

export interface PlanEditorProps {
  nodes: EditorNode[]
  activeIds: Set<string>
  failedId: string | null
  /** Where new palette blocks go: null = main plan, or a Repeat id. */
  target: ListTarget
  onTarget: (t: ListTarget) => void
  onPatch: (id: string, p: Patch) => void
  onRemove: (id: string) => void
  onMove: (id: string, to: DropPosition) => void
  onMoveInto: (id: string, repeatId: string) => void
  onMoveOut: (id: string) => void
  onUnwrap: (id: string) => void
  reduced: boolean
  /** "touch" = phone plan editor (bigger blocks), "desk" = desktop panel. */
  density?: 'touch' | 'desk'
  empty?: ReactNode
}

interface DropState {
  pos: DropPosition
  valid: boolean
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function labelsOf(nodes: EditorNode[], prefix = '', out = new Map<string, string>()) {
  nodes.forEach((n, i) => {
    const l = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
    out.set(n.id, l)
    if (n.type === 'repeat') labelsOf(n.commands, l, out)
  })
  return out
}

function listOf(nodes: EditorNode[], list: ListTarget): EditorNode[] {
  if (list === null) return nodes
  const r = findNode(nodes, list)
  return r?.type === 'repeat' ? r.commands : []
}

/** Would dropping here leave the block exactly where it already is? */
function isNoop(nodes: EditorNode[], id: string, pos: DropPosition): boolean {
  const from = findParent(nodes, id)
  if (from !== pos.list) return false
  const i = indexOfNode(nodes, id)
  return pos.index === i || pos.index === i + 1
}

/** Time of the last drag end, so the click that ends a drag does not also select. */
let lastDragEnd = 0

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function PlanEditor(props: PlanEditorProps) {
  const { nodes, onMove, density = 'desk' } = props
  const t = useT()
  const [selected, setSelected] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [drop, setDrop] = useState<DropState | null>(null)
  const dropRef = useRef<DropState | null>(null)
  const subtree = useRef<Set<string>>(new Set())
  const labels = useMemo(() => labelsOf(nodes), [nodes])

  // Mouse: a short move starts a drag, so clicks still select.
  // Touch: hold briefly, so normal swipes keep scrolling the plan.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  // Innermost droppable under the pointer wins (a block inside a Repeat beats the Repeat).
  const collision: CollisionDetection = useCallback((args) => {
    const containers = args.droppableContainers.filter((c) => {
      const owner = String(c.id).split(':')[1]
      return !subtree.current.has(owner)
    })
    const hits = pointerWithin({ ...args, droppableContainers: containers })
    if (hits.length) {
      const area = (id: string | number) => {
        const r = args.droppableRects.get(id)
        return r ? r.width * r.height : Infinity
      }
      return [...hits].sort((a, b) => area(a.id) - area(b.id))
    }
    return closestCenter({ ...args, droppableContainers: containers })
  }, [])

  const resolve = useCallback(
    (overId: string, y: number, rect: { top: number; height: number }): DropPosition | null => {
      const [kind, id] = overId.split(':')
      if (kind === 'end') {
        const list = id === 'root' ? null : id
        return { list, index: listOf(nodes, list).length }
      }
      if (kind === 'into') return { list: id, index: 0 }
      if (kind === 'drop') {
        const parent = findParent(nodes, id)
        if (parent === undefined) return null
        const idx = indexOfNode(nodes, id)
        if (y < rect.top + rect.height / 2) return { list: parent, index: idx }
        const n = findNode(nodes, id)
        if (n?.type === 'repeat') return { list: id, index: 0 }
        return { list: parent, index: idx + 1 }
      }
      return null
    },
    [nodes],
  )

  const setDropState = (d: DropState | null) => {
    const a = dropRef.current
    if (a === d || (a && d && a.valid === d.valid && a.pos.list === d.pos.list && a.pos.index === d.pos.index)) return
    dropRef.current = d
    setDrop(d)
    if (d && a && (a.pos.list !== d.pos.list || a.pos.index !== d.pos.index)) haptic(4)
  }

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    const n = findNode(nodes, id)
    subtree.current = new Set(n ? allIds([n]) : [])
    setDragId(id)
    setSelected(null)
    playSfx('pickup')
    haptic(12)
  }

  const onDragMove = (e: DragMoveEvent) => {
    if (!e.over || !dragId) return setDropState(null)
    const start = getEventCoordinates(e.activatorEvent)
    if (!start) return
    const y = start.y + e.delta.y
    const pos = resolve(String(e.over.id), y, e.over.rect)
    if (!pos || isNoop(nodes, dragId, pos)) return setDropState(null)
    setDropState({ pos, valid: canMoveTo(nodes, dragId, pos.list) })
  }

  const finish = () => {
    lastDragEnd = performance.now()
    setDragId(null)
    setDropState(null)
    subtree.current = new Set()
  }

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id)
    const d = dropRef.current
    finish()
    if (!d) return
    if (!d.valid) {
      playSfx('drop-invalid')
      haptic([10, 40, 10])
      return
    }
    onMove(id, d.pos)
    haptic(10)
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.editor.announce.start(labels.get(String(active.id)) ?? ''),
    onDragOver: () => t.editor.announce.over,
    onDragMove: () => undefined,
    onDragEnd: ({ active }) => (dropRef.current?.valid ? t.editor.announce.drop(labels.get(String(active.id)) ?? '') : t.editor.announce.cancel),
    onDragCancel: () => t.editor.announce.cancel,
  }

  const dragged = dragId ? findNode(nodes, dragId) : undefined

  const ctx: Ctx = { ...props, density, labels, selected, setSelected, dragId, drop }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragMove as never}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t.editor.dragHintDesktop } }}
      autoScroll={{ threshold: { x: 0, y: 0.18 }, acceleration: 12 }}
    >
      <LayoutGroup>
        <div className="relative" data-testid="plan-editor" data-dragging={dragId ? 'true' : undefined}>
          {nodes.length === 0 && !dragId ? props.empty : <BlockList ctx={ctx} list={nodes} listId={null} depth={0} />}
          <EndZone ctx={ctx} listId={null} />
        </div>
      </LayoutGroup>
      <DragOverlay dropAnimation={props.reduced ? null : { duration: 180, easing: 'cubic-bezier(0.22,1,0.36,1)' }}>
        {dragged ? <BlockFace node={dragged} label={labels.get(dragged.id) ?? ''} density={density} lifted invalid={drop?.valid === false} /> : null}
      </DragOverlay>
      {drop && !drop.valid && (
        <p role="status" className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-[90] mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-lift)]">
          {t.editor.cantDrop}
        </p>
      )}
    </DndContext>
  )
}

type Ctx = PlanEditorProps & {
  density: 'touch' | 'desk'
  labels: Map<string, string>
  selected: string | null
  setSelected: (id: string | null) => void
  dragId: string | null
  drop: DropState | null
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

function InsertLine({ valid }: { valid: boolean }) {
  return (
    <motion.li
      aria-hidden
      className="list-none"
      initial={{ opacity: 0, scaleX: 0.6 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.12 }}
      data-testid="drop-indicator"
    >
      <div className={`relative mx-1 h-[6px] rounded-full ${valid ? 'bg-primary shadow-[0_0_0_4px_rgb(37_99_235/0.18)]' : 'bg-danger/70'}`}>
        <span className={`absolute -left-1 -top-[5px] h-4 w-4 rounded-full border-[3px] bg-white ${valid ? 'border-primary' : 'border-danger'}`} />
      </div>
    </motion.li>
  )
}

function BlockList({ ctx, list, listId, depth }: { ctx: Ctx; list: EditorNode[]; listId: ListTarget; depth: number }) {
  const t = useT()
  const here = ctx.drop && ctx.drop.pos.list === listId ? ctx.drop : null
  return (
    <ol className={`flex flex-col ${ctx.density === 'touch' ? 'gap-2.5' : 'gap-2'}`} aria-label={listId ? t.blocks.listInner : t.blocks.listMain}>
      <AnimatePresence initial={false}>
        {list.map((n, i) => [
          here && here.pos.index === i ? <InsertLine key={`ins-${i}`} valid={here.valid} /> : null,
          <BlockItem key={n.id} ctx={ctx} node={n} index={i} count={list.length} depth={depth} />,
        ])}
        {here && here.pos.index >= list.length && <InsertLine key="ins-end" valid={here.valid} />}
      </AnimatePresence>
    </ol>
  )
}

function EndZone({ ctx, listId }: { ctx: Ctx; listId: ListTarget }) {
  const { setNodeRef, isOver } = useDroppable({ id: `end:${listId ?? 'root'}` })
  const t = useT()
  if (listId === null)
    return (
      <div ref={setNodeRef} className={`mt-2 grid place-items-center rounded-[16px] border-2 border-dashed text-sm font-bold transition-colors ${ctx.dragId ? 'h-16 border-primary/40 text-primary' : 'h-6 border-transparent text-transparent'} ${isOver ? 'bg-primary-50' : ''}`}>
        {ctx.dragId ? t.editor.dropHere : null}
      </div>
    )
  return <div ref={setNodeRef} className="absolute inset-x-0 bottom-0 h-5" aria-hidden />
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const TONE = {
  move: { face: 'bg-primary text-white', icon: 'bg-white/20', step: 'bg-white/18 text-white', num: 'bg-white/25 text-white' },
  turn: { face: 'bg-orange text-ink', icon: 'bg-white/45', step: 'bg-white/45 text-ink', num: 'bg-white/50 text-ink' },
  repeat: { face: 'bg-mint text-ink', icon: 'bg-white/45', step: 'bg-white/55 text-ink', num: 'bg-white/55 text-ink' },
} as const

function BlockItem({ ctx, node, index, count, depth }: { ctx: Ctx; node: EditorNode; index: number; count: number; depth: number }) {
  const t = useT()
  const label = ctx.labels.get(node.id) ?? ''
  const drag = useDraggable({ id: node.id })
  const dropZone = useDroppable({ id: `drop:${node.id}` })
  const selected = ctx.selected === node.id
  const active = ctx.activeIds.has(node.id)
  const failed = ctx.failedId === node.id
  const isDragging = ctx.dragId === node.id
  const intoThis = node.type === 'repeat' && ctx.drop?.pos.list === node.id
  const parent = findParent(ctx.nodes, node.id) ?? null
  const touch = ctx.density === 'touch'

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const prev = parent === null ? ctx.nodes[index - 1] : undefined
    if (e.altKey && e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      ctx.onMove(node.id, { list: parent, index: index - 1 })
    } else if (e.altKey && e.key === 'ArrowDown' && index < count - 1) {
      e.preventDefault()
      ctx.onMove(node.id, { list: parent, index: index + 2 })
    } else if (e.altKey && e.key === 'ArrowLeft' && parent) {
      e.preventDefault()
      ctx.onMoveOut(node.id)
    } else if (e.altKey && e.key === 'ArrowRight') {
      const siblings = parent === null ? ctx.nodes : listOf(ctx.nodes, parent)
      const above = siblings[index - 1] ?? prev
      if (above?.type === 'repeat' && canMoveTo(ctx.nodes, node.id, above.id)) {
        e.preventDefault()
        ctx.onMoveInto(node.id, above.id)
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      if (node.type === 'repeat' && node.commands.length) ctx.setSelected(node.id)
      else ctx.onRemove(node.id)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      ctx.setSelected(selected ? null : node.id)
    } else if (e.key === 'Escape' && selected) {
      ctx.setSelected(null)
    }
  }

  const surface = (
    <div
      ref={(el) => {
        drag.setNodeRef(el)
        dropZone.setNodeRef(el)
      }}
      {...drag.listeners}
      {...drag.attributes}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-roledescription={undefined}
      aria-label={t.blocks.stepAria(label, blockAria(node, t), failed, active)}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Delete"
      onKeyDown={onKeyDown}
      onClick={() => {
        if (performance.now() - lastDragEnd < 250) return
        playSfx('tap')
        ctx.setSelected(selected ? null : node.id)
      }}
      className={`relative cursor-grab touch-manipulation select-none outline-offset-4 active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
      data-testid="block-surface"
      style={{ WebkitTouchCallout: 'none' }}
    >
      <BlockFace node={node} label={label} depth={depth} density={ctx.density} active={active} failed={failed} selected={selected} onPatch={ctx.onPatch} reduced={ctx.reduced} />
    </div>
  )

  return (
    <motion.li
      layout={ctx.reduced || ctx.dragId ? false : 'position'}
      layoutId={ctx.reduced ? undefined : node.id}
      initial={ctx.reduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: ctx.reduced ? 0 : 0.1 } }}
      transition={tweenList}
      className="relative list-none"
      data-testid="program-block"
      data-block-type={node.type}
      data-node-id={node.id}
      data-depth={depth}
    >
      {node.type === 'repeat' ? (
        <div
          className={`rounded-[20px] p-[5px] pb-0 transition-[box-shadow,background-color] duration-200 ${failed ? 'bg-danger' : active ? 'bg-orange' : 'bg-mint'} ${intoThis ? (ctx.drop?.valid ? 'shadow-[0_0_0_4px_rgb(37_99_235/0.35)]' : 'shadow-[0_0_0_4px_rgb(220_76_84/0.35)]') : ''} ${isDragging ? 'opacity-30' : ''}`}
          data-testid="loop-container"
          data-drop-target={intoThis || undefined}
        >
          {surface}
          <div className={`relative mt-[5px] rounded-l-[14px] rounded-r-[10px] transition-colors ${depth > 0 ? 'ml-2 p-1.5' : 'ml-3 p-2'} ${intoThis ? 'bg-primary-50' : 'bg-[#f3fcf8]'}`}>
            {node.commands.length === 0 ? (
              <EmptyLoop ctx={ctx} id={node.id} />
            ) : (
              <BlockList ctx={ctx} list={node.commands} listId={node.id} depth={depth + 1} />
            )}
            {node.commands.length > 0 && <EndZone ctx={ctx} listId={node.id} />}
          </div>
          <div className="flex h-[26px] items-center justify-between px-3 text-[12px] font-extrabold text-ink/70">
            <span>{t.blocks.repeatRuns(node.times)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                ctx.onTarget(ctx.target === node.id ? null : node.id)
              }}
              aria-pressed={ctx.target === node.id}
              className={`-mr-1 inline-flex h-[24px] items-center gap-1 rounded-full px-2 ${ctx.target === node.id ? 'bg-ink text-white' : 'hover:bg-white/50'}`}
            >
              <PlusCircle size={13} aria-hidden /> {ctx.target === node.id ? t.editor.addingHere : depth > 0 ? t.editor.addShort : t.editor.addHere}
            </button>
          </div>
        </div>
      ) : (
        surface
      )}
      <AnimatePresence initial={false}>
        {selected && !ctx.dragId && <ActionStrip ctx={ctx} node={node} index={index} count={count} parent={parent} label={label} touch={touch} />}
      </AnimatePresence>
    </motion.li>
  )
}

function EmptyLoop({ ctx, id }: { ctx: Ctx; id: string }) {
  const t = useT()
  const { setNodeRef } = useDroppable({ id: `into:${id}` })
  const highlight = ctx.drop?.pos.list === id
  return (
    <div ref={setNodeRef} className={`grid min-h-[52px] place-items-center rounded-[12px] border-2 border-dashed px-3 text-center text-[13px] font-bold ${highlight ? (ctx.drop?.valid ? 'border-primary text-primary' : 'border-danger text-danger') : 'border-mint text-mint-700'}`}>
      {t.editor.emptyLoop}
    </div>
  )
}

/** The visual block. Also used (non-interactive) as the drag preview. */
export function BlockFace({
  node,
  label,
  density,
  active,
  failed,
  selected,
  lifted,
  invalid,
  onPatch,
  reduced,
  depth = 0,
}: {
  node: EditorNode
  label: string
  density: 'touch' | 'desk'
  /** Nesting depth: blocks inside loops get a tighter layout so two levels still fit a phone. */
  depth?: number
  active?: boolean
  failed?: boolean
  selected?: boolean
  lifted?: boolean
  invalid?: boolean
  onPatch?: (id: string, p: Patch) => void
  reduced?: boolean
}) {
  const t = useT()
  const tone = TONE[node.type]
  const touch = density === 'touch'
  const tight = depth > 0
  const text = tight ? 'text-[16px]' : touch ? 'text-[18px]' : 'text-[16px]'
  const ring = failed
    ? 'ring-4 ring-danger/60'
    : active
      ? 'ring-4 ring-orange/70'
      : selected
        ? 'ring-4 ring-ink/25'
        : ''
  return (
    <motion.div
      className={`relative flex items-center gap-2 rounded-[16px] pr-2 shadow-[inset_0_-4px_0_rgb(0_0_0/0.14)] ${tone.face} ${ring} ${touch ? (tight ? 'min-h-[56px] gap-1.5 pl-1.5' : 'min-h-[60px] pl-1.5') : 'min-h-[54px] pl-1'} ${lifted ? 'rotate-[-1.5deg] scale-[1.04] shadow-[inset_0_-4px_0_rgb(0_0_0/0.14),0_18px_30px_-12px_rgb(23_37_84/0.55)]' : ''} ${invalid ? 'opacity-70 grayscale' : ''}`}
      animate={failed && !reduced ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.36 }}
      data-active={active || undefined}
      data-failed={failed || undefined}
    >
      {!tight && (
        <span className={`grid shrink-0 place-items-center text-current/60 ${touch ? 'h-11 w-6' : 'h-10 w-5'}`} aria-hidden>
          <GripVertical size={18} className="opacity-60" />
        </span>
      )}
      <span className={`tabular grid shrink-0 place-items-center rounded-full px-1 font-display font-black ${tight ? 'h-6 min-w-6 text-[11px]' : 'h-7 min-w-7 text-[12px]'} ${tone.num}`} aria-hidden>
        {label}
      </span>
      <span className={`grid shrink-0 place-items-center rounded-[12px] ${tone.icon} ${tight ? 'h-8 w-8' : touch ? 'h-10 w-10' : 'h-9 w-9'}`}>
        <BlockIcon node={node} size={tight ? 18 : touch ? 22 : 20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        {node.type === 'move' && (
          <>
            <span className={`font-display font-black ${text}`}>{t.blocks.move}</span>
            <Stepper tight={tight} value={node.steps} min={LIMITS.move.min} max={LIMITS.move.max} label={t.blocks.squares} tone={tone.step} onChange={onPatch && ((v) => onPatch(node.id, { steps: v }))} />
          </>
        )}
        {node.type === 'turn' && (
          <button
            type="button"
            disabled={!onPatch}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onPatch?.(node.id, { direction: node.direction === 'left' ? 'right' : 'left' })
            }}
            className={`flex h-11 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-[12px] px-1.5 font-display font-black ${text} enabled:hover:bg-white/30`}
            aria-label={t.blocks.swapAria(node.direction)}
          >
            {t.blocks.turn(node.direction)}
            {tight ? (
              <ArrowLeftRight size={15} className="shrink-0 opacity-60" aria-hidden />
            ) : (
              <span className="rounded-md bg-white/55 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">{t.blocks.swap}</span>
            )}
          </button>
        )}
        {node.type === 'repeat' && (
          <>
            <span className={`font-display font-black ${text}`}>{t.blocks.repeat}</span>
            <Stepper tight={tight} value={node.times} min={LIMITS.repeat.min} max={LIMITS.repeat.max} label={t.blocks.times} suffix="x" tone={tone.step} onChange={onPatch && ((v) => onPatch(node.id, { times: v }))} />
            {lifted && <span className="text-[12px] font-bold opacity-70">{node.commands.length > 0 ? `+${node.commands.length}` : ''}</span>}
          </>
        )}
      </div>
      {active && (
        <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-orange text-[11px] text-ink shadow" aria-hidden>
          ▶
        </span>
      )}
    </motion.div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  suffix,
  tone,
  tight,
}: {
  tight?: boolean
  value: number
  min: number
  max: number
  onChange?: (v: number) => void
  label: string
  suffix?: string
  tone: string
}) {
  const t = useT()
  const btn = `grid h-10 ${tight ? 'w-8' : 'w-9'} place-items-center rounded-[10px] disabled:opacity-30 enabled:hover:bg-white/25 enabled:active:scale-90 transition-transform`
  return (
    <div className={`flex items-center rounded-[12px] ${tone}`} role="group" aria-label={label} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" className={btn} disabled={!onChange || value <= min} onClick={(e) => { e.stopPropagation(); onChange?.(value - 1) }} aria-label={t.blocks.decrease(label)}>
        <Minus size={16} strokeWidth={3.2} aria-hidden />
      </button>
      <span className="tabular min-w-6 text-center font-display text-[19px] font-black" aria-live="polite">
        {value}
        {suffix && <span className="text-[13px]">{suffix}</span>}
      </span>
      <button type="button" className={btn} disabled={!onChange || value >= max} onClick={(e) => { e.stopPropagation(); onChange?.(value + 1) }} aria-label={t.blocks.increase(label)}>
        <Plus size={16} strokeWidth={3.2} aria-hidden />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tap-to-move actions                                                 */
/* ------------------------------------------------------------------ */

function ActionStrip({ ctx, node, index, count, parent, label, touch }: { ctx: Ctx; node: EditorNode; index: number; count: number; parent: ListTarget; label: string; touch: boolean }) {
  const t = useT()
  const [mode, setMode] = useState<'main' | 'loops' | 'confirm-delete'>('main')
  const targets = repeatTargetsFor(ctx.nodes, node.id)
  const close = () => ctx.setSelected(null)
  const act = (fn: () => void) => {
    fn()
    close()
  }

  const into = () => {
    if (targets.length === 1) act(() => ctx.onMoveInto(node.id, targets[0].id))
    else setMode('loops')
  }
  const remove = () => {
    if (node.type === 'repeat' && node.commands.length > 0) setMode('confirm-delete')
    else act(() => ctx.onRemove(node.id))
  }

  return (
    <motion.div
      initial={ctx.reduced ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
      transition={{ duration: DUR.select, ease: EASE_OUT }}
      className="overflow-hidden"
      role="group"
      aria-label={t.editor.actionsFor(label)}
      data-testid="block-actions"
    >
      <div className={`mt-1.5 gap-1.5 rounded-[16px] bg-ink/[0.05] p-1.5 ${mode === 'main' ? 'grid auto-cols-fr grid-flow-col' : 'flex flex-wrap'}`}>
        {mode === 'main' && (
          <>
            <ActionBtn icon={<ChevronUp size={18} strokeWidth={3} />} label={t.editor.moveUp} disabled={index === 0} onClick={() => ctx.onMove(node.id, { list: parent, index: index - 1 })} touch={touch} testId="action-up" stacked />
            <ActionBtn icon={<ChevronDown size={18} strokeWidth={3} />} label={t.editor.moveDown} disabled={index >= count - 1} onClick={() => ctx.onMove(node.id, { list: parent, index: index + 2 })} touch={touch} testId="action-down" stacked />
            {targets.length > 0 && <ActionBtn icon={<ArrowDownToLine size={18} />} label={t.editor.putInLoop} onClick={into} touch={touch} tone="mint" testId="action-into" stacked keepOpen={targets.length > 1} />}
            {parent !== null && <ActionBtn icon={<ArrowUpFromLine size={18} />} label={t.editor.takeOut} onClick={() => act(() => ctx.onMoveOut(node.id))} touch={touch} tone="mint" testId="action-out" stacked keepOpen />}
            <ActionBtn icon={<Trash2 size={17} />} label={t.editor.remove} onClick={remove} touch={touch} tone="danger" testId="action-delete" stacked keepOpen />
          </>
        )}
        {mode === 'loops' && (
          <>
            <p className="w-full px-1.5 pt-0.5 text-[13px] font-extrabold text-ink-soft">{t.editor.chooseLoop}</p>
            {targets.map((r) => (
              <ActionBtn
                key={r.id}
                icon={<BlockIcon node={r} size={16} />}
                label={t.editor.loopName(ctx.labels.get(r.id) ?? '', r.type === 'repeat' ? r.times : 2)}
                onClick={() => act(() => ctx.onMoveInto(node.id, r.id))}
                touch={touch}
                tone="mint"
                testId="action-into-target"
                keepOpen
              />
            ))}
            <ActionBtn label={t.editor.cancel} onClick={() => setMode('main')} touch={touch} keepOpen />
          </>
        )}
        {mode === 'confirm-delete' && (
          <>
            <p className="w-full px-1.5 pt-0.5 text-[13px] font-extrabold text-ink-soft">{t.editor.deleteLoopTitle}</p>
            <ActionBtn label={t.editor.keepBlocks} onClick={() => act(() => ctx.onUnwrap(node.id))} touch={touch} tone="mint" testId="action-unwrap" keepOpen />
            <ActionBtn label={t.editor.deleteAll} onClick={() => act(() => ctx.onRemove(node.id))} touch={touch} tone="danger" testId="action-delete-all" keepOpen />
            <ActionBtn label={t.editor.cancel} onClick={() => setMode('main')} touch={touch} keepOpen />
          </>
        )}
      </div>
    </motion.div>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
  touch,
  tone,
  testId,
  stacked,
}: {
  icon?: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  touch: boolean
  tone?: 'mint' | 'danger'
  testId?: string
  keepOpen?: boolean
  stacked?: boolean
}) {
  const cls = tone === 'danger' ? 'text-danger hover:bg-danger-50' : tone === 'mint' ? 'text-mint-700 hover:bg-mint-50' : 'text-ink-soft hover:bg-primary-50'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`rounded-[12px] bg-white font-display font-extrabold shadow-[0_1px_0_rgb(23_37_84/0.08)] disabled:opacity-35 ${
        stacked ? `flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[12px] leading-tight ${touch ? 'h-[58px]' : 'h-[52px]'}` : `inline-flex items-center gap-1.5 px-3 text-[14px] ${touch ? 'h-12' : 'h-10'}`
      } ${cls}`}
      data-testid={testId}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label}
    </button>
  )
}
