import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAIWatchdog } from '@/hooks/useAIWatchdog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: 'buyer' | 'chef';
  content: string;
  original_content: string | null;
  is_masked: boolean;
  created_at: string;
}

interface OrderChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  userRole: 'buyer' | 'chef';
  otherPartyName?: string;
}

export function OrderChatSheet({ 
  open, 
  onOpenChange, 
  orderId, 
  userRole,
  otherPartyName = 'Chat'
}: OrderChatSheetProps) {
  const { user } = useAuth();
  const { scanMessage, loading: aiLoading } = useAIWatchdog();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !orderId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      setMessages(data as Message[]);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, orderId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      // Scan message with AI Chat Sentry
      const scanResult = await scanMessage(newMessage);
      
      let contentToSave = newMessage;
      let originalContent: string | null = null;
      let isMasked = false;

      if (scanResult && scanResult.detectedViolations.length > 0) {
        // Use masked message if violations detected
        contentToSave = scanResult.maskedMessage;
        originalContent = newMessage;
        isMasked = true;
        
        toast.warning('Sensitive info masked', {
          description: 'Phone numbers and bank details have been automatically hidden for your safety.'
        });
      }

      const { error } = await supabase.from('chat_messages').insert({
        order_id: orderId,
        sender_id: user.id,
        sender_role: userRole,
        content: contentToSave,
        original_content: originalContent,
        is_masked: isMasked
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            Chat with {otherPartyName}
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            AI moderation masks phone numbers & bank details
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {msg.sender_role === 'buyer' ? 'B' : 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${isOwnMessage ? 'text-right' : ''}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-secondary rounded-tl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.is_masked && (
                          <div className="flex items-center gap-1 mt-1 opacity-70">
                            <ShieldAlert className="h-3 w-3" />
                            <span className="text-xs">Masked</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending || aiLoading}
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={sending || aiLoading || !newMessage.trim()}
            >
              {sending || aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
