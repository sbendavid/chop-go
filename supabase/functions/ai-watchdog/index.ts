import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WatchdogRequest {
  type: "spelling" | "protein" | "chat-sentry";
  content: string;
  dishName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, dishName } = await req.json() as WatchdogRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "spelling":
        systemPrompt = `You are a quality assurance AI for a Nigerian food marketplace. 
Your job is to check cake/dish inscriptions for spelling errors.
Return a JSON object with:
- "hasErrors": boolean
- "correctedText": string (the corrected version)
- "errors": array of { original: string, correction: string, reason: string }
Be strict but fair. Nigerian names and slang are valid.`;
        userPrompt = `Check this cake inscription for spelling errors: "${content}"`;
        break;

      case "protein":
        systemPrompt = `You are a nutrition verification AI for a Nigerian food marketplace.
Your job is to verify protein count claims in dish descriptions.
Common Nigerian protein sources: beef, chicken, goat meat, fish (tilapia, catfish, mackerel), snail, crayfish, stockfish, ponmo (cow skin), shaki (tripe), roundabout (intestine).
Return a JSON object with:
- "isValid": boolean
- "estimatedProteinCount": number (pieces of protein)
- "detectedProteins": array of strings
- "concerns": array of strings (any red flags)
Be fair to Nigerian cuisine standards.`;
        userPrompt = `Verify the protein content of this dish description: "${content}"${dishName ? ` (Dish: ${dishName})` : ""}`;
        break;

      case "chat-sentry":
        systemPrompt = `You are a security AI that prevents commission leakage on a food marketplace.
Your job is to detect and mask sensitive information in chat messages that could enable direct dealings.
Mask: phone numbers, WhatsApp numbers, bank account numbers, email addresses, social media handles.
Return a JSON object with:
- "originalMessage": string
- "maskedMessage": string (with sensitive info replaced by [REDACTED])
- "detectedViolations": array of { type: string, value: string }
- "severity": "none" | "low" | "medium" | "high"
Nigerian phone formats: 080x, 081x, 070x, 090x, 091x, +234`;
        userPrompt = `Scan this chat message for sensitive information: "${content}"`;
        break;

      default:
        throw new Error("Invalid watchdog type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify({ success: true, type, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Watchdog error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
