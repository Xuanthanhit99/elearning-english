import { useSortable } from "@dnd-kit/sortable";
import type { Transform } from '@dnd-kit/utilities';
import { CSS } from "@dnd-kit/utilities";
export function SortableBlock({
  block,
  index,
  children,
}: {
  block: any;
  index: number;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: '1px solid #ddd',
    padding: 16,
    marginBottom: 16,
    background: '#fff',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          marginBottom: 12,
          fontWeight: 'bold',
        }}
      >
        ⠿ Kéo block #{index + 1} - {block.type}
      </div>

      {children}
    </div>
  );
}