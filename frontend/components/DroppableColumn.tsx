'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

export function DroppableColumn({ id, children, className }: DroppableColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
        data: {
            type: 'Column',
        },
    });

    return (
        <div ref={setNodeRef} className={className}>
            {children}
        </div>
    );
}
