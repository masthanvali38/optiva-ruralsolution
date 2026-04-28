import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { issue_id, title, description, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You classify the urgency of rural civic issues (drainage, garbage, electrical, road, water, sanitation). Consider risk to human safety, health hazards, infrastructure damage, and number of people affected. Respond using the classify_urgency tool only.

Levels:
- critical: immediate danger to life (live wires, major flooding, collapsed road, contaminated drinking water)
- high: serious health/safety risk affecting many (broken sewage, prolonged power outage, blocked main road)
- medium: noticeable disruption but not dangerous (overflowing garbage, potholes, intermittent water)
- low: minor inconvenience (litter, small puddle, cosmetic damage)`;

    const userPrompt = `Category: ${category}\nTitle: ${title}\nDescription: ${description || "(none)"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_urgency",
              description: "Return the urgency classification.",
              parameters: {
                type: "object",
                properties: {
                  urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  reason: { type: "string", description: "Short explanation (max 20 words)." },
                },
                required: ["urgency", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_urgency" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;
    const urgency = args?.urgency || "medium";
    const reason = args?.reason || "";

    if (issue_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("issues").update({ urgency }).eq("id", issue_id);
    }

    return new Response(JSON.stringify({ urgency, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-urgency error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
