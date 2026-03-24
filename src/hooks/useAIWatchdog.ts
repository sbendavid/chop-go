import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpellingResult {
  hasErrors: boolean;
  correctedText: string;
  errors: Array<{ original: string; correction: string; reason: string }>;
}

interface ProteinResult {
  isValid: boolean;
  estimatedProteinCount: number;
  detectedProteins: string[];
  concerns: string[];
}

interface ChatSentryResult {
  originalMessage: string;
  maskedMessage: string;
  detectedViolations: Array<{ type: string; value: string }>;
  severity: 'none' | 'low' | 'medium' | 'high';
}

export const useAIWatchdog = () => {
  const [loading, setLoading] = useState(false);

  const checkSpelling = async (inscription: string): Promise<SpellingResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-watchdog', {
        body: { type: 'spelling', content: inscription },
      });

      if (error) throw error;
      return data.result as SpellingResult;
    } catch (error: any) {
      console.error('Spelling check error:', error);
      toast.error('Spelling check failed', { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyProtein = async (description: string, dishName?: string): Promise<ProteinResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-watchdog', {
        body: { type: 'protein', content: description, dishName },
      });

      if (error) throw error;
      return data.result as ProteinResult;
    } catch (error: any) {
      console.error('Protein verification error:', error);
      toast.error('Protein check failed', { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const scanMessage = async (message: string): Promise<ChatSentryResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-watchdog', {
        body: { type: 'chat-sentry', content: message },
      });

      if (error) throw error;
      return data.result as ChatSentryResult;
    } catch (error: any) {
      console.error('Chat sentry error:', error);
      toast.error('Message scan failed', { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    checkSpelling,
    verifyProtein,
    scanMessage,
  };
};
