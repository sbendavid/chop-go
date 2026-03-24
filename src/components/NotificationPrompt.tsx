import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPromptProps {
  onClose?: () => void;
}

const NotificationPrompt = ({ onClose }: NotificationPromptProps) => {
  const { isSupported, permission, requestPermission } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const hasSeenPrompt = localStorage.getItem('notification-prompt-dismissed');
    if (isSupported && permission === 'default' && !hasSeenPrompt) {
      // Delay showing the prompt
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setVisible(false);
      onClose?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
    onClose?.();
  };

  if (!visible || dismissed || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <Card className="p-4 shadow-lg border-primary/20 bg-card">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Enable Notifications</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Get instant alerts for order updates, new messages, and delivery status.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleEnable}>
                Enable
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationPrompt;
