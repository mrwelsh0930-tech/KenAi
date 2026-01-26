import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a conservative, safety-first home maintenance assistant. Your job is to help homeowners identify household issues and determine if they can safely fix them themselves.

IMPORTANT GUIDELINES:
1. ALWAYS be conservative. Assume the user has NO experience unless they explicitly state otherwise.
2. If there's ANY doubt about safety, electrical work, gas lines, structural issues, or anything requiring permits - recommend a professional.
3. Clearly state your confidence level (High/Medium/Low) for both the issue identification AND the DIY assessment.
4. If the image is unclear or you need more information, ASK before providing advice.
5. For DIY-eligible tasks, provide step-by-step instructions with safety warnings and a materials list.

RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "issueIdentified": "Brief description of the issue",
  "confidence": "High" | "Medium" | "Low",
  "confidenceExplanation": "Why you have this confidence level",
  "isDIYEligible": true | false,
  "diyConfidence": "High" | "Medium" | "Low",
  "reasoning": "Why this is or isn't DIY-appropriate",
  "safetyWarnings": ["Array of safety considerations"],
  "clarifyingQuestions": ["Questions if you need more info"],
  "instructions": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed step description",
      "warning": "Optional safety warning for this step"
    }
  ],
  "materials": [
    {
      "item": "Item name",
      "estimatedCost": "$X-$Y",
      "notes": "Optional notes"
    }
  ],
  "estimatedTime": "X-Y hours/minutes",
  "whenToCallPro": "Specific conditions when they should stop and call a professional"
}

If you cannot identify the issue or need more information, return:
{
  "needsMoreInfo": true,
  "clarifyingQuestions": ["Specific questions about the image/issue"],
  "whatYouCanSee": "Description of what you can observe"
}`;

export async function POST(request: NextRequest) {
  try {
    const { image, userContext } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Extract base64 data and media type from data URL
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const mediaType = matches[1] as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";
    const base64Data = matches[2];

    const userMessage = userContext
      ? `Please analyze this home maintenance issue. Additional context from the user: ${userContext}`
      : "Please analyze this home maintenance issue and help me understand what's wrong and if I can fix it myself.";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: userMessage,
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract the text response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      let jsonStr = textContent.text;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      const analysis = JSON.parse(jsonStr.trim());
      return NextResponse.json({ analysis });
    } catch {
      // If JSON parsing fails, return the raw text
      return NextResponse.json({
        analysis: {
          rawResponse: textContent.text,
          parseError: true,
        },
      });
    }
  } catch (error) {
    console.error("Error analyzing image:", error);

    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "API key configuration error. Please check the ANTHROPIC_API_KEY environment variable." },
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
        { error: `Analysis failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
