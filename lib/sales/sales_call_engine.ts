// lib/sales/sales_call_engine.ts
// Web-friendly sales call engine. Manages in-memory conversations (one per
// callId) backed by the SalesConversation class which uses the Groq-powered
// llamaClient. Designed to run in a serverless (Vercel) environment — no
// PowerShell, no readline, no process.exit.
//
// Exports the three functions consumed by app/api/sales-call/voice/route.ts
// and scripts/createandtestcall.ts:
//   - startSalesCall(leadId)            -> { success, callId, aiResponse, error? }
//   - handleProspectResponse(callId, msg) -> { aiResponse, ended, outcome }
//   - endCall(callId, reason?)           -> { success, outcome, duration }
import { SalesConversation, SalesStage, STAGE_NAMES } from "./sales-conversations";
import { logger } from "@/lib/scraper/utils/logger";

interface ActiveCall {
  callId: string;
  leadId: string;
  leadName: string;
  conversation: SalesConversation;
  startedAt: number;
  ended: boolean;
}

// In-memory store. In production with multiple instances this should be Redis,
// but for a single serverless instance this is sufficient.
const activeCalls = new Map<string, ActiveCall>();

function generateCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Start a new AI sales call for a lead. Returns the first AI greeting.
 */
export async function startSalesCall(
  leadId: string,
  leadName?: string
): Promise<{
  success: boolean;
  callId?: string;
  aiResponse?: string;
  error?: string;
}> {
  try {
    const name = leadName || "there";
    const callId = generateCallId();
    const conversation = new SalesConversation(leadId, name);

    // Generate the opening line of the conversation.
    const greeting = await conversation.generateResponse("Hello");

    activeCalls.set(callId, {
      callId,
      leadId,
      leadName: name,
      conversation,
      startedAt: Date.now(),
      ended: false,
    });

    logger.info(`Sales call started`, { callId, leadId, leadName: name });

    return {
      success: true,
      callId,
      aiResponse: greeting,
    };
  } catch (error) {
    logger.error("Failed to start sales call", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error starting call",
    };
  }
}

/**
 * Send the prospect's response to the active call and get the AI's reply.
 */
export async function handleProspectResponse(
  callId: string,
  message: string
): Promise<{
  aiResponse?: string;
  ended?: boolean;
  outcome?: string;
  error?: string;
}> {
  const call = activeCalls.get(callId);
  if (!call) {
    return { error: "Call not found or already ended" };
  }
  if (call.ended) {
    return {
      ended: true,
      outcome: "already_ended",
      aiResponse: "This call has already ended.",
    };
  }

  try {
    const aiResponse = await call.conversation.generateResponse(message);
    const ended = call.conversation.shouldEndCall();
    let outcome: string | undefined;

    if (ended) {
      call.ended = true;
      const stage = call.conversation.getCurrentStage();
      outcome =
        stage === SalesStage.END
          ? "completed"
          : "ended_early";
      logger.info(`Call ${callId} ended naturally`, { outcome, stage: STAGE_NAMES[stage] });
    }

    return { aiResponse, ended, outcome };
  } catch (error) {
    logger.error(`Error in call ${callId}`, error);
    return {
      aiResponse: "I'm sorry, could you repeat that?",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * End an active call manually.
 */
export async function endCall(
  callId: string,
  reason?: string
): Promise<{
  success: boolean;
  outcome?: string;
  duration?: number;
  error?: string;
}> {
  const call = activeCalls.get(callId);
  if (!call) {
    return { success: false, error: "Call not found" };
  }

  const duration = Math.round((Date.now() - call.startedAt) / 1000);
  const outcome = reason || "ended_by_user";
  call.ended = true;

  logger.info(`Call ${callId} ended`, { outcome, duration });

  // Keep the record briefly so any final polling can read the outcome, then
  // schedule cleanup.
  setTimeout(() => activeCalls.delete(callId), 60_000);

  return { success: true, outcome, duration };
}

// Backwards-compatible export for any code that may still expect a default.
export default { startSalesCall, handleProspectResponse, endCall };
