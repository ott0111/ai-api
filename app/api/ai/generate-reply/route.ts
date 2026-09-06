import { NextResponse } from "next/server";

import { generateWithGemini } from "@/app/lib/ai/gemini";

export type GenerateReplyInput = {
  postText: string;
  authorUsername?: string;
  instructions?: string;
};

export function buildReplyPrompt({
  postText,
  authorUsername,
  instructions,
}: GenerateReplyInput) {
  const authorLabel = authorUsername?.trim()
    ? `@${authorUsername.trim()}`
    : "the author";

  const replyInstructions = instructions?.trim()
    ? instructions.trim()
    : "Casual and insightful";

  return [
    "Write one short, natural X reply to the original post below.",
    "",
    "Requirements:",
    "- Relevant to the original post.",
    "- Adds something to the conversation.",
    "- Sounds human, conversational, and natural.",
    "- Does not sound like an advertisement.",
    "- Does not mention AI unless the original post is specifically about AI.",
    "- Use no hashtags unless explicitly requested.",
    "- Use no unnecessary emojis.",
    "- No fake enthusiasm or engagement bait.",
    "- Do not invent personal experiences or claims.",
    "- Keep it comfortably under 220 characters.",
    "- Return only the reply text with no explanation, quotes, or markdown.",
    "",
    `Reply style: ${replyInstructions}`,
    "",
    `Original post from ${authorLabel}:`,
    postText,
  ].join("\n");
}

export async function generateReplySuggestion(
  input: GenerateReplyInput
): Promise<string> {
  const postText = String(input.postText ?? "").trim();

  if (!postText) {
    throw new Error("Post text is required");
  }

  const prompt = buildReplyPrompt(input);
  const reply = await generateWithGemini(prompt);
  const cleaned = reply.trim();

  if (!cleaned) {
    throw new Error("Gemini returned an empty reply");
  }

  return cleaned;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const postText = String(body?.postText ?? "").trim();

    if (!postText) {
      return NextResponse.json(
        {
          error: "Post text is required",
        },
        { status: 400 }
      );
    }

    const authorUsername = String(
      body?.authorUsername ?? ""
    ).trim();
    const instructions = String(
      body?.instructions ?? ""
    ).trim();

    const reply = await generateReplySuggestion({
      postText,
      authorUsername,
      instructions,
    });

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Reply generation failed",
      },
      { status: 500 }
    );
  }
}
