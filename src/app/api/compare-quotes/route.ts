import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are KenAI's Quote Comparison Engine. You've already analyzed multiple contractor quotes individually. Now compare them side by side.

## WHAT YOU RECEIVE
Numbered quote analyses, each containing the original user description and your previous analysis with verdict.

## YOUR COMPARISON MUST INCLUDE

1. **Side-by-Side Summary** — Compare key metrics across all quotes: total price, number of line items, verdict, warranty, permits, timeline.

2. **Price Comparison** — Who is cheapest overall? Where does each quote save or cost more? Use specific dollar amounts.

3. **Scope Comparison** — Who includes more work? What does one quote cover that others don't? This is often more important than price.

4. **Red Flags Across Quotes** — Anything concerning that appears in one or more quotes.

5. **Recommendation** — Which quote represents the best VALUE (not just cheapest). Consider completeness, pricing fairness, and professionalism of the quote.

## RESPONSE FORMAT (CRITICAL)

You MUST respond with valid JSON:
{
  "message": "Your markdown comparison using the sections above",
  "recommendation": "quote_1" or "quote_2" etc. or "need_more_info",
  "recommendationLabel": "Best Value: Quote 1" or similar short label
}

IMPORTANT: Only output the JSON object, nothing else. No markdown code blocks around it.`;

interface QuoteData {
  label: string;
  userContent: string;
  analysisContent: string;
  flag: string;
  flagLabel: string;
}

interface CompareRequest {
  quotes: QuoteData[];
}

export async function POST(request: NextRequest) {
  try {
    const { quotes }: CompareRequest = await request.json();

    if (!quotes || quotes.length < 2) {
      return NextResponse.json(
        { error: "At least 2 quotes are required for comparison" },
        { status: 400 }
      );
    }

    // Build a single message with all quote analyses
    const quoteSummaries = quotes
      .map(
        (q, i) =>
          `--- ${q.label} (Verdict: ${q.flagLabel}) ---\nUser said: ${q.userContent}\n\nAnalysis:\n${q.analysisContent}`
      )
      .join("\n\n");

    const userMessage = `Compare these ${quotes.length} contractor quotes side by side:\n\n${quoteSummaries}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    try {
      let jsonStr = textContent.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const structured = JSON.parse(jsonStr);

      return NextResponse.json({
        response: structured.message,
        recommendation: structured.recommendation || null,
        recommendationLabel: structured.recommendationLabel || null,
      });
    } catch {
      return NextResponse.json({
        response: textContent.text,
        recommendation: null,
        recommendationLabel: null,
      });
    }
  } catch (error) {
    console.error("Error in quote comparison:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "API key configuration error." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Comparison failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Comparison failed" },
      { status: 500 }
    );
  }
}
