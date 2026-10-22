import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn.util.ts';

/** What a sortable list says, in the reader's language. */
export interface SortableListMessages {
  /** The handle's label: "Move Bug". */
  move: (name: string) => string;
  /** What screen readers call an item: "movable item". */
  roleDescription: string;
  /** Read when a handle is focused: how to move it with the keyboard. */
  instructions: string;
  picked: (name: string) => string;
  over: (name: string, position: number, count: number) => string;
  dropped: (name: string, position: number, count: number) => string;
  cancelled: (name: string) => string;
}

/** A list moves up and down only. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * A list put in order by dragging each item's handle: with a mouse, a finger, or the keyboard
 * (Space, the arrows, Space), each move announced to screen readers.
 */
export function SortableList<Item extends { key: string }>({
  items,
  nameOf,
  messages,
  onReorder,
  renderItem,
  className,
}: {
  items: readonly Item[];
  /** What an item is called, for its handle's label and the announcements. */
  nameOf: (item: Item) => string;
  messages: SortableListMessages;
  onReorder: (items: Item[]) => void;
  /** An item's row, given its drag handle to place. */
  renderItem: (item: Item, handle: ReactNode) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const indexOf = (key: UniqueIdentifier) => items.findIndex((item) => item.key === key);
  const named = (key: UniqueIdentifier) => {
    const item = items[indexOf(key)];
    return item ? nameOf(item) : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => messages.picked(named(active.id)),
    onDragOver: ({ active, over }) =>
      over ? messages.over(named(active.id), indexOf(over.id) + 1, items.length) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? messages.dropped(named(active.id), indexOf(over.id) + 1, items.length) : undefined,
    onDragCancel: ({ active }) => messages.cancelled(named(active.id)),
  };

  function reorder({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      onReorder(arrayMove([...items], indexOf(active.id), indexOf(over.id)));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: messages.instructions },
      }}
      onDragEnd={reorder}
    >
      <SortableContext items={items.map(({ key }) => key)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableItem key={item.key} id={item.key} name={nameOf(item)} messages={messages}>
              {(handle) => renderItem(item, handle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  name,
  messages,
  children,
}: {
  id: string;
  name: string;
  messages: SortableListMessages;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, attributes: { roleDescription: messages.roleDescription } });

  return (
    <li
      ref={setNodeRef}
      // Where the item is while it moves: set through the DOM, which the CSP allows.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('bg-surface', isDragging && 'relative z-10 shadow-lg')}
    >
      {children(
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={messages.move(name)}
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing pointer-coarse:size-11"
        >
          <GripVerticalIcon aria-hidden="true" className="size-4" />
        </button>,
      )}
    </li>
  );
}
