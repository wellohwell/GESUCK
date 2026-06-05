import { db, auth } from "../src/firebase/config.ts";
import { collection, doc, setDoc } from "firebase/firestore";

/**
 * Clean and normalize phone numbers.
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Pushes a WhatsApp notification task to the Firestore fallback queue.
 */
export async function pushToQueue(data) {
  const normalizedTo = normalizePhone(data.to);
  try {
    const queueRef = doc(collection(db, "notification_queue"));
    const queueItem = {
      // Phase 5 parameters
      to: normalizedTo,
      message: data.message,
      status: "pending",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      tenant_id: data.tenant_id || "default",

      // Phase 3 & 4 compatibility
      phone: normalizedTo,
      type: data.type || "fallback_whatsapp",
      uid: data.uid || auth.currentUser?.uid || "system_simulated",
      title: data.title || "WhatsApp Outbound Fallback",
      priority: data.priority || 2,
      updatedAt: new Date().toISOString(),
      metadata: data.metadata || { source: "wa_client_fallback_js" }
    };

    await setDoc(queueRef, queueItem);
    console.log("Successfully pushed task to parent notification_queue via JS client:", queueItem);
    return { success: true, queued: true, id: queueRef.id };
  } catch (err) {
    console.error("Failed to push task to notification_queue via JS client:", err);
    return { success: false, error: err.message || "Failed to push to Firestore queue" };
  }
}

/**
 * End-to-end send WhatsApp message with fallback processing.
 */
export async function sendWhatsApp(to, message, extraData = {}) {
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    return { success: false, error: "Invalid phone number input" };
  }

  try {
    console.log(`Sending WhatsApp message to ${normalizedTo} via JS external gateway...`);
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
    console.log("External WhatsApp API JS response:", responseData);

    if (responseData && responseData.success === false) {
      throw new Error(responseData.error || "External API returned success: false");
    }

    return {
      success: true,
      response: responseData
    };
  } catch (error) {
    console.warn(`WhatsApp send failed: ${error.message}. Running Hybrid Fallback Mode...`);

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
