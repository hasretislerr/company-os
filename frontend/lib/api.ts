export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
export const STORAGE_URL = API_BASE_URL.replace('/api', '');

import { isAuthGracePeriod, traceRedirect } from './auth-util';

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    bio?: string;
    avatar_url?: string;
    theme?: 'light' | 'dark';
    email_notifications?: boolean;
    push_notifications?: boolean;
    activity_summary?: boolean;
    role?: string;
    department?: string;
    last_seen?: string;
    created_at: string;
    updated_at: string;
}


export interface AuthResponse {
    token: string;
    user: User;
}

export interface RegisterRequest {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    plan_type: string;
    created_by: string;
    creator_first_name?: string;
    creator_last_name?: string;
}

export interface SelectOrganizationResponse {
    token: string;
    organization: Organization;
}

export interface Workspace {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    creator_first_name?: string;
    creator_last_name?: string;
    creator_avatar_url?: string;
}

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
}

export interface UpdateWorkspaceRequest {
    name: string;
    description?: string;
}

export interface Project {
    id: string;
    organization_id: string;
    workspace_id: string;
    name: string;
    description?: string;
    status: string; // 'active' | 'completed' | 'archived'
    created_by: string;
    created_at: string;
    updated_at: string;
    creator_first_name?: string;
    creator_last_name?: string;
    creator_avatar_url?: string;
}

export interface CreateProjectRequest {
    workspace_id: string;
    name: string;
    description?: string;
    status?: string;
}

export interface UpdateProjectRequest {
    name: string;
    description?: string;
    status?: string;
}

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
    id: string;
    user_id: string;
    user?: User;
    organization_id: string;
    type: string;
    start_date: string;
    end_date: string;
    status: LeaveRequestStatus;
    reason: string;
    rejection_reason?: string;

    // Multi-stage approval fields
    manager_status: LeaveRequestStatus;
    manager_approved_by?: string;
    manager_approved_at?: string;
    hr_status: LeaveRequestStatus;
    hr_approved_by?: string;
    hr_approved_at?: string;

    created_at: string;
    updated_at: string;
}

export type ChatRoomType = 'channel' | 'direct';

export interface ChatRoom {
    id: string;
    organization_id: string;
    name: string;
    type: ChatRoomType;
    created_at: string;
    members?: User[];
    last_message?: ChatMessage;
}


export interface ChatMessage {
    id: string;
    chat_room_id: string;
    sender_id: string;
    sender?: User;
    content: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
    file_url?: string;
    status: 'sent' | 'delivered' | 'read';
    created_at: string;
}

export interface CreateChatRoomRequest {
    name: string;
    type: ChatRoomType;
    member_ids?: string[];
}



export interface CreateLeaveRequestInput {
    type: string;
    start_date: string;
    end_date: string;
    reason: string;
}


export interface BoardColumn {
    id: string;
    board_id: string;
    name: string;
    position: number;
}

export interface Board {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    type: string; // 'kanban' | 'scrum'
    created_by: string;
    created_at: string;
    updated_at: string;
    creator_first_name?: string;
    creator_last_name?: string;
    creator_avatar_url?: string;
    columns?: BoardColumn[];
}

export interface CreateBoardRequest {
    project_id: string;
    name: string;
    description?: string;
    type?: string;
    columns?: string[];
}

export interface UpdateBoardRequest {
    name: string;
    description?: string;
    type?: string;
}

export interface UpdateColumnRequest {
    name: string;
    position: number;
}

export interface Announcement {
    id: string;
    organization_id: string;
    author_id: string;
    author_name?: string;
    author_avatar_url?: string;
    title: string;
    content: string;
    target_type: 'all' | 'multiple';
    target_departments?: string[];
    target_roles?: string[];
    priority: 'normal' | 'high';
    created_at: string;
}

export interface Notification {
    id: string;
    organization_id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    ref_id?: string;
    is_read: boolean;
    created_at: string;
}

export interface CreateAnnouncementRequest {
    title: string;
    content: string;
    target_type: 'all' | 'multiple';
    target_departments?: string[];
    target_roles?: string[];
    priority: 'normal' | 'high';
    send_email: boolean;
}

