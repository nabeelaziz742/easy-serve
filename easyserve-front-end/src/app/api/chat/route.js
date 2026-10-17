import { NextResponse } from "next/server";

// This route spends the server's Anthropic key on behalf of anonymous
// visitors, so it no longer forwards the client's body as-is (which let
// anyone pick any model and any max_tokens). Only the fields the menu
// chatbot needs are passed on, with fixed limits.
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_SYSTEM_CHARS = 60000;

const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
        return null;
    }
    const clean = [];
    for (const message of messages) {
        if (
            !message ||
            (message.role !== "user" && message.role !== "assistant") ||
            typeof message.content !== "string" ||
            message.content.length > MAX_MESSAGE_CHARS
        ) {
            return null;
        }
        clean.push({ role: message.role, content: message.content });
    }
    return clean;
};

export async function POST(req) {
    let body;
    try {
        body = await req.json();
    } catch (_) {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const messages = sanitizeMessages(body?.messages);
    const system = typeof body?.system === "string" ? body.system : "";
    if (!messages || system.length > MAX_SYSTEM_CHARS) {
        return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "Chat is not configured." }, { status: 503 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            ...(system ? { system } : {}),
            messages,
        }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
}
