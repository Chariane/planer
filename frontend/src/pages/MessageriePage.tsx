import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  Crown,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquareText,
  Mic,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Phone,
  PhoneOff,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Square,
  Trash2,
  Unlock,
  Users,
  Video,
  Wifi,
  WifiOff,
  Briefcase,
  FolderTree,
  ListTodo,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeApiErrorMessage } from '../services/api';
import { authService } from '../services/auth.service';
import type { PublicUserProfile } from '../services/auth.service';
import {
  messagerieService,
  ensureChatGroup,  // ✅ AJOUT
  type MessageItem,
  type MessagerieGroup,
  type MessagerieMember,
  type MessagerieUnreadSummary,
  type PrivateConversation,
} from '../services/messagerie.service';

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (minutes === 0) return `${remainingSeconds} s`;
  return `${minutes} min ${String(remainingSeconds).padStart(2, '0')} s`;
};

const formatLastSeen = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "à l'instant";

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return `le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
};

const presenceLabel = (isOnline?: boolean, lastSeen?: string | null) => {
  if (isOnline) return 'En ligne';
  const formattedLastSeen = formatLastSeen(lastSeen);
  return formattedLastSeen ? `Vu ${formattedLastSeen}` : 'Hors ligne';
};

const initials = (label?: string | null) => {
  if (!label) return 'KP';
  const clean = label.trim();
  if (!clean) return 'KP';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const displayMember = (member: MessagerieMember) =>
  member.username || member.email || 'Utilisateur';

const displayProfile = (profile: PublicUserProfile | null) =>
  [profile?.prenoms, profile?.nom].filter(Boolean).join(' ').trim() || profile?.username || 'Utilisateur';

const profileAsMember = (profile: PublicUserProfile | null): MessagerieMember | null =>
  profile
    ? {
        id: profile.id,
        username: displayProfile(profile),
        email: profile.email,
        photo_base64: profile.photo_base64,
        role: 'Membre',
      }
    : null;

const avatarSrc = (member?: Pick<MessagerieMember, 'photo_base64'> | null) =>
  member?.photo_base64 ? `data:image/jpeg;base64,${member.photo_base64}` : null;

const getErrorMessage = (error: unknown, fallback: string) =>
  sanitizeApiErrorMessage(error, fallback);

const normalizeSearch = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const searchableText = (...values: Array<string | number | null | undefined>) =>
  normalizeSearch(values.filter(value => value !== null && value !== undefined).join(' '));

const MAX_CHAT_ATTACHMENT_SIZE = 8 * 1024 * 1024;

type PendingAttachment = {
  kind: 'audio' | 'image' | 'video' | 'file';
  name: string;
  mimeType: string;
  base64: string;
};

type CallKind = 'audio' | 'video';
type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active';

type CallSignalPayload = {
  type: 'call_offer' | 'call_answer' | 'call_ice' | 'call_end' | 'call_reject';
  call_type?: CallKind;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  from?: string;
  to?: string;
  id_groupe?: string | null;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const fileToDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Lecture impossible.'));
    reader.readAsDataURL(file);
  });

const splitDataUrl = (dataUrl?: string | null) => {
  if (!dataUrl) return { mimeType: 'application/octet-stream', base64: '' };
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { mimeType: 'application/octet-stream', base64: dataUrl };
  return { mimeType: match[1], base64: match[2] };
};

const dataUrlFromBase64 = (base64?: string | null, mimeType = 'application/octet-stream') =>
  base64 ? `data:${mimeType};base64,${base64}` : '';

const attachmentKindFromFile = (file: File): PendingAttachment['kind'] => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
};

const MESSAGE_EDIT_WINDOW_MS = 30 * 60 * 1000;
const legacyAttachmentMetaPrefix = '__kp_attachment__:';

const cleanMessageText = (value?: string | null) => {
  if (!value) return '';
  if (!value.startsWith(legacyAttachmentMetaPrefix)) return value;

  try {
    const meta = JSON.parse(value.slice(legacyAttachmentMetaPrefix.length)) as { caption?: string };
    return meta.caption || '';
  } catch {
    return '';
  }
};

const isAttachmentMessage = (message: MessageItem) =>
  Boolean(message.audio || message.image || message.video || message.file);

const attachmentLabel = (message: MessageItem) => {
  if (message.audio) return 'Message vocal';
  if (message.image) return 'Image jointe';
  if (message.video) return 'Video jointe';
  if (message.file) return 'Fichier joint';
  return '';
};

const conversationPreview = (message?: MessageItem | null) => {
  if (!message) return '';
  const cleanText = cleanMessageText(message.message);
  if (isAttachmentMessage(message)) {
    return cleanText ? `${attachmentLabel(message)} - ${cleanText}` : attachmentLabel(message);
  }
  return cleanText;
};

const editableMessageText = (message: MessageItem) => {
  return cleanMessageText(message.message);
};

const updatedMessageContent = (_message: MessageItem, nextText: string) => {
  return nextText.trim();
};

const canEditMessage = (message: MessageItem) => {
  if (!message.created_at) return false;
  const createdAt = new Date(message.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt <= MESSAGE_EDIT_WINDOW_MS;
};

function MessageContent({ message, isMine }: { message: MessageItem; isMine: boolean }) {
  const textColor = isMine ? 'text-white/90' : 'text-theme-main';
  const subtleColor = isMine ? 'text-white/70' : 'text-theme-muted';

  if (message.audio) {
    const src = dataUrlFromBase64(message.audio, 'audio/webm');
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-xs font-black ${subtleColor}`}>
          <Mic size={14} />
          Message vocal
        </div>
        <audio controls src={src} className="max-w-full h-10" />
        {cleanMessageText(message.message) && <p className={`text-sm ${textColor}`}>{cleanMessageText(message.message)}</p>}
      </div>
    );
  }

  if (message.image) {
    const src = dataUrlFromBase64(message.image, 'image/jpeg');
    return (
      <div className="space-y-2">
        <img src={src} alt="Image jointe" className="max-h-72 w-full rounded-xl object-cover" />
        {cleanMessageText(message.message) && <p className={`text-sm ${textColor}`}>{cleanMessageText(message.message)}</p>}
      </div>
    );
  }

  if (message.video) {
    const src = dataUrlFromBase64(message.video, 'video/mp4');
    return (
      <div className="space-y-2">
        <video controls src={src} className="max-h-72 w-full rounded-xl bg-black" />
        {cleanMessageText(message.message) && <p className={`text-sm ${textColor}`}>{cleanMessageText(message.message)}</p>}
      </div>
    );
  }

  if (message.file) {
    const src = dataUrlFromBase64(message.file, 'application/octet-stream');
    return (
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${isMine ? 'bg-white/15 text-white' : 'bg-secondary/10 text-secondary'}`}>
          <FileText size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-black ${textColor}`}>Fichier joint</p>
          <p className={`truncate text-xs ${subtleColor}`}>Piece jointe</p>
          {cleanMessageText(message.message) && <p className={`mt-1 text-sm ${textColor}`}>{cleanMessageText(message.message)}</p>}
        </div>
        <a
          href={src}
          download={`fichier-message-${message.id}`}
          className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition ${isMine ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-theme-surface-hover hover:bg-secondary/10 text-theme-muted hover:text-secondary'}`}
          title="Télécharger"
        >
          <Download size={17} />
        </a>
      </div>
    );
  }

  return <>{cleanMessageText(message.message)}</>;
}

const resourceLabel = (group: MessagerieGroup) => {
  const typeLabels: Record<string, string> = {
    workspace: 'Workspace',
    espace: 'Espace',
    liste: 'Projet',
  };
  return group.resource_type ? typeLabels[group.resource_type] || group.resource_type : 'Groupe';
};

const groupSections = [
  {
    key: 'workspace',
    title: 'Workspaces',
    icon: Briefcase,
    empty: 'Aucun canal workspace',
  },
  {
    key: 'espace',
    title: 'Espaces',
    icon: FolderTree,
    empty: 'Aucun canal espace',
  },
  {
    key: 'liste',
    title: 'Projets',
    icon: ListTodo,
    empty: 'Aucun canal projet',
  },
  {
    key: 'group',
    title: 'Autres groupes',
    icon: MessageCircle,
    empty: 'Aucun autre groupe',
  },
];

const sectionKeyFor = (group: MessagerieGroup) => {
  if (group.resource_type === 'workspace') return 'workspace';
  if (group.resource_type === 'espace') return 'espace';
  if (group.resource_type === 'liste') return 'liste';
  return 'group';
};

