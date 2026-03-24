import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    if (permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, permission]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (!isSupported || permission !== 'granted') {
        console.log('Cannot send notification:', { isSupported, permission });
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error('Error sending notification:', error);
        return null;
      }
    },
    [isSupported, permission]
  );

  // Order-specific notification helpers
  const notifyNewOrder = useCallback(
    (orderAmount: number, orderId: string) => {
      sendNotification('🔔 New Order Received!', {
        body: `Order #${orderId.slice(0, 8)} for ₦${orderAmount.toLocaleString()}`,
        tag: `order-${orderId}`,
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  const notifyOrderStatusChange = useCallback(
    (orderId: string, newStatus: string) => {
      const statusMessages: Record<string, { title: string; body: string }> = {
        confirmed: {
          title: '✅ Order Confirmed!',
          body: 'The chef has confirmed your order and will start preparing soon.',
        },
        accepted: {
          title: '✅ Order Accepted!',
          body: 'The chef has accepted your order and will start preparing soon.',
        },
        preparing: {
          title: '🍳 Order Being Prepared',
          body: 'Your delicious food is being prepared!',
        },
        ready: {
          title: '✨ Order Ready!',
          body: 'Your order is ready and waiting for pickup.',
        },
        picked_up: {
          title: '🚴 Rider Picked Up Your Order!',
          body: 'Your food has been picked up and is on the way.',
        },
        in_transit: {
          title: '🛵 Order On The Way!',
          body: 'Your rider is heading to your location now.',
        },
        arriving_soon: {
          title: '📍 Rider Arriving Soon!',
          body: 'Your rider is almost at your location. Get ready!',
        },
        'out-for-delivery': {
          title: '🚴 Out for Delivery',
          body: 'Your order is on its way!',
        },
        delivered: {
          title: '🎉 Order Delivered!',
          body: 'Enjoy your meal! Don\'t forget to rate your experience.',
        },
        cancelled: {
          title: '❌ Order Cancelled',
          body: 'Your order has been cancelled. Refund will be processed.',
        },
      };

      const message = statusMessages[newStatus];
      if (message) {
        sendNotification(message.title, {
          body: message.body,
          tag: `order-status-${orderId}`,
        });
      }
    },
    [sendNotification]
  );

  const notifyRiderAssigned = useCallback(
    (orderId: string) => {
      sendNotification('🚴 Rider Assigned!', {
        body: 'A rider has been assigned to pick up your order.',
        tag: `rider-${orderId}`,
      });
    },
    [sendNotification]
  );

  const notifyNewMessage = useCallback(
    (senderName: string, orderId: string) => {
      sendNotification('💬 New Message', {
        body: `${senderName} sent you a message about order #${orderId.slice(0, 8)}`,
        tag: `message-${orderId}`,
      });
    },
    [sendNotification]
  );

  const notifyNewHaggle = useCallback(
    (dishName: string, offerAmount: number, haggleId: string) => {
      sendNotification('🤝 New Haggle Request!', {
        body: `A buyer wants to negotiate on "${dishName}" - ₦${offerAmount.toLocaleString()}`,
        tag: `haggle-${haggleId}`,
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyNewOrder,
    notifyOrderStatusChange,
    notifyRiderAssigned,
    notifyNewMessage,
    notifyNewHaggle,
  };
};
