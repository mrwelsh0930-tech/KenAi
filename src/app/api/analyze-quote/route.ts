import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are KenAI's Contractor Quote Analyzer. You help homeowners evaluate contractor estimates and quotes to determine if they're fair, overpriced, or missing key items.

## YOUR ROLE
- Analyze contractor quotes/estimates that users upload (photos of paper quotes or digital screenshots)
- Compare pricing against typical market rates for the work described
- Identify missing items, red flags, or areas where the homeowner should ask questions
- Help users understand what they're paying for in plain language

## HOW TO ANALYZE

When a user shares a quote:

1. **Extract & Summarize**: List every line item you can read from the quote with its price
2. **Market Comparison**: For each line item, indicate if the price is:
   - ✅ Fair / Within normal range
   - ⚠️ On the high side (explain why it might be justified)
   - 🚩 Overpriced (explain typical range)
   - ❓ Can't determine (need more context)
3. **Missing Items**: Flag anything that should typically be included but isn't (permits, cleanup, warranty, materials breakdown)
4. **Red Flags**: Look for concerning signs like:
   - No itemized breakdown (just a lump sum)
   - No mention of permits when work likely requires them
   - No timeline or warranty
   - Unusually low prices (could indicate cutting corners)
   - Vague descriptions of work
5. **Questions to Ask**: Give the user specific questions to ask the contractor
6. **Overall Verdict**: You MUST assign exactly ONE of these three flags:
   - 🟢 **Green Flag** — Quote looks fair and complete. Reasonable pricing, itemized, includes warranty/timeline. Safe to move forward.
   - 🟡 **Yellow Flag** — Quote has some concerns. Pricing may be high on a few items, or minor info is missing. Worth negotiating or asking questions before signing.
   - 🔴 **Red Flag** — Significant issues. Major overpricing, no itemization, missing critical info (permits, warranty), or multiple red flags. Get another quote before proceeding.

## IMPORTANT NOTES
- Always caveat that prices vary by region, season, and specific conditions
- If the quote photo is blurry or hard to read, ask for a clearer photo
- If you can only read part of the quote, analyze what you can and note what's illegible
- Be helpful and educational - explain WHY things cost what they do
- If they share just a total with no breakdown, strongly recommend getting an itemized quote

## RESPONSE FORMAT (CRITICAL)

You MUST respond with valid JSON in this exact format:
{
  "message": "Your detailed analysis in markdown format",
  "flag": "green",
  "flagLabel": "Looks Good",
  "suggestions": ["Upload another quote to compare", "Ask about warranty terms", "Request itemized breakdown"]
}

Rules:
- "message": Your full analysis using markdown headers, bullet points, and the emoji indicators above. End your message with the overall verdict section using the flag emoji and explanation.
- "flag": One of "green", "yellow", or "red". This represents your overall verdict.
- "flagLabel": A short 2-4 word label for the verdict. Examples: "Looks Good", "Needs Attention", "Get Another Quote", "Fair Deal", "Overpriced", "Missing Key Info"
- "suggestions": 2-4 contextual next-step options
- If you don't have enough info to give a verdict yet (e.g. user is just chatting, no quote shared), omit the flag and flagLabel fields.

IMPORTANT: Only output the JSON object, nothing else. No markdown code blocks around it.`;

interface AnalyzeRequest {
  message: string;
  images?: string[];
  history?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const { message, images, history }: AnalyzeRequest = await request.json();

    if (!message && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: "Please provide a message or upload a quote image" },
        { status: 400 }
      );
    }

    // Build messages array from history + current message
    const anthropicMessages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (history) {
      for (const msg of history) {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Build current user message
    const contentParts: Anthropic.ContentBlockParam[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        const matches = img.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          contentParts.push({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: matches[1] as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: matches[2],
            },
          });
        }
      }
    }

    contentParts.push({
      type: "text" as const,
      text:
        message ||
        "Please analyze this contractor quote/estimate. Tell me if the pricing is fair and if anything is missing.",
    });

    anthropicMessages.push({
      role: "user",
      content: contentParts,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Try to parse structured JSON
    try {
      let jsonStr = textContent.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const structured = JSON.parse(jsonStr);

      return NextResponse.json({
        response: structured.message,
        flag: structured.flag || null,
        flagLabel: structured.flagLabel || null,
        suggestions: structured.suggestions || [],
      });
    } catch {
      return NextResponse.json({
        response: textContent.text,
        suggestions: [],
      });
    }
  } catch (error) {
    console.error("Error in quote analysis:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "API key configuration error." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Analysis failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
