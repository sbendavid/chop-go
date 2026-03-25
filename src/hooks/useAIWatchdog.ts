/**
 * useAIWatchdog.ts
 * Migrated from Supabase Edge Functions to Express API.
 *
 * Express endpoints expected:
 *   POST /api/ai/watchdog   { type: 'spelling'|'protein'|'chat-sentry', content, dishName? }
 *                           → { result: SpellingResult | ProteinResult | ChatSentryResult }
 */

import { useState } from "react";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

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
  severity: "none" | "low" | "medium" | "high";
}

interface WatchdogResponse<T> {
  result: T;
}

export const useAIWatchdog = () => {
  const [loading, setLoading] = useState(false);

  const checkSpelling = async (
    inscription: string,
  ): Promise<SpellingResult | null> => {
    setLoading(true);
    try {
      const data = await api.post<WatchdogResponse<SpellingResult>>(
        "/ai/watchdog",
        {
          type: "spelling",
          content: inscription,
        },
      );
      return data.result;
    } catch (error: any) {
      console.error("Spelling check error:", error);
      toast.error("Spelling check failed", { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyProtein = async (
    description: string,
    dishName?: string,
  ): Promise<ProteinResult | null> => {
    setLoading(true);
    try {
      const data = await api.post<WatchdogResponse<ProteinResult>>(
        "/ai/watchdog",
        {
          type: "protein",
          content: description,
          dishName,
        },
      );
      return data.result;
    } catch (error: any) {
      console.error("Protein verification error:", error);
      toast.error("Protein check failed", { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const scanMessage = async (
    message: string,
  ): Promise<ChatSentryResult | null> => {
    setLoading(true);
    try {
      const data = await api.post<WatchdogResponse<ChatSentryResult>>(
        "/ai/watchdog",
        {
          type: "chat-sentry",
          content: message,
        },
      );
      return data.result;
    } catch (error: any) {
      console.error("Chat sentry error:", error);
      toast.error("Message scan failed", { description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, checkSpelling, verifyProtein, scanMessage };
};
