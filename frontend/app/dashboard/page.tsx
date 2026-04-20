'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { decodeToken, hasOrganizationContext } from '@/lib/token';
import { apiClient, type Workspace, type Project, type Board, type Task } from '@/lib/api';
import { isAuthGracePeriod, traceRedirect } from '@/lib/auth-util';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import MobileDashboard from '@/components/MobileDashboard';
import ConfirmationModal from '@/components/ConfirmationModal';
import { SortableDashboardTask } from '@/components/SortableDashboardTask';
import { TaskFilterBar } from '@/components/TaskFilterBar';
import toast from 'react-hot-toast';
import WorkspaceModal from '@/components/WorkspaceModal';
import ProjectModal from '@/components/ProjectModal';
import BoardModal from '@/components/BoardModal';
import TaskModal from '@/components/TaskModal';
import TaskViewModal from '@/components/TaskViewModal';
import OnboardingTour from '@/components/OnboardingTour';
import { Plus } from 'lucide-react';
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
    closestCorners,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

import { DroppableColumn } from '@/components/DroppableColumn';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Local Sortable Column Component
function SortableDashboardColumn({ id, children, name, count, onAddClick, isActiveTarget }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: id,
        data: {
            type: 'Column',
            name
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex-1 min-w-[280px] group transition-all duration-300 ${isActiveTarget ? 'scale-[1.03] z-10' : 'scale-100'}`}>
            <div className={`bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] border-2 p-5 min-h-[500px] flex flex-col transition-all duration-300 ${
                isActiveTarget 
                    ? 'border-indigo-500 bg-indigo-50/10 shadow-2xl shadow-indigo-500/10' 
                    : isDragging 
                        ? 'ring-2 ring-indigo-500/50 shadow-2xl bg-white dark:bg-gray-900 border-indigo-200' 
                        : 'border-gray-100 dark:border-gray-800'
            }`}>
                <div className="flex items-center justify-between mb-6 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
                    <div className="flex items-center gap-3">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActiveTarget ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-500'}`} />
                        <span className={`font-black text-[11px] uppercase tracking-[0.2em] ${isActiveTarget ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`}>{name}</span>
                        <span className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full text-[10px] font-black text-gray-400 shadow-sm">{count}</span>
                    </div>
                    <button 
                        onClick={onAddClick}
                        className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group-hover:scale-110"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

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
    const initialLoadRef = useRef(true);


    // Modal states
    const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');
    const [selectedColumnId, setSelectedColumnId] = useState<string>('');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedTaskForView, setSelectedTaskForView] = useState<Task | null>(null);
    const [isTaskViewModalOpen, setIsTaskViewModalOpen] = useState(false);

    // Filter State
    const [filters, setFilters] = useState<{ assigneeId: string | null; priority: string | null }>({
        assigneeId: null,
        priority: null
    });

    const handleFilterChange = (key: 'assigneeId' | 'priority', value: string | null) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Name formatting helper: Proper Case (Hasret İşler)
    const formatName = (firstName: string = '', lastName: string = '') => {
        if (!firstName && !lastName) return 'Bilinmeyen Kullanıcı';
        const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
        return `${capitalize(firstName)} ${capitalize(lastName)}`.trim();
    };

    // Creator Badge Helper (Finds user in global state to ensure photo is shown)
    const renderCreatorBadge = (creatorId: string) => {
        const creator = users.find(u => u.id === creatorId);
        if (!creator) return null;
        
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:border-indigo-100">
                {creator.avatar_url ? (
                    <img src={apiClient.getFileUrl(creator.avatar_url)} alt="Creator" className="w-5 h-5 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-black uppercase">
                        {(creator.first_name || 'U')[0]}
                    </div>
                )}
                <span className="text-[10px] font-black text-indigo-900/60 dark:text-gray-300 tracking-widest px-1">
                    {formatName(creator.first_name, creator.last_name)}
                </span>
            </div>
        );
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
    const [activeColumn, setActiveColumn] = useState<{ id: string, name: string, count: number } | null>(null);
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
                distance: 8, // Increased distance for pointer to avoid accidental drags
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

    // Generic Confirmation State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'danger'
    });

    // Track which column is being dragged over for visual feedback
    const [activeOverColumnId, setActiveOverColumnId] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            if (isAuthGracePeriod()) {
                console.log('[DashboardGuard] Token yok ama Hoşgörü Süresi içinde; yönlendirme ertelendi.');
                return;
            }
            traceRedirect('/login', 'Dashboard page guard: No token found');
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

        // Clear task notifications when visiting dashboard
        const clearTaskNotifications = async () => {
            try {
                await apiClient.markNotificationsAsReadByType('task');
                window.dispatchEvent(new CustomEvent('refresh-counts'));
            } catch (err) {
                console.error('Bildirimler temizlenemedi:', err);
            }
        };
        clearTaskNotifications();
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

            setUsers(data || []);

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
            console.error('Kullanıcılar yüklenirken hata:', error);
        }
    };

    const loadWorkspaces = async () => {
        try {
            const data = await apiClient.listWorkspaces();
            setWorkspaces(data || []);
            // Auto-expand all workspaces on first load or refresh
            if (data && data.length > 0) {
                if (initialLoadRef.current) {
                    setExpandedWorkspaces(prev => {
                        const next = new Set(prev);
                        data.forEach(w => next.add(w.id));
                        return next;
                    });
                }
                // Also trigger project loading for these workspaces
                data.forEach(w => loadProjectsForWorkspace(w.id));
            }
            if (initialLoadRef.current) {
                initialLoadRef.current = false;
            }
        } catch (error) {
            console.error('Çalışma alanları yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProjectsForWorkspace = async (workspaceId: string, force = false) => {
        if (!force && projects[workspaceId]) return; // Already loaded

        try {
            const data = await apiClient.listProjectsByWorkspace(workspaceId);
            setProjects(prev => ({ ...prev, [workspaceId]: data || [] }));
            // Auto-expand all projects
            if (data && data.length > 0) {
                // Sadece ilk yüklemede veya daha önce hiç proje genişletilmemişse otomatik genişlet
                setExpandedProjects(prev => {
                    if (prev.size === 0) {
                        const next = new Set(prev);
                        data.forEach(p => next.add(p.id));
                        return next;
                    }
                    return prev;
                });
                // Also trigger board loading
                data.forEach(p => loadBoardsForProject(p.id));
            }
        } catch (error) {
            console.error('Projeler yüklenirken hata:', error);
        }
    };

    const loadBoardsForProject = async (projectId: string, force = false) => {
        if (!force && boards[projectId]) return; // Already loaded

        try {
            const data = await apiClient.listBoardsByProject(projectId);
            setBoards(prev => ({ ...prev, [projectId]: data || [] }));

            // Load tasks for each board
            for (const board of data) {
                loadTasksForBoard(board.id);
            }
        } catch (error) {
            console.error('Panolar yüklenirken hata:', error);
        }
    };

    const loadTasksForBoard = async (boardId: string, force = false) => {
        if (!force && tasks[boardId]) return; // Already loaded

        try {
            const data = await apiClient.listTasksByBoard(boardId);
            setTasks(prev => ({ ...prev, [boardId]: data || [] }));
        } catch (error) {
            console.error('Görevler yüklenirken hata:', error);
        }
    };

    const getTaskCountsByColumn = (boardId: string, board: Board) => {
        const boardTasks = getFilteredTasks(boardId);
        const columns = board.columns || [];

        // Define expected 3 columns
        const defaultNames = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];
        
        // Map existing columns to these 3 slots based on name
        const resultSlots = defaultNames.map(name => {
            const found = columns.find(c => {
                const lower = c.name.toLowerCase();
                if (name === 'Yapılacak' && (lower.includes('yapılacak') || lower.includes('todo'))) return true;
                if (name === 'Devam Ediyor' && (lower.includes('devam') || lower.includes('progress'))) return true;
                if (name === 'Tamamlandı' && (lower.includes('tamam') || lower.includes('done'))) return true;
                return false;
            });
            
            return {
                id: found?.id || `fallback-${name}-${boardId}`,
                name: name,
                count: found ? boardTasks.filter(task => task.column_id === found.id).length : 0,
                realId: found?.id
            };
        });

        return resultSlots;
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

    const handleDeleteWorkspace = (e: React.MouseEvent, workspaceId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: 'Çalışma Alanını Sil',
            message: 'Bu çalışma alanı ve içindeki tüm projeler silinecek. Bu işlem geri alınamaz.',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await apiClient.deleteWorkspace(workspaceId);
                    loadWorkspaces();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    toast.error('Silme işlemi başarısız oldu');
                }
            }
        });
    };

    const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: 'Projeyi Sil',
            message: 'Bu proje ve içindeki tüm panolar silinecek. Emin misiniz?',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await apiClient.deleteProject(projectId);
                    loadWorkspaces();
                    setProjects({});
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    toast.error('Silme işlemi başarısız oldu');
                }
            }
        });
    };

    const handleDeleteBoard = (e: React.MouseEvent, boardId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: 'Panoyu Sil',
            message: 'Bu pano silinecek. Emin misiniz?',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await apiClient.deleteBoard(boardId);
                    setBoards({});
                    setProjects({});
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    toast.error('Silme işlemi başarısız oldu');
                }
            }
        });
    };

    const getTotalProjects = () => {
        return Object.values(projects).reduce((sum, projectList) => sum + projectList.length, 0);
    };

    const getTotalBoards = () => {
        return Object.values(boards).reduce((sum, boardList) => sum + boardList.length, 0);
    };

    const handleAddTaskClick = async (boardId: string, col: { id: string, name: string, realId?: string, count: number }) => {
        setSelectedBoardId(boardId);
        
        if (!col.realId) {
            const defaultNames = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];
            const position = defaultNames.indexOf(col.name);
            
            try {
                const newCol = await apiClient.createColumn(boardId, col.name, position >= 0 ? position : 0);
                setSelectedColumnId(newCol.id);
                loadBoardsForProject(selectedProjectId || ''); 
            } catch (error) {
                console.error('Sütun oluşturulamadı:', error);
                toast.error('Sütun oluşturulamadı');
                return;
            }
        } else {
            setSelectedColumnId(col.realId);
        }
        setIsTaskModalOpen(true);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const type = active.data.current?.type;

        if (type === 'Task') {
            let task: Task | undefined;
            for (const boardTasks of Object.values(tasks)) {
                task = boardTasks.find(t => t.id === active.id);
                if (task) break;
            }
            if (task) {
                setPreDragTasksState(JSON.parse(JSON.stringify(tasks)));
                setActiveTask(task);
            }
        } else if (type === 'Column') {
            setActiveColumn({
                id: active.id as string,
                name: active.data.current?.name,
                count: 0 // Will be handled in overlay if needed
            });
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (activeType === 'Column' || overType === 'Column' && activeType !== 'Task') return;

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

        const isOverTask = overType === 'Task';
        const isOverColumn = overType === 'Column';

        if (isOverTask) {
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

            if (!overTask || overBoardId !== activeBoardId) return;
            
            // Set active over column for visual feedback
            setActiveOverColumnId(overTask.column_id);

            if (activeTask.column_id !== overTask.column_id) {
                setTasks((prev) => {
                    const boardTasks = [...(prev[activeBoardId!] || [])];
                    const activeIndex = boardTasks.findIndex((t) => t.id === activeId);
                    const overIndex = boardTasks.findIndex((t) => t.id === overId);
                    
                    if (activeIndex === -1 || overIndex === -1) return prev;
                    
                    const updatedTasks = [...boardTasks];
                    updatedTasks[activeIndex] = { ...updatedTasks[activeIndex], column_id: overTask!.column_id };
                    return { ...prev, [activeBoardId!]: arrayMove(updatedTasks, activeIndex, overIndex) };
                });
            }
        } else if (isOverColumn) {
            // Set active over column for visual feedback
            setActiveOverColumnId(overId as string);

            // Check if column is in same board
            const allBoards = Object.values(boards).flat();
            const board = allBoards.find(b => b.columns?.some(c => c.id === overId));
            
            if (board && board.id === activeBoardId && activeTask.column_id !== overId) {
                setTasks((prev) => {
                    const boardTasks = [...(prev[activeBoardId!] || [])];
                    const activeIndex = boardTasks.findIndex((t) => t.id === activeId);
                    if (activeIndex === -1) return prev;
                    
                    const updatedTasks = [...boardTasks];
                    updatedTasks[activeIndex] = { ...updatedTasks[activeIndex], column_id: overId as string };
                    return { ...prev, [activeBoardId!]: updatedTasks };
                });
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        setActiveColumn(null);
        setActiveOverColumnId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // COLUMN SORTING
        if (active.data.current?.type === 'Column') {
            const activeColId = activeId as string;
            const overColId = overId as string;

            if (activeColId !== overColId) {
                let targetBoard: Board | undefined;
                let projectKey: string | undefined;
                
                // Find which board includes these columns
                for (const [pId, bList] of Object.entries(boards)) {
                    const found = bList.find(b => b.columns?.some(c => c.id === activeColId));
                    if (found) {
                        targetBoard = found;
                        projectKey = pId;
                        break;
                    }
                }

                if (targetBoard && projectKey) {
                    const columns = [...(targetBoard.columns || [])];
                    const oldIndex = columns.findIndex(c => c.id === activeColId);
                    const newIndex = columns.findIndex(c => c.id === overColId);

                    if (oldIndex !== -1 && newIndex !== -1) {
                        const newColumns = arrayMove(columns, oldIndex, newIndex);
                        
                        // Optimistic Update
                        setBoards(prev => {
                            const list = [...(prev[projectKey!] || [])];
                            const idx = list.findIndex(b => b.id === targetBoard!.id);
                            if (idx !== -1) {
                                list[idx] = { ...list[idx], columns: newColumns };
                            }
                            return { ...prev, [projectKey!]: list };
                        });

                        try {
                            // Update all column positions in background
                            await Promise.all(newColumns.map((col, idx) => 
                                apiClient.updateColumn(targetBoard!.id, col.id, { 
                                    name: col.name, 
                                    position: idx 
                                })
                            ));
                            toast.success('Görünüm güncellendi');
                        } catch (err) {
                            console.error("Column sort failed", err);
                            toast.error("Sıralama kaydedilemedi");
                            // Revert on failure
                            loadBoardsForProject(projectKey!);
                        }
                    }
                }
            }
            return;
        }

        // TASK SORTING
        if (active.data.current?.type === 'Task') {
            const activeBoardId = active.data.current?.boardId;
            if (!activeBoardId) return;

            // Final state check
            setTasks(prev => {
                const boardTasks = [...(prev[activeBoardId] || [])];
                const activeIndex = boardTasks.findIndex(t => t.id === activeId);
                if (activeIndex === -1) return prev;

                const activeTask = boardTasks[activeIndex];
                let finalColumnId = activeTask.column_id;
                let finalIndexInCol = 0;

                const overType = over.data.current?.type;
                if (overType === 'Task') {
                    const overTask = boardTasks.find(t => t.id === overId);
                    if (overTask) {
                        finalColumnId = overTask.column_id;
                        const colTasks = boardTasks.filter(t => t.column_id === finalColumnId && t.id !== activeId);
                        const overInColIdx = colTasks.findIndex(t => t.id === overId);
                        finalIndexInCol = overInColIdx >= 0 ? overInColIdx : 0;
                    }
                } else if (overType === 'Column') {
                    finalColumnId = overId as string;
                    finalIndexInCol = 0;
                }

                // --- Handle Fallback Column Creation on Drag ---
                const finalizeTaskMove = async (realColId: string) => {
                    updateTaskPosition(activeId as string, realColId, finalIndexInCol, activeTask);
                };

                if (finalColumnId.startsWith('fallback-')) {
                    // This is a virtual column, create it first
                    const parts = finalColumnId.split('-');
                    const colName = parts[1]; // fallback-Name-BoardId
                    
                    (async () => {
                        try {
                            const newCol = await apiClient.createColumn(activeBoardId, colName, 0);
                            // Update local state to replace fallback ID with real ID
                            setTasks(current => {
                                const bTasks = [...(current[activeBoardId] || [])];
                                const updatedTasks = bTasks.map(t => 
                                    t.column_id === finalColumnId ? { ...t, column_id: newCol.id } : t
                                );
                                return { ...current, [activeBoardId]: updatedTasks };
                            });
                            // Resolve the correct project ID by searching through the boards state
                            const actualProjectId = Object.keys(boards).find(pId => 
                                boards[pId].some(b => b.id === activeBoardId)
                            );

                            if (actualProjectId) {
                                // Reload board structure to get the new column in 'boards' state
                                loadBoardsForProject(actualProjectId, true);
                            }
                            
                            // Now we can finalize with the real ID
                            finalizeTaskMove(newCol.id);
                        } catch (err) {
                            console.error("Auto-column creation failed", err);
                            toast.error("Sütun otomatik oluşturulamadı");
                        }
                    })();
                } else {
                    // Regular column, just finalize
                    setTimeout(() => {
                        finalizeTaskMove(finalColumnId);
                    }, 0);
                }

                return prev; 
            });
            
            setPreDragTasksState(null);
        }
    };

    const updateTaskPosition = async (taskId: string, columnId: string, position: number, task: Task, newAssigneeId?: string) => {
        try {
            const updatedTask = await apiClient.updateTask(taskId, {
                title: task.title,
                description: task.description || '',
                priority: (task.priority || 'medium').toLowerCase(),
                column_id: columnId,
                position: position,
                assignee_id: newAssigneeId || task.assignee_id,
                due_date: task.due_date,
            });

            setTasks(prev => {
                const boardTasks = [...(prev[task.board_id] || [])];
                const taskIndex = boardTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    // MAPPING: Ensure nested objects (assignee, creator) are strictly preserved
                    const oldTask = boardTasks[taskIndex];
                    boardTasks[taskIndex] = { 
                        ...oldTask, 
                        ...updatedTask,
                        assignee: updatedTask.assignee || oldTask.assignee, // Keep old assignee object if new one is missing
                        creator: updatedTask.creator || oldTask.creator    // Keep old creator object if new one is missing
                    };
                }
                return { ...prev, [task.board_id]: boardTasks };
            });
        } catch (error) {
            console.error("Failed to move task", error);
            if (preDragTasksState) {
                setTasks(preDragTasksState);
            } else {
                loadTasksForBoard(task.board_id);
            }
            toast.error("Görev taşınamadı");
        }
    };

    const handleDeleteTask = async (e: React.MouseEvent, taskId: string, boardId: string) => {
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: 'Görevi Sil',
            message: 'Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await apiClient.deleteTask(taskId);
                    setTasks(prev => {
                        const boardTasks = (prev[boardId] || []).filter(t => t.id !== taskId);
                        return { ...prev, [boardId]: boardTasks };
                    });
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    toast.success('Görev silindi');
                } catch (error) {
                    toast.error('Silme işlemi başarısız oldu');
                }
            }
        });
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
        if (pendingMove?.originalTasks) {
            setTasks(pendingMove.originalTasks);
        }
        setPendingMove(null);
        setPreDragTasksState(null);
    };

    const dashboardContent = (
        <>
            {/* Summary Cards */}
            <div id="guide-summary" className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 leading-none">Çalışma Alanları</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-none truncate">{workspaces.length}</h3>
                    </div>
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl shadow-inner border border-indigo-100/50 dark:border-indigo-800/50 shrink-0">📁</div>
                </div>
                <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 leading-none">Projeler</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-none truncate">{getTotalProjects()}</h3>
                    </div>
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl shadow-inner border border-emerald-100/50 dark:border-emerald-800/50 shrink-0">📊</div>
                </div>
                <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 leading-none">Panolar</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-none truncate">{getTotalBoards()}</h3>
                    </div>
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl shadow-inner border border-amber-100/50 dark:border-amber-800/50 shrink-0">📋</div>
                </div>
                <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1 leading-none">Aktif Görevler</p>
                        <h3 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-none truncate">{Object.values(tasks).flat().length}</h3>
                    </div>
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 dark:bg-rose-900/30 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-3xl shadow-inner border border-rose-100/50 dark:border-rose-800/50 shrink-0">✅</div>
                </div>
            </div>

            <TaskFilterBar 
                assignees={users} 
                onFilterChange={handleFilterChange} 
                filters={filters}
                currentUserId={user?.id}
                currentUserDept={user?.department}
                currentUserAvatar={user?.avatar_url}
            />

            {/* Hiyerarşik Görünüm */}
            <div id="guide-kanban" className="bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden mb-20">
                <div className="p-6 md:p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">Çalışma Alanları</h2>
                    <button
                        onClick={() => setIsWorkspaceModalOpen(true)}
                        className="h-10 md:h-12 px-6 bg-indigo-600 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        + Yeni Çalışma Alanı
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {workspaces.map(workspace => (
                        <div key={workspace.id} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                            {/* Workspace Row */}
                            <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <button 
                                        onClick={() => toggleWorkspace(workspace.id)}
                                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0"
                                    >
                                        {expandedWorkspaces.has(workspace.id) ? '▼' : '▶'}
                                    </button>
                                    <span className="text-2xl shrink-0">📁 </span>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 dark:text-white tracking-tight truncate">{workspace.name}</h3>
                                        <p className="text-xs text-gray-400 font-medium truncate">{workspace.description || 'Bu çalışma alanında projeleriniz yer almaktadır.'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between md:justify-end gap-4 ml-0 md:ml-4">
                                    <div className="hidden sm:block">{renderCreatorBadge(workspace.created_by)}</div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => { setSelectedWorkspaceId(workspace.id); setIsProjectModalOpen(true); }}
                                            className="h-9 px-4 border border-indigo-100 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 transition whitespace-nowrap"
                                        >
                                            + Proje
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteWorkspace(e, workspace.id)}
                                            className="h-9 w-9 flex items-center justify-center border border-rose-100 text-rose-500 rounded-lg hover:bg-rose-50 transition shrink-0"
                                        >
                                            🗑️ 
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Projects Section */}
                            {expandedWorkspaces.has(workspace.id) && projects[workspace.id]?.map(project => (
                                <div key={project.id} className="ml-4 md:ml-12 mr-4 md:mr-6 mb-4 border border-gray-50 dark:border-gray-800 rounded-xl bg-gray-50/30 dark:bg-gray-800/10">
                                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white dark:hover:bg-gray-800/30 transition rounded-t-xl">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <button 
                                                onClick={() => toggleProject(project.id)}
                                                className="w-8 h-8 flex items-center justify-center text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition shrink-0"
                                            >
                                                {expandedProjects.has(project.id) ? '▼' : '▶'}
                                            </button>
                                            <div className="flex items-center gap-3 truncate">
                                                <span className="text-xl shrink-0">📊</span>
                                                <h4 className="font-black text-gray-800 dark:text-gray-200 tracking-tight truncate">{project.name}</h4>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between md:justify-end gap-4 ml-0 md:ml-4">
                                            <div className="hidden sm:block">{renderCreatorBadge(project.created_by)}</div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => { setSelectedProjectId(project.id); setIsBoardModalOpen(true); }}
                                                    className="h-8 px-3 border border-indigo-100 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-50 transition whitespace-nowrap"
                                                >
                                                    + Pano
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                                    className="h-8 w-8 flex items-center justify-center border border-rose-100 text-rose-500 rounded-lg hover:bg-rose-50 transition shrink-0"
                                                >
                                                    🗑️ 
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Boards Section */}
                                    {expandedProjects.has(project.id) && (
                                        <div className="p-4 space-y-6">
                                            {boards[project.id]?.map(board => (
                                                <div key={board.id} className="bg-white dark:bg-gray-900 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 dark:border-gray-800 p-4 md:p-8 shadow-sm overflow-hidden mb-6 last:mb-0">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0">📋</div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-black text-gray-900 dark:text-white tracking-tight truncate">{board.name}</h4>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pano Görünümü</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-between md:justify-end gap-4 ml-0 md:ml-4">
                                                            <div className="hidden sm:block">{renderCreatorBadge(board.created_by)}</div>
                                                            <button 
                                                                onClick={(e) => handleDeleteBoard(e, board.id)}
                                                                className="h-10 w-10 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all shrink-0"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCorners}
                                                        onDragStart={handleDragStart}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={handleDragOver}
                                                    >
                                                        <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 custom-scrollbar min-w-full">
                                                            {getTaskCountsByColumn(board.id, board).map(col => (
                                                                <SortableDashboardColumn
                                                                    key={col.id}
                                                                    id={col.realId || col.id}
                                                                    name={col.name}
                                                                    count={col.count}
                                                                    onAddClick={() => handleAddTaskClick(board.id, col)}
                                                                    isActiveTarget={activeOverColumnId === (col.realId || col.id)}
                                                                >
                                                                    <SortableContext
                                                                        id={col.realId || col.id}
                                                                        items={getFilteredTasks(board.id).filter(t => t.column_id === (col.realId || col.id)).map(t => t.id)}
                                                                        strategy={verticalListSortingStrategy}
                                                                    >
                                                                        <div className="space-y-4 min-h-[250px] pt-2">
                                                                            {getFilteredTasks(board.id).filter(t => t.column_id === (col.realId || col.id)).map(task => (
                                                                                <SortableDashboardTask 
                                                                                    key={task.id} 
                                                                                    task={task} 
                                                                                    boardId={board.id}
                                                                                    displayedUser={(() => {
                                                                                        // PRIORITY: Robust user matching to prevent avatar loss during drag
                                                                                        if (task.assignee && typeof task.assignee === 'object' && task.assignee.avatar_url) return task.assignee;
                                                                                        if (task.assignee_id) return users.find(u => u.id === task.assignee_id);
                                                                                        return task.assignee;
                                                                                    })()}
                                                                                    onDelete={(e) => handleDeleteTask(e, task.id, board.id)}
                                                                                    onView={(t) => { setSelectedTaskForView(t); setIsTaskViewModalOpen(true); }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </SortableContext>
                                                                </SortableDashboardColumn>
                                                            ))}
                                                        </div>
                                                    </DndContext>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Drag Overlay for Kanban Items */}
                <DragOverlay zIndex={200}>
                    {activeTask ? (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-indigo-500 shadow-2xl cursor-grabbing w-[250px] rotate-2 transition-transform">
                            <p className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-2">{activeTask.title}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Taşınıyor...</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
        </>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600 font-bold animate-pulse">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-0 md:px-0">
            <MobileDashboard>
                <div className="mt-8 px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 px-4">GÖREV DAĞILIMI</h3>
                    {dashboardContent}
                </div>
            </MobileDashboard>

            <div className="hidden md:flex h-screen overflow-hidden">
                <LeftSidebar />

                <main className="flex-1 md:ml-80 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
                    <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md md:bg-transparent md:backdrop-blur-none">
                        <TopNavbar userName={user?.firstName} />
                    </div>
                    
                    <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
                        {dashboardContent}
                    </div>
                </main>
            </div>

            {/* Modals */}
            <TaskViewModal 
                task={selectedTaskForView}
                isOpen={isTaskViewModalOpen}
                onClose={() => setIsTaskViewModalOpen(false)}
            />
            <WorkspaceModal 
                isOpen={isWorkspaceModalOpen} 
                onClose={() => setIsWorkspaceModalOpen(false)} 
                onSuccess={() => loadWorkspaces()}
                users={users}
            />
            <ProjectModal 
                isOpen={isProjectModalOpen} 
                onClose={() => setIsProjectModalOpen(false)} 
                onSuccess={() => loadProjectsForWorkspace(selectedWorkspaceId, true)}
                workspaceId={selectedWorkspaceId}
                users={users}
            />
            <BoardModal 
                isOpen={isBoardModalOpen} 
                onClose={() => setIsBoardModalOpen(false)} 
                onSuccess={() => loadBoardsForProject(selectedProjectId, true)}
                projectId={selectedProjectId}
                users={users}
            />
            <TaskModal 
                isOpen={isTaskModalOpen} 
                onClose={() => setIsTaskModalOpen(false)} 
                onSuccess={() => loadTasksForBoard(selectedBoardId, true)}
                boardId={selectedBoardId}
                columnId={selectedColumnId}
                users={users}
            />

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
