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
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../contexts/AuthContext';
import {
  messagerieService,
  type MessageItem,
  type MessagerieGroup,
  type MessagerieMember,
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

export default function MessageriePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState<MessagerieGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<MessagerieMember[]>([]);
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

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);
    try {
      const response = await messagerieService.listGroups();
      const nextGroups = response.groups || [];
      const requestedGroup = nextGroups.find(group =>
        group.resource_type === desiredResourceType && group.resource_id === desiredResourceId
      );
      setGroups(nextGroups);
      setActiveGroupId(current => requestedGroup?.id || current || nextGroups[0]?.id || null);
    } catch (err: unknown) {
      setGroups([]);
      setError(getErrorMessage(err, 'Impossible de charger vos conversations.'));
    } finally {
      setLoadingGroups(false);
    }
  }, [desiredResourceId, desiredResourceType]);

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

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!activeGroupId) return;
    loadThread(activeGroupId);
  }, [activeGroupId, loadThread]);

  useEffect(() => {
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
  }, [activeGroupId]);

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
    if (!activeGroupId || !draft.trim() || sending) return;

    const text = draft.trim();
    setDraft('');
    setSending(true);
    setError(null);

    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ message: text, type: 'text' }));
      } else {
        const sent = await messagerieService.sendGroupMessage(activeGroupId, { message: text, type: 'text' });
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
    <div className="h-full overflow-hidden bg-theme-page transition-colors duration-300">
      <div className="h-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center shadow-lg shadow-secondary/10">
              <MessageCircle size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-theme-main tracking-tight">Messagerie</h1>
              <p className="text-sm text-theme-muted font-medium mt-1">
                Conversations des workspaces, espaces et listes où vous collaborez.
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest ${isRealtime ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
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

        <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_300px] gap-5">
          <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[420px]" hover={false}>
            <div className="p-4 border-b border-theme-subtle">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] font-black text-theme-muted">Canaux</p>
                  <p className="text-xl font-black text-theme-main">{groups.length}</p>
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
              ) : filteredGroups.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center text-theme-muted px-6">
                  <Sparkles className="h-10 w-10 opacity-30 mb-3" />
                  <p className="text-sm font-bold text-theme-main">Aucun groupe disponible</p>
                  <p className="text-xs mt-2 leading-relaxed">Les groupes apparaîtront automatiquement avec vos ressources.</p>
                </div>
              ) : (
                groupSections.map(section => {
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
                            onClick={() => setActiveGroupId(group.id)}
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
                })
              )}
            </div>
          </GlassCard>

          <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[520px]" hover={false}>
            {activeGroup ? (
              <>
                <div className="px-5 py-4 border-b border-theme-subtle flex items-center justify-between gap-4 bg-theme-surface/90">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg">
                      {initials(activeGroup.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-theme-main truncate">{activeGroup.name}</h2>
                      <p className="text-xs text-theme-muted font-medium">
                        {resourceLabel(activeGroup)} • {members.length || activeGroup.member_count} participant{(members.length || activeGroup.member_count) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-theme-muted font-bold">
                    <MessageSquareText size={16} />
                    {messages.length} message{messages.length > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-[radial-gradient(circle_at_top_left,rgba(255,102,0,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(38,74,103,0.08),transparent_30%)]">
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
                          const sender = memberById.get(message.sender);
                          return (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 12, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                <div className={`flex items-center gap-2 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[11px] font-black text-theme-muted">
                                    {isMine ? 'Vous' : displayMember(sender || { id: message.sender, role: 'Membre' })}
                                  </span>
                                  <span className="text-[10px] text-theme-muted opacity-60">{formatDateTime(message.created_at)}</span>
                                </div>
                                <div className={`rounded-2xl px-4 py-3 shadow-theme-sm border text-sm leading-relaxed ${isMine
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

                <form onSubmit={sendMessage} className="p-4 border-t border-theme-subtle bg-theme-surface/95">
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

          <GlassCard className="!p-0 overflow-hidden flex flex-col min-h-[420px]" hover={false}>
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
                  <div key={member.id} className="p-3 rounded-2xl border border-theme-subtle bg-theme-surface hover:bg-theme-surface-hover transition">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary dark:text-sky-200 flex items-center justify-center font-black text-sm">
                        {initials(displayMember(member))}
                      </div>
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
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