export interface Task {
    id: string;
    board_id: string;
    column_id: string;
    title: string;
    description?: string;
    priority: string; // 'low' | 'medium' | 'high' | 'critical'
    status: string;
    assignee_id?: string;
    assignee?: User;
    created_by: string;
    creator?: User;
    due_date?: string;
    position?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Meeting {
    id: string;
    organization_id: string;
    creator_id: string;
    title: string;
    description: string;
    start_time: string;
    end_time?: string;
    created_at: string;
    updated_at: string;
    participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
    meeting_id: string;
    user_id: string;
    user?: User;
    status: 'invited' | 'accepted' | 'declined';
    joined_at: string;
}

export interface CreateMeetingRequest {
    title: string;
    description: string;
    start_time: string;
    end_time?: string;
    member_ids: string[];
}

export interface CreateTaskRequest {
    board_id: string;
    column_id: string;
    title: string;
    description?: string;
    priority?: string;
    assignee_id?: string;
    due_date?: string;
    position?: number;
}

export interface UpdateTaskRequest {
    column_id?: string;
    title?: string;
    description?: string;
    priority?: string;
    assignee_id?: string;
    due_date?: string;
    position?: number;
}

export interface HelpdeskRequest {
    id: string;
    organization_id: string;
    creator_id: string;
    creator?: User;
    department: string;
    role_name: string;
    problem_type: string;
    description: string;
    status: string;
    is_escalated: boolean;
    created_at: string;
    updated_at: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    type: 'task' | 'meeting' | 'leave';
    start_date: string;
    end_date?: string;
    status: string;
    color?: string;
    ref_id: string;
}

export interface CreateHelpdeskRequest {
    department: string;
    role_name: string;
    problem_type: string;
    description: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    getFileUrl(path: string | undefined): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${STORAGE_URL}${path}`;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        let orgId = typeof window !== 'undefined' ? localStorage.getItem('organization_id') : null;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        };

        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (orgId) {
            headers['X-Organization-ID'] = orgId;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Hata ayıklama için her isteği logla
        if (typeof window !== 'undefined') {
            console.log(`[API] ${response.status} <- ${endpoint}`, {
                hasToken: !!token,
                hasOrg: !!orgId,
                tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
            });
        }

        if (!response.ok) {
            // Don't log out for webauthn errors - a failed biometric is NOT an auth token error
            const isWebAuthn = url.includes('/webauthn/');
            const errorText = await response.text();
            
            if (typeof window !== 'undefined') {
                if (response.status === 401 && !isWebAuthn) {
                    const sentAuth = headers['Authorization'];
                    const isAuthEndpoint = url.includes('/auth/google') || url.includes('/auth/login') || url.includes('/auth/register');
                    
                    // SADECE çok kritik uç noktalarda otomatik çıkış yaptır.
                    // Profil isteği en temel yetki göstergesidir.
                    const isCriticalEndpoint = url.includes('/users/profile');

                    if (sentAuth && 
                        sentAuth !== 'Bearer null' && 
                        sentAuth !== 'Bearer undefined' && 
                        sentAuth !== 'Bearer ' &&
                        !isAuthEndpoint &&
                        isCriticalEndpoint) { // Sadece kritik uç noktalarda yönlendir!
                        
                        const currentToken = localStorage.getItem('token');
                        if (currentToken === token) {
                            // KRİTİK: Koruma Kalkanı Kontrolü
                            if (isAuthGracePeriod()) {
                                console.log('[API] 401 algılandı ama HOŞGÖRÜ SÜRESİ (Grace Period) içinde olduğumuz için oturum korundu.');
                                throw new Error(`[401] Unauthorized (Grace Period Protected) for ${url}`);
                            }

                            traceRedirect('/login', `Kritik 401 Hatası: ${url}`);
                            localStorage.removeItem('token');
                            localStorage.removeItem('organization_id');
                            window.location.href = '/login';
                            await new Promise(() => {});
                        } else {
                            console.log('[API] 401 alındı ama token çoktan güncellenmiş; yönlendirme iptal edildi.');
                        }
                    } else {
                        // Kritik olmayan veya token içermeyen isteklerde sadece hata fırlat, oturumu kapatma.
                        console.log('[API] 401 alındı ancak güvenli modda oturum kapatılmadı:', { 
                            url, 
                            isCritical: isCriticalEndpoint,
                            hasToken: !!sentAuth 
                        });
                    }
                }
                
                // If user doesn't exist anymore, we must invalidate their session
                if (response.status === 404 && errorText.includes('User not found') && url.includes('/users/profile')) {
                    if (isAuthGracePeriod()) {
                        console.log('[API] 404 User Not Found algılandı ama HOŞGÖRÜ SÜRESİ içinde; oturum korundu.');
                        throw new Error(`[404] User Not Found (Grace Period Protected) for ${url}`);
                    }

                    traceRedirect('/login', `404 User Not Found: ${url}`);
                    localStorage.removeItem('token');
                    localStorage.removeItem('organization_id');
                    window.location.href = '/login';
                    await new Promise(() => {});
                }
            }
            
            throw new Error(`[${response.status}] ${errorText || 'Request failed'}`);
        }

        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {} as T;
        } catch (e) {
            console.error('JSON Parse Error for URL:', url);
            console.error('Response text started with:', text.substring(0, 100));
            throw new Error(`Invalid JSON response from ${url}`);
        }
    }


    async globalSearch(query: string): Promise<any[]> {
        return this.request<any[]>(`/search?q=${encodeURIComponent(query)}`);
    }

    async register(data: RegisterRequest): Promise<AuthResponse> {
        return this.request<AuthResponse>('/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        return this.request<AuthResponse>('/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async changePassword(current_password: string, new_password: string): Promise<{ message: string }> {
        return this.request<{ message: string }>('/users/change-password', {
            method: 'PUT',
            body: JSON.stringify({ current_password, new_password }),
        });
    }

    async createOrganization(name: string): Promise<Organization> {
        return this.request<Organization>('/organizations', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async listOrganizations(): Promise<Organization[]> {
        return this.request<Organization[]>('/organizations', {
            method: 'GET',
        });
    }

    async selectOrganization(orgId: string): Promise<SelectOrganizationResponse> {
        return this.request<SelectOrganizationResponse>(`/organizations/${orgId}/select`, {
            method: 'POST',
        });
    }

    // Workspace methods
    async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
        return this.request<Workspace>('/workspaces', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listWorkspaces(): Promise<Workspace[]> {
        return this.request<Workspace[]>('/workspaces');
    }

    async getWorkspace(id: string): Promise<Workspace> {
        return this.request<Workspace>(`/workspaces/${id}`);
    }

    async updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
        return this.request<Workspace>(`/workspaces/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteWorkspace(id: string): Promise<void> {
        return this.request<void>(`/workspaces/${id}`, {
            method: 'DELETE',
        });
    }

