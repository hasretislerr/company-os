'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeToken, hasOrganizationContext } from '@/lib/token';
import { apiClient, type Workspace, type Project, type Board, type Task } from '@/lib/api';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import MobileDashboard from '@/components/MobileDashboard';
import ConfirmationModal from '@/components/ConfirmationModal';
import { SortableDashboardTask } from '@/components/SortableDashboardTask';
import { TaskFilterBar } from '@/components/TaskFilterBar';
import toast from 'react-hot-toast';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
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

import { DroppableColumn } from '@/components/DroppableColumn';
import { SortableTask } from '@/components/SortableTask'; // We won't use this, using local SortableDashboardTask

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<{ id?: string; firstName: string; orgName?: string; role?: string; department?: string; avatar_url?: string; } | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [projects, setProjects] = useState<Record<string, Project[]>>({});
    const [boards, setBoards] = useState<Record<string, Board[]>>({});
    const [tasks, setTasks] = useState<Record<string, Task[]>>({});
    const [users, setUsers] = useState<any[]>([]);
    const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filters, setFilters] = useState<{ assigneeId: string | null; priority: string | null }>({
        assigneeId: null,
        priority: null
    });

    const handleFilterChange = (key: 'assigneeId' | 'priority', value: string | null) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Helper to filter tasks
    const getFilteredTasks = (boardId: string) => {
        const boardTasks = tasks[boardId] || [];
        return boardTasks.filter(task => {
            // Assignee Filter
            if (filters.assigneeId && task.assignee_id !== filters.assigneeId) return false;
            // Priority Filter
            if (filters.priority && task.priority.toLowerCase() !== filters.priority.toLowerCase()) return false;

            return true;
        });
    };

    // DnD State
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState<{
        taskId: string;
        targetColumnId: string;
        position: number;
        originalTasks: Record<string, Task[]>; // Store full state to revert
        taskTitle: string;
        sourceColumnName: string;
        targetColumnName: string;
        boardId: string;
        newAssigneeId?: string; // Track if we need to update assignee
    } | null>(null);

    const [preDragTasksState, setPreDragTasksState] = useState<Record<string, Task[]> | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        if (!hasOrganizationContext(token)) {
            console.log("No organization context, attempting to auto-select...");
            apiClient.listOrganizations().then(orgs => {
                if (orgs.length > 0) {
                    apiClient.selectOrganization(orgs[0].id).then(res => {
                        localStorage.setItem('token', res.token);
                        localStorage.setItem('organization_id', orgs[0].id);
                        window.location.reload();
                    }).catch(err => {
                        console.error("Auto-select failed:", err);
                        setLoading(false);
                        loadUsers();
                    });
                } else {
                    setLoading(false);
                    loadUsers();
                }
            }).catch(() => {
                setLoading(false);
                loadUsers();
            });
            return;
        }

        const payload = decodeToken(token);
        if (payload) {
            // Try to get existing user info from localStorage first for better name display
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    setUser({
                        id: parsed.id || payload.user_id,
                        firstName: parsed.first_name || (parsed.email ? parsed.email.split('@')[0] : payload.email.split('@')[0]),
                        role: parsed.role || payload.role,
                        department: parsed.department || payload.department
                    });
                } catch (e) {
                    setUser({
                        id: payload.user_id,
                        firstName: payload.email.split('@')[0],
                        role: payload.role,
                        department: payload.department
                    });
                }
            } else {
                setUser({
                    id: payload.user_id,
                    firstName: payload.email.split('@')[0],
                    role: payload.role,
                    department: payload.department
                });
            }
        }

        loadWorkspaces();
        loadUsers();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadUsers = async () => {
        try {
            let orgId = localStorage.getItem('organization_id');

            // Sync from token if missing
            if (!orgId) {
                const token = localStorage.getItem('token');
                if (token) {
                    const payload = decodeToken(token);
                    if (payload?.organization_id) {
                        orgId = payload.organization_id;
                        localStorage.setItem('organization_id', orgId);
                    }
                }
            }

            let data;
            if (orgId && orgId !== 'undefined' && orgId !== 'null') {
                data = await apiClient.listUsers();
            } else {
                data = await apiClient.listAllUsers().catch(() => []);
            }

            setUsers(data);

            // Update current user with role info if available
            if (user && user.id) {
                const currentUser = data.find((u: any) => u.id === user.id);
                if (currentUser) {
                    setUser(prev => {
                        const newUser = {
                            ...(prev || {}),
                            id: currentUser.id,
                            firstName: currentUser.first_name || prev?.firstName || '',
                            role: currentUser.role,
                            department: currentUser.department,
                            avatar_url: currentUser.avatar_url || prev?.avatar_url // Merge: API might be empty if query is weird
                        };
                        return newUser as any;
                    });

                    // Also update localStorage so other pages (like Board) stay in sync
                    localStorage.setItem('user', JSON.stringify({
                        ...currentUser,
                        first_name: currentUser.first_name,
                        last_name: currentUser.last_name,
                        role: currentUser.role,
                        department: currentUser.department,
                        avatar_url: currentUser.avatar_url || JSON.parse(localStorage.getItem('user') || '{}').avatar_url
                    }));
                    window.dispatchEvent(new Event('storage'));
                }
            }
        } catch (error) {
            console.error('KullanÄ±cÄ±lar yÃ¼klenirken hata:', error);
        }
    };

    const loadWorkspaces = async () => {
        try {
            const data = await apiClient.listWorkspaces();
            setWorkspaces(data);
        } catch (error) {
            console.error('Ã‡alÄ±ÅŸma alanlarÄ± yÃ¼klenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProjectsForWorkspace = async (workspaceId: string) => {
        if (projects[workspaceId]) return; // Already loaded

        try {
            const data = await apiClient.listProjectsByWorkspace(workspaceId);
            setProjects(prev => ({ ...prev, [workspaceId]: data }));
        } catch (error) {
            console.error('Projeler yÃ¼klenirken hata:', error);
        }
    };

    const loadBoardsForProject = async (projectId: string) => {
        if (boards[projectId]) return; // Already loaded

        try {
            const data = await apiClient.listBoardsByProject(projectId);
            setBoards(prev => ({ ...prev, [projectId]: data }));

            // Load tasks for each board
            for (const board of data) {
                loadTasksForBoard(board.id);
            }
        } catch (error) {
            console.error('Panolar yÃ¼klenirken hata:', error);
        }
    };

    const loadTasksForBoard = async (boardId: string) => {
        if (tasks[boardId]) return; // Already loaded

        try {
            const data = await apiClient.listTasksByBoard(boardId);
            setTasks(prev => ({ ...prev, [boardId]: data }));
        } catch (error) {
            console.error('GÃ¶revler yÃ¼klenirken hata:', error);
        }
    };

    const getTaskCountsByColumn = (boardId: string, board: Board) => {
        const boardTasks = getFilteredTasks(boardId);
        const columns = board.columns || [];

        return columns.map(column => ({
            id: column.id,
            name: column.name,
            count: boardTasks.filter(task => task.column_id === column.id).length
        }));
    };

    const toggleWorkspace = async (workspaceId: string) => {
        const newExpanded = new Set(expandedWorkspaces);
        if (newExpanded.has(workspaceId)) {
            newExpanded.delete(workspaceId);
        } else {
            newExpanded.add(workspaceId);
            await loadProjectsForWorkspace(workspaceId);
        }
        setExpandedWorkspaces(newExpanded);
    };

    const toggleProject = async (projectId: string) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
            await loadBoardsForProject(projectId);
        }
        setExpandedProjects(newExpanded);
    };

    const handleDeleteWorkspace = async (e: React.MouseEvent, workspaceId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Bu Ã§alÄ±ÅŸma alanÄ± ve iÃ§indeki tÃ¼m projeler silinecek. Emin misiniz?')) {
            return;
        }

        try {
            await apiClient.deleteWorkspace(workspaceId);
            loadWorkspaces();
        } catch (error) {
            toast.error('Silme iÅŸlemi baÅŸarÄ±sÄ±z oldu');
        }
    };

    const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Bu proje ve iÃ§indeki tÃ¼m panolar silinecek. Emin misiniz?')) {
            return;
        }

        try {
            await apiClient.deleteProject(projectId);
            // Refresh all workspaces to update counts
            loadWorkspaces();
            // Clear projects cache
            setProjects({});
        } catch (error) {
            toast.error('Silme iÅŸlemi baÅŸarÄ±sÄ±z oldu');
        }
    };

    const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Bu pano silinecek. Emin misiniz?')) {
            return;
        }

        try {
            await apiClient.deleteBoard(boardId);
            // Clear boards cache
            setBoards({});
            // Refresh projects to update counts
            setProjects({});
        } catch (error) {
            toast.error('Silme iÅŸlemi baÅŸarÄ±sÄ±z oldu');
        }
    };

    const getTotalProjects = () => {
        return Object.values(projects).reduce((sum, projectList) => sum + projectList.length, 0);
    };

    const getTotalBoards = () => {
        return Object.values(boards).reduce((sum, boardList) => sum + boardList.length, 0);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        // Find task in all boards
        let task: Task | undefined;
        for (const boardTasks of Object.values(tasks)) {
            task = boardTasks.find(t => t.id === active.id);
            if (task) break;
        }

        if (task) {
            setPreDragTasksState(JSON.parse(JSON.stringify(tasks))); // Capture true original state
            setActiveTask(task);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        // Find active task and its board
        let activeTask: Task | undefined;
        let activeBoardId: string | undefined;

        for (const [bId, bTasks] of Object.entries(tasks)) {
            const found = bTasks.find(t => t.id === activeId);
            if (found) {
                activeTask = found;
                activeBoardId = bId;
                break;
            }
        }

        if (!activeTask || !activeBoardId) return;

        // Check over item (Task or Column)
        const isActiveTask = active.data.current?.type === 'Task';
        const isOverTask = over.data.current?.type === 'Task';

        // If over a task
        if (isOverTask) {
            // Find over task and its board
            let overTask: Task | undefined;
            let overBoardId: string | undefined;

            for (const [bId, bTasks] of Object.entries(tasks)) {
                const found = bTasks.find(t => t.id === overId);
                if (found) {
                    overTask = found;
                    overBoardId = bId;
                    break;
                }
            }

            if (!overTask || !overBoardId) return;

            // Restrict dragging between different boards
            if (activeBoardId !== overBoardId) return;

            if (activeTask.column_id !== overTask.column_id) {
                setTasks((prev) => {
                    const boardTasks = [...(prev[activeBoardId!] || [])];
                    const activeIndex = boardTasks.findIndex((t) => t.id === activeId);
                    const overIndex = boardTasks.findIndex((t) => t.id === overId);

                    if (activeIndex === -1 || overIndex === -1) return prev;

                    boardTasks[activeIndex] = { ...boardTasks[activeIndex], column_id: overTask!.column_id };
                    const newBoardTasks = arrayMove(boardTasks, activeIndex, overIndex);

                    return {
                        ...prev,
                        [activeBoardId!]: newBoardTasks
                    };
                });
            }
        }

        // If over a column
        // We need to find which board this column belongs to
        let overColumnBoardId: string | undefined;
        let isOverColumn = false;

        // Check loaded boards
        for (const [bId, bList] of Object.entries(boards)) {
            for (const board of bList) {
                if (board.columns?.some(c => c.id === overId)) {
                    overColumnBoardId = board.id;
                    isOverColumn = true;
                    break;
                }
            }
            if (overColumnBoardId) break;
        }

        if (isOverColumn && overColumnBoardId === activeBoardId) {
            const overColumnId = overId as string;
            if (activeTask.column_id !== overColumnId) {
                setTasks((prev) => {
                    const boardTasks = [...(prev[activeBoardId!] || [])];
                    const activeIndex = boardTasks.findIndex((t) => t.id === activeId);

                    if (activeIndex === -1) return prev;

                    boardTasks[activeIndex] = { ...boardTasks[activeIndex], column_id: overColumnId };
                    return {
                        ...prev,
                        [activeBoardId!]: boardTasks
                    };
                });
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        const originalTask = activeTask;
        setActiveTask(null);

        if (!over || !originalTask) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find current task state (optimistically updated)
        let currentTaskState: Task | undefined;
        let activeBoardId: string | undefined;

        for (const [bId, bTasks] of Object.entries(tasks)) {
            const found = bTasks.find(t => t.id === activeId);
            if (found) {
                currentTaskState = found;
                activeBoardId = bId;
                break;
            }
        }

        if (!currentTaskState || !activeBoardId) return;

        let targetColumnId = currentTaskState.column_id;
        let targetColumnName = '';

        // If dropped on a column explicitly
        for (const bList of Object.values(boards)) {
            for (const board of bList) {
                const col = board.columns?.find(c => c.id === overId);
                if (col) {
                    targetColumnId = col.id;
                    targetColumnName = col.name;
                    break;
                }
            }
        }

        const getColName = (colId: string) => {
            for (const bList of Object.values(boards)) {
                for (const board of bList) {
                    const col = board.columns?.find(c => c.id === colId);
                    if (col) return col.name;
                }
            }
            // If still not found, check if it was maybe in the task's status? 
            // Better fallback: check if we can find it in the board columns directly if we have boardId
            if (activeBoardId) {
                const board = boards[activeBoardId]?.find(b => b.id === activeBoardId);
                if (board) {
                    const col = board.columns?.find(c => c.id === colId);
                    if (col) return col.name;
                }
            }
            return 'SÃ¼tun';
        };

        if (targetColumnName === '') {
            targetColumnName = getColName(targetColumnId);
        }

        const isTodoColumn = targetColumnName.toLowerCase().includes('yapÄ±lacak') || targetColumnName.toLowerCase().includes('todo');
        let newAssigneeId = originalTask.assignee_id;

        // Auto-assign to current user if moved to "In Progress" or "Done" and not already assigned to them
        if (!isTodoColumn && user?.id && originalTask.assignee_id !== user.id) {
            newAssigneeId = user.id;
        }

        if (originalTask.column_id !== targetColumnId) {
            const boardTasks = tasks[activeBoardId];
            const columnTasks = boardTasks.filter(t => t.column_id === targetColumnId);
            const newPosition = columnTasks.findIndex(t => t.id === activeId);

            setPendingMove({
                taskId: activeId,
                targetColumnId: targetColumnId,
                position: newPosition,
                originalTasks: preDragTasksState || tasks, // Use captured pre-drag state
                taskTitle: originalTask.title,
                sourceColumnName: getColName(originalTask.column_id),
                targetColumnName: getColName(targetColumnId),
                boardId: activeBoardId,
                newAssigneeId: newAssigneeId
            });
            setModalOpen(true);
            return;
        }

        if (activeId !== overId) {
            const boardTasks = tasks[activeBoardId];
            const oldIndex = boardTasks.findIndex((t) => t.id === activeId);
            const newIndex = boardTasks.findIndex((t) => t.id === overId);

            // Calculate new position
            const newBoardTasks = arrayMove(boardTasks, oldIndex, newIndex);
            const columnTasks = newBoardTasks.filter(t => t.column_id === targetColumnId);
            const newPosition = columnTasks.findIndex(t => t.id === activeId);

            updateTaskPosition(activeId, targetColumnId, newPosition, currentTaskState);
        }
    };

    const updateTaskPosition = async (taskId: string, columnId: string, position: number, task: Task, newAssigneeId?: string) => {
        try {
            const updatedTask = await apiClient.updateTask(taskId, {
                title: task.title,
                description: task.description || '',
                priority: task.priority,
                column_id: columnId,
                position: position,
                assignee_id: newAssigneeId || task.assignee_id,
                due_date: task.due_date,
            });

            // Update local state with the full updated task from backend (contains creator/assignee objects)
            setTasks(prev => {
                const boardTasks = [...(prev[task.board_id] || [])];
                const taskIndex = boardTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    boardTasks[taskIndex] = updatedTask;
                }
                return { ...prev, [task.board_id]: boardTasks };
            });

            // Update local state to reflect new assignee if needed
            if (newAssigneeId && newAssigneeId !== task.assignee_id) {
                const newAssignee = users.find(u => u.id === newAssigneeId);
                setTasks(prev => {
                    const boardTasks = [...(prev[task.board_id] || [])];
                    const taskIndex = boardTasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        boardTasks[taskIndex] = {
                            ...boardTasks[taskIndex],
                            assignee_id: newAssigneeId,
                            assignee: newAssignee
                        };
                    }
                    return { ...prev, [task.board_id]: boardTasks };
                });
            }

        } catch (error) {
            console.error("Failed to move task", error);
            // Revert changes
            if (pendingMove?.originalTasks && pendingMove.originalTasks[task.board_id]) {
                setTasks(pendingMove.originalTasks);
            } else {
                loadTasksForBoard(task.board_id); // Fallback
            }
        }
    };

    const confirmMove = async () => {
        if (!pendingMove) return;
        setModalOpen(false);

        const currentTask = tasks[pendingMove.boardId]?.find(t => t.id === pendingMove.taskId);
        if (currentTask) {
            await updateTaskPosition(
                pendingMove.taskId,
                pendingMove.targetColumnId,
                pendingMove.position,
                currentTask,
                pendingMove.newAssigneeId
            );
        }
        setPendingMove(null);
    };

    const cancelMove = () => {
        setModalOpen(false);
        if (pendingMove) {
            // Revert to original tasks state using a deep copy
            setTasks(JSON.parse(JSON.stringify(pendingMove.originalTasks)));
        }
        setPendingMove(null);
        setPreDragTasksState(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">YÃ¼kleniyor...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <MobileDashboard />
            <div className="hidden md:flex h-screen overflow-hidden">
                <LeftSidebar />

                <div className="flex-1 overflow-y-auto bg-gray-50">
                    <TopNavbar userName={user?.firstName} />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={pointerWithin}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                    >
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                GÃ¶rev DaÄŸÄ±lÄ±mÄ±
                            </h2>
                            <p className="text-gray-600">
                                HoÅŸ geldin, {user?.firstName}! ğŸ‘‹ Projelerini ve gÃ¶revlerini buradan takip edebilirsin.
                            </p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Ã‡alÄ±ÅŸma AlanlarÄ±</p>
                                        <p className="text-3xl font-bold text-gray-900">{workspaces.length}</p>
                                    </div>
                                    <div className="text-4xl">ğŸ“</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Projeler</p>
                                        <p className="text-3xl font-bold text-gray-900">{getTotalProjects()}</p>
                                    </div>
                                    <div className="text-4xl">ğŸ“Š</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Panolar</p>
                                        <p className="text-3xl font-bold text-gray-900">{getTotalBoards()}</p>
                                    </div>
                                    <div className="text-4xl">ğŸ“‹</div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Aktif GÃ¶revler</p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {Object.values(tasks).reduce((sum, taskList) => sum + taskList.length, 0)}
                                        </p>
                                    </div>
                                    <div className="text-4xl">âœ…</div>
                                </div>
                            </div>
                        </div>

                        <TaskFilterBar
                            assignees={users}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            currentUserId={(user as any)?.id}
                            currentUserDept={user?.department || (user as any)?.department}
                            currentUserAvatar={user?.avatar_url || (user as any)?.avatar_url}
                        />

                        {/* Workspaces Section */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Ã‡alÄ±ÅŸma AlanlarÄ±</h3>
                                <Link
                                    href="/workspaces/new"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                                >
                                    + Yeni Ã‡alÄ±ÅŸma AlanÄ±
                                </Link>
                            </div>

                            {workspaces.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">ğŸ“</div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                        HenÃ¼z Ã§alÄ±ÅŸma alanÄ± yok
                                    </h4>
                                    <p className="text-gray-600 mb-6">
                                        Ä°lk Ã§alÄ±ÅŸma alanÄ±nÄ± oluÅŸturarak baÅŸla
                                    </p>
                                    <Link
                                        href="/workspaces/new"
                                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                                    >
                                        Ã‡alÄ±ÅŸma AlanÄ± OluÅŸtur
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {workspaces.map((workspace) => (
                                        <div key={workspace.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {/* Workspace Header */}
                                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => toggleWorkspace(workspace.id)}
                                                        className="flex items-center gap-3 flex-1 text-left hover:text-indigo-600 transition"
                                                    >
                                                        <span className="text-xl">
                                                            {expandedWorkspaces.has(workspace.id) ? 'â–¼' : 'â–¶'}
                                                        </span>
                                                        <span className="text-3xl">ğŸ“</span>
                                                        <div>
                                                            <h4 className="text-lg font-bold text-gray-900">
                                                                {workspace.name}
                                                            </h4>
                                                            {workspace.description && (
                                                                <p className="text-sm text-gray-600 mb-1">{workspace.description}</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/projects/new?workspace=${workspace.id}`}
                                                            className="px-3 py-1 text-sm bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition font-medium"
                                                        >
                                                            + Proje
                                                        </Link>
                                                        <span className="px-3 py-1 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg">
                                                            {user?.role === 'admin' ? 'ğŸ›¡ï¸' : 'ğŸ‘¤'} {user?.firstName || 'Bilinmiyor'}
                                                        </span>
                                                        <Link
                                                            href={`/workspaces/${workspace.id}`}
                                                            className="px-3 py-1 text-sm bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                                                        >
                                                            GÃ¶rÃ¼ntÃ¼le
                                                        </Link>
                                                        <button
                                                            onClick={(e) => handleDeleteWorkspace(e, workspace.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Sil"
                                                        >
                                                            ğŸ—‘ï¸
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Projects (if expanded) */}
                                            {expandedWorkspaces.has(workspace.id) && (
                                                <div className="bg-gray-50 p-4 pl-12">
                                                    {!projects[workspace.id] ? (
                                                        <div className="text-sm text-gray-500">YÃ¼kleniyor...</div>
                                                    ) : projects[workspace.id].length === 0 ? (
                                                        <div className="text-sm text-gray-500 py-2">HenÃ¼z proje yok</div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {projects[workspace.id].map((project) => (
                                                                <div key={project.id} className="bg-white rounded-lg border border-gray-200">
                                                                    {/* Project Header */}
                                                                    <div className="p-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <button
                                                                                onClick={() => toggleProject(project.id)}
                                                                                className="flex items-center gap-2 flex-1 text-left hover:text-purple-600 transition"
                                                                            >
                                                                                <span className="text-sm">
                                                                                    {expandedProjects.has(project.id) ? 'â–¼' : 'â–¶'}
                                                                                </span>
                                                                                <span className="text-2xl">ğŸ“Š</span>
                                                                                <span className="font-semibold text-gray-900">
                                                                                    {project.name}
                                                                                </span>
                                                                            </button>
                                                                            <div className="flex items-center gap-2">
                                                                                <Link
                                                                                    href={`/boards/new?project=${project.id}`}
                                                                                    className="px-2 py-1 text-xs bg-white text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition font-medium"
                                                                                >
                                                                                    + Pano
                                                                                </Link>
                                                                                <span className="px-2 py-1 text-xs bg-white border border-gray-200 text-gray-700 rounded-lg hidden sm:inline-block">
                                                                                    {user?.role === 'admin' ? 'ğŸ›¡ï¸' : 'ğŸ‘¤'} {user?.firstName || 'Bilinmiyor'}
                                                                                </span>
                                                                                <Link
                                                                                    href={`/projects/${project.id}`}
                                                                                    className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition"
                                                                                >
                                                                                    GÃ¶rÃ¼ntÃ¼le
                                                                                </Link>
                                                                                <button
                                                                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition text-sm"
                                                                                    title="Sil"
                                                                                >
                                                                                    ğŸ—‘ï¸
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Boards (if expanded) */}
                                                                    {expandedProjects.has(project.id) && (
                                                                        <div className="bg-gray-50 p-3 pl-10 border-t">
                                                                            {!boards[project.id] ? (
                                                                                <div className="text-xs text-gray-500">YÃ¼kleniyor...</div>
                                                                            ) : boards[project.id].length === 0 ? (
                                                                                <div className="text-xs text-gray-500">HenÃ¼z pano yok</div>
                                                                            ) : (
                                                                                <div className="space-y-2">
                                                                                    {boards[project.id].map((board) => (
                                                                                        <div
                                                                                            key={board.id}
                                                                                            className="bg-white rounded border border-gray-200 hover:border-blue-300 transition"
                                                                                        >
                                                                                            <div className="flex items-center justify-between p-2">
                                                                                                <Link
                                                                                                    href={`/boards/${board.id}`}
                                                                                                    className="flex items-center gap-2 flex-1 hover:text-blue-600 transition"
                                                                                                >
                                                                                                    <span className="text-xl">ğŸ“‹</span>
                                                                                                    <span className="text-sm font-medium text-gray-900">
                                                                                                        {board.name}
                                                                                                    </span>
                                                                                                </Link>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-lg">
                                                                                                        ğŸ‘¤ {user?.firstName || 'Bilinmiyor'}
                                                                                                    </span>
                                                                                                    <button
                                                                                                        onClick={(e) => handleDeleteBoard(e, board.id)}
                                                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition text-sm"
                                                                                                        title="Sil"
                                                                                                    >
                                                                                                        ğŸ—‘ï¸
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Task counts and previews by column */}
                                                                                            {tasks[board.id] && (
                                                                                                <div className="px-2 pb-2 pt-1 border-t border-gray-100">
                                                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                                                                        {getTaskCountsByColumn(board.id, board).map((col) => {
                                                                                                            let colorClass = 'border-gray-200 bg-gray-50';
                                                                                                            let textClass = 'text-gray-700';
                                                                                                            const lowerName = col.name.toLowerCase();
                                                                                                            const isTodo = lowerName.includes('yapÄ±lacak') || lowerName.includes('todo');

                                                                                                            if (isTodo) {
                                                                                                                colorClass = 'border-gray-200 bg-gray-50';
                                                                                                            } else if (lowerName.includes('devam') || lowerName.includes('progress')) {
                                                                                                                colorClass = 'border-blue-200 bg-blue-50';
                                                                                                                textClass = 'text-blue-800';
                                                                                                            } else if (lowerName.includes('tamam') || lowerName.includes('done')) {
                                                                                                                colorClass = 'border-green-200 bg-green-50';
                                                                                                                textClass = 'text-green-800';
                                                                                                            }

                                                                                                            // Get first few tasks for this column using ID directly
                                                                                                            const columnTasks = getFilteredTasks(board.id).filter(t => t.column_id === col.id);

                                                                                                            return (
                                                                                                                <DroppableColumn key={col.id} id={col.id} className={`rounded-lg border ${colorClass} p-2 h-full flex flex-col`}>
                                                                                                                    <div className={`flex items-center justify-between mb-1 ${textClass}`}>
                                                                                                                        <span className="font-semibold text-xs">{col.name}</span>
                                                                                                                        <div className="flex items-center gap-1">
                                                                                                                            <span className="text-xs bg-white/50 px-1.5 rounded font-bold">{col.count}</span>
                                                                                                                            <Link
                                                                                                                                href={`/tasks/new?board=${board.id}&column=${col.id}`}
                                                                                                                                className="text-xs hover:bg-white/50 rounded px-1 transition font-bold"
                                                                                                                                title="Yeni gÃ¶rev"
                                                                                                                            >
                                                                                                                                +
                                                                                                                            </Link>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    <SortableContext
                                                                                                                        id={col.id}
                                                                                                                        items={columnTasks.map(t => t.id)}
                                                                                                                        strategy={verticalListSortingStrategy}
                                                                                                                    >
                                                                                                                        <div className="space-y-1 min-h-[50px]">
                                                                                                                            {columnTasks.slice(0, 5).map(task => {
                                                                                                                                // Determine displayedUser
                                                                                                                                let displayedUser = null;
                                                                                                                                let fallbackText = null;

                                                                                                                                // Helper to find user efficiently
                                                                                                                                const findUser = (id: string) => {
                                                                                                                                    if (!id) return null;
                                                                                                                                    // 1. Check current logged-in user
                                                                                                                                    if (user && user.id === id) return { id: user.id, first_name: user.firstName, last_name: '', email: '' }; // Map generic user to format
                                                                                                                                    // 2. Check loaded users list
                                                                                                                                    return users.find(u => u.id === id);
                                                                                                                                };

                                                                                                                                if (isTodo) {
                                                                                                                                    const creator = task.creator || findUser(task.created_by);
                                                                                                                                    if (creator) {
                                                                                                                                        displayedUser = creator;
                                                                                                                                    } else {
                                                                                                                                        fallbackText = 'Bilinmeyen';
                                                                                                                                    }
                                                                                                                                } else {
                                                                                                                                    if (task.assignee) {
                                                                                                                                        displayedUser = task.assignee;
                                                                                                                                    } else if (task.assignee_id) {
                                                                                                                                        const assignee = findUser(task.assignee_id);
                                                                                                                                        if (assignee) {
                                                                                                                                            displayedUser = assignee;
                                                                                                                                        } else {
                                                                                                                                            fallbackText = 'BulunamadÄ±';
                                                                                                                                        }
                                                                                                                                    } else {
                                                                                                                                        fallbackText = 'AtanmamÄ±ÅŸ';
                                                                                                                                    }
                                                                                                                                }

                                                                                                                                // Create a temporary user object for fallback if needed
                                                                                                                                if (!displayedUser && fallbackText) {
                                                                                                                                    // If user is truly unknown, we still want to render something clean.
                                                                                                                                    // Maybe just empty string if "Bilinmeyen" is annoying? 
                                                                                                                                    // But user said "write user name".
                                                                                                                                    // If we can't find it, we can't write it. 
                                                                                                                                    // But maybe the "Bilinmeyen" is showing up too aggressively.
                                                                                                                                    displayedUser = { first_name: fallbackText, last_name: '' } as any;
                                                                                                                                }

                                                                                                                                return (
                                                                                                                                    <SortableDashboardTask
                                                                                                                                        key={task.id}
                                                                                                                                        task={task}
                                                                                                                                        boardId={board.id}
                                                                                                                                        displayedUser={displayedUser}
                                                                                                                                    />
                                                                                                                                );
                                                                                                                            })}
                                                                                                                            {columnTasks.length === 0 && (
                                                                                                                                <div className="text-xs text-gray-400 italic text-center py-2 opacity-50">SÃ¼rÃ¼kle</div>
                                                                                                                            )}
                                                                                                                            {columnTasks.length > 5 && (
                                                                                                                                <div className="text-xs text-gray-500 text-center">+ {columnTasks.length - 5} daha</div>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    </SortableContext>
                                                                                                                </DroppableColumn>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <DragOverlay>
                            {activeTask ? (
                                <SortableDashboardTask task={activeTask} boardId="overlay" />
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    <ConfirmationModal
                        isOpen={modalOpen}
                        title="AÅŸama DeÄŸiÅŸikliÄŸi"
                        message={`"${pendingMove?.taskTitle}" iÅŸlemi "${pendingMove?.sourceColumnName}" aÅŸamasÄ±ndan "${pendingMove?.targetColumnName}" aÅŸamasÄ±na geÃ§ecektir. OnaylÄ±yor musunuz?`}
                        onConfirm={confirmMove}
                        onCancel={cancelMove}
                    />
                </main>
            </div>
        </div>
    );
}
