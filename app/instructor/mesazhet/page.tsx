'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Conversation, Message, ApiResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Plus, Send, Inbox } from 'lucide-react';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'tani';
  if (diffMin < 60) return `${diffMin} min me pare`;
  if (diffHours < 24) return `${diffHours} ore me pare`;
  if (diffDays === 1) return 'dje';
  if (diffDays < 7) return `${diffDays} dite me pare`;
  return date.toLocaleDateString('sq-XK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('sq-XK', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InstructorMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messageText, setMessageText] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } =
    useQuery<ApiResponse<Conversation[]>>({
      queryKey: ['instructor-conversations'],
      queryFn: () => api.get('/conversations'),
      refetchInterval: 30000,
    });

  const conversations = conversationsData?.data ?? [];

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery<
    ApiResponse<Message[]>
  >({
    queryKey: ['conversation-messages', selectedConversationId],
    queryFn: () =>
      api.get(`/conversations/${selectedConversationId}/messages`),
    enabled: !!selectedConversationId,
    refetchInterval: 30000,
  });

  const messages = messagesData?.data ?? [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening a conversation
  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      api.put(`/conversations/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['instructor-conversations'],
      });
      queryClient.invalidateQueries({
        queryKey: ['messages-unread-count'],
      });
    },
  });

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation && (conversation.unreadCount ?? 0) > 0) {
        markReadMutation.mutate(conversationId);
      }
    },
    [conversations, markReadMutation]
  );

  // Send message
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${selectedConversationId}/messages`, {
        content,
      }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({
        queryKey: ['conversation-messages', selectedConversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['instructor-conversations'],
      });
    },
  });

  const handleSendMessage = useCallback(() => {
    const trimmed = messageText.trim();
    if (!trimmed || !selectedConversationId) return;
    sendMutation.mutate(trimmed);
  }, [messageText, selectedConversationId, sendMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (payload: { subject: string; initialMessage: string }) => {
      const res = await api.post('/conversations', payload);
      return res as unknown as ApiResponse<Conversation>;
    },
    onSuccess: (response: ApiResponse<Conversation>) => {
      setNewDialogOpen(false);
      setNewSubject('');
      setNewMessage('');
      queryClient.invalidateQueries({
        queryKey: ['instructor-conversations'],
      });
      if (response?.data?.id) {
        setSelectedConversationId(response.data.id);
      }
    },
  });

  const handleCreateConversation = useCallback(() => {
    const subject = newSubject.trim();
    const message = newMessage.trim();
    if (!subject || !message) return;
    createConversationMutation.mutate({
      subject,
      initialMessage: message,
    });
  }, [newSubject, newMessage, createConversationMutation]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Mesazhet" description="Komunikimi me administratorin" />

      <div className="flex-1 min-h-0">
        <Card className="h-[calc(100vh-220px)] flex overflow-hidden">
          {/* Left Panel - Conversation List */}
          <div className="w-full sm:w-1/3 border-r flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Bisedat
              </h2>
              <Button
                size="sm"
                onClick={() => setNewDialogOpen(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Mesazh i Ri
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Inbox className="h-8 w-8 text-gray-300 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nuk keni biseda
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conversation) => {
                    const isSelected =
                      conversation.id === selectedConversationId;
                    const hasUnread = (conversation.unreadCount ?? 0) > 0;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                        className={cn(
                          'w-full text-left p-4 hover:bg-gray-50 transition-colors',
                          isSelected && 'bg-blue-50 hover:bg-blue-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm truncate',
                              hasUnread
                                ? 'font-bold text-gray-900'
                                : 'font-medium text-gray-700'
                            )}
                          >
                            {conversation.subject}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasUnread && (
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                        {conversation.lastMessageAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(conversation.lastMessageAt)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Message Thread */}
          <div className="hidden sm:flex flex-1 flex-col">
            {!selectedConversationId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <MessageSquare className="h-12 w-12 text-gray-200 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Zgjidhni nje bisede per te pare mesazhet
                </p>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {conversations.find(
                      (c) => c.id === selectedConversationId
                    )?.subject ?? 'Biseda'}
                  </h3>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex',
                            i % 2 === 0 ? 'justify-start' : 'justify-end'
                          )}
                        >
                          <Skeleton className="h-16 w-2/3 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nuk ka mesazhe ne kete bisede
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              isOwn ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[75%] rounded-lg px-4 py-2.5',
                                isOwn
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              )}
                            >
                              {!isOwn && message.sender && (
                                <p
                                  className={cn(
                                    'text-xs font-semibold mb-1',
                                    'text-gray-500'
                                  )}
                                >
                                  {message.sender.fullName}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                              <p
                                className={cn(
                                  'text-[10px] mt-1',
                                  isOwn
                                    ? 'text-blue-200'
                                    : 'text-gray-400'
                                )}
                              >
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Shkruaj mesazhin..."
                      className="min-h-[44px] max-h-[120px] resize-none"
                      rows={1}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        !messageText.trim() || sendMutation.isPending
                      }
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mesazh i Ri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Marresi</Label>
              <Input value="Administratori" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Tema</Label>
              <Input
                id="subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Tema e mesazhit..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialMessage">Mesazhi</Label>
              <Textarea
                id="initialMessage"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Shkruaj mesazhin tuaj..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewDialogOpen(false)}
            >
              Anulo
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={
                !newSubject.trim() ||
                !newMessage.trim() ||
                createConversationMutation.isPending
              }
            >
              Dergo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
