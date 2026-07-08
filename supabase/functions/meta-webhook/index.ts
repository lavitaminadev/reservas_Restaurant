// ============================================================================
// Edge Function: Meta Webhook Receiver
// ============================================================================
// Recibe webhooks de Meta (Instagram, Facebook) y los procesa.
// --verify_token: valida el webhook verify token de Meta
// -- Los mensajes se normalizan y guardan en webhook_events
// -- Los mensajes de Instagram se convierten en conversaciones + mensajes
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{ type: string; payload: { url?: string } }>;
      };
      postback?: { title: string; payload: string };
    }>;
    changes?: Array<{
      field: string;
      value: Record<string, unknown>;
    }>;
  }>;
}

serve(async (req) => {
  const url = new URL(req.url);

  // GET = Webhook verification (Meta handshake)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );

      const { data: integration } = await supabase
        .from("company_integrations")
        .select("*, provider:integration_providers(*)")
        .filter("provider.slug", "eq", "instagram")
        .filter("metadata->>verify_token", "eq", token)
        .single();

      if (integration) {
        await supabase
          .from("company_integrations")
          .update({ status: "connected", metadata: { ...integration.metadata, webhook_verified: true } })
          .eq("id", integration.id);

        return new Response(challenge, { status: 200 });
      }
    }

    return new Response("Verification failed", { status: 403 });
  }

  // POST = Webhook event
  if (req.method === "POST") {
    const signature = req.headers.get("x-hub-signature-256") || "";
    const body = await req.text();
    const payload: WebhookPayload = JSON.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY)!
    );

    for (const entry of payload.entry || []) {
      const pageId = entry.id;

      // Find the company integration by page ID
      const { data: account } = await supabase
        .from("integration_accounts")
        .select("company_id")
        .eq("external_account_id", pageId)
        .eq("provider", "instagram")
        .single();

      if (!account) continue;

      // Process messages
      for (const messaging of entry.messaging || []) {
        const eventId = `ig_${messaging.timestamp}_${messaging.sender.id}`;

        // Check idempotency
        const { data: existing } = await supabase
          .from("webhook_events")
          .select("id")
          .eq("idempotency_key", eventId)
          .maybeSingle();

        if (existing) continue;

        // Save webhook event
        await supabase.from("webhook_events").insert({
          company_id: account.company_id,
          direction: "inbound",
          provider: "instagram",
          event_type: messaging.message ? "message" : messaging.postback ? "postback" : "unknown",
          external_event_id: messaging.message?.mid,
          idempotency_key: eventId,
          status: "processing",
          payload_safe: {
            sender_id: messaging.sender.id,
            recipient_id: messaging.recipient.id,
            message_type: messaging.message ? "text" : messaging.postback ? "postback" : null,
            has_attachments: !!messaging.message?.attachments?.length,
          },
          received_at: new Date().toISOString(),
        });

        // Find or create customer
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("company_id", account.company_id)
          .eq("platform", "instagram")
          .eq("platform_id", messaging.sender.id)
          .maybeSingle();

        let customerId = customer?.id;
        if (!customerId) {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              company_id: account.company_id,
              platform: "instagram",
              platform_id: messaging.sender.id,
              name: `IG-${messaging.sender.id.slice(-6)}`,
            })
            .select("id")
            .single();

          customerId = newCustomer!.id;
        }

        // Find or create conversation
        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("company_id", account.company_id)
          .eq("customer_id", customerId)
          .eq("channel", "instagram")
          .eq("status", "active")
          .maybeSingle();

        let conversationId = conversation?.id;
        if (!conversationId) {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({
              company_id: account.company_id,
              customer_id: customerId,
              channel: "instagram",
              channel_conversation_id: eventId,
              status: "active",
            })
            .select("id")
            .single();

          conversationId = newConv!.id;
        }

        // Save message
        if (messaging.message?.text || messaging.message?.attachments) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender: "customer",
            content: messaging.message.text || "[attachment]",
            content_type: messaging.message.text ? "text" : "image",
            platform_message_id: messaging.message.mid,
          });
        }

        // Update webhook event status
        await supabase
          .from("webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("idempotency_key", eventId);
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
