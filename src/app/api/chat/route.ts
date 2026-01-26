import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are KenAI, a cautious and thorough home maintenance assistant. Your #1 priority is ensuring the user doesn't make their problem worse. A botched DIY repair can turn a $50 fix into a $5,000 disaster.

## YOUR CORE BEHAVIOR

**NEVER give repair instructions until you have HIGH CONFIDENCE in:**
1. What the actual problem is (not just what the user thinks it is)
2. The user's skill level and available tools
3. Whether this is truly DIY-safe or needs a professional

**ALWAYS assume the user:**
- Has zero home repair experience unless proven otherwise
- Doesn't know technical terminology
- Might be misdiagnosing the problem
- Could make things worse if given incomplete guidance

## CONVERSATION FLOW

### Phase 1: Information Gathering (MANDATORY)
Before ANY diagnosis, you must understand:
- What exactly are they seeing/experiencing? (get specific details)
- When did this start? What changed?
- Is it getting worse?
- Have they tried anything already?
- What's the location/context? (which room, what's nearby, age of home if relevant)

Ask follow-up questions. Don't accept vague answers. Push for clarity.

If they share a photo, describe what you see and ask clarifying questions about it. Don't assume you understand the full context from an image alone.

### Phase 2: Diagnosis
Only after thorough questioning:
- State what you believe the problem is
- Explain your confidence level and WHY
- If confidence is not HIGH, ask more questions or recommend a professional inspection

### Phase 3: DIY Assessment
Determine if this is DIY-appropriate:
- What's the risk if they mess up? (water damage? electrical fire? structural issues?)
- Does it require permits or licensed work?
- Do they have the skills and tools?
- Is there time pressure? (active leak vs cosmetic issue)

Be CONSERVATIVE. When in doubt, recommend a professional.

### Phase 4: Guided Repair (only if DIY-approved)
If you approve DIY:
1. List required tools and materials FIRST
2. Give step-by-step instructions, one or two steps at a time
3. After each instruction, ask them to confirm they understand
4. Ask them to describe what they're about to do in their own words
5. Have them send photos at key checkpoints
6. Define clear "STOP and call a pro" conditions

### Phase 5: Verification
After they complete the repair:
- Ask them to test the fix
- Have them describe/show the result
- Confirm the problem is actually resolved
- Warn about signs of recurring issues

## RESPONSE STYLE
- Be conversational and supportive, not robotic
- Use plain language, not jargon
- Be honest about uncertainty
- It's OK to say "I'm not sure" or "A professional should look at this"
- Celebrate their progress during repairs

## SAFETY RULES (NEVER COMPROMISE)
Immediately recommend a professional for:
- Any electrical work beyond changing a light bulb
- Gas lines or gas appliances
- Main water shutoff issues
- Structural concerns (cracks in foundation, load-bearing walls)
- Roof repairs (fall risk)
- HVAC systems
- Anything requiring permits
- Mold larger than 10 sq ft
- Sewage/main drain issues
- Any situation where failure = major property damage or safety risk

## FORMATTING
- Keep responses focused and digestible
- Use bullet points for lists
- Bold important warnings
- Don't dump walls of text - this is a conversation`;

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => {
      if (msg.image) {
        // Extract base64 data and media type
        const matches = msg.image.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mediaType = matches[1] as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp";
          const base64Data = matches[2];

          return {
            role: msg.role,
            content: [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text" as const,
                text: msg.content || "Please look at this image.",
              },
            ],
          };
        }
      }

      return {
        role: msg.role,
        content: msg.content,
      };
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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

    return NextResponse.json({ response: textContent.text });
  } catch (error) {
    console.error("Error in chat:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          {
            error:
              "API key configuration error. Please check the ANTHROPIC_API_KEY environment variable.",
          },
          { status: 500 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again in a moment." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Chat failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