    // Project methods
    async createProject(data: CreateProjectRequest): Promise<Project> {
        return this.request<Project>('/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listProjects(): Promise<Project[]> {
        return this.request<Project[]>('/projects');
    }

    async listProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
        return this.request<Project[]>(`/workspaces/${workspaceId}/projects`);
    }

    async getProject(id: string): Promise<Project> {
        return this.request<Project>(`/projects/${id}`);
    }

    async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
        return this.request<Project>(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteProject(id: string): Promise<void> {
        return this.request<void>(`/projects/${id}`, {
            method: 'DELETE',
        });
    }

    // Board methods
    async createBoard(data: CreateBoardRequest): Promise<Board> {
        return this.request<Board>('/boards', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listBoardsByProject(projectId: string): Promise<Board[]> {
        return this.request<Board[]>(`/projects/${projectId}/boards`);
    }

    async getBoard(id: string): Promise<Board> {
        return this.request<Board>(`/boards/${id}`);
    }

    async updateBoard(id: string, data: UpdateBoardRequest): Promise<Board> {
        return this.request<Board>(`/boards/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteBoard(id: string): Promise<void> {
        return this.request<void>(`/boards/${id}`, {
            method: 'DELETE',
        });
    }

    async createColumn(boardId: string, name: string, position: number): Promise<BoardColumn> {
        return this.request<BoardColumn>(`/boards/${boardId}/columns`, {
            method: 'POST',
            body: JSON.stringify({ name, position }),
        });
    }

    async updateColumn(boardId: string, columnId: string, data: UpdateColumnRequest): Promise<BoardColumn> {
        return this.request<BoardColumn>(`/boards/${boardId}/columns/${columnId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Task methods
    async createTask(data: CreateTaskRequest): Promise<Task> {
        return this.request<Task>('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listTasksByBoard(boardId: string): Promise<Task[]> {
        return this.request<Task[]>(`/boards/${boardId}/tasks`);
    }

    async listMyTasks(): Promise<Task[]> {
        return this.request<Task[]>('/my-tasks');
    }

    async getTask(id: string): Promise<Task> {
        return this.request<Task>(`/tasks/${id}`);
    }

    async updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
        return this.request<Task>(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTask(id: string): Promise<void> {
        return this.request<void>(`/tasks/${id}`, {
            method: 'DELETE',
        });
    }

    // User methods
    async listUsers(): Promise<User[]> {
        return this.request<User[]>('/users');
    }

    async deleteUser(id: string): Promise<void> {
        return this.request<void>(`/users/${id}`, {
            method: 'DELETE',
        });
    }

    // Leave Request methods
    async createLeaveRequest(data: CreateLeaveRequestInput): Promise<LeaveRequest> {
        return this.request<LeaveRequest>('/leaves', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listMyLeaveRequests(): Promise<LeaveRequest[]> {
        return this.request<LeaveRequest[]>('/leaves');
    }

    async listIncomingLeaveRequests(): Promise<LeaveRequest[]> {
        return this.request<LeaveRequest[]>('/leaves/incoming');
    }

    async updateLeaveRequestStatus(id: string, status: LeaveRequestStatus, rejectionReason?: string): Promise<void> {
        return this.request<void>(`/leaves/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, rejection_reason: rejectionReason || '' }),
        });
    }

    async updateMemberRole(orgId: string, userId: string, role: string, department: string): Promise<void> {
        return this.request<void>(`/organizations/${orgId}/members/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role, department }),
        });
    }

    async inviteUser(data: { first_name: string, last_name: string, email: string, role: string, department: string }): Promise<{ message: string }> {
        return this.request<{ message: string }>('/users/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async verifyUser(data: { email: string, code: string }): Promise<{ message: string }> {
        return this.request<{ message: string }>('/users/verify', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listAllUsers(orgId?: string): Promise<User[]> {
        const endpoint = orgId ? `/admin/users/all?orgId=${orgId}` : '/admin/users/all';
        return this.request<User[]>(endpoint);
    }

    // Chat methods
    async listChatRooms(): Promise<ChatRoom[]> {
        return this.request<ChatRoom[]>('/chat/rooms');
    }

    async createChatRoom(data: CreateChatRoomRequest): Promise<ChatRoom> {
        return this.request<ChatRoom>('/chat/rooms', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getChatMessages(roomId: string): Promise<ChatMessage[]> {
        return this.request<ChatMessage[]>(`/chat/rooms/${roomId}/messages`);
    }

    getChatWsUrl(): string {
        let fullUrl = API_BASE_URL.startsWith('http') 
            ? API_BASE_URL 
            : typeof window !== 'undefined' 
                ? `${window.location.origin}${API_BASE_URL}`
                : `http://localhost:8086${API_BASE_URL}`;
        
        // Handle local development (Home WiFi, etc.) where Next.js is on 3000 but backend is on 8086
        // This ensures mobile devices on the same WiFi can connect to WebSockets directly
        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            const isLocal = host === 'localhost' || host === '127.0.0.1' || 
                           host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
            
            if (isLocal && window.location.port !== '8086') {
                fullUrl = `${window.location.protocol}//${host}:8086${API_BASE_URL.startsWith('http') ? '/api' : API_BASE_URL}`;
            }
        }
                
        const url = new URL(fullUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${url.host}${url.pathname}/chat/ws`;
    }
    async deleteChatMessage(id: string, type?: 'me' | 'everyone'): Promise<void> {
        const url = type ? `/chat/messages/${id}?type=${type}` : `/chat/messages/${id}`;
        await this.request<void>(url, {
            method: 'DELETE',
        });
    }

    async deleteChatRoom(id: string): Promise<void> {
        await this.request<void>(`/chat/rooms/${id}`, {
            method: 'DELETE',
        });
    }

    async updateChatRoom(id: string, name: string): Promise<void> {
        await this.request<void>(`/chat/rooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
        });
    }

    async sendChatMessage(roomId: string, content: string, fileData?: { file_name?: string, file_type?: string, file_size?: number, file_url?: string }): Promise<ChatMessage> {
        return this.request<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, ...fileData }),
        });
    }

    async markMessageAsRead(messageId: string): Promise<void> {
        await this.request<void>(`/chat/messages/${messageId}/read`, {
            method: 'PUT',
        });
    }

    // Meeting methods
    async createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
        return this.request<Meeting>('/meetings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listMeetings(): Promise<Meeting[]> {
        return this.request<Meeting[]>('/meetings');
    }

    async updateMeetingStatus(id: string, status: string): Promise<void> {
        return this.request(`/meetings/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }

    async getMeeting(id: string): Promise<Meeting> {
        return this.request<Meeting>(`/meetings/${id}`);
    }

    async deleteMeeting(id: string): Promise<void> {
        return this.request<void>(`/meetings/${id}`, {
            method: 'DELETE',
        });
    }

    async uploadFile(file: File): Promise<{ url: string; name: string; type: string; size: number }> {
        const formData = new FormData();
        formData.append('file', file);

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/upload`, {
            method: 'POST',
            body: formData,
            headers,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Upload failed');
        }

        return response.json();
    }

    // Announcement methods
    async createAnnouncement(data: CreateAnnouncementRequest): Promise<Announcement> {
        return this.request<Announcement>('/announcements', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listAnnouncements(): Promise<Announcement[]> {
        return this.request<Announcement[]>('/announcements');
    }

    async getSidebarCounts(): Promise<{
        tasks: number;
        announcements: number;
        chat: number;
        leave_requests: number;
        meetings: number;
    }> {
        return this.request<{
            tasks: number;
            announcements: number;
            chat: number;
            leave_requests: number;
            meetings: number;
        }>('/sidebar/counts');
    }

    // Notification methods
    async listNotifications(limit?: number): Promise<Notification[]> {
        const endpoint = limit ? `/notifications?limit=${limit}` : '/notifications';
        return this.request<Notification[]>(endpoint);
    }

    async getUnreadNotificationCount(): Promise<{ count: number }> {
        return this.request<{ count: number }>('/notifications/unread-count');
    }

    async markNotificationAsRead(id: string): Promise<void> {
        await this.request<void>(`/notifications/${id}/read`, {
            method: 'PUT',
        });
    }

    async markAllNotificationsAsRead(): Promise<void> {
        await this.request<void>('/notifications/read-all', {
            method: 'PUT',
        });
    }

    async markNotificationsAsReadByTypeAndRef(nType: string, refId: string): Promise<void> {
        await this.request<void>(`/notifications/mark-read?type=${nType}&refId=${refId}`, {
            method: 'PUT',
        });
    }

    async markNotificationsAsReadByType(nType: string): Promise<void> {
        await this.request<void>(`/notifications/mark-read-type?type=${nType}`, {
            method: 'PUT',
        });
    }

    async getUnreadCountsByRef(nType: string): Promise<Record<string, number>> {
        return this.request<Record<string, number>>(`/notifications/unread-counts?type=${nType}`);
    }

    // User Profile methods
    async getProfile(): Promise<User> {
        return this.request<User>('/users/profile');
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        return this.request<User>('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Attendance methods
    async listDailyAttendance(date?: string): Promise<any[]> {
        const endpoint = date ? `/attendance/daily?date=${date}` : '/attendance/daily';
        return this.request<any[]>(endpoint);
    }

    async checkIn(): Promise<void> {
        await this.request('/attendance/check-in', { method: 'POST' });
    }

    async checkOut(): Promise<void> {
        await this.request('/attendance/check-out', { method: 'POST' });
    }

    async updateAttendance(id: string, data: { status: string; reason: string }): Promise<void> {
        await this.request(`/attendance/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getAttendanceLogs(id: string): Promise<any[]> {
        return this.request<any[]>(`/attendance/${id}/logs`);
    }

    // Calendar methods
    async getCalendarEvents(): Promise<CalendarEvent[]> {
        return this.request<CalendarEvent[]>('/calendar/events');
    }

    // Helpdesk Request methods
    async createRequest(data: CreateHelpdeskRequest): Promise<HelpdeskRequest> {
        return this.request<HelpdeskRequest>('/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async listRequests(): Promise<HelpdeskRequest[]> {
        return this.request<HelpdeskRequest[]>('/requests');
    }

    async closeRequest(id: string): Promise<void> {
        return this.request<void>(`/requests/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'closed' }),
        });
    }

    // WebAuthn methods
    async webauthnBeginRegistration(): Promise<any> {
        return this.request('/webauthn/register/begin');
    }

    async webauthnFinishRegistration(data: any): Promise<void> {
        await this.request('/webauthn/register/finish', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async webauthnBeginLogin(): Promise<any> {
        return this.request('/webauthn/login/begin');
    }

    async webauthnFinishLogin(data: any): Promise<void> {
        await this.request('/webauthn/login/finish', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}



export const apiClient = new ApiClient(API_BASE_URL);
