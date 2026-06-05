import { db, auth } from "@/src/firebase/config";
import { collection, doc, setDoc } from "firebase/firestore";

/**
 * Clean and normalize phone numbers:
 * - If it starts with "0", convert it to "62".
 * - If it already starts with "62", keep it as is.
 * - Removes non-digit characters.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Pushes a WhatsApp notification task to the Firestore fallback queue.
 * Compliant with Phase 5 schema, while preserving strict Phase 3/4 NotificationQueueItem compatibility.
 */
export async function pushToQueue(data: {
  to: string;
  message: string;
  tenant_id?: string;
  type?: string;
  uid?: string;
  title?: string;
  priority?: number;
  metadata?: any;
}) {
  const normalizedTo = normalizePhone(data.to);
  try {
    const queueRef = doc(collection(db, "notification_queue"));
    const queueItem = {
      // Phase 5 parameters
      to: normalizedTo,
      message: data.message,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      tenant_id: data.tenant_id || "default",

      // Phase 3 & 4 compatibility parameters (Required by NotificationQueueItem schema validation)
      phone: normalizedTo,
      type: data.type || "fallback_whatsapp",
      uid: data.uid || auth.currentUser?.uid || "system_simulated",
      title: data.title || "WhatsApp Outbound Fallback",
      priority: data.priority || 2,
      updatedAt: new Date().toISOString(),
      metadata: data.metadata || { source: "wa_client_fallback" }
    };

    await setDoc(queueRef, queueItem);
    console.log("Successfully pushed task to parent notification_queue:", queueItem);
    return { success: true, queued: true, id: queueRef.id };
  } catch (err: any) {
    console.error("Failed to push task to notification_queue:", err);
    return { success: false, error: err.message || "Failed to push to Firestore queue" };
  }
}

/**
 * End-to-end send WhatsApp message with fallback processing.
 * Connects to the external WA API service.
 */
export async function sendWhatsApp(to: string, message: string, extraData: any = {}) {
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    return { success: false, error: "Invalid phone number input" };
  }

  try {
    console.log(`Sending WhatsApp message to ${normalizedTo} via external gateway...`);
    const response = await fetch("https://wa-api.teamrewang.xyz/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: normalizedTo,
        message
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("External WhatsApp API response:", responseData);

    if (responseData && responseData.success === false) {
      throw new Error(responseData.error || "External API returned success: false");
    }

    return {
      success: true,
      response: responseData
    };
  } catch (error: any) {
    console.warn(`WhatsApp send failed: ${error.message || error}. Running Hybrid Fallback Mode...`);

    // Hybrid Fallback Mode: push to Firestore queue so that workers can process it later
    const fallbackResult = await pushToQueue({
      to: normalizedTo,
      message,
      tenant_id: extraData.tenant_id || "default",
      ...extraData
    });

    return {
      success: false,
      error: error.message || "Unknown gateway error",
      fallback: fallbackResult
    };
  }
}
