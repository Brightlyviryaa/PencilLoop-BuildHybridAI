import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { ChevronDown, ChevronUp, GripVertical, Minus, Plus, Trash2 } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { LIMITS } from '../maze/limits'
import type { TurnDirection } from '../maze/types'
import { DUR, EASE_OUT, tweenList } from '../../styles/motion'
import type { EditorNode, ListTarget } from './ast'
import { BlockIcon } from './blocks'
import { BLOCK_STYLE, blockAria } from './blockMeta'
import { useT } from '../../i18n'

export interface ProgramListProps {
  nodes: EditorNode[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  target: ListTarget
  onTarget: (t: ListTarget) => void
  activeIds: Set<string>
  failedId: string | null
  onPatch: (id: string, p: Partial<{ steps: number; times: number; direction: TurnDirection }>) => void
  onRemove: (id: string) => void
  onShift: (id: string, d: -1 | 1) => void
  onReorder: (list: ListTarget, items: EditorNode[]) => void
  reduced: boolean
}

export function ProgramList(props: ProgramListProps) {
  return <BlockList {...props} list={props.nodes} listId={null} prefix="" depth={0} />
}

function BlockList(
  props: ProgramListProps & { list: EditorNode[]; listId: ListTarget; prefix: string; depth: number },
) {
  const { list, listId, prefix, onReorder } = props
  const t = useT()
  return (
    <Reorder.Group
      as="ol"
      axis="y"
      values={list}
      onReorder={(items) => onReorder(listId, items)}
      className="flex flex-col gap-2"
      aria-label={listId ? t.blocks.listInner : t.blocks.listMain}
    >
      <AnimatePresence initial={false}>
        {list.map((n, i) => (
          <BlockRow key={n.id} {...props} node={n} index={i} count={list.length} label={prefix ? `${prefix}.${i + 1}` : `${i + 1}`} />
        ))}
      </AnimatePresence>
    </Reorder.Group>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  suffix,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  label: string
  suffix?: string
}) {
  const t = useT()
  return (
    <div className="flex items-center rounded-[12px] bg-white/90 ring-1 ring-line" role="group" aria-label={label}>
      <button
        type="button"
        className="grid h-11 w-10 place-items-center rounded-l-[12px] text-ink-soft hover:bg-primary-50 disabled:opacity-30"
        onClick={(e) => {
          e.stopPropagation()
          onChange(value - 1)
        }}
        disabled={value <= min}
        aria-label={t.blocks.decrease(label)}
      >
        <Minus size={16} strokeWidth={3} aria-hidden />
      </button>
      <span className="tabular min-w-7 text-center font-display text-lg font-black" aria-live="polite">
        {value}
        {suffix && <span className="text-sm">{suffix}</span>}
      </span>
      <button
        type="button"
        className="grid h-11 w-10 place-items-center rounded-r-[12px] text-ink-soft hover:bg-primary-50 disabled:opacity-30"
        onClick={(e) => {
          e.stopPropagation()
          onChange(value + 1)
        }}
        disabled={value >= max}
        aria-label={t.blocks.increase(label)}
      >
        <Plus size={16} strokeWidth={3} aria-hidden />
      </button>
    </div>
  )
}

function BlockRow(
  props: ProgramListProps & { node: EditorNode; index: number; count: number; label: string; depth: number },
) {
  const { node, index, count, label, selectedId, onSelect, target, onTarget, activeIds, failedId, onPatch, onRemove, onShift, reduced, depth } = props
  const controls = useDragControls()
  const t = useT()
  const selected = selectedId === node.id
  const active = activeIds.has(node.id)
  const failed = failedId === node.id
  const style = BLOCK_STYLE[node.type]
  const isTarget = node.type === 'repeat' && target === node.id

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      onShift(node.id, -1)
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      onShift(node.id, 1)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onRemove(node.id)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(selected ? null : node.id)
    }
  }

  return (
    <Reorder.Item
      as="li"
      value={node}
      dragListener={false}
      dragControls={controls}
      layout={reduced ? undefined : 'position'}
      initial={reduced ? false : { opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={tweenList}
      className="relative list-none"
      data-testid="program-block"
      data-block-type={node.type}
      data-node-id={node.id}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={t.blocks.stepAria(label, blockAria(node, t), failed, active)}
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Delete"
        onKeyDown={onKeyDown}
        onClick={() => {
          onSelect(selected ? null : node.id)
          if (node.type === 'repeat') onTarget(node.id)
        }}
        className={`group relative flex min-h-[56px] items-center gap-2 rounded-[16px] border-2 bg-white py-1.5 pl-1.5 pr-2 transition-[border-color,box-shadow,background-color] duration-200 ${
          failed
            ? 'border-danger bg-danger-50 shadow-[0_0_0_4px_rgba(220,76,84,0.14)]'
            : active
              ? 'border-orange shadow-[0_0_0_4px_rgba(255,155,66,0.22)]'
              : selected
                ? 'border-primary shadow-[var(--shadow-soft)]'
                : 'border-line hover:border-primary/35'
        }`}
      >
        <button
          type="button"
          aria-label={t.blocks.drag(label)}
          className="hidden h-11 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-ink-muted/70 hover:bg-primary-50 active:cursor-grabbing md:grid"
          onPointerDown={(e) => {
            e.stopPropagation()
            controls.start(e)
          }}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVertical size={18} aria-hidden />
        </button>
        <span className="tabular w-7 shrink-0 text-center font-display text-sm font-black text-ink-muted" aria-hidden>
          {label}
        </span>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${style.chip}`}>
          <BlockIcon node={node} size={20} />
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {node.type === 'move' && (
            <>
              <span className="font-display text-[16px] font-extrabold">{t.blocks.move}</span>
              <Stepper
                value={node.steps}
                min={LIMITS.move.min}
                max={LIMITS.move.max}
                onChange={(v) => onPatch(node.id, { steps: v })}
                label={t.blocks.squares}
              />
            </>
          )}
          {node.type === 'turn' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPatch(node.id, { direction: node.direction === 'left' ? 'right' : 'left' })
              }}
              className="flex h-11 items-center gap-2 rounded-[12px] px-2.5 font-display text-[16px] font-extrabold hover:bg-orange-50"
              aria-label={t.blocks.swapAria(node.direction)}
            >
              {t.blocks.turn(node.direction)}
              <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-600">{t.blocks.swap}</span>
            </button>
          )}
          {node.type === 'repeat' && (
            <>
              <span className="font-display text-[16px] font-extrabold">{t.blocks.repeat}</span>
              <Stepper
                value={node.times}
                min={LIMITS.repeat.min}
                max={LIMITS.repeat.max}
                onChange={(v) => onPatch(node.id, { times: v })}
                label={t.blocks.times}
                suffix="x"
              />
            </>
          )}
        </div>

        <AnimatePresence initial={false}>
          {selected && (
            <motion.div
              className="flex shrink-0 items-center gap-0.5"
              initial={reduced ? false : { opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6, transition: { duration: 0.12 } }}
              transition={{ duration: DUR.select, ease: EASE_OUT }}
            >
              <RowAction label={t.blocks.up(label)} disabled={index === 0} onClick={() => onShift(node.id, -1)}>
                <ChevronUp size={18} strokeWidth={2.8} aria-hidden />
              </RowAction>
              <RowAction label={t.blocks.down(label)} disabled={index === count - 1} onClick={() => onShift(node.id, 1)}>
                <ChevronDown size={18} strokeWidth={2.8} aria-hidden />
              </RowAction>
              <RowAction label={t.blocks.remove(label)} danger onClick={() => onRemove(node.id)}>
                <Trash2 size={17} aria-hidden />
              </RowAction>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {node.type === 'repeat' && (
        <div
          className={`ml-5 mt-2 rounded-[16px] border-2 border-dashed p-2 pl-2.5 transition-colors duration-200 ${
            isTarget ? 'border-mint bg-mint-50/70' : 'border-line bg-cloud/60'
          }`}
        >
          {node.commands.length === 0 ? (
            <p className="px-2 py-2.5 text-sm font-semibold text-ink-muted">
              {isTarget ? t.blocks.repeatEmptyTarget : t.blocks.repeatEmpty}
            </p>
          ) : (
            <BlockList {...props} list={node.commands} listId={node.id} prefix={label} depth={depth + 1} />
          )}
          <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
            <span className={`text-xs font-bold ${isTarget ? 'text-mint-700' : 'text-ink-muted'}`}>
              {isTarget ? t.blocks.repeatTarget : t.blocks.repeatRuns(node.times)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTarget(isTarget ? null : node.id)
              }}
              className="h-11 rounded-[10px] px-2.5 text-xs font-extrabold text-primary hover:bg-primary-50"
              aria-pressed={isTarget}
            >
              {isTarget ? t.blocks.doneInside : t.blocks.addInside}
            </button>
          </div>
        </div>
      )}
    </Reorder.Item>
  )
}

function RowAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`grid h-11 w-10 place-items-center rounded-[10px] disabled:opacity-25 ${danger ? 'text-danger hover:bg-danger-50' : 'text-ink-soft hover:bg-primary-50'}`}
    >
      {children}
    </button>
  )
}
