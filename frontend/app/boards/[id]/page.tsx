'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, type Board, type Task, type BoardColumn, type User } from '@/lib/api';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import ConfirmationModal from '@/components/ConfirmationModal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    pointerWithin,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTask } from '@/components/SortableTask';
import { TaskCard } from '@/components/TaskCard';
import { DroppableColumn } from '@/components/DroppableColumn';

export default function BoardDetail() {
    const router = useRouter();
    const params = useParams();
    const boardId = params.id as string;

    const [board, setBoard] = useState<Board | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [preDragTasksState, setPreDragTasksState] = useState<Task[] | null>(null);

    // Confirmation Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState<{
        taskId: string;
        targetColumnId: string;
        position: number;
        originalTasks: Task[]; // To revert if cancelled
        taskTitle: string;
        sourceColumnName: string;
        targetColumnName: string;
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Increased for mobile stability
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        setMounted(true);
        loadBoard();
        loadTasks();
        loadUsers();
    }, [boardId]);

    const loadBoard = async () => {
        try {
            const data = await apiClient.getBoard(boardId);
            setBoard(data);
        } catch (err) {
            setError('Pano yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const loadTasks = async () => {
        try {
            const data = await apiClient.listTasksByBoard(boardId);
            // Sort tasks by position
            const sortedTasks = [...data].sort((a, b) => ((a.position || 0) as number) - ((b.position || 0) as number));
            setTasks(sortedTasks);
        } catch (err) {
            console.error('Görevler yüklenirken hata:', err);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await apiClient.listUsers();
            setUsers(data);

            // Sync current user to localStorage for consistent name in TopNavbar
            const token = localStorage.getItem('token');
            if (token) {
                const storedUser = localStorage.getItem('user');
                let currentUserId = '';
                if (storedUser) {
                    try { currentUserId = JSON.parse(storedUser).id; } catch (e) { }
                }

                if (currentUserId) {
                    const currentUser = data.find((u: any) => u.id === currentUserId);
                    if (currentUser) {
                        localStorage.setItem('user', JSON.stringify({
                            ...currentUser,
                            first_name: currentUser.first_name,
                            last_name: currentUser.last_name,
                            role: currentUser.role
                        }));
                        // Trigger storage event for TopNavbar to pick up
                        window.dispatchEvent(new Event('storage'));
                    }
                }
            }
        } catch (err) {
            console.error('Kullanıcılar yüklenemedi:', err);
        }
    };

    const getUserById = (userId: string | undefined): User | undefined => {
        if (!userId) return undefined;
        return users.find(u => u.id === userId);
    };

    const getTasksByColumn = (columnId: string) => {
        return tasks.filter(task => task.column_id === columnId);
    };

    const getColumnName = (columnId: string) => {
        return board?.columns?.find(c => c.id === columnId)?.name || 'Bilinmeyen Kolon';
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) {
            setPreDragTasksState([...tasks]); // Capture true original state
            setActiveTask(task);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Task';
        const isOverTask = over.data.current?.type === 'Task';

        if (!isActiveTask) return;

        const activeTask = tasks.find(t => t.id === activeId);
        if (!activeTask) return;

        // Dropping over a task
        if (isActiveTask && isOverTask) {
            const overTask = tasks.find(t => t.id === overId);
            if (!overTask) return;

            if (activeTask.column_id !== overTask.column_id) {
                setTasks((items) => {
                    const activeIndex = items.findIndex((t) => t.id === activeId);
                    const overIndex = items.findIndex((t) => t.id === overId);

                    if (activeIndex === -1 || overIndex === -1) return items;

                    // Update column_id locally
                    const activeItem = { ...items[activeIndex], column_id: overTask.column_id };

                    const newItems = [...items];
                    newItems[activeIndex] = activeItem;

                    return arrayMove(newItems, activeIndex, overIndex);
                });
            }
        }

        // Dropping over a column (empty area)
        const isOverColumn = over.data.current?.sortable?.containerId === overId || board?.columns?.some(c => c.id === overId);

        if (isActiveTask && isOverColumn) {
            const overColumnId = overId as string;
            if (activeTask.column_id !== overColumnId) {
                const isValidColumn = board?.columns?.some(c => c.id === overColumnId);
                if (isValidColumn) {
                    setTasks((items) => {
                        const activeIndex = items.findIndex((t) => t.id === activeId);
                        if (activeIndex === -1) return items;

                        const activeItem = { ...items[activeIndex], column_id: overColumnId };
                        const newItems = [...items];
                        newItems[activeIndex] = activeItem;
                        return newItems;
                    });
                }
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        // Capture specific state BEFORE we do anything
        // However, handleDragOver has already mutated `tasks` state optimistically.
        // We need to know where it started to check if column changed.
        // `activeTask` state from `dragStart` has the original state.
        const originalTask = activeTask;

        setActiveTask(null);

        if (!over || !originalTask) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Determine destination column based on the CURRENT visual state after dragOver
        // or by checking the collision target

        const currentTaskState = tasks.find(t => t.id === activeId);
        if (!currentTaskState) return;

        let targetColumnId = currentTaskState.column_id;

        // Verify collision
        const overTask = tasks.find(t => t.id === overId);
        if (overTask) {
            targetColumnId = overTask.column_id;
        } else if (board?.columns?.some(c => c.id === overId)) {
            targetColumnId = overId;
        }

        // Check if column REALLY changed compared to START of drag
        if (originalTask.column_id !== targetColumnId) {
            // COLUMN CHANGE - REQUIRE CONFIRMATION

            // Calculate what the API position would be
            let newPosition = 0;
            const columnTasks = tasks.filter(t => t.column_id === targetColumnId);

            // If dragging over a task, standard reorder logic applies
            // But since we are here, `tasks` is already optimistically updated by `dragOver`.
            // So we just find the index of the active item in the target column.
            newPosition = columnTasks.findIndex(t => t.id === activeId);

            setPendingMove({
                taskId: activeId,
                targetColumnId: targetColumnId,
                position: newPosition,
                originalTasks: preDragTasksState || tasks, // Revert to captured state
                taskTitle: originalTask.title,
                sourceColumnName: getColumnName(originalTask.column_id),
                targetColumnName: getColumnName(targetColumnId),
            });
            setModalOpen(true);
            return;
        }

        // SAME COLUMN REORDER - No confirmation needed
        if (activeId !== overId) {
            const oldIndex = tasks.findIndex((t) => t.id === activeId);
            const newIndex = tasks.findIndex((t) => t.id === overId);

            setTasks((items) => {
                return arrayMove(items, oldIndex, newIndex);
            });

            // Calculate new position
            const finalTasks = arrayMove(tasks, oldIndex, newIndex);
            const columnTasks = finalTasks.filter(t => t.column_id === targetColumnId);
            const newPosition = columnTasks.findIndex(t => t.id === activeId);

            updateTaskPosition(activeId, targetColumnId, newPosition, currentTaskState);
        }
    };

    const updateTaskPosition = async (taskId: string, columnId: string, position: number, task: Task) => {
        try {
            const updatedTask = await apiClient.updateTask(taskId, {
                title: task.title,
                description: task.description || '',
                priority: task.priority,
                column_id: columnId,
                position: position,
                assignee_id: task.assignee_id,
                due_date: task.due_date,
            });

            // Update local state with the full updated task from backend (contains creator/assignee objects)
            setTasks(prev => {
                const newTasks = [...prev];
                const taskIndex = newTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    newTasks[taskIndex] = updatedTask;
                }
                return newTasks;
            });
        } catch (error) {
            console.error("Failed to move task", error);
            loadTasks();
        }
    };

    const confirmMove = async () => {
        if (!pendingMove) return;
        setModalOpen(false);

        // API Call
        const currentTask = tasks.find(t => t.id === pendingMove.taskId);
        if (currentTask) {
            await updateTaskPosition(
                pendingMove.taskId,
                pendingMove.targetColumnId,
                pendingMove.position,
                currentTask
            );
        }
        setPendingMove(null);
    };

    const cancelMove = () => {
        setModalOpen(false);
        if (pendingMove && preDragTasksState) {
            setTasks(preDragTasksState); // Revert UI instantly
        } else {
            loadTasks();
        }
        setPendingMove(null);
    };

    const getPriorityBadge = (priority: string) => {
        const styles = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800',
        };
        const labels = {
            low: 'Düşük',
            medium: 'Orta',
            high: 'Yüksek',
            critical: 'Kritik',
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority as keyof typeof styles] || styles.medium}`}>
                {labels[priority as keyof typeof labels] || priority}
            </span>
        );
    };

    if (!mounted) {
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Yükleniyor...</div>
            </div>
        );
    }

    if (error || !board) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error || 'Pano bulunamadı'}</div>
                    <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
                        Dashboard'a Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <LeftSidebar />

            <div className="flex-1 md:ml-64 overflow-y-auto bg-gray-50">
                <TopNavbar />

                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/projects/${board.project_id}`}
                            className="text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            ← Projeye Dön
                        </Link>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
                    </div>
                </div>

                <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {board.description && (
                        <div className="mb-6">
                            <p className="text-gray-600">{board.description}</p>
                        </div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={pointerWithin} // Switch to pointerWithin for better container hit testing
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
                            {board.columns && board.columns.map((column: BoardColumn) => (
                                <div key={column.id} className="flex-shrink-0 w-80 h-full flex flex-col">
                                    <DroppableColumn id={column.id} className="bg-gray-100 rounded-lg p-4 h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-900">
                                                {column.name}
                                                <span className="ml-2 text-sm text-gray-500">
                                                    ({getTasksByColumn(column.id).length})
                                                </span>
                                            </h3>
                                            <Link
                                                href={`/tasks/new?board=${boardId}&column=${column.id}`}
                                                className="text-indigo-600 hover:text-indigo-700 text-2xl leading-none"
                                                title="Yeni görev"
                                            >
                                                +
                                            </Link>
                                        </div>

                                        <SortableContext
                                            id={column.id}
                                            items={getTasksByColumn(column.id).map(t => t.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3 flex-1 overflow-y-auto min-h-[100px]">
                                                {getTasksByColumn(column.id).map((task, index) => (
                                                    <SortableTask
                                                        key={task.id}
                                                        task={task}
                                                        index={index}
                                                        getUserById={getUserById}
                                                        getPriorityBadge={getPriorityBadge}
                                                    />
                                                ))}

                                                {getTasksByColumn(column.id).length === 0 && (
                                                    <div className="text-center py-8 text-gray-400 text-sm">
                                                        Henüz görev yok
                                                        <br />
                                                        <span className="text-xs">(Buraya sürükleyin)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DroppableColumn>
                                </div>
                            ))}
                        </div>

                        <DragOverlay>
                            {activeTask ? (
                                <div className="w-80">
                                    <TaskCard
                                        task={activeTask}
                                        getUserById={getUserById}
                                        getPriorityBadge={getPriorityBadge}
                                        isOverlay
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </main>
            </div>

            <ConfirmationModal
                isOpen={modalOpen}
                title="Aşama Değişikliği"
                message={`"${pendingMove?.taskTitle}" işlemi "${pendingMove?.sourceColumnName}" aşamasından "${pendingMove?.targetColumnName}" aşamasına geçecektir. Onaylıyor musunuz?`}
                onConfirm={confirmMove}
                onCancel={cancelMove}
            />
        </div>
    );
}
