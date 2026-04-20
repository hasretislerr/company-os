'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, User } from '@/lib/api';
import { TaskCard } from './TaskCard';
import Link from 'next/link';

interface SortableTaskProps {
    task: Task;
    index: number;
    getUserById: (userId: string | undefined) => User | undefined;
    getPriorityBadge: (priority: string) => React.ReactNode;
}

export function SortableTask({ task, index, getUserById, getPriorityBadge }: SortableTaskProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
            index,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1, // Lower opacity for the original item while dragging
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="mb-3 select-none"
        >
            {/* We wrap TaskCard in a Link if we want it clickable, 
                 but for DnD handle we usually want the whole card to be the handle.
                 The previous implementation had Link inside. 
                 TaskCard doesn't have Link inside, so we wrap it here or pass the onClick.
                 Actually TaskCard was designed to be presentational. 
                 Let's keep the Link wrapper here as it was. */}
            <Link
                href={`/tasks/${task.id}`}
                onClick={(e) => {
                    if (isDragging) e.preventDefault();
                }}
            >
                <TaskCard
                    task={task}
                    getUserById={getUserById}
                    getPriorityBadge={getPriorityBadge}
                />
            </Link>
        </div>
    );
}
