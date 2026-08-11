import { NextResponse } from "next/server";

export async function POST(req) {
    const body = await req.json();

    console.log("API KEY exists:", !!process.env.ANTHROPIC_API_KEY);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data));
    
    return NextResponse.json(data);
}