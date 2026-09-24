import { useEffect, useRef, useState, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CandidateIntakeSchema } from "../schemas/candidateIntakeSchema";

export interface LiveIntakeMessage {
  type: "INIT_SYNC" | "FIELD_UPDATES";
  session_id: string;
  timestamp?: number;
  state?: Record<string, any>;
  updates?: Record<string, any>;
}

export interface UseLiveIntakeSocketOptions {
  sessionId?: string;
  form: UseFormReturn<CandidateIntakeSchema>;
  enabled?: boolean;
}

export function useLiveIntakeSocket({
  sessionId = "live_candidate_call",
  form,
  enabled = true,
}: UseLiveIntakeSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<Record<string, any>>({});
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Apply a batch of validated updates to React Hook Form
  const applyUpdates = useCallback(
    (updates: Record<string, any>) => {
      if (!updates || Object.keys(updates).length === 0) return;

      setIsSyncing(true);
      setLastSyncTime(new Date());

      // 1. Separate TRIGGER fields so they mount conditional sub-sections first
      const triggerKeys = [
        "call_disposition",
        "professional_profile.work_status",
        "education.graduation.status",
      ];

      const entries = Object.entries(updates);
      const sortedEntries = entries.sort(([a], [b]) => {
        const aIsTrigger = triggerKeys.includes(a);
        const bIsTrigger = triggerKeys.includes(b);
        if (aIsTrigger && !bIsTrigger) return -1;
        if (!aIsTrigger && bIsTrigger) return 1;
        return 0;
      });

      // 2. Set each value sequentially with shouldValidate & shouldDirty
      sortedEntries.forEach(([path, value]) => {
        try {
          form.setValue(path as any, value, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        } catch (err) {
          console.warn(`[LiveIntake] Error applying ${path}:`, err);
        }
      });

      // 3. Highlight newly updated fields temporarily
      const newHighlighted = new Set<string>();
      Object.keys(updates).forEach((k) => newHighlighted.add(k));
      setHighlightedFields((prev) => new Set([...prev, ...newHighlighted]));
      setRecentUpdates((prev) => ({ ...prev, ...updates }));

      // Clear highlights after 3 seconds
      window.setTimeout(() => {
        setHighlightedFields((prev) => {
          const next = new Set(prev);
          Object.keys(updates).forEach((k) => next.delete(k));
          return next;
        });
        setIsSyncing(false);
      }, 3000);
    },
    [form]
  );

  useEffect(() => {
    if (!enabled || !sessionId) return;

    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const host = window.location.hostname || "127.0.0.1";
      const wsUrl = `ws://${host}:8000/api/candidates/live-intake/${sessionId}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!unmounted) {
          setIsConnected(true);
        }
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          if (event.data === "pong") return;
          const msg: LiveIntakeMessage = JSON.parse(event.data);

          if (msg.type === "INIT_SYNC" && msg.state) {
            // Pre-fill any state already accumulated
            applyUpdates(msg.state);
          } else if (msg.type === "FIELD_UPDATES" && msg.updates) {
            // Apply live update event
            applyUpdates(msg.updates);
          }
        } catch (err) {
          console.warn("[LiveIntake] WS message parse error:", err);
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          setIsConnected(false);
          // Auto-reconnect after 2 seconds
          reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [sessionId, enabled, applyUpdates]);

  // Helper function to send simulated spoken utterances for live testing
  const sendCandidateSpeech = useCallback(
    async (utterance: string) => {
      const host = window.location.hostname || "127.0.0.1";
      const res = await fetch(
        `http://${host}:8000/api/candidates/live-intake/${sessionId}/speech`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ utterance }),
        }
      );
      return await res.json();
    },
    [sessionId]
  );

  return {
    isConnected,
    isSyncing,
    lastSyncTime,
    recentUpdates,
    highlightedFields,
    sendCandidateSpeech,
  };
}