const emptyUnreadSummary: MessagerieUnreadSummary = {
  unread_discussions_count: 0,
  unread_group_ids: [],
  unread_group_counts: {},
  unread_private_user_ids: [],
  unread_private_counts: {},
  has_private_unread: false,
};

const unreadBadgeLabel = (count: number) => {
  if (count <= 0) return null;
  return count > 9 ? '+9' : String(count);
};

function UnreadBadge({ count, selected }: { count: number; selected: boolean }) {
  const label = unreadBadgeLabel(count);
  if (!label) return null;

  return (
    <span
      className={`ml-2 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black leading-none shadow-sm ${
        selected
          ? 'bg-white text-secondary'
          : 'bg-secondary text-white shadow-secondary/20'
      }`}
      title={`${count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}`}
      aria-label={`${count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}`}
    >
      {label}
    </span>
  );
}

function UserAvatar({
  member,
  label,
  className = 'h-10 w-10 rounded-xl',
}: {
  member?: MessagerieMember | null;
  label: string;
  className?: string;
}) {
  const src = avatarSrc(member);

  return (
    <div className={`${className} bg-primary/10 text-primary dark:text-sky-200 flex shrink-0 items-center justify-center overflow-hidden font-black text-sm`}>
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        initials(label)
      )}
    </div>
  );
}

