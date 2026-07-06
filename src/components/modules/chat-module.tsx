"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send, Search, Plus, MessageCircle, Users, MoreVertical, Phone, Video, ArrowLeft,
  Smile, Paperclip, Mic, Check, CheckCheck, Pencil, Trash2, Reply, X, ImageIcon,
  FileText, Download, Info, WifiOff, Wifi, Bell, BellOff, Settings as SettingsIcon,
  CheckCircle2, Circle, UserPlus, LogOut, Edit3,
} from "lucide-react";
import { useChat, type ChatRoom, type ChatMessage } from "@/lib/hooks/use-chat";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/lib/auth";

// Common emoji set for the picker
const EMOJIS = [
  "😀", "😂", "🥰", "😍", "😘", "😎", "🤔", "😴", "😭", "😡",
  "👍", "👎", "👌", "🙏", "👏", "💪", "🤝", "✌️", "🤞", "🤙",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❤️‍🔥",
  "🔥", "⭐", "✨", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎯",
  "✅", "❌", "⚠️", "💯", "📢", "💬", "💭", "📌", "📎", "🔗",
  "☕", "🍕", "🍔", "🍪", "🎂", "🌹", "🌸", "🌺", "🌻", "🌷",
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatTime(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(d: string | Date) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hari Ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function formatRoomTime(d: string | Date) {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" });
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ============ Main Module ============
export function ChatModule({ user }: { user: SafeUser }) {
  const chat = useChat(user);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Load users for new chat
  useEffect(() => {
    api<{ users: any[] }>("/api/chat/users")
      .then((d) => setAllUsers(d.users || []))
      .catch(() => {});
  }, []);

  // Filter rooms by search
  const filteredRooms = useMemo(() => {
    if (!search.trim()) return chat.rooms;
    const q = search.toLowerCase();
    return chat.rooms.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        r.members.some((m) => m.name.toLowerCase().includes(q)) ||
        r.lastMessage?.content.toLowerCase().includes(q)
    );
  }, [chat.rooms, search]);

  const activeRoom = chat.rooms.find((r) => r.id === chat.activeRoomId) || null;

  function handleSelectRoom(roomId: string) {
    chat.selectRoom(roomId);
    setMobileView("chat");
  }

  function handleBack() {
    setMobileView("list");
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-blue-600" /> Chat Tim
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            {chat.connected ? (
              <><Wifi className="w-3.5 h-3.5 text-green-500" /> Terhubung real-time</>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-amber-500" /> Menghubungkan...</>
            )}
            <span className="text-slate-300">·</span>
            <span>{chat.rooms.length} percakapan</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={() => setShowNewGroup(true)}
          >
            <Users className="w-4 h-4 mr-1.5" /> Grup Baru
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowNewChat(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Chat Baru
          </Button>
        </div>
      </div>

      {/* Main chat container */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex">
        {/* Sidebar — room list */}
        <aside
          className={cn(
            "w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0",
            mobileView === "chat" ? "hidden md:flex" : "flex"
          )}
        >
          {/* Search */}
          <div className="p-3 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari percakapan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Rooms */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            {chat.loadingRooms ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="py-12 text-center px-4">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Belum ada percakapan</p>
                <p className="text-xs text-slate-500 mt-1">Mulai chat baru dengan anggota tim</p>
                <Button
                  size="sm"
                  className="mt-3 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowNewChat(true)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Mulai Chat
                </Button>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <RoomListItem
                  key={room.id}
                  room={room}
                  active={room.id === chat.activeRoomId}
                  currentUserId={user.id}
                  onlineUsers={chat.onlineUsers[room.id] || []}
                  typing={chat.typing[room.id] || []}
                  onClick={() => handleSelectRoom(room.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main
          className={cn(
            "flex-1 flex flex-col min-w-0",
            mobileView === "list" ? "hidden md:flex" : "flex"
          )}
        >
          {activeRoom ? (
            <ChatArea
              key={activeRoom.id}
              room={activeRoom}
              user={user}
              chat={chat}
              onBack={handleBack}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center max-w-sm px-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Selamat datang di Chat Tim</h2>
                <p className="text-sm text-slate-500 mt-2">
                  Pilih percakapan di kiri atau mulai chat baru dengan anggota tim. Semua pesan tersimpan dan tersinkron real-time.
                </p>
                <Button
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowNewChat(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Mulai Chat Baru
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Chat Dialog */}
      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        users={allUsers}
        existingRoomUserIds={new Set(chat.rooms.flatMap((r) => r.members.map((m) => m.userId)))}
        currentUserId={user.id}
        onSelect={async (userId) => {
          try {
            await chat.createDirectRoom(userId);
            setShowNewChat(false);
            setMobileView("chat");
          } catch (e: any) { toast.error(e.message); }
        }}
      />

      {/* New Group Dialog */}
      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        users={allUsers}
        currentUserId={user.id}
        onCreate={async (data) => {
          try {
            await chat.createGroupRoom(data);
            setShowNewGroup(false);
            setMobileView("chat");
            toast.success("Grup dibuat");
          } catch (e: any) { toast.error(e.message); }
        }}
      />
    </div>
  );
}

// ============ Room List Item ============
function RoomListItem({
  room, active, currentUserId, onlineUsers, typing, onClick,
}: {
  room: ChatRoom;
  active: boolean;
  currentUserId: string;
  onlineUsers: string[];
  typing: { userId: string; name: string }[];
  onClick: () => void;
}) {
  const isGroup = room.type === "GROUP";
  const otherUser = !isGroup ? room.members.find((m) => m.userId !== currentUserId) : null;
  const name = isGroup ? room.name : otherUser?.name || "Unknown";
  const isOnline = !isGroup && otherUser ? onlineUsers.includes(otherUser.userId) : false;

  const lastMsgPreview = (() => {
    if (!room.lastMessage) return "Belum ada pesan";
    if (room.lastMessage.deletedAt) return "Pesan dihapus";
    if (room.lastMessage.type === "IMAGE") return "📷 Foto";
    if (room.lastMessage.type === "FILE") return `📎 ${room.lastMessage.fileName || "File"}`;
    return room.lastMessage.content;
  })();

  const typingText = typing.length > 0
    ? typing.length === 1
      ? `${typing[0].name} sedang mengetik...`
      : `${typing.length} orang mengetik...`
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-3 flex items-start gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left",
        active && "bg-blue-50 hover:bg-blue-50"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarFallback className={cn(
            "text-sm font-semibold",
            isGroup ? "bg-violet-100 text-violet-700" : ROLE_COLORS[otherUser?.userRole || ""] || "bg-slate-100 text-slate-700"
          )}>
            {isGroup ? <Users className="w-5 h-5" /> : initials(name || "?")}
          </AvatarFallback>
        </Avatar>
        {!isGroup && isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            {isGroup && (
              <Badge variant="outline" className="text-[8px] py-0 px-1 bg-violet-50 text-violet-600 border-violet-200 shrink-0">
                GRUP
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">
            {room.lastMessage ? formatRoomTime(room.lastMessage.createdAt) : formatRoomTime(room.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-xs truncate flex-1",
            typingText ? "text-blue-600 italic" : "text-slate-500"
          )}>
            {typingText || (room.lastMessage && room.lastMessage.senderId === currentUserId && !typingText
              ? `Anda: ${lastMsgPreview}`
              : lastMsgPreview)}
          </p>
          {room.unread > 0 && (
            <Badge className="bg-blue-600 text-white text-[10px] h-5 min-w-5 rounded-full flex items-center justify-center px-1.5 shrink-0">
              {room.unread > 99 ? "99+" : room.unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ============ Chat Area ============
function ChatArea({
  room, user, chat, onBack,
}: {
  room: ChatRoom;
  user: SafeUser;
  chat: ReturnType<typeof useChat>;
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isGroup = room.type === "GROUP";
  const otherUser = !isGroup ? room.members.find((m) => m.userId !== user.id) : null;
  const roomName = isGroup ? room.name : otherUser?.name || "Unknown";
  const isOnline = !isGroup && otherUser ? (chat.onlineUsers[room.id] || []).includes(otherUser.userId) : false;
  const typingUsers = chat.typing[room.id] || [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages]);

  // State resets on room change are handled by parent `key={room.id}` prop
  // which forces a fresh mount of this component when switching rooms.

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    if (editingMessage) {
      chat.editMessage(editingMessage.id, text);
      setEditingMessage(null);
    } else {
      chat.sendMessage({
        content: text,
        type: "TEXT",
        replyToId: replyTo?.id,
      });
    }
    setInput("");
    setReplyTo(null);
    setShowEmoji(false);
  }

  function handleTyping(value: string) {
    setInput(value);
    if (value && !editingMessage) chat.setTyping(true);
  }

  async function handleFileUpload(file: File, type: "IMAGE" | "FILE") {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }
    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      // For now, store the base64 data URL directly in content (small files only)
      // In production, you'd upload to a CDN and store the URL
      await chat.sendMessage({
        content: base64,
        type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
    };
    reader.readAsDataURL(file);
  }

  function handleEmojiClick(emoji: string) {
    setInput((prev) => prev + emoji);
  }

  function handleEditMessage(msg: ChatMessage) {
    setEditingMessage(msg);
    setInput(msg.content);
    setReplyTo(null);
    setShowEmoji(false);
  }

  function handleDeleteMessage(msg: ChatMessage) {
    if (confirm("Hapus pesan ini?")) {
      chat.deleteMessage(msg.id);
    }
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate: string | null = null;
    for (const msg of chat.messages) {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (dateKey !== currentDate) {
        groups.push({ date: formatDateLabel(msg.createdAt), messages: [msg] });
        currentDate = dateKey;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [chat.messages]);

  const onlineMembersCount = isGroup
    ? room.members.filter((m) => (chat.onlineUsers[room.id] || []).includes(m.userId)).length
    : 0;

  return (
    <>
      {/* Header */}
      <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0 bg-white">
        <button
          onClick={onBack}
          className="md:hidden p-1 -ml-1 rounded hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className={cn(
            "text-sm font-semibold",
            isGroup ? "bg-violet-100 text-violet-700" : ROLE_COLORS[otherUser?.userRole || ""]
          )}>
            {isGroup ? <Users className="w-5 h-5" /> : initials(roomName || "?")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{roomName}</h2>
            {isGroup && (
              <Badge variant="outline" className="text-[8px] py-0 px-1 bg-violet-50 text-violet-600 border-violet-200">
                {room.members.length} anggota
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {typingUsers.length > 0 ? (
              <span className="text-blue-600 italic">
                {typingUsers.length === 1 ? `${typingUsers[0].name} mengetik...` : "beberapa orang mengetik..."}
              </span>
            ) : isGroup ? (
              `${onlineMembersCount} dari ${room.members.length} online`
            ) : isOnline ? (
              <span className="text-green-600">online</span>
            ) : (
              "offline"
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowMembers(true)}>
                  <Info className="w-4 h-4 text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Info Anggota</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowMembers(true)}>
                <Users className="w-4 h-4 mr-2" /> Lihat Anggota
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Fitur telephon belum tersedia")}>
                <Phone className="w-4 h-4 mr-2" /> Telepon
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Fitur video call belum tersedia")}>
                <Video className="w-4 h-4 mr-2" /> Video Call
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (confirm("Keluar dari percakapan ini?")) {
                    chat.leaveRoom(room.id);
                    onBack();
                  }
                }}
                className="text-rose-600 focus:text-rose-700"
              >
                <LogOut className="w-4 h-4 mr-2" /> Keluar Percakapan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto custom-scroll px-3 sm:px-6 py-4 bg-gradient-to-br from-slate-50 to-blue-50/30"
      >
        {chat.loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">Mulai percakapan</p>
            <p className="text-xs text-slate-500 mt-1">Kirim pesan pertama Anda</p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <div key={gIdx}>
              {/* Date divider */}
              <div className="flex items-center justify-center my-3">
                <span className="text-[10px] font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const isOwn = msg.userId === user.id;
                const showAvatar = !isOwn && (!prevMsg || prevMsg.userId !== msg.userId);
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    isGroup={isGroup}
                    currentUserId={user.id}
                    onReply={() => setReplyTo(msg)}
                    onEdit={() => handleEditMessage(msg)}
                    onDelete={() => handleDeleteMessage(msg)}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply / Edit preview */}
      {(replyTo || editingMessage) && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-start gap-2 shrink-0">
          <div className="w-1 self-stretch bg-blue-500 rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
              {editingMessage ? <><Pencil className="w-3 h-3" /> Mengedit pesan</> : <><Reply className="w-3 h-3" /> Membalas {replyTo?.userName}</>}
            </p>
            <p className="text-xs text-slate-600 truncate mt-0.5">
              {editingMessage?.content || replyTo?.content || (replyTo?.type === "IMAGE" ? "📷 Foto" : replyTo?.type === "FILE" ? "📎 File" : "")}
            </p>
          </div>
          <button
            onClick={() => { setReplyTo(null); setEditingMessage(null); setInput(""); }}
            className="p-1 rounded hover:bg-slate-200 shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white shrink-0">
          <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 sm:px-4 py-3 border-t border-slate-100 bg-white shrink-0">
        <div className="flex items-end gap-2">
          {/* Emoji button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={() => setShowEmoji((v) => !v)}
                >
                  <Smile className={cn("w-5 h-5", showEmoji ? "text-blue-600" : "text-slate-500")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Attach file dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0">
                <Paperclip className="w-5 h-5 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" /> Kirim Foto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" /> Kirim Dokumen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f, "IMAGE");
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f, "FILE");
              e.target.value = "";
            }}
          />

          {/* Text input */}
          <Textarea
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={editingMessage ? "Edit pesan..." : "Ketik pesan..."}
            rows={1}
            className="flex-1 resize-none min-h-9 max-h-32 bg-slate-50 border-slate-200 text-sm py-2"
          />

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 h-9 w-9 p-0 shrink-0"
          >
            {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Members dialog */}
      <MembersDialog
        open={showMembers}
        onOpenChange={setShowMembers}
        room={room}
        onlineUsers={chat.onlineUsers[room.id] || []}
        currentUserId={user.id}
        isAdmin={room.members.find((m) => m.userId === user.id)?.role === "ADMIN"}
      />
    </>
  );
}

// ============ Message Bubble ============
function MessageBubble({
  msg, isOwn, showAvatar, isGroup, currentUserId, onReply, onEdit, onDelete,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  isGroup: boolean;
  currentUserId: string;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isSystem = msg.type === "SYSTEM";
  const isDeleted = !!msg.deletedAt;

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[10px] text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2 mb-1.5 group", isOwn ? "justify-end" : "justify-start")}>
      {/* Avatar (other side) */}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="w-8 h-8">
              <AvatarFallback className={cn("text-[10px] font-semibold", ROLE_COLORS[msg.userRole] || "bg-slate-100 text-slate-700")}>
                {initials(msg.userName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={cn(
        "max-w-[75%] sm:max-w-[60%] relative",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Sender name (in groups) */}
        {!isOwn && isGroup && showAvatar && (
          <p className={cn("text-[10px] font-semibold mb-0.5 ml-1", roleTextColor(msg.userRole))}>
            {msg.userName}
          </p>
        )}

        <div
          className={cn(
            "rounded-2xl px-3 py-2 shadow-sm relative",
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-white text-slate-800 rounded-bl-sm border border-slate-100",
            isDeleted && "opacity-60 italic"
          )}
        >
          {/* Reply preview */}
          {msg.replyTo && !isDeleted && (
            <div className={cn(
              "mb-1.5 px-2 py-1 rounded text-[10px] border-l-2",
              isOwn ? "bg-blue-700/40 border-blue-200" : "bg-slate-100 border-blue-500"
            )}>
              <p className={cn("font-semibold", isOwn ? "text-blue-100" : "text-blue-700")}>
                {msg.replyTo.userName}
              </p>
              <p className={cn("truncate", isOwn ? "text-blue-100" : "text-slate-600")}>
                {msg.replyTo.type === "IMAGE" ? "📷 Foto" : msg.replyTo.type === "FILE" ? `📎 ${msg.replyTo.fileName || "File"}` : msg.replyTo.content}
              </p>
            </div>
          )}

          {/* Content */}
          {isDeleted ? (
            <p className="text-xs flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Pesan ini telah dihapus
            </p>
          ) : msg.type === "IMAGE" ? (
            <div>
              <img src={msg.content} alt={msg.fileName || "foto"} className="rounded-lg max-w-full max-h-64" />
              {msg.fileName && (
                <p className={cn("text-[10px] mt-1", isOwn ? "text-blue-100" : "text-slate-500")}>{msg.fileName}</p>
              )}
            </div>
          ) : msg.type === "FILE" ? (
            <a
              href={msg.content}
              download={msg.fileName || "file"}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg border",
                isOwn ? "bg-blue-700/40 border-blue-300" : "bg-slate-50 border-slate-200"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center shrink-0",
                isOwn ? "bg-blue-700" : "bg-slate-200"
              )}>
                <FileText className={cn("w-4 h-4", isOwn ? "text-white" : "text-slate-600")} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs font-medium truncate", isOwn ? "text-white" : "text-slate-700")}>
                  {msg.fileName || "File"}
                </p>
                <p className={cn("text-[10px]", isOwn ? "text-blue-100" : "text-slate-500")}>
                  {formatFileSize(msg.fileSize)} · Klik untuk unduh
                </p>
              </div>
              <Download className={cn("w-3.5 h-3.5 shrink-0", isOwn ? "text-white" : "text-slate-500")} />
            </a>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          {/* Time & status */}
          <div className={cn(
            "flex items-center gap-1 mt-0.5 text-[9px]",
            isOwn ? "text-blue-100 justify-end" : "text-slate-400"
          )}>
            {msg.editedAt && !isDeleted && <span className="italic">diedit ·</span>}
            <span>{formatTime(msg.createdAt)}</span>
            {isOwn && !isDeleted && (
              <CheckCheck className="w-3 h-3" />
            )}
          </div>
        </div>

        {/* Hover actions */}
        {!isDeleted && (
          <div className={cn(
            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
            isOwn ? "right-full mr-1" : "left-full ml-1"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded bg-white border border-slate-200 shadow-sm hover:bg-slate-50">
                  <MoreVertical className="w-3 h-3 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="w-3.5 h-3.5 mr-2" /> Balas
                </DropdownMenuItem>
                {isOwn && msg.type === "TEXT" && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {(isOwn || true) && (
                  <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

function roleTextColor(role: string) {
  const map: Record<string, string> = {
    OWNER: "text-blue-700",
    PROJECT_MANAGER: "text-violet-700",
    ASSISTANT_TRAINER: "text-amber-700",
    CONTENT_CREATIVE: "text-pink-700",
    DIGITAL_MARKETING_IT: "text-cyan-700",
    FINANCE: "text-sky-700",
  };
  return map[role] || "text-slate-700";
}

// ============ New Chat Dialog ============
function NewChatDialog({
  open, onOpenChange, users, existingRoomUserIds, currentUserId, onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: any[];
  existingRoomUserIds: Set<string>;
  currentUserId: string;
  onSelect: (userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" /> Mulai Chat Baru
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari anggota tim..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Tidak ada user ditemukan</p>
            ) : (
              filtered.map((u) => {
                const hasRoom = existingRoomUserIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => onSelect(u.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className={cn("text-xs font-semibold", ROLE_COLORS[u.role])}>
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{ROLE_LABELS[u.role] || u.role}</p>
                    </div>
                    {hasRoom && <Badge variant="outline" className="text-[9px] bg-slate-50">Ada</Badge>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ New Group Dialog ============
function NewGroupDialog({
  open, onOpenChange, users, currentUserId, onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: any[];
  currentUserId: string;
  onCreate: (data: { name: string; description?: string; memberIds: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setName("");
    setDescription("");
    setSelected(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Buat Grup Baru
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold">Nama Grup *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tim Konten Bulan Ini"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Deskripsi (opsional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topik grup..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Pilih Anggota ({selected.size} dipilih)</Label>
            <div className="max-h-56 overflow-y-auto space-y-1 mt-1 border border-slate-200 rounded-lg p-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                    selected.has(u.id) ? "bg-blue-50" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                    selected.has(u.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  )}>
                    {selected.has(u.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={cn("text-[10px] font-semibold", ROLE_COLORS[u.role])}>
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{ROLE_LABELS[u.role]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={!name.trim() || selected.size < 1}
            onClick={() => onCreate({ name: name.trim(), description: description.trim() || undefined, memberIds: Array.from(selected) })}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Users className="w-4 h-4 mr-1.5" /> Buat Grup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Members Dialog ============
function MembersDialog({
  open, onOpenChange, room, onlineUsers, currentUserId, isAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room: ChatRoom;
  onlineUsers: string[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (open && room.type === "GROUP") {
      api<{ users: any[] }>("/api/chat/users").then((d) => setAllUsers(d.users || [])).catch(() => {});
    }
  }, [open, room.type]);

  const nonMembers = allUsers.filter((u) => !room.members.some((m) => m.userId === u.id));

  async function addMember(userId: string) {
    try {
      await api(`/api/chat/rooms/${room.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      toast.success("Anggota ditambahkan");
      // Refresh by closing & reopening — could be improved
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  }

  async function removeMember(userId: string) {
    if (!confirm("Keluarkan anggota ini?")) return;
    try {
      await api(`/api/chat/rooms/${room.id}/members?userId=${userId}`, { method: "DELETE" });
      toast.success("Anggota dikeluarkan");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Anggota ({room.members.length})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {room.members.map((m) => {
            const isOnline = onlineUsers.includes(m.userId);
            const isYou = m.userId === currentUserId;
            return (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className={cn("text-xs font-semibold", ROLE_COLORS[m.userRole])}>
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {m.name} {isYou && <span className="text-[10px] text-blue-600">(Anda)</span>}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {ROLE_LABELS[m.userRole] || m.userRole}
                    {m.role === "ADMIN" && " · Admin"}
                    {isOnline ? " · online" : " · offline"}
                  </p>
                </div>
                {isAdmin && !isYou && m.role !== "ADMIN" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                    onClick={() => removeMember(m.userId)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {room.type === "GROUP" && isAdmin && nonMembers.length > 0 && (
          <>
            <Button variant="outline" className="w-full" onClick={() => setShowAdd((v) => !v)}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Tambah Anggota
            </Button>
            {showAdd && (
              <div className="border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                {nonMembers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => addMember(u.id)}
                    className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 text-left"
                  >
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className={cn("text-[10px] font-semibold", ROLE_COLORS[u.role])}>
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{u.name}</p>
                      <p className="text-[9px] text-slate-500">{ROLE_LABELS[u.role]}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
