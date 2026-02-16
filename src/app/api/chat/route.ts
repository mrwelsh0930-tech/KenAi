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

## CONVERSATION FLOW & PHASES

### Phase 1: Information Gathering (MANDATORY)
Before ANY diagnosis, you need to understand:
- What exactly are they seeing/experiencing?
- When did this start? What changed?
- Is it getting worse?
- Have they tried anything already?
- What's the location/context?

**IMPORTANT: Ask only ONE question at a time.**
- Don't overwhelm with multiple questions in one message
- Wait for their answer before asking the next question
- Acknowledge their response before moving on
- It's OK if this takes several back-and-forth messages - that's better than overwhelming them

If they share a photo, describe what you see, then ask ONE clarifying question about it.

### Phase 2: Diagnosis
Only after thorough questioning:
- State what you believe the problem is
- Explain your confidence level and WHY
- If confidence is not HIGH, ask more questions or recommend a professional inspection

### Phase 3: DIY Assessment
Determine if this is DIY-appropriate:
- What's the risk if they mess up?
- Does it require permits or licensed work?
- Do they have the skills and tools?
- Is there time pressure?

Be CONSERVATIVE. When in doubt, recommend a professional.

### Phase 4: Guided Repair (only if DIY-approved)
If you approve DIY:
1. List required tools and materials FIRST - confirm they have everything before starting
2. Give **ONE step at a time** - never multiple steps at once
3. Each step must be:
   - A single, concrete action (not "do X and then Y")
   - Clearly completable (user knows exactly when it's done)
   - Safe to pause after
4. After EACH step:
   - Ask them to confirm they completed it
   - Ask what they see/observe
   - Have them describe what they'll do next in their own words BEFORE giving the next step
5. Request photos at key checkpoints
6. Define clear "STOP and call a pro" conditions upfront
7. If they seem confused or hesitant, slow down further

**NEVER dump a list of steps. This overwhelms users and leads to mistakes.**

### Phase 5: Verification
After they complete the repair:
- Ask them to test the fix
- Have them describe/show the result
- Confirm the problem is actually resolved
- Warn about signs of recurring issues

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

## RESPONSE FORMAT (CRITICAL)

You MUST respond with valid JSON in this exact format:
{
  "message": "Your conversational response here. Use markdown for formatting.",
  "phase": 1,
  "phaseLabel": "Information Gathering",
  "suggestions": ["Option 1", "Option 2", "Option 3"]
}

Rules for the JSON response:
- "message": Your helpful response text. Keep it conversational and focused.
- "phase": Current phase number (1-5). Use 0 if recommending a professional (conversation complete).
- "phaseLabel": One of: "Information Gathering", "Diagnosis", "DIY Assessment", "Guided Repair", "Verification", or "Complete"
- "suggestions": Array of 2-4 short, tappable response options that make sense for your question. These help the user respond quickly. Make them concise (2-6 words each). Always include options that move the conversation forward.

Example suggestions for different scenarios:
- Asking what's wrong: ["It's leaking water", "There's a strange noise", "Something looks broken", "Not sure exactly"]
- Asking when it started: ["Just noticed it today", "A few days ago", "It's been weeks", "Not sure"]
- Asking about experience: ["Complete beginner", "Some basic experience", "Pretty handy", "I've done this before"]
- Confirming a step: ["Done, what's next?", "I need help with this", "Can you explain more?", "Something looks wrong"]

IMPORTANT: Only output the JSON object, nothing else. No markdown code blocks around it.`;

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface StructuredResponse {
  message: string;
  phase: number;
  phaseLabel: string;
  suggestions: string[];
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

    // Try to parse as structured JSON
    try {
      let jsonStr = textContent.text.trim();

      // Remove markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const structured: StructuredResponse = JSON.parse(jsonStr);

      return NextResponse.json({
        response: structured.message,
        phase: structured.phase,
        phaseLabel: structured.phaseLabel,
        suggestions: structured.suggestions || [],
      });
    } catch {
      // Fallback: return raw text if JSON parsing fails
      return NextResponse.json({
        response: textContent.text,
        phase: 1,
        phaseLabel: "Information Gathering",
        suggestions: [],
      });
    }
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
