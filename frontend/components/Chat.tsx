'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient, type ChatRoom, type ChatMessage, type User } from '@/lib/api';
import { deptMapper, roleMapper } from '@/lib/mappers';
import { decodeToken } from '@/lib/token';
import { 
    Plus, 
    MessageSquare, 
    Hash, 
    User as UserIcon, 
    X, 
    Search, 
    Wifi, 
    WifiOff, 
    Trash2, 
    Copy, 
    Check, 
    Edit3, 
    Users, 
    CheckCircle, 
    Paperclip, 
    File, 
    Download, 
    Image as ImageIcon, 
    Loader2,
    ChevronLeft,
    MoreVertical,
    Send,
    Smile,
    Maximize2,
    CheckCheck,
    Camera
} from 'lucide-react';

export default function Chat() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [roomUnreadCounts, setRoomUnreadCounts] = useState<Record<string, number>>({});
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [selectedImage, setSelectedImage] = useState<ChatMessage | null>(null);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [modalMode, setModalMode] = useState<'individual' | 'group'>('individual');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [groupName, setGroupName] = useState('');
    const [orgUsers, setOrgUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'chat'>('list'); 
    const [isMobile, setIsMobile] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [openDeleteMenuId, setOpenDeleteMenuId] = useState<string | null>(null);
    const [deptFilter, setDeptFilter] = useState<string>('Tüm Birimler');
    const [roleFilter, setRoleFilter] = useState<string>('Tüm Yetkiler');
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [editedGroupName, setEditedGroupName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const activeRoomRef = useRef<string | null>(null);

    // Responsive Check
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setViewMode('list'); // Desktop always shows list+chat (via CSS)
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Mesajlar değiştiğinde en alta kaydır
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = decodeToken(token);
            if (payload) {
                setCurrentUser({ id: payload.user_id, email: payload.email });
                setUserRole(payload.role || null);
            }
        }
        loadRooms();
    }, []);

    useEffect(() => {
        const roomId = searchParams.get('roomId');
        if (roomId && rooms.length > 0) {
            const target = rooms.find(r => r.id === roomId);
            if (target && activeRoom?.id !== roomId) {
                setActiveRoom(target);
                if (isMobile) setViewMode('chat');
            }
        }
    }, [searchParams, rooms, isMobile]);

    useEffect(() => {
        activeRoomRef.current = activeRoom?.id || null;
        if (activeRoom) {
            setMessages([]);
            loadMessages(activeRoom.id);
            apiClient.markNotificationsAsReadByTypeAndRef('chat', activeRoom.id).then(() => {
                window.dispatchEvent(new CustomEvent('refresh-counts'));
                setRoomUnreadCounts(prev => ({ ...prev, [activeRoom.id]: 0 }));
            });

            const socket = connectWebSocket();
            return () => {
                if (socket) socket.close();
                setIsConnected(false);
            };
        }
    }, [activeRoom]);

    const openDeleteMenuIdRef = useRef<string | null>(null);

    // Click outside to close message delete menu
    useEffect(() => {
        const handleClickOutside = () => setOpenDeleteMenuId(null);
        if (openDeleteMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openDeleteMenuId]);

    const loadRooms = async () => {
        try {
            const [roomsData, countsData] = await Promise.all([
                apiClient.listChatRooms(),
                apiClient.getUnreadCountsByRef('chat')
            ]);
            setRooms(roomsData || []);
            setRoomUnreadCounts(countsData || {});
            
            const roomIdParam = searchParams.get('roomId');
            if (!activeRoom && !roomIdParam && roomsData?.length > 0 && !isMobile) {
                setActiveRoom(roomsData[0]);
            }
        } catch (error) {
            console.error('Rooms fetch error:', error);
        }
    };

    const loadMessages = async (roomId: string) => {
        try {
            const data = await apiClient.getChatMessages(roomId);
            if (activeRoomRef.current === roomId) {
                setMessages((data || []).sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ));
            }
        } catch (error) {
            console.error('Messages fetch error:', error);
        }
    };

    const connectWebSocket = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const socket = new WebSocket(`${apiClient.getChatWsUrl()}?token=${token}`);

        socket.onopen = () => {
            setIsConnected(true);
            console.log('Chat WebSocket connected');
        };
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Chat WebSocket Message:', data);
                
                if (data.type === 'initial_presence') {
                    setOnlineUsers(new Set(data.user_ids));
                    return;
                }
                
                if (data.type === 'presence_update') {
                    setOnlineUsers(prev => {
                        const next = new Set(prev);
                        if (data.online) next.add(data.user_id);
                        else next.delete(data.user_id);
                        return next;
                    });
                    return;
                }

                const msg: ChatMessage = data;
                
                // 1. Update Room List (Move room to top and update last message)
                setRooms(prev => {
                    const roomIndex = prev.findIndex(r => r.id === msg.chat_room_id);
                    if (roomIndex === -1) return prev;
                    
                    const updatedRooms = [...prev];
                    updatedRooms[roomIndex] = { ...updatedRooms[roomIndex], last_message: msg };
                    
                    // Move to top
                    const room = updatedRooms.splice(roomIndex, 1)[0];
                    return [room, ...updatedRooms];
                });

                // 2. Update messages if in active room
                if (msg.chat_room_id === activeRoomRef.current) {
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === msg.id);
                        if (exists) return prev;
                        const newMsgs = [...prev, msg].sort((a, b) => 
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                        return newMsgs;
                    });
                    setTimeout(scrollToBottom, 100);
                    
                    if (msg.sender_id !== currentUser?.id) {
                        apiClient.markMessageAsRead(msg.id);
                        apiClient.markNotificationsAsReadByTypeAndRef('chat', msg.chat_room_id);
                    }
                } else {
                    setRoomUnreadCounts(prev => ({ ...prev, [msg.chat_room_id]: (prev[msg.chat_room_id] || 0) + 1 }));
                }
                window.dispatchEvent(new CustomEvent('refresh-counts'));
            } catch (err) {
                console.error('WS Message handle error:', err);
            }
        };
        socket.onclose = () => {
            setIsConnected(false);
            console.log('Chat WebSocket closed, reconnecting...');
            setTimeout(() => {
                if (localStorage.getItem('token')) {
                    connectWebSocket();
                }
            }, 3000);
        };
        
        socket.onerror = (err) => {
            console.error('WebSocket Error:', err);
            socket.close();
        };

        setWs(socket);
        return socket;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent, fileData?: any) => {
        if (e) e.preventDefault();
        const content = newMessage.trim();
        if (!fileData && (!content || !activeRoom)) return;

        try {
            if (!fileData) setNewMessage('');
            // ALL messages (text or files) go through the HTTP SendMessage for reliability
            // This ensures backend broadcasts them correctly to ALL clients
            const sentMsg = await apiClient.sendChatMessage(activeRoom!.id, content, fileData);
            
            // The message will also come back via WS, but we can update locally for snappiness
            setMessages(prev => {
                const exists = prev.some(m => m.id === sentMsg.id);
                if (exists) return prev;
                return [...prev, sentMsg];
            });
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            console.error('Send failed:', err);
            alert('Mesaj gönderilemedi');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeRoom) return;

        try {
            setUploadProgress(0);
            // Use XHR for upload progress
            const xhr = new XMLHttpRequest();
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
            xhr.open('POST', `${apiUrl}/upload`);
            xhr.withCredentials = true;

            // Add Auth and Org headers
            const token = localStorage.getItem('token');
            const orgId = localStorage.getItem('organization_id');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            if (orgId) xhr.setRequestHeader('X-Organization-ID', orgId);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(percent);
                }
            };

            xhr.onload = () => {
                setUploadProgress(null);
                if (xhr.status >= 200 && xhr.status < 300) {
                    const fileData = JSON.parse(xhr.responseText);
                    handleSendMessage(null as any, {
                        file_name: fileData.name,
                        file_type: fileData.type,
                        file_size: fileData.size,
                        file_url: fileData.url
                    });
                } else {
                    alert('Upload error: ' + (xhr.statusText || xhr.status));
                }
            };

            xhr.onerror = () => {
                setUploadProgress(null);
                alert('Upload failed');
            };

            const formData = new FormData();
            formData.append('file', file);
            xhr.send(formData);

        } catch (error) {
            setUploadProgress(null);
            console.error('File operation failed:', error);
            alert('Dosya işlemi başarısız');
        } finally {
            if (e.target) e.target.value = '';
        }
    };
    
    const handleDownload = async (url: string, fileName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error('Download failed', e);
            window.open(url, '_blank');
        }
    };

    const renderAvatar = (user: any, size: string = 'w-10 h-10') => {
        const name = encodeURIComponent(`${user?.first_name || ''} ${user?.last_name || ''}`);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${name || 'U'}&background=6366f1&color=fff&size=128&bold=true`;
        const avatarPath = user?.avatar_url || user?.avatarUrl;
        const src = avatarPath ? apiClient.getFileUrl(avatarPath) : defaultAvatar;

        return (
            <div className={`${size} rounded-full overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm shrink-0`}>
                <img src={src} alt="Avatar" className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = defaultAvatar} />
            </div>
        );
    };

    const getRoomName = (room: ChatRoom) => {
        if (room.type === 'channel') return room.name;
        const partner = room.members?.find(m => m.id !== currentUser?.id);
        return partner ? `${partner.first_name} ${partner.last_name || ''}` : (room.name || 'Sohbet');
    };

    const handleDeleteRoom = async (roomId?: string) => {
        const idToDelete = roomId || activeRoom?.id;
        if (!idToDelete) return;
        try {
            await apiClient.deleteChatRoom(idToDelete);
            setRooms(prev => prev.filter(r => r.id !== idToDelete));
            if (activeRoom?.id === idToDelete) {
                setActiveRoom(null);
                setViewMode('list');
            }
            setShowMoreMenu(false);
        } catch (err) {
            alert('Sohbet silinemedi');
        }
    };

    const handleDeleteMessage = async (msgId: string, type: 'me' | 'everyone') => {
        try {
            await apiClient.deleteChatMessage(msgId, type);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            alert('Mesaj silinemedi');
        }
    };

    const handleUpdateGroupName = async () => {
        if (!activeRoom || !editedGroupName.trim()) return;
        try {
            await apiClient.updateChatRoom(activeRoom.id, editedGroupName);
            setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, name: editedGroupName } : r));
            setActiveRoom(prev => prev ? { ...prev, name: editedGroupName } : null);
            setIsEditingGroupName(false);
            setShowMoreMenu(false);
        } catch (err) {
            alert('Grup ismi güncellenemedi');
        }
    };
	const formatLastSeen = (lastSeen?: string) => {
		if (!lastSeen) return '';
		const date = new Date(lastSeen);
		const now = new Date();
		
		const hours = date.getHours().toString().padStart(2, '0');
		const mins = date.getMinutes().toString().padStart(2, '0');
		const timeStr = `${hours}.${mins}`;
		
		if (date.toDateString() === now.toDateString()) {
			return `son görülme: ${timeStr}`;
		}
        
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `son görülme: dün ${timeStr}`;
        }
        
		return `son görülme: ${date.toLocaleDateString('tr-TR')} ${timeStr}`;
	};

	const MessageStatusIcons = ({ status }: { status?: ChatMessage['status'] }) => {
		if (status === 'read') {
			return <CheckCheck className="w-3 h-3 text-sky-400" />;
		}
		if (status === 'delivered') {
			return <CheckCheck className="w-3 h-3 text-gray-400" />;
		}
		return <Check className="w-3 h-3 text-gray-400" />;
	};

    return (
        <div className="flex flex-1 w-full h-full bg-slate-50 md:bg-white md:rounded-xl overflow-hidden relative min-h-0">
            
            {/* Rooms List Sidebar */}
            <aside className={`${isMobile && viewMode === 'chat' ? 'hidden' : 'flex'} w-full md:w-80 lg:w-96 border-r border-border-custom bg-white dark:bg-slate-900 flex-col`}>
                <header className={`${isMobile ? 'p-6' : 'p-4'} border-b border-border-custom flex items-center justify-between`}>
                    <div>
                        <h2 className={`${isMobile ? 'text-xl font-black' : 'text-base font-bold text-gray-700'} tracking-widest`}>Sohbetler</h2>
                        {isMobile && <p className="text-[10px] text-gray-400 font-bold mt-1">Ekibinle Bağlı Kal</p>}
                    </div>
                    <button onClick={async () => {
                        const users = await apiClient.listUsers();
                        setOrgUsers(users.filter(u => u.id !== currentUser?.id));
                        setShowUserModal(true);
                    }} className={`${isMobile ? 'w-10 h-10 bg-indigo-600 text-white' : 'p-1.5 hover:bg-gray-100 text-indigo-600'} rounded-xl flex items-center justify-center transition-all`}>
                        <Plus className="w-5 h-5" />
                    </button>
                </header>

                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Ara..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {/* GRUPLAR */}
                    <div className="px-4 py-2 mt-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-2">GRUPLAR</p>
                        {rooms.filter(r => r.type === 'channel').map(room => (
                            <div key={room.id} className="group relative">
                                <button 
                                    onClick={() => { setActiveRoom(room); setViewMode('chat'); }}
                                    className={`w-full ${isMobile ? 'p-4' : 'px-4 py-3'} flex items-center gap-4 transition-all hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl mb-1 ${activeRoom?.id === room.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                >
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <Hash className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <h4 className="font-bold text-sm text-foreground truncate">{getRoomName(room)}</h4>
                                    </div>
                                    {roomUnreadCounts[room.id] > 0 && (
                                        <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                            {roomUnreadCounts[room.id]}
                                        </div>
                                    )}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-rose-400 opacity-100 transition-all hover:bg-rose-50 rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* ÖZEL MESAJLAR */}
                    <div className="px-4 py-2 mt-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-2">ÖZEL MESAJLAR</p>
                        {rooms.filter(r => r.type === 'direct').map(room => (
                            <div key={room.id} className="group relative">
                                <button 
                                    onClick={() => { setActiveRoom(room); setViewMode('chat'); }}
                                    className={`w-full ${isMobile ? 'p-4' : 'px-4 py-3'} flex items-center gap-4 transition-all hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl mb-1 ${activeRoom?.id === room.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                >
                                    {renderAvatar(room.members?.find(m => m.id !== currentUser?.id), 'w-10 h-10')}
                                    <div className="flex-1 min-w-0 text-left">
                                        <h4 className="font-bold text-sm text-foreground truncate">{getRoomName(room)}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {(() => {
                                                const partner = room.members?.find(m => m.id !== currentUser?.id);
                                                const isOnline = partner && onlineUsers.has(partner.id);
                                                return (
                                                    <>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                                                        <p className="text-[10px] text-gray-400 font-bold">
                                                            {isOnline ? 'Çevrimiçi' : formatLastSeen(partner?.last_seen)}
                                                        </p>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    {roomUnreadCounts[room.id] > 0 && (
                                        <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                            {roomUnreadCounts[room.id]}
                                        </div>
                                    )}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-rose-400 opacity-100 transition-all hover:bg-rose-50 rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Chat Area - Card style for mobile to match screenshot */}
            <main className={`${isMobile && viewMode === 'list' ? 'hidden' : 'flex'} flex-1 flex-col bg-white overflow-hidden relative md:bg-slate-50 min-h-0`}>
                
                {activeRoom ? (
                    <>
                        {/* WhatsApp Background Pattern (Mobile Only) */}
                        {isMobile && <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://i.pinimg.com/originals/ab/ab/60/abab60f06ab52fa7846593e6ae0c9a0b.png')] bg-repeat" />}

                        {/* WhatsApp Header - Top Fixed */}
                        <header className={`${isMobile ? 'px-4 py-3 bg-white border-b border-gray-100 min-h-[72px]' : 'p-4 bg-white border-b'} border-border-custom flex items-center justify-between z-30 shrink-0`}>
                            <div className="flex items-center gap-2">
                                {isMobile && (
                                    <button onClick={() => setViewMode('list')} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors">
                                        <ChevronLeft className="w-8 h-8 text-gray-800" />
                                    </button>
                                )}
                                {activeRoom.type === 'direct' ? (
                                    renderAvatar(activeRoom.members?.find(m => m.id !== currentUser?.id), isMobile ? 'w-12 h-12' : 'w-8 h-8')
                                ) : (
                                    <div className={`${isMobile ? 'w-12 h-12' : 'w-8 h-8'} bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600`}>
                                        <Hash className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="ml-1">
                                    <h3 className={`font-bold ${isMobile ? 'text-base font-black text-gray-900 leading-tight' : 'text-sm'}`}>
                                        {getRoomName(activeRoom)}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {activeRoom.type === 'direct' ? (
                                            (() => {
                                                const partner = activeRoom.members?.find(m => m.id !== currentUser?.id);
                                                const isPartnerOnline = partner && onlineUsers.has(partner.id);
                                                return (
                                                    <>
                                                        <span className={`w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                        <span className={`text-[10px] font-bold ${isPartnerOnline ? 'text-green-500' : 'text-gray-400'}`}>
                                                            {isPartnerOnline ? 'Çevrimiçi' : formatLastSeen(partner?.last_seen)}
                                                        </span>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <>
                                                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                                <span className={`text-[10px] font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isConnected ? 'Bağlı' : 'Bağlantı Kesildi'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 text-gray-400 hover:text-foreground hover:bg-gray-100 rounded-full transition-all">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                                {showMoreMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-border-custom z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {activeRoom.type === 'channel' && (
                                            <button onClick={() => { setEditedGroupName(activeRoom.name); setIsEditingGroupName(true); }} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 font-medium">
                                                <Edit3 className="w-4 h-4" /> İsmi Düzenle
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteRoom()} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                                            <Trash2 className="w-4 h-4" /> Sohbeti Sil
                                        </button>
                                        <button onClick={() => setShowMoreMenu(false)} className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 font-medium">
                                            <X className="w-4 h-4" /> Kapat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </header>

                        <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto min-h-0 p-4 space-y-4 z-10 bg-white chat-messages-list custom-scrollbar relative`}>
                            {uploadProgress !== null && (
                                <div className="sticky top-0 left-0 right-0 z-20 flex justify-center p-2 pointer-events-none">
                                    <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                        <span className="text-xs font-black uppercase tracking-widest">Yükleniyor: %{uploadProgress}</span>
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const isMe = msg.sender_id === currentUser?.id;
                                return (
                                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`relative max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-[1.5rem] shadow-sm ${
                                            isMe 
                                            ? 'bg-indigo-600 text-white rounded-br-none' 
                                            : 'bg-white dark:bg-slate-800 text-foreground rounded-bl-none border border-gray-100 shadow-sm'
                                        }`}>
                                            {!isMe && activeRoom.type === 'channel' && (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-[10px] font-bold text-indigo-500">{msg.sender?.first_name || 'Kullanıcı'} {msg.sender?.last_name || ''}</p>
                                                    {msg.sender?.role && (
                                                        <span className="text-[8px] px-1 bg-indigo-50 text-indigo-400 rounded">
                                                            {msg.sender.role.toLowerCase() === 'administration' || msg.sender.role.toLowerCase() === 'admin' ? 'Admin' : 
                                                             msg.sender.role.toLowerCase() === 'member' ? 'Personel' : msg.sender.role}
                                                        </span>
                                                    )}
                                                </div>
                                             )}
                                            {msg.file_url ? (
                                                <div className="space-y-2 py-1">
                                                    {msg.file_type?.startsWith('image/') ? (
                                                        <div className="relative group/img cursor-zoom-in" onClick={() => setSelectedImage(msg)}>
                                                            <img 
                                                                src={apiClient.getFileUrl(msg.file_url)} 
                                                                className="rounded-2xl max-h-[250px] w-auto border border-black/5 transition-all group-hover/img:brightness-90 object-contain" 
                                                                alt="resim" 
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                                <div className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white">
                                                                    <Maximize2 className="w-5 h-5" />
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDownload(apiClient.getFileUrl(msg.file_url!), msg.file_name!); }}
                                                                className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md rounded-xl text-white opacity-0 group-hover/img:opacity-100 transition-all hover:bg-black/60"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isMe ? 'border-white/20 bg-white/10' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>
                                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                                                <File className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => window.open(apiClient.getFileUrl(msg.file_url), '_blank')}>
                                                                <p className="text-xs font-bold truncate">{msg.file_name}</p>
                                                                <p className="text-[9px] opacity-60">Dosya • Görüntülemek için tıkla</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleDownload(apiClient.getFileUrl(msg.file_url!), msg.file_name!)}
                                                                className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                                            >
                                                                <Download className={`w-5 h-5 ${isMe ? 'text-white' : 'text-indigo-600'}`} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : <p className="text-[13px] font-semibold leading-relaxed">{msg.content}</p>}
                                                <div className="flex items-center justify-between gap-6 mt-1.5 relative">
                                                    <p className={`text-[9px] ${isMe ? 'text-indigo-200' : 'text-gray-400'} font-bold shrink-0`}>
                                                        {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {msg.file_url && (
                                                            <button 
                                                                onClick={() => handleDownload(apiClient.getFileUrl(msg.file_url!), msg.file_name!)}
                                                                className={`p-1 rounded-lg transition-colors ${isMe ? 'hover:bg-black/10 text-white/50 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'}`}
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {isMe && (
                                                            <>
                                                                <div className="relative">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setOpenDeleteMenuId(openDeleteMenuId === msg.id ? null : msg.id); }}
                                                                        className="p-1 hover:bg-black/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    {openDeleteMenuId === msg.id && (
                                                                        <div className="absolute right-0 bottom-full mb-2 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-gray-700 dark:text-gray-200 animate-in fade-in slide-in-from-bottom-2">
                                                                            <button onClick={() => { handleDeleteMessage(msg.id, 'me'); setOpenDeleteMenuId(null); }} className="w-full px-4 py-3 text-left text-[11px] hover:bg-gray-50 dark:hover:bg-slate-800 font-black uppercase tracking-tighter border-b border-gray-50">Benden sil</button>
                                                                            <button onClick={() => { handleDeleteMessage(msg.id, 'everyone'); setOpenDeleteMenuId(null); }} className="w-full px-4 py-3 text-left text-[11px] hover:bg-red-50 text-red-600 font-black uppercase tracking-tighter">Herkesten sil</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <MessageStatusIcons status={msg.status} />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input - Bottom alignment adjusted for floating nav */}
                        <form onSubmit={handleSendMessage} className={`p-4 bg-white/95 backdrop-blur-xl border-t border-gray-100 shrink-0 z-20 flex items-center gap-3 ${isMobile ? 'pb-24' : ''}`}>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 shadow-sm shrink-0">
                                <Plus className="w-6 h-6" />
                            </button>
                            <div className="flex-1 relative flex items-center">
                                <input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={(e) => setNewMessage(e.target.value)} 
                                    placeholder="Mesaj yazın..." 
                                    className="w-full px-5 py-3 rounded-[2rem] bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white text-sm font-medium transition-all" 
                                />
                            </div>
                            <button type="submit" disabled={!newMessage.trim()} className="w-12 h-12 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 transition-all shrink-0">
                                <Send className="w-6 h-6" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center">
                            <MessageSquare className="w-10 h-10 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Sohbet Seçin</h3>
                            <p className="text-sm text-gray-400">Mesajlaşmaya başlamak için birini seçin</p>
                        </div>
                    </div>
                )}
            </main>

            {/* User Search & New Chat Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUserModal(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-border-custom animate-in zoom-in duration-200">
                        <header className="p-4 border-b border-border-custom flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">Yeni Sohbet</h3>
                            <button onClick={() => setShowUserModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </header>
                        <div className="p-4 space-y-4">
                            {/* Tabs */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                                <button onClick={() => setModalMode('individual')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${modalMode === 'individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><UserIcon className="w-4 h-4" /> Bireysel</button>
                                <button onClick={() => setModalMode('group')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${modalMode === 'group' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><Users className="w-4 h-4" /> Grup</button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Kullanıcı ara..." onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none text-sm border focus:ring-2 focus:ring-indigo-500" />
                            </div>

                            {(() => {
                                const departments = Array.from(new Set(orgUsers.map(u => (u.department || 'GENEL').toUpperCase()))).sort();
                                const roles = Array.from(new Set(orgUsers.map(u => (u.role || 'PERSONEL').toUpperCase()))).sort();
                                
                                return (
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 bg-gray-50 rounded-xl text-[11px] font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="Tüm Birimler">Tüm Birimler</option>
                                            {departments.map(d => <option key={d} value={d}>{deptMapper(d)}</option>)}
                                        </select>
                                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 bg-gray-50 rounded-xl text-[11px] font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="Tüm Yetkiler">Tüm Yetkiler</option>
                                            {roles.map(r => <option key={r} value={r}>{roleMapper(r)}</option>)}
                                        </select>
                                    </div>
                                );
                            })()}

                            {modalMode === 'group' && (
                                <input type="text" placeholder="Grup ismi..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded-xl outline-none text-xs border" />
                            )}

                            <div className="max-h-[40vh] overflow-y-auto space-y-2 no-scrollbar pr-1">
                                {orgUsers
                                    .filter(u => {
                                        const matchesSearch = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase());
                                        const matchesDept = deptFilter === 'Tüm Birimler' || u.department?.toUpperCase() === deptFilter;
                                        const matchesRole = roleFilter === 'Tüm Yetkiler' || u.role?.toUpperCase() === roleFilter;
                                        return matchesSearch && matchesDept && matchesRole;
                                    })
                                    .map(user => (
                                    <button 
                                        key={user.id} 
                                        onClick={async () => {
                                            if (modalMode === 'individual') {
                                                const existing = rooms.find(r => r.type === 'direct' && r.members?.some(m => m.id === user.id));
                                                if (existing) { setActiveRoom(existing || null); }
                                                else {
                                                    const nr = await apiClient.createChatRoom({ name: user.email, type: 'direct', member_ids: [user.id] });
                                                    setRooms(prev => [nr, ...prev]);
                                                    setActiveRoom(nr);
                                                }
                                                setShowUserModal(false);
                                                if (isMobile) setViewMode('chat');
                                            } else {
                                                const next = new Set(selectedUserIds);
                                                if (next.has(user.id)) next.delete(user.id);
                                                else next.add(user.id);
                                                setSelectedUserIds(next);
                                            }
                                        }}
                                        className={`w-full p-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl flex items-center justify-between border transition-all ${selectedUserIds.has(user.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent'}`}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            {renderAvatar(user, 'w-10 h-10')}
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                                    {user.first_name} {user.last_name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {user.department && (
                                                        <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[8px] font-bold rounded">
                                                            {deptMapper(user.department)}
                                                        </span>
                                                    )}
                                                    {user.role && (
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                                                            {user.role === 'admin' ? 'Super Admin' : user.role === 'manager' ? 'Admin' : user.role === 'hr' ? 'Müdür' : 'Personel'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {modalMode === 'group' && selectedUserIds.has(user.id) && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                                    </button>
                                ))}
                            </div>

                            {modalMode === 'group' && (
                                <button 
                                    disabled={selectedUserIds.size === 0 || !groupName}
                                    onClick={async () => {
                                        const nr = await apiClient.createChatRoom({ name: groupName, type: 'channel', member_ids: Array.from(selectedUserIds) });
                                        setRooms(prev => [nr, ...prev]);
                                        setActiveRoom(nr);
                                        setShowUserModal(false);
                                        if (isMobile) setViewMode('chat');
                                    }}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    Sohbeti Başlat ({selectedUserIds.size} Kişi)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Image Lightbox Overlay */}
            {selectedImage && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 animate-in fade-in duration-300">
                    <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all font-bold text-sm"
                        >
                            <ChevronLeft className="w-5 h-5" /> Geri Dön
                        </button>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => handleDownload(apiClient.getFileUrl(selectedImage.file_url!), selectedImage.file_name!)}
                                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl transition-all"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-3 bg-white/10 hover:bg-rose-500 hover:text-white text-white rounded-2xl backdrop-blur-md transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </header>
                    
                    <div className="w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden" onClick={() => setSelectedImage(null)}>
                        <img 
                            src={apiClient.getFileUrl(selectedImage.file_url)} 
                            alt={selectedImage.file_name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="absolute bottom-8 px-6 py-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 max-w-[90%]">
                        <p className="text-white font-bold text-sm truncate">{selectedImage.file_name}</p>
                        <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-0.5">
                            {selectedImage.sender?.first_name} • {new Date(selectedImage.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            )}

            {/* Group Name Edit Modal */}
            {isEditingGroupName && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditingGroupName(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-border-custom animate-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-4">Grup İsmini Düzenle</h3>
                        <input 
                            type="text" 
                            value={editedGroupName} 
                            onChange={(e) => setEditedGroupName(e.target.value)} 
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setIsEditingGroupName(false)} className="flex-1 py-2 bg-gray-100 rounded-xl font-bold text-sm">İptal</button>
                            <button onClick={handleUpdateGroupName} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
