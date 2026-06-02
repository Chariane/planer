import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Crown,
  Loader2,
  MessageCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  Briefcase,
  FolderTree,
  ListTodo,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import type { PublicUserProfile } from '../services/auth.service';
import {
  messagerieService,
  type MessageItem,
  type MessagerieGroup,
  type MessagerieMember,
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
  error instanceof Error ? error.message : fallback;

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
  const [privateProfile, setPrivateProfile] = useState<PublicUserProfile | null>(null);
  const [privateOnline, setPrivateOnline] = useState(false);
  const [privateLastSeen, setPrivateLastSeen] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeGroup = groups.find(group => group.id === activeGroupId) || null;
  const desiredResourceType = searchParams.get('resource_type');
  const desiredResourceId = searchParams.get('resource_id');
  const desiredPrivateUserId = searchParams.get('private_user_id');
  const privateUserId = selectedPrivateUserId;
  const isPrivateMode = Boolean(privateUserId);
  const privateMember = profileAsMember(privateProfile);
  const threadTitle = isPrivateMode ? displayProfile(privateProfile) : activeGroup?.name;
  const threadSubtitle = isPrivateMode
    ? `${presenceLabel(privateOnline, privateLastSeen)} • Discussion privée`
    : activeGroup
      ? `${resourceLabel(activeGroup)} • ${members.length || activeGroup.member_count} participant${(members.length || activeGroup.member_count) > 1 ? 's' : ''}`
      : '';

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);
    try {
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
    } catch (err: unknown) {
      setGroups([]);
      setPrivateConversations([]);
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
        messagerieService.getPresence(otherUserId).catch(() => ({ is_online: false })),
        messagerieService.getPrivateMessages(otherUserId),
      ]);
      setPrivateProfile(profileData);
      setPrivateOnline(Boolean(presenceData.is_online));
      setPrivateLastSeen(presenceData.last_seen || null);
      setMessages(messagesResponse.messages || []);
      setMembers([]);
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

  useEffect(() => {
    if (privateUserId) return;
    if (!activeGroupId) return;
    socketRef.current?.close();
    setIsRealtime(false);

    const socket = new WebSocket(messagerieService.groupSocketUrl(activeGroupId));
    socketRef.current = socket;

    socket.onopen = () => setIsRealtime(true);
    socket.onclose = () => setIsRealtime(false);
    socket.onerror = () => setIsRealtime(false);
    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data) as MessageItem;
        if (!payload.id || payload.id_groupe !== activeGroupId) return;
        setMessages(prev => prev.some(item => item.id === payload.id) ? prev : [...prev, payload]);
      } catch {
        setIsRealtime(false);
      }
    };

    return () => socket.close();
  }, [activeGroupId, privateUserId]);

  useEffect(() => {
    if (!privateUserId) return;
    socketRef.current?.close();
    setIsRealtime(false);

    const socket = new WebSocket(messagerieService.privateSocketUrl(privateUserId));
    socketRef.current = socket;

    socket.onopen = () => setIsRealtime(true);
    socket.onclose = () => setIsRealtime(false);
    socket.onerror = () => setIsRealtime(false);
    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data) as MessageItem;
        if (!payload.id) return;
        setMessages(prev => prev.some(item => item.id === payload.id) ? prev : [...prev, payload]);
      } catch {
        setIsRealtime(false);
      }
    };

    return () => socket.close();
  }, [privateUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeGroupId]);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups.filter(group =>
      group.name.toLowerCase().includes(needle)
      || resourceLabel(group).toLowerCase().includes(needle)
    );
  }, [groups, query]);

  const filteredPrivateConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return privateConversations;
    return privateConversations.filter(conversation =>
      displayMember(conversation.user).toLowerCase().includes(needle)
      || (conversation.user.email || '').toLowerCase().includes(needle)
    );
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

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if ((!activeGroupId && !privateUserId) || !draft.trim() || sending) return;

    const text = draft.trim();
    setDraft('');
    setSending(true);
    setError(null);

    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ message: text, type: 'text' }));
      } else if (privateUserId) {
        const sent = await messagerieService.sendPrivateMessage(privateUserId, { message: text, type: 'text' });
        setMessages(prev => prev.some(item => item.id === sent.id) ? prev : [...prev, sent]);
      } else {
        const sent = await messagerieService.sendGroupMessage(activeGroupId!, { message: text, type: 'text' });
        setMessages(prev => prev.some(item => item.id === sent.id) ? prev : [...prev, sent]);
      }
    } catch (err: unknown) {
      setDraft(text);
      setError(getErrorMessage(err, "Impossible d'envoyer ce message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-theme-page transition-colors duration-300">
      <div className="min-h-full max-w-[1500px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">
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

        <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_300px] gap-4 sm:gap-5">
          <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[340px] sm:min-h-[420px]" hover={false}>
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <UserAvatar member={conversation.user} label={displayMember(conversation.user)} className="h-11 w-11 rounded-xl" />
                              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${selected ? 'border-secondary' : 'border-theme-surface'} ${conversation.is_online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black truncate">{displayMember(conversation.user)}</p>
                              <p className={`text-xs mt-1 truncate ${selected ? 'text-white/70' : 'text-theme-muted'}`}>
                                {conversation.last_message?.message || presenceLabel(conversation.is_online, conversation.last_seen)}
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
                        sectionGroups.map(group => (
                          <button
                            key={group.id}
                            onClick={() => {
                              setActiveGroupId(group.id);
                              setSelectedPrivateUserId(null);
                            }}
                            className={`w-full text-left rounded-2xl p-3 transition-all border ${activeGroupId === group.id
                              ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/15'
                              : 'bg-theme-surface hover:bg-theme-surface-hover text-theme-main border-theme-subtle'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm ${activeGroupId === group.id ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary dark:text-sky-200'}`}>
                                {initials(group.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-black truncate">{group.name}</p>
                                <p className={`text-xs mt-1 flex items-center gap-1 ${activeGroupId === group.id ? 'text-white/70' : 'text-theme-muted'}`}>
                                  <Users size={13} />
                                  {group.member_count} membre{group.member_count > 1 ? 's' : ''}
                                  <span className="opacity-60">•</span>
                                  <span className="truncate">{resourceLabel(group)}</span>
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  );
                })}
                </>
              )}
            </div>
          </GlassCard>

          <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[520px] sm:min-h-[560px] xl:min-h-[520px]" hover={false}>
            {activeGroup || privateProfile ? (
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
                  <div className="hidden sm:flex items-center gap-2 text-xs text-theme-muted font-bold">
                    <MessageSquareText size={16} />
                    {messages.length} message{messages.length > 1 ? 's' : ''}
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
                          const sender = isPrivateMode && message.sender === privateProfile?.id
                            ? privateMember
                            : memberById.get(message.sender);
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
                                        member={sender}
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
                                        member={sender}
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
                                  {message.message}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <div ref={endRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-theme-subtle bg-theme-surface/95">
                  <div className="flex items-end gap-3">
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
                    <Button type="submit" loading={sending} disabled={!draft.trim() || sending} className="h-12 w-12 !p-0 rounded-2xl">
                      <Send size={18} />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="h-full min-h-[520px] flex flex-col items-center justify-center text-center text-theme-muted p-10">
                <MessageCircle className="h-14 w-14 opacity-30 mb-4" />
                <p className="text-lg font-black text-theme-main">Sélectionnez une conversation</p>
                <p className="text-sm mt-2 max-w-sm">Vos groupes de ressources seront listés dès que vous appartenez à un workspace, un espace ou une liste.</p>
              </div>
            )}
          </GlassCard>

          {!isPrivateMode && (
          <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[320px] xl:min-h-[420px]" hover={false}>
            <div className="p-4 border-b border-theme-subtle">
              <p className="text-[10px] uppercase tracking-[0.22em] font-black text-theme-muted">Participants</p>
              <p className="text-xl font-black text-theme-main mt-1">{members.length}</p>
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
                members.map(member => (
                  <Link key={member.id} to={`/users/${member.id}`} className="block p-3 rounded-2xl border border-theme-subtle bg-theme-surface hover:bg-theme-surface-hover transition">
                    <div className="flex items-center gap-3">
                      <UserAvatar member={member} label={displayMember(member)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-theme-main truncate">{displayMember(member)}</p>
                        <p className="text-xs text-theme-muted truncate">{member.email || 'Email non renseigné'}</p>
                      </div>
                    </div>
                    <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${member.role === 'Administrateur'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-sky-500/10 text-sky-500 border-sky-500/20'}`}>
                      {member.role === 'Administrateur' ? <Crown size={12} /> : <Shield size={12} />}
                      {member.role}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