export default function MessageriePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState<MessagerieGroup[]>([]);
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [selectedPrivateUserId, setSelectedPrivateUserId] = useState<string | null>(searchParams.get('private_user_id'));
  const [members, setMembers] = useState<MessagerieMember[]>([]);
  const [unreadSummary, setUnreadSummary] = useState<MessagerieUnreadSummary>(emptyUnreadSummary);
  const [privateProfile, setPrivateProfile] = useState<PublicUserProfile | null>(null);
  const [privateOnline, setPrivateOnline] = useState(false);
  const [privateLastSeen, setPrivateLastSeen] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<MessageItem | null>(null);
  const [groupStateLoading, setGroupStateLoading] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callKind, setCallKind] = useState<CallKind>('audio');
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const [incomingCall, setIncomingCall] = useState<CallSignalPayload | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const peerRefs = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const callSignalHandlerRef = useRef<(payload: CallSignalPayload) => void>(() => undefined);
  const callStartedAtRef = useRef<number | null>(null);
  const callTimerRef = useRef<number | null>(null);
  const callInitiatedByMeRef = useRef(false);
  const callWasActiveRef = useRef(false);
  const [remoteStreams, setRemoteStreams] = useState<Array<{ peerId: string; stream: MediaStream }>>([]);
  
  const [activeGroupState, setActiveGroupState] = useState<MessagerieGroup | null>(null);
  const activeGroup = activeGroupState;
  const desiredResourceType = searchParams.get('resource_type');
  const desiredResourceId = searchParams.get('resource_id');
  const desiredPrivateUserId = searchParams.get('private_user_id');
  const privateUserId = selectedPrivateUserId;
  const isPrivateMode = Boolean(privateUserId);
  const currentMember = members.find(member => member.id === user?.id);
  const canManageActiveGroup = Boolean(activeGroup?.can_manage || currentMember?.role === 'Administrateur');
  const canWriteActiveGroup = isPrivateMode || Boolean(activeGroup && (activeGroup.can_write !== false || canManageActiveGroup));
  const activeGroupIsReadOnly = Boolean(activeGroup && !isPrivateMode && !canWriteActiveGroup);
  const callsAllowed = isPrivateMode || Boolean(activeGroup && canWriteActiveGroup);
  const privateMember = profileAsMember(privateProfile);
  const threadTitle = isPrivateMode
    ? (privateProfile ? displayProfile(privateProfile) : 'Discussion privée')
    : activeGroup?.name;
  const threadSubtitle = isPrivateMode
    ? `${presenceLabel(privateOnline, privateLastSeen)} • Discussion privée`
    : activeGroup
      ? `${resourceLabel(activeGroup)} • ${members.length || activeGroup.member_count} participant${(members.length || activeGroup.member_count) > 1 ? 's' : ''}`
      : '';

  useEffect(() => {
    if (!activeGroupId) {
      setActiveGroupState(null);
      return;
    }
    const group = groups.find(g => g.id === activeGroupId) || null;
    setActiveGroupState(group);
  }, [activeGroupId, groups]);

  // ✅ loadGroups MODIFIÉE avec ensureChatGroup
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);
    try {
      // ✅ Si un resource_type est demandé, garantir le groupe via K-Planner
      if (desiredResourceType && desiredResourceId) {
        try {
          await ensureChatGroup(desiredResourceType, desiredResourceId);
        } catch (ensureError) {
          console.warn('Erreur lors de la synchronisation du groupe:', ensureError);
          // On continue, l'utilisateur pourra réessayer
        }
      }
      
      const [groupsResponse, privateResponse] = await Promise.all([
        messagerieService.listGroups(),
        messagerieService.listPrivateConversations(),
      ]);
      
      const nextGroups = groupsResponse.groups || [];
      const requestedGroup = nextGroups.find(group =>
        group.resource_type === desiredResourceType && group.resource_id === desiredResourceId
      );
      
      setGroups(nextGroups);
      setPrivateConversations(privateResponse.conversations || []);
      setActiveGroupId(current => privateUserId ? current : requestedGroup?.id || current || nextGroups[0]?.id || null);
      
      messagerieService.getUnreadSummary()
        .then(summary => setUnreadSummary({ ...emptyUnreadSummary, ...summary }))
        .catch(() => setUnreadSummary(emptyUnreadSummary));
    } catch (err: unknown) {
      setGroups([]);
      setPrivateConversations([]);
      setUnreadSummary(emptyUnreadSummary);
      setError(getErrorMessage(err, 'Impossible de charger vos conversations.'));
    } finally {
      setLoadingGroups(false);
    }
  }, [desiredResourceId, desiredResourceType, privateUserId]);

  useEffect(() => {
    if (desiredPrivateUserId) {
      setSelectedPrivateUserId(desiredPrivateUserId);
      setActiveGroupId(null);
    }
  }, [desiredPrivateUserId]);

  useEffect(() => {
    if (!desiredResourceType || !desiredResourceId || groups.length === 0) return;
    const requestedGroup = groups.find(group =>
      group.resource_type === desiredResourceType && group.resource_id === desiredResourceId
    );
    if (requestedGroup) {
      setActiveGroupId(requestedGroup.id);
    }
  }, [desiredResourceId, desiredResourceType, groups]);

  const loadThread = useCallback(async (groupId: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const [messagesResponse, membersResponse] = await Promise.all([
        messagerieService.getGroupMessages(groupId),
        messagerieService.getGroupMembers(groupId),
      ]);
      setMessages(messagesResponse.messages || []);
      setMembers(membersResponse.members || []);
      setUnreadSummary(current => ({
        ...current,
        unread_group_ids: current.unread_group_ids.filter(id => id !== groupId),
        unread_group_counts: { ...(current.unread_group_counts || {}), [groupId]: 0 },
        unread_discussions_count: Math.max(0, current.unread_discussions_count - (current.unread_group_counts?.[groupId] ? 1 : 0)),
      }));
    } catch (err: unknown) {
      setMessages([]);
      setMembers([]);
      setError(getErrorMessage(err, 'Impossible de charger cette conversation.'));
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const loadPrivateThread = useCallback(async (otherUserId: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const [profileData, presenceData, messagesResponse] = await Promise.all([
        authService.getUserProfile(otherUserId),
        messagerieService.getPresence(otherUserId).catch(() => ({ is_online: false, last_seen: null })),
        messagerieService.getPrivateMessages(otherUserId),
      ]);
      setPrivateProfile(profileData);
      setPrivateOnline(Boolean(presenceData.is_online));
      setPrivateLastSeen(presenceData.last_seen || null);
      setMessages(messagesResponse.messages || []);
      setMembers([]);
      setUnreadSummary(current => ({
        ...current,
        unread_private_user_ids: (current.unread_private_user_ids || []).filter(id => id !== otherUserId),
        unread_private_counts: { ...(current.unread_private_counts || {}), [otherUserId]: 0 },
        unread_discussions_count: Math.max(0, current.unread_discussions_count - (current.unread_private_counts?.[otherUserId] ? 1 : 0)),
        has_private_unread: (current.unread_private_user_ids || []).some(id => id !== otherUserId),
      }));
    } catch (err: unknown) {
      setMessages([]);
      setPrivateProfile(null);
      setPrivateLastSeen(null);
      setError(getErrorMessage(err, 'Impossible de charger cette discussion privée.'));
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (isPrivateMode) return;
    if (!activeGroupId) return;
    loadThread(activeGroupId);
  }, [activeGroupId, isPrivateMode, loadThread]);

  useEffect(() => {
    if (!privateUserId) {
      setPrivateProfile(null);
      setPrivateLastSeen(null);
      return;
    }
    loadPrivateThread(privateUserId);
  }, [loadPrivateThread, privateUserId]);

  // ✅ WEBSOCKET GROUPE - CORRIGÉ
  useEffect(() => {
    if (privateUserId) return;
    if (!activeGroupId) return;
    
    // ✅ NE PAS RECRÉER LE SOCKET S'IL EST DÉJÀ OUVERT
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    socketRef.current?.close();
    setIsRealtime(false);

    const socket = new WebSocket(messagerieService.groupSocketUrl(activeGroupId));
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('🔌 WebSocket groupe connecté:', activeGroupId);
      setIsRealtime(true);
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket groupe déconnecté:', activeGroupId);
      setIsRealtime(false);
    };
    
    socket.onerror = (err) => {
      console.error('❌ Erreur WebSocket groupe:', err);
      setIsRealtime(false);
    };
    
    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data) as Partial<MessageItem> & {
          event?: string;
          updated_message?: MessageItem;
          message_id?: string;
          group?: Partial<MessagerieGroup> & { id: string };
          error?: string;
          type?: string;
        };
        
        if (payload.error) {
          setError(getErrorMessage(payload.error, 'Action impossible dans cette discussion.'));
          return;
        }
        
        if (payload.event === 'group_state_updated' && payload.group?.id) {
          setGroups(prev => prev.map(group => {
            if (group.id !== payload.group!.id) return group;
            const isClosed = Boolean(payload.group!.is_closed);
            const canManage = Boolean(group.can_manage);
            return {
              ...group,
              ...payload.group,
              is_closed: isClosed,
              can_manage: canManage,
              can_write: !isClosed || canManage,
            };
          }));
          if (payload.group.id === activeGroupId) {
            setActiveGroupState(prev => {
              if (!prev || prev.id !== payload.group!.id) return prev;
              const isClosed = Boolean(payload.group!.is_closed);
              return {
                ...prev,
                ...payload.group,
                is_closed: isClosed,
                can_write: !isClosed || prev.can_manage,
              };
            });
            if (payload.group.is_closed) {
              setPendingAttachment(null);
              setDraft('');
            }
          }
          return;
        }
        
        if (typeof payload.type === 'string' && payload.type.startsWith('call_')) {
          callSignalHandlerRef.current(payload as CallSignalPayload);
          return;
        }
        
        if (payload.event === 'message_updated' && payload.updated_message) {
          setMessages(prev => prev.map(item => 
            item.id === payload.updated_message!.id ? payload.updated_message! : item
          ));
          return;
        }
        
        if (payload.event === 'message_deleted' && payload.message_id) {
          setMessages(prev => prev.filter(item => item.id !== payload.message_id));
          return;
        }
        
        // ✅ TRAITEMENT DES NOUVEAUX MESSAGES - CORRIGÉ
        if (payload.id) {
          const hasContent = payload.message || payload.audio || payload.image || payload.video || payload.file;
          if (!hasContent && payload.type !== 'system') {
            return;
          }
          
          // ✅ FORCER l'ajout du message si c'est le groupe actif
          const isGroupMessage = payload.id_groupe === activeGroupId;
          const isSystemMessage = payload.type === 'system';
          
          // ✅ Si le message n'a pas id_groupe mais qu'il vient du WebSocket du groupe actif, on l'accepte
          if (isGroupMessage || isSystemMessage || !payload.id_groupe) {
            const nextMessage = payload as MessageItem;
            
            // ✅ Ajouter id_groupe si manquant
            if (!nextMessage.id_groupe) {
              nextMessage.id_groupe = activeGroupId;
            }
            
            setMessages(prev => {
              // ✅ Éviter les doublons
              if (prev.some(item => item.id === nextMessage.id)) {
                return prev;
              }
              return [...prev, nextMessage];
            });
          }
        }
      } catch (err) {
        console.error('❌ Erreur de traitement WebSocket:', err);
        setIsRealtime(false);
      }
    };

    return () => {
      console.log('🔌 Fermeture du WebSocket groupe:', activeGroupId);
      socket.close();
    };
  }, [activeGroupId, privateUserId]);

  // ✅ WEBSOCKET PRIVÉ - CORRIGÉ
  useEffect(() => {
    if (!privateUserId) return;
    
    // ✅ NE PAS RECRÉER LE SOCKET S'IL EST DÉJÀ OUVERT
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    socketRef.current?.close();
    setIsRealtime(false);

    const socket = new WebSocket(messagerieService.privateSocketUrl(privateUserId));
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('🔌 WebSocket privé connecté:', privateUserId);
      setIsRealtime(true);
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket privé déconnecté:', privateUserId);
      setIsRealtime(false);
    };
    
    socket.onerror = (err) => {
      console.error('❌ Erreur WebSocket privé:', err);
      setIsRealtime(false);
    };
    
    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data) as Partial<MessageItem> & { 
          event?: string; 
          updated_message?: MessageItem; 
          message_id?: string;
          type?: string;
        };
        
        if (typeof payload.type === 'string' && payload.type.startsWith('call_')) {
          callSignalHandlerRef.current(payload as CallSignalPayload);
          return;
        }
        
        if (payload.event === 'message_updated' && payload.updated_message) {
          setMessages(prev => prev.map(item => 
            item.id === payload.updated_message!.id ? payload.updated_message! : item
          ));
          return;
        }
        
        if (payload.event === 'message_deleted' && payload.message_id) {
          setMessages(prev => prev.filter(item => item.id !== payload.message_id));
          return;
        }
        
        // ✅ TRAITEMENT DES NOUVEAUX MESSAGES PRIVÉS
        if (payload.id) {
          const hasContent = payload.message || payload.audio || payload.image || payload.video || payload.file;
          if (!hasContent && payload.type !== 'system') {
            return;
          }
          const nextMessage = payload as MessageItem;
          setMessages(prev => {
            if (prev.some(item => item.id === nextMessage.id)) {
              return prev;
            }
            return [...prev, nextMessage];
          });
        }
      } catch (err) {
        console.error('❌ Erreur de traitement WebSocket privé:', err);
        setIsRealtime(false);
      }
    };

    return () => {
      console.log('🔌 Fermeture du WebSocket privé:', privateUserId);
      socket.close();
    };
  }, [privateUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeGroupId]);

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingStartedAtRef.current = null;
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    Object.values(peerRefs.current).forEach(peer => peer.close());
    peerRefs.current = {};
    localStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const filteredGroups = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return groups;
    return groups.filter(group => {
      const typeLabel = resourceLabel(group);
      const section = groupSections.find(item => item.key === sectionKeyFor(group))?.title || '';
      return searchableText(
        group.name,
        group.raw_name,
        group.resource_type,
        group.resource_id,
        typeLabel,
        section,
        group.member_count,
        group.resource_type === 'liste' ? 'liste projet projets' : null,
        group.resource_type === 'workspace' ? 'workspace workspaces environnement' : null,
        group.resource_type === 'espace' ? 'espace espaces sous-espace' : null,
      ).includes(needle);
    });
  }, [groups, query]);

  const filteredPrivateConversations = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return privateConversations;
    return privateConversations.filter(conversation => searchableText(
      displayMember(conversation.user),
      conversation.user.username,
      conversation.user.email,
      conversation.user.id,
      conversationPreview(conversation.last_message),
      presenceLabel(conversation.is_online, conversation.last_seen),
      'discussion privee prive privé message',
    ).includes(needle));
  }, [privateConversations, query]);

  const visiblePrivateConversations = useMemo(() => {
    if (!privateProfile || filteredPrivateConversations.some(conversation => conversation.user.id === privateProfile.id)) {
      return filteredPrivateConversations;
    }

    const syntheticConversation: PrivateConversation = {
      room_id: `pending-${privateProfile.id}`,
      user: privateMember || {
        id: privateProfile.id,
        username: displayProfile(privateProfile),
        email: privateProfile.email,
        photo_base64: privateProfile.photo_base64,
        role: 'Membre',
      },
      last_message: null,
      updated_at: null,
      is_online: privateOnline,
      last_seen: privateLastSeen,
    };

    return [syntheticConversation, ...filteredPrivateConversations];
  }, [filteredPrivateConversations, privateLastSeen, privateMember, privateOnline, privateProfile]);

  const groupedConversations = useMemo(() => {
    const bySection = new Map<string, MessagerieGroup[]>();
    groupSections.forEach(section => bySection.set(section.key, []));
    filteredGroups.forEach(group => {
      const key = sectionKeyFor(group);
      bySection.set(key, [...(bySection.get(key) || []), group]);
    });
    return bySection;
  }, [filteredGroups]);

  const memberById = useMemo(() => {
    const map = new Map<string, MessagerieMember>();
    members.forEach(member => map.set(member.id, member));
    return map;
  }, [members]);

  const waitForRealtimeSocket = () =>
    new Promise<boolean>(resolve => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }
      if (socket.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }
      if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        resolve(false);
        return;
      }

      const timeout = window.setTimeout(() => {
        socket.removeEventListener('open', handleOpen);
        resolve(socket.readyState === WebSocket.OPEN);
      }, 2500);
      const handleOpen = () => {
        window.clearTimeout(timeout);
        resolve(true);
      };
      socket.addEventListener('open', handleOpen, { once: true });
    });

  const sendPayload = useCallback(async (payload: Parameters<typeof messagerieService.sendGroupMessage>[1]) => {
    const hasContent = payload.message || payload.audio || payload.image || payload.video || payload.file;
    if (!hasContent) {
      return;
    }

    if (!privateUserId && activeGroupIsReadOnly) {
      throw new Error("Cette discussion est fermée. Vous avez uniquement le droit de lecture.");
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      return;
    }

    if (privateUserId) {
      const sent = await messagerieService.sendPrivateMessage(privateUserId, payload);
      setMessages(prev => prev.some(item => item.id === sent.id) ? prev : [...prev, sent]);
      return;
    }

    if (!activeGroupId) return;
    const sent = await messagerieService.sendGroupMessage(activeGroupId, payload);
    setMessages(prev => prev.some(item => item.id === sent.id) ? prev : [...prev, sent]);
  }, [activeGroupId, activeGroupIsReadOnly, privateUserId]);

  const sendCallSignal = useCallback((payload: CallSignalPayload) => {
    if (!privateUserId && activeGroupIsReadOnly) {
      setError("Cette discussion est fermée. Vous ne pouvez pas lancer d'appel dans ce groupe.");
      return false;
    }
    if ((!privateUserId && !activeGroupId) || socketRef.current?.readyState !== WebSocket.OPEN) {
      setError("La connexion temps réel n'est pas prête pour lancer l'appel.");
      return false;
    }
    socketRef.current.send(JSON.stringify({ ...payload, from: user?.id }));
    return true;
  }, [activeGroupId, activeGroupIsReadOnly, privateUserId, user?.id]);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const startCallTimer = useCallback(() => {
    if (!callStartedAtRef.current) {
      callStartedAtRef.current = Date.now();
    }
    callWasActiveRef.current = true;
    stopCallTimer();
    setCallElapsedSeconds(Math.floor((Date.now() - callStartedAtRef.current) / 1000));
    callTimerRef.current = window.setInterval(() => {
      if (!callStartedAtRef.current) return;
      setCallElapsedSeconds(Math.floor((Date.now() - callStartedAtRef.current) / 1000));
    }, 1000);
  }, [stopCallTimer]);

  const resetCallTracking = useCallback(() => {
    stopCallTimer();
    callStartedAtRef.current = null;
    callInitiatedByMeRef.current = false;
    callWasActiveRef.current = false;
    setCallElapsedSeconds(0);
  }, [stopCallTimer]);

  const postCallHistory = useCallback((statusLabel: 'terminé' | 'manqué' | 'refusé', durationSeconds = 0) => {
    const kindLabel = callKind === 'video' ? 'vidéo' : 'audio';
    const durationText = statusLabel === 'terminé' ? ` • durée ${formatDuration(durationSeconds)}` : '';
    const message = `📞 Appel ${kindLabel} ${statusLabel}${durationText}`;
    if (message.trim()) {
      void sendPayload({
        type: 'text',
        message: message,
      }).catch(err => {
        console.error("Impossible d'ajouter l'historique d'appel", err);
      });
    }
  }, [callKind, sendPayload]);

  const attachMediaStreams = useCallback(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, []);

  const stopCall = useCallback((notify = true) => {
    const wasActive = callWasActiveRef.current;
    const durationSeconds = callStartedAtRef.current
      ? Math.floor((Date.now() - callStartedAtRef.current) / 1000)
      : 0;
    if (notify) {
      if (wasActive) {
        postCallHistory('terminé', durationSeconds);
      } else if (callInitiatedByMeRef.current && callStatus === 'outgoing') {
        postCallHistory('manqué');
      }
    }
    if (notify && callStatus !== 'idle') {
      sendCallSignal({ type: 'call_end' });
    }
    stopCallTimer();
    Object.values(peerRefs.current).forEach(peer => peer.close());
    peerRefs.current = {};
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setRemoteStreams([]);
    setIncomingCall(null);
    setCallStatus('idle');
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    resetCallTracking();
  }, [callStatus, postCallHistory, resetCallTracking, sendCallSignal, stopCallTimer]);

  const createPeerConnection = useCallback((peerId: string) => {
    peerRefs.current[peerId]?.close();
    const peer = new RTCPeerConnection(rtcConfig);

    peer.onicecandidate = event => {
      if (event.candidate) {
        sendCallSignal({ type: 'call_ice', candidate: event.candidate.toJSON(), to: peerId });
      }
    };

    peer.ontrack = event => {
      const [stream] = event.streams;
      if (!stream) return;
      setRemoteStreams(current => {
        const withoutPeer = current.filter(item => item.peerId !== peerId);
        return [...withoutPeer, { peerId, stream }];
      });
    };

    peer.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        setRemoteStreams(current => current.filter(item => item.peerId !== peerId));
      }
    };

    peerRefs.current[peerId] = peer;
    return peer;
  }, [sendCallSignal]);

  const getCallMedia = async (kind: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video',
    });
    localStreamRef.current = stream;
    attachMediaStreams();
    return stream;
  };

  const startCall = async (kind: CallKind) => {
    if (!callsAllowed) {
      setError("Cette discussion est en lecture seule. Les appels sont réservés aux personnes autorisées à écrire.");
      return;
    }
    const recipients = privateUserId
      ? [privateUserId]
      : members.filter(member => member.id !== user?.id).map(member => member.id);

    if (recipients.length === 0) {
      setError(isPrivateMode ? 'Aucun destinataire disponible.' : 'Aucun autre membre chargé pour cet appel de groupe.');
      return;
    }
    if (callStatus !== 'idle') return;

    try {
      setCallKind(kind);
      setCallStatus('outgoing');
      callInitiatedByMeRef.current = true;
      callWasActiveRef.current = false;
      callStartedAtRef.current = null;
      setCallElapsedSeconds(0);
      setError(null);
      const socketReady = await waitForRealtimeSocket();
      if (!socketReady) {
        stopCall(false);
        setError("La connexion temps réel n'est pas prête. Réessayez dans un instant.");
        return;
      }
      const stream = await getCallMedia(kind);
      for (const recipientId of recipients) {
        const peer = createPeerConnection(recipientId);
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        if (!sendCallSignal({ type: 'call_offer', call_type: kind, offer, to: recipientId })) {
          stopCall(false);
          return;
        }
      }
    } catch (err: unknown) {
      stopCall(false);
      setError(getErrorMessage(err, "Impossible de lancer l'appel."));
    }
  };

  const acceptCall = async () => {
    if (!incomingCall?.offer || !incomingCall.from) return;
    const kind = incomingCall.call_type || 'audio';
    try {
      setCallKind(kind);
      callInitiatedByMeRef.current = false;
      callWasActiveRef.current = false;
      callStartedAtRef.current = null;
      setCallElapsedSeconds(0);
      const stream = await getCallMedia(kind);
      const peer = createPeerConnection(incomingCall.from);
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendCallSignal({ type: 'call_answer', call_type: kind, answer, to: incomingCall.from });
      setIncomingCall(null);
      setCallStatus('active');
      startCallTimer();
    } catch (err: unknown) {
      stopCall(false);
      setError(getErrorMessage(err, "Impossible d'accepter l'appel."));
    }
  };

  const rejectCall = () => {
    sendCallSignal({ type: 'call_reject', to: incomingCall?.from });
    postCallHistory('refusé');
    setIncomingCall(null);
    setCallStatus('idle');
    resetCallTracking();
  };

  async function handleCallSignal(payload: CallSignalPayload) {
    try {
      if (payload.from && payload.from === user?.id) {
        return;
      }
      if (payload.to && payload.to !== user?.id) {
        return;
      }

      if (payload.type === 'call_offer') {
        if (callStatus !== 'idle') {
          sendCallSignal({ type: 'call_reject' });
          return;
        }
        setCallKind(payload.call_type || 'audio');
        callInitiatedByMeRef.current = false;
        callWasActiveRef.current = false;
        callStartedAtRef.current = null;
        setCallElapsedSeconds(0);
        setIncomingCall(payload);
        setCallStatus('incoming');
        return;
      }

      if (payload.type === 'call_answer' && payload.answer && payload.from && peerRefs.current[payload.from]) {
        await peerRefs.current[payload.from].setRemoteDescription(new RTCSessionDescription(payload.answer));
        setCallStatus('active');
        startCallTimer();
        return;
      }

      if (payload.type === 'call_ice' && payload.candidate && payload.from && peerRefs.current[payload.from]) {
        await peerRefs.current[payload.from].addIceCandidate(new RTCIceCandidate(payload.candidate));
        return;
      }

      if (payload.type === 'call_reject') {
        stopCall(false);
        setError('Appel refusé.');
        return;
      }

      if (payload.type === 'call_end') {
        stopCall(false);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur pendant l'appel."));
    }
  }
  callSignalHandlerRef.current = payload => {
    void handleCallSignal(payload);
  };

  useEffect(() => {
    attachMediaStreams();
  }, [attachMediaStreams, callStatus]);

  const handleFileSelect = async (file?: File) => {
    if (!file) return;
    if (activeGroupIsReadOnly) {
      setError("Cette discussion est fermée. Vous ne pouvez pas joindre de fichier dans ce groupe.");
      return;
    }
    if (file.size > MAX_CHAT_ATTACHMENT_SIZE) {
      setError('Le fichier est trop volumineux pour la discussion. Taille maximale : 8 Mo.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const { mimeType, base64 } = splitDataUrl(dataUrl);
      setPendingAttachment({
        kind: attachmentKindFromFile(file),
        name: file.name,
        mimeType: mimeType || file.type || 'application/octet-stream',
        base64,
      });
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Impossible de lire ce fichier.'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    if (activeGroupIsReadOnly) {
      setError("Cette discussion est fermée. Vous ne pouvez pas envoyer de message vocal dans ce groupe.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError("L'enregistrement vocal n'est pas disponible dans ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const durationSeconds = recordingStartedAtRef.current
          ? Math.max(1, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000))
          : recordingSeconds;
        recordingStartedAtRef.current = null;
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > MAX_CHAT_ATTACHMENT_SIZE) {
          setError('Le message vocal est trop volumineux. Réessayez avec un enregistrement plus court.');
          return;
        }
        const dataUrl = await fileToDataUrl(blob);
        const parsed = splitDataUrl(dataUrl);
        setPendingAttachment({
          kind: 'audio',
          name: `Message vocal ${formatDuration(durationSeconds)}.webm`,
          mimeType: parsed.mimeType || mimeType,
          base64: parsed.base64,
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(seconds => seconds + 1);
      }, 1000);
      setIsRecording(true);
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Impossible d'accéder au micro."));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    if (!activeGroupIsReadOnly) return;
    setPendingAttachment(null);
    setDraft('');
    if (isRecording) {
      stopRecording();
    }
    if (callStatus !== 'idle') {
      stopCall(false);
    }
  }, [activeGroupIsReadOnly, callStatus, isRecording, stopCall]);

  const startEditingMessage = (message: MessageItem) => {
    setEditingMessageId(message.id);
    setEditingDraft(editableMessageText(message));
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingDraft('');
  };

  const saveEditedMessage = async (message: MessageItem) => {
    const nextContent = updatedMessageContent(message, editingDraft);
    if (!isAttachmentMessage(message) && !nextContent.trim()) return;

    setMessageActionLoading(`edit-${message.id}`);
    setError(null);
    try {
      const updated = await messagerieService.updateMessage(message.id, nextContent);
      setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
      cancelEditingMessage();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Impossible de modifier ce message.'));
    } finally {
      setMessageActionLoading(null);
    }
  };

  const removeMessage = (message: MessageItem) => {
    setMessageToDelete(message);
  };

  const confirmRemoveMessage = async () => {
    if (!messageToDelete) return;
    setMessageActionLoading(`delete-${messageToDelete.id}`);
    setError(null);
    try {
      await messagerieService.deleteMessage(messageToDelete.id);
      setMessages(prev => prev.filter(item => item.id !== messageToDelete.id));
      if (editingMessageId === messageToDelete.id) cancelEditingMessage();
      setMessageToDelete(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Impossible de supprimer ce message.'));
    } finally {
      setMessageActionLoading(null);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if ((!activeGroupId && !privateUserId) || sending) return;
    if (activeGroupIsReadOnly) {
      setError("Cette discussion est fermée. Vous pouvez lire les messages, mais vous ne pouvez pas écrire.");
      return;
    }

    const text = draft.trim();
    const attachment = pendingAttachment;

    if (!text && !attachment) {
      return;
    }

    setDraft('');
    setPendingAttachment(null);
    setSending(true);
    setError(null);

    try {
      if (attachment) {
        await sendPayload({
          type: attachment.kind,
          message: text || null,
          [attachment.kind]: attachment.base64,
        });
      } else if (text) {
        await sendPayload({ message: text, type: 'text' });
      }
    } catch (err: unknown) {
      setDraft(text);
      setPendingAttachment(attachment);
      setError(getErrorMessage(err, "Impossible d'envoyer ce message."));
    } finally {
      setSending(false);
    }
  };

  // ✅ FONCTION CORRIGÉE - Avec guard contre les appels multiples
  const toggleGroupClosedState = async () => {
    if (groupStateLoading) return;
    
    const currentGroup = groups.find(g => g.id === activeGroupId);
    if (!currentGroup || !canManageActiveGroup) return;
    
    const nextClosedState = !currentGroup.is_closed;
    
    setGroupStateLoading(true);
    setError(null);
    
    const groupId = currentGroup.id;
    const currentClosedState = currentGroup.is_closed || false;
    
    // Mise à jour optimiste
    setActiveGroupState(prev => {
      if (!prev || prev.id !== groupId) return prev;
      return {
        ...prev,
        is_closed: nextClosedState,
        can_write: !nextClosedState || !!prev.can_manage,
      };
    });
    
    setGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        is_closed: nextClosedState,
        can_write: !nextClosedState || !!group.can_manage,
      };
    }));
    
    try {
      const response = await messagerieService.updateGroupClosedState(groupId, nextClosedState);
      
      // ✅ La réponse peut être { group: ... } ou directement le groupe
      const updatedGroup = (response as any).group || response;
      
      const isClosed = Boolean(updatedGroup.is_closed);
      const canManage = Boolean(updatedGroup.can_manage ?? currentGroup.can_manage);
      
      const finalGroup = {
        ...currentGroup,
        ...updatedGroup,
        is_closed: isClosed,
        can_manage: canManage,
        can_write: !isClosed || canManage,
      };
      
      // Mettre à jour activeGroupState
      setActiveGroupState(prev => {
        if (!prev || prev.id !== groupId) return prev;
        return finalGroup;
      });
      
      // Mettre à jour groups
      setGroups(prev => prev.map(group => {
        if (group.id !== groupId) return group;
        return finalGroup;
      }));
      
      if (nextClosedState) {
        setPendingAttachment(null);
        setDraft('');
      }
      
    } catch (err: unknown) {
      setActiveGroupState(prev => {
        if (!prev || prev.id !== groupId) return prev;
        return {
          ...prev,
          is_closed: currentClosedState,
          can_write: !currentClosedState || !!prev.can_manage,
        };
      });
      
      setGroups(prev => prev.map(group => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          is_closed: currentClosedState,
          can_write: !currentClosedState || !!group.can_manage,
        };
      }));
      
      setError(getErrorMessage(err, "Impossible de modifier l'état de cette discussion."));
    } finally {
      setGroupStateLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto xl:overflow-hidden bg-theme-page transition-colors duration-300">
      <div className="min-h-full xl:h-full max-w-[1500px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center shadow-lg shadow-secondary/10">
              <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-theme-main tracking-tight">Messagerie</h1>
              <p className="text-xs sm:text-sm text-theme-muted font-medium mt-1">
                Conversations des workspaces, espaces et listes où vous collaborez.
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl border text-[10px] sm:text-xs font-black uppercase tracking-widest ${isRealtime ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
            {isRealtime ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isRealtime ? 'Temps réel' : 'Connexion douce'}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-500 flex items-center gap-3">
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {messageToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.96 }}
                className="w-full max-w-md rounded-3xl border border-theme-subtle bg-theme-surface p-5 shadow-2xl"
              >
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-theme-main">Supprimer ce message ?</h3>
                    <p className="mt-1 text-sm font-medium text-theme-muted">
                      Cette action retirera le message de la conversation. Elle ne pourra pas être annulée.
                    </p>
                    <div className="mt-4 rounded-2xl border border-theme-subtle bg-theme-surface-hover px-3 py-2 text-sm text-theme-muted">
                      {messageToDelete.audio ? 'Message vocal'
                        : messageToDelete.image ? 'Image'
                          : messageToDelete.video ? 'Vidéo'
                            : messageToDelete.file ? 'Fichier'
                              : cleanMessageText(messageToDelete.message) || 'Message sans texte'}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMessageToDelete(null)}
                    disabled={messageActionLoading === `delete-${messageToDelete.id}`}
                    className="h-10 rounded-2xl border border-theme-subtle px-4 text-sm font-black text-theme-muted hover:bg-theme-surface-hover transition disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveMessage}
                    disabled={messageActionLoading === `delete-${messageToDelete.id}`}
                    className="h-10 rounded-2xl bg-red-500 px-4 text-sm font-black text-white hover:bg-red-600 transition disabled:opacity-60 flex items-center gap-2"
                  >
                    {messageActionLoading === `delete-${messageToDelete.id}` && <Loader2 size={16} className="animate-spin" />}
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {callStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-theme-subtle bg-theme-surface shadow-theme-md overflow-hidden"
          >
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${callKind === 'video' ? 'bg-secondary/10 text-secondary' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {callKind === 'video' ? <Video size={20} /> : <Phone size={19} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-theme-main">
                      {callStatus === 'incoming'
                        ? `${callKind === 'video' ? 'Appel vidéo' : 'Appel audio'} entrant`
                        : callStatus === 'outgoing'
                          ? `${callKind === 'video' ? 'Appel vidéo' : 'Appel audio'} en cours de lancement`
                          : `${callKind === 'video' ? 'Appel vidéo' : 'Appel audio'} actif`}
                    </p>
                    <p className="text-xs font-semibold text-theme-muted">
                      {isPrivateMode ? displayProfile(privateProfile) : activeGroup?.name}
                      {callStatus === 'active' && (
                        <span className="ml-2 font-black text-secondary tabular-nums">
                          {formatDuration(callElapsedSeconds)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {callStatus === 'incoming' && (
                    <>
                      <button
                        type="button"
                        onClick={acceptCall}
                        className="h-10 px-4 rounded-2xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 transition flex items-center gap-2"
                      >
                        <Phone size={16} />
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={rejectCall}
                        className="h-10 px-4 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition flex items-center gap-2"
                      >
                        <PhoneOff size={16} />
                        Refuser
                      </button>
                    </>
                  )}
                  {(callStatus === 'outgoing' || callStatus === 'active') && (
                    <button
                      type="button"
                      onClick={() => stopCall(true)}
                      className="h-10 px-4 rounded-2xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition flex items-center gap-2"
                    >
                      <PhoneOff size={16} />
                      Raccrocher
                    </button>
                  )}
                </div>
              </div>

              {callStatus === 'active' && callKind === 'video' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {remoteStreams.map(({ peerId, stream }) => (
                    <div key={peerId} className="aspect-video overflow-hidden rounded-3xl bg-black">
                      <video
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                        ref={element => {
                          if (element) element.srcObject = stream;
                        }}
                      />
                    </div>
                  ))}
                  <div className="aspect-video overflow-hidden rounded-3xl bg-black ring-2 ring-secondary/40">
                    <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  </div>
                </div>
              )}

              {callStatus === 'active' && callKind === 'audio' && (
                <div className="rounded-2xl border border-theme-subtle bg-theme-surface-hover px-4 py-3 text-sm font-bold text-theme-muted">
                  {remoteStreams.map(({ peerId, stream }) => (
                    <audio
                      key={peerId}
                      autoPlay
                      ref={element => {
                        if (element) element.srcObject = stream;
                      }}
                    />
                  ))}
                  Appel audio actif. Gardez cette discussion ouverte pendant l'appel.
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className={`min-h-0 flex-1 grid grid-cols-1 ${
          !isPrivateMode && participantsOpen
            ? 'xl:grid-cols-[340px_minmax(0,1fr)_300px]'
            : 'xl:grid-cols-[340px_minmax(0,1fr)]'
        } gap-4 sm:gap-5 xl:overflow-hidden`}>
          <GlassCard className="!p-0 overflow-hidden flex min-h-0 flex-col h-[380px] sm:h-[440px] xl:h-full" hover={false}>
            <div className="p-4 border-b border-theme-subtle">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-black text-theme-muted">Canaux</p>
                  <p className="text-xl font-black text-theme-main">{groups.length + privateConversations.length}</p>
                </div>
                <button
                  onClick={loadGroups}
                  className="h-10 w-10 rounded-xl border border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-secondary transition flex items-center justify-center"
                  title="Actualiser"
                >
                  <RefreshCw size={18} className={loadingGroups ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Rechercher un canal..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-theme-subtle bg-theme-surface-hover text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
              {loadingGroups ? (
                <div className="h-full flex items-center justify-center text-theme-muted">
                  <Loader2 className="animate-spin text-secondary" />
                </div>
              ) : filteredGroups.length === 0 && visiblePrivateConversations.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center text-theme-muted px-6">
                  <Sparkles className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm font-bold text-theme-main">Aucune conversation disponible</p>
                  <p className="text-xs mt-2 leading-relaxed">Vos groupes et discussions privées apparaîtront ici.</p>
                </div>
              ) : (
                <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-theme-muted">
                      <MessageCircle size={13} />
                      Privées
                    </div>
                    <span className="rounded-full bg-theme-surface-hover px-2 py-0.5 text-[10px] font-black text-theme-muted">
                      {visiblePrivateConversations.length}
                    </span>
                  </div>

                  {visiblePrivateConversations.length === 0 ? (
                    !query.trim() && (
                      <div className="rounded-2xl border border-dashed border-theme-subtle px-3 py-3 text-[11px] font-bold text-theme-muted/60">
                        Aucune discussion privée
                      </div>
                    )
                  ) : (
                    visiblePrivateConversations.map(conversation => {
                      const selected = selectedPrivateUserId === conversation.user.id;
                      const unreadCount = unreadSummary.unread_private_counts?.[conversation.user.id] || 0;
                      return (
                        <button
                          key={conversation.room_id}
                          onClick={() => {
                            setSelectedPrivateUserId(conversation.user.id);
                            setActiveGroupId(null);
                          }}
                          className={`w-full text-left rounded-2xl p-3 transition-all border ${selected
                            ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/15'
                            : 'bg-theme-surface hover:bg-theme-surface-hover text-theme-main border-theme-subtle'}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative">
                              <UserAvatar member={conversation.user} label={displayMember(conversation.user)} className="h-11 w-11 rounded-xl" />
                              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${selected ? 'border-secondary' : 'border-theme-surface'} ${conversation.is_online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <p className="min-w-0 flex-1 truncate font-black">{displayMember(conversation.user)}</p>
                                <UnreadBadge count={unreadCount} selected={selected} />
                              </div>
                              <p className={`text-xs mt-1 truncate ${selected ? 'text-white/70' : 'text-theme-muted'}`}>
                                {conversationPreview(conversation.last_message) || presenceLabel(conversation.is_online, conversation.last_seen)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {groupSections.map(section => {
                  const sectionGroups = groupedConversations.get(section.key) || [];
                  if (sectionGroups.length === 0 && query.trim()) return null;
                  const SectionIcon = section.icon;

                  return (
                    <div key={section.key} className="space-y-2">
                      <div className="flex items-center justify-between px-1 pt-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-theme-muted">
                          <SectionIcon size={13} />
                          {section.title}
                        </div>
                        <span className="rounded-full bg-theme-surface-hover px-2 py-0.5 text-[10px] font-black text-theme-muted">
                          {sectionGroups.length}
                        </span>
                      </div>

                      {sectionGroups.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-theme-subtle px-3 py-3 text-[11px] font-bold text-theme-muted/60">
                          {section.empty}
                        </div>
                      ) : (
                        sectionGroups.map(group => {
                          const selected = activeGroupId === group.id;
                          const unreadCount = unreadSummary.unread_group_counts?.[group.id] || 0;
                          return (
                          <button
                            key={group.id}
                            onClick={() => {
                              setActiveGroupId(group.id);
                              setSelectedPrivateUserId(null);
                            }}
                            className={`w-full text-left rounded-2xl p-3 transition-all border ${selected
                              ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/15'
                              : 'bg-theme-surface hover:bg-theme-surface-hover text-theme-main border-theme-subtle'}`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${selected ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary dark:text-sky-200'}`}>
                                {initials(group.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center justify-between gap-2">
                                  <p className="min-w-0 flex-1 truncate font-black">{group.name}</p>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <UnreadBadge count={unreadCount} selected={selected} />
                                  </div>
                                </div>
                                <p className={`text-xs mt-1 flex items-center gap-1 ${selected ? 'text-white/70' : 'text-theme-muted'}`}>
                                  <Users size={13} />
                                  {group.member_count} membre{group.member_count > 1 ? 's' : ''}
                                  <span className="opacity-60">•</span>
                                  <span className="truncate">{resourceLabel(group)}</span>
                                  {group.is_closed && (
                                    <>
                                      <span className="opacity-60">•</span>
                                      <Lock size={12} />
                                      <span>Lecture seule</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
                </>
              )}
            </div>
          </GlassCard>

          <GlassCard className="!p-0 overflow-hidden flex min-h-0 flex-col h-[620px] xl:h-full" hover={false}>
            {activeGroup || isPrivateMode ? (
              <>
                <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-theme-subtle flex items-center justify-between gap-3 sm:gap-4 bg-theme-surface/90">
                  <div className="min-w-0">
                    {isPrivateMode && privateProfile ? (
                      <Link
                        to={`/users/${privateProfile.id}`}
                        className="flex items-center gap-3 min-w-0 -m-2 p-2 rounded-2xl hover:bg-theme-surface-hover transition"
                        title="Voir le profil"
                      >
                        <UserAvatar member={privateMember} label={threadTitle || 'Utilisateur'} className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl text-base shadow-lg" />
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-black text-theme-main truncate">{threadTitle}</h2>
                          <p className="text-xs text-theme-muted font-medium">
                            {threadSubtitle}
                          </p>
                        </div>
                      </Link>
                    ) : isPrivateMode ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-primary/10 text-primary dark:text-sky-200 flex items-center justify-center font-black shadow-lg">
                          {initials(threadTitle)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-black text-theme-main truncate">{threadTitle}</h2>
                          <p className="text-xs text-theme-muted font-medium">
                            {loadingThread ? 'Chargement du profil...' : threadSubtitle || 'Discussion privée'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg">
                          {initials(activeGroup?.name)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-black text-theme-main truncate">{threadTitle}</h2>
                          <p className="text-xs text-theme-muted font-medium">
                            {threadSubtitle}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPrivateMode && activeGroup && (
                      canManageActiveGroup ? (
                        <button
                          type="button"
                          onClick={toggleGroupClosedState}
                          disabled={groupStateLoading}
                          className={`h-10 rounded-2xl border px-3 transition flex items-center gap-2 text-xs font-black ${
                            activeGroup.is_closed
                              ? 'border-amber-500/25 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15'
                              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'
                          } disabled:opacity-60`}
                          title={activeGroup.is_closed ? 'Ouvrir la discussion aux membres' : 'Fermer la discussion en lecture seule'}
                        >
                          {groupStateLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : activeGroup.is_closed ? (
                            <Lock size={16} />
                          ) : (
                            <Unlock size={16} />
                          )}
                          <span className="hidden sm:inline">{activeGroup.is_closed ? 'Fermée' : 'Ouverte'}</span>
                        </button>
                      ) : activeGroup.is_closed ? (
                        <div
                          className="h-10 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-black text-amber-500 flex items-center gap-2"
                          title="Les administrateurs ont fermé cette discussion."
                        >
                          <Lock size={16} />
                          <span className="hidden sm:inline">Lecture seule</span>
                        </div>
                      ) : null
                    )}
                    {(isPrivateMode || activeGroup) && (
                      <>
                        <button
                          type="button"
                          onClick={() => startCall('audio')}
                          disabled={!callsAllowed || callStatus !== 'idle' || (isPrivateMode && !privateProfile) || (!isPrivateMode && members.length <= 1)}
                          className="h-10 w-10 rounded-2xl border border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition flex items-center justify-center disabled:opacity-50"
                          title={!callsAllowed ? 'Discussion en lecture seule : appel indisponible' : isPrivateMode && !privateProfile ? 'Chargement du profil...' : !isRealtime ? 'Connexion temps réel en cours, le clic préparera l’appel...' : 'Appel audio'}
                        >
                          <Phone size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => startCall('video')}
                          disabled={!callsAllowed || callStatus !== 'idle' || (isPrivateMode && !privateProfile) || (!isPrivateMode && members.length <= 1)}
                          className="h-10 w-10 rounded-2xl border border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-secondary hover:bg-secondary/10 transition flex items-center justify-center disabled:opacity-50"
                          title={!callsAllowed ? 'Discussion en lecture seule : appel indisponible' : isPrivateMode && !privateProfile ? 'Chargement du profil...' : !isRealtime ? 'Connexion temps réel en cours, le clic préparera l’appel...' : 'Appel vidéo'}
                        >
                          <Video size={18} />
                        </button>
                      </>
                    )}
                    {!isPrivateMode && activeGroup && (
                      <button
                        type="button"
                        onClick={() => setParticipantsOpen(open => !open)}
                        className={`h-10 rounded-2xl border px-3 transition flex items-center gap-2 text-xs font-black ${
                          participantsOpen
                            ? 'border-secondary/25 bg-secondary/10 text-secondary hover:bg-secondary/15'
                            : 'border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-secondary hover:bg-secondary/10'
                        }`}
                        title={participantsOpen ? 'Fermer les participants' : 'Afficher les participants'}
                      >
                        {participantsOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                        <span className="hidden sm:inline">{participantsOpen ? 'Masquer' : 'Participants'}</span>
                      </button>
                    )}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-theme-muted font-bold">
                      <MessageSquareText size={16} />
                      {messages.length} message{messages.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[radial-gradient(circle_at_top_left,rgba(255,102,0,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(38,74,103,0.08),transparent_30%)]">
                  {loadingThread ? (
                    <div className="h-full flex flex-col items-center justify-center text-theme-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-secondary mb-3" />
                      <p className="text-xs uppercase tracking-widest font-black">Ouverture du salon...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center">
                      <div className="h-20 w-20 rounded-3xl bg-secondary/10 text-secondary flex items-center justify-center mb-5 border border-secondary/10">
                        <MessageCircle size={36} />
                      </div>
                      <p className="text-xl font-black text-theme-main">La conversation est prête</p>
                      <p className="text-sm text-theme-muted mt-2 max-w-sm leading-relaxed">
                        Le premier message donnera le ton à ce groupe de ressource.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {messages.map(message => {
                          const isMine = message.sender === user?.id;
                          const isEditing = editingMessageId === message.id;
                          const editAllowed = isMine && canEditMessage(message);
                          const sender = isPrivateMode && message.sender === privateProfile?.id
                            ? privateMember
                            : memberById.get(message.sender);
                          
                          const senderPhoto = message.sender_photo_base64 || sender?.photo_base64;
                          const senderWithPhoto = sender ? { ...sender, photo_base64: senderPhoto } : null;
                          
                          const senderLabel = isMine ? 'Vous' : displayMember(sender || { id: message.sender, role: 'Membre' });
                          const senderProfilePath = isMine ? '/profile' : sender?.id ? `/users/${sender.id}` : null;
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 12, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[92%] sm:max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                <div className={`flex items-center gap-2 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                  {senderProfilePath ? (
                                    <Link
                                      to={senderProfilePath}
                                      className={`flex items-center gap-2 rounded-full hover:text-secondary transition ${isMine ? 'flex-row-reverse' : ''}`}
                                      title={isMine ? 'Voir mon profil' : 'Voir le profil'}
                                    >
                                      <UserAvatar
                                        member={senderWithPhoto}
                                        label={senderLabel}
                                        className="h-6 w-6 rounded-full text-[10px]"
                                      />
                                      <span className="text-[11px] font-black text-theme-muted hover:text-secondary transition">
                                        {senderLabel}
                                      </span>
                                    </Link>
                                  ) : (
                                    <>
                                      <UserAvatar
                                        member={senderWithPhoto}
                                        label={senderLabel}
                                        className="h-6 w-6 rounded-full text-[10px]"
                                      />
                                      <span className="text-[11px] font-black text-theme-muted">
                                        {senderLabel}
                                      </span>
                                    </>
                                  )}
                                  <span className="text-[10px] text-theme-muted opacity-60">{formatDateTime(message.created_at)}</span>
                                </div>
                                <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-theme-sm border text-sm leading-relaxed break-words ${isMine
                                  ? 'bg-secondary text-white border-secondary rounded-br-md'
                                  : 'bg-theme-surface text-theme-main border-theme-subtle rounded-bl-md'}`}>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editingDraft}
                                        onChange={event => setEditingDraft(event.target.value)}
                                        className="min-h-[80px] w-full resize-none rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                                        placeholder={isAttachmentMessage(message) ? 'Ajouter une légende...' : 'Modifier le message...'}
                                        autoFocus
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={cancelEditingMessage}
                                          className="h-8 w-8 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition flex items-center justify-center"
                                          title="Annuler"
                                        >
                                          <X size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => saveEditedMessage(message)}
                                          disabled={messageActionLoading === `edit-${message.id}` || (!isAttachmentMessage(message) && !editingDraft.trim())}
                                          className="h-8 w-8 rounded-xl bg-white text-secondary hover:bg-white/90 transition flex items-center justify-center disabled:opacity-50"
                                          title="Enregistrer"
                                        >
                                          {messageActionLoading === `edit-${message.id}` ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <MessageContent message={message} isMine={isMine} />
                                  )}
                                </div>
                                {isMine && !isEditing && (
                                  <div className={`flex items-center gap-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                    {editAllowed && (
                                      <button
                                        type="button"
                                        onClick={() => startEditingMessage(message)}
                                        className="h-7 w-7 rounded-lg text-theme-muted hover:text-secondary hover:bg-secondary/10 transition flex items-center justify-center"
                                        title="Modifier le message"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeMessage(message)}
                                      disabled={messageActionLoading === `delete-${message.id}`}
                                      className="h-7 w-7 rounded-lg text-theme-muted hover:text-red-500 hover:bg-red-500/10 transition flex items-center justify-center disabled:opacity-50"
                                      title="Supprimer le message"
                                    >
                                      {messageActionLoading === `delete-${message.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <div ref={endRef} />
                    </div>
                  )}
                </div>

                {activeGroupIsReadOnly ? (
                  <div className="p-3 sm:p-4 border-t border-theme-subtle bg-theme-surface/95">
                    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-600 dark:text-amber-400 flex items-start gap-3">
                      <div className="mt-0.5 h-9 w-9 shrink-0 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <Lock size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black">Discussion fermée par les administrateurs</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-700/80 dark:text-amber-300/80">
                          Vous pouvez lire les messages de ce groupe, mais l'écriture, les pièces jointes, les messages vocaux et les appels sont désactivés.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-theme-subtle bg-theme-surface/95">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={event => handleFileSelect(event.target.files?.[0])}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  />
                  {pendingAttachment && (
                    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-theme-subtle bg-theme-surface-hover px-3 py-2">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                        {pendingAttachment.kind === 'audio' ? <Mic size={18} />
                          : pendingAttachment.kind === 'image' ? <ImageIcon size={18} />
                            : pendingAttachment.kind === 'video' ? <Video size={18} />
                              : <FileText size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-theme-main">{pendingAttachment.name}</p>
                        <p className="truncate text-xs text-theme-muted">{pendingAttachment.mimeType}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        className="h-8 w-8 rounded-xl text-theme-muted hover:text-red-500 hover:bg-red-500/10 transition flex items-center justify-center"
                        title="Retirer la pièce jointe"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {isRecording && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-500">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
                        <span className="truncate text-sm font-black">Enregistrement vocal en cours</span>
                      </div>
                      <span className="shrink-0 rounded-xl bg-red-500/10 px-2.5 py-1 text-xs font-black tabular-nums">
                        {formatDuration(recordingSeconds)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || isRecording}
                      className="h-12 w-12 shrink-0 rounded-2xl border border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-secondary hover:bg-secondary/10 transition flex items-center justify-center disabled:opacity-50"
                      title="Joindre un fichier"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={sending}
                      className={`h-12 w-12 shrink-0 rounded-2xl border transition flex items-center justify-center disabled:opacity-50 ${
                        isRecording
                          ? 'border-red-500/30 bg-red-500/10 text-red-500 animate-pulse'
                          : 'border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-secondary hover:bg-secondary/10'
                      }`}
                      title={isRecording ? "Arrêter l'enregistrement" : 'Enregistrer un message vocal'}
                    >
                      {isRecording ? <Square size={16} /> : <Mic size={18} />}
                    </button>
                    <textarea
                      value={draft}
                      onChange={event => setDraft(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage(event);
                        }
                      }}
                      placeholder="Écrire un message..."
                      className="min-h-[48px] max-h-32 flex-1 resize-none rounded-2xl border border-theme-subtle bg-theme-surface-hover px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    />
                    <Button type="submit" loading={sending} disabled={(!draft.trim() && !pendingAttachment) || sending || isRecording} className="h-12 w-12 !p-0 rounded-2xl">
                      <Send size={18} />
                    </Button>
                  </div>
                </form>
                )}
              </>
            ) : (
              <div className="h-full min-h-[520px] flex flex-col items-center justify-center text-center text-theme-muted p-10">
                <MessageCircle className="h-14 w-14 opacity-30 mb-4" />
                <p className="text-lg font-black text-theme-main">Sélectionnez une conversation</p>
                <p className="text-sm mt-2 max-w-sm">Vos groupes de ressources seront listés dès que vous appartenez à un workspace, un espace ou une liste.</p>
              </div>
            )}
          </GlassCard>

          {!isPrivateMode && participantsOpen && (
            <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[320px] xl:min-h-[420px]" hover={false}>
              <div className="p-4 border-b border-theme-subtle">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-black text-theme-muted">Participants</p>
                  <p className="text-xl font-black text-theme-main mt-1">{members.length}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeGroup && members.length === 0 && loadingThread ? (
                  <div className="h-full flex items-center justify-center text-theme-muted">
                    <Loader2 className="animate-spin text-secondary" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="h-full min-h-[260px] flex items-center justify-center text-center text-theme-muted px-6">
                    <p className="text-sm">Aucun participant chargé.</p>
                  </div>
                ) : (
                  members.map(member => {
                    const isMe = member.id === user?.id;
                    const participantLabel = isMe ? 'Vous' : displayMember(member);
                    return (
                      <div
                        key={member.id}
                        className="flex min-w-0 items-center gap-2 rounded-2xl border border-theme-subtle bg-theme-surface px-2.5 py-2 hover:bg-theme-surface-hover transition"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isMe) return;
                            setSelectedPrivateUserId(member.id);
                            setActiveGroupId(null);
                          }}
                          disabled={isMe}
                          className="h-9 w-9 shrink-0 rounded-xl border border-theme-subtle bg-theme-surface-hover text-theme-muted hover:text-secondary hover:bg-secondary/10 transition flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-theme-muted"
                          title={isMe ? 'Vous êtes ce participant' : `Discuter avec ${participantLabel}`}
                        >
                          <MessageCircle size={16} />
                        </button>
                        <Link
                          to={isMe ? '/profile' : `/users/${member.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl -m-1 p-1 transition hover:text-secondary"
                          title={isMe ? 'Voir mon profil' : 'Voir le profil'}
                        >
                          <UserAvatar member={member} label={participantLabel} className="h-9 w-9 shrink-0 rounded-xl text-xs" />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 truncate text-sm font-black text-theme-main">{participantLabel}</p>
                              <span className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${member.role === 'Administrateur'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-500 border-sky-500/20'}`}>
                                {member.role === 'Administrateur' ? <Crown size={10} /> : <Shield size={10} />}
                                {member.role}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}