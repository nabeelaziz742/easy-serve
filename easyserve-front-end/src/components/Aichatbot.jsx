"use client";

import { useDispatch, useSelector } from "react-redux";
import { addItem } from "@/store/slices/cartSlice";
import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, ShoppingCart, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AIChatbot({ restaurant }) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const dispatch = useDispatch();
    const router = useRouter();
    const cartItems = useSelector((state) => state.cart.items || []);
    const [typing, setTyping] = useState(false);
    const conversationHistory = useRef([]);

    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: `Assalam o Alaikum! 👋 Welcome to **${restaurant?.name || "EasyServe"}**. I can assist you with our chef's recommendations, take your orders, or answer any dining questions. What would you like today?`,
        },
    ]);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    // Build system prompt with full restaurant context
    const buildSystemPrompt = () => {
        const allMenuItems =
            restaurant?.menus?.flatMap((menu) => ({
                category: menu.name,
                items: menu.menu_items,
            })) || [];

        const menuText = allMenuItems
            .map(
                (m) =>
                    `Category: ${m.category}\n` +
                    m.items
                        .map((i) => `  - ${i.name} | Rs.${i.price}${i.description ? ` | ${i.description}` : ""}`)
                        .join("\n")
            )
            .join("\n\n");

        const cartText =
            cartItems.length > 0
                ? cartItems
                      .map((i) => `${i.name} x${i.qty} = Rs.${i.price * i.qty}`)
                      .join(", ")
                : "Cart is empty";

        return `You are a helpful, friendly restaurant assistant for "${restaurant?.name || "this restaurant"}".

RESTAURANT INFO:
- Name: ${restaurant?.name || "N/A"}
- Description: ${restaurant?.description || "N/A"}
- Address: ${restaurant?.address || "N/A"}
- Cuisine: ${restaurant?.cuisine || "N/A"}

FULL MENU:
${menuText || "No menu available right now."}

CUSTOMER'S CURRENT CART:
${cartText}

YOUR JOB:
1. Answer questions about the menu, restaurant, location, and hours naturally.
2. Suggest items based on what the customer wants — if they ask for "something spicy" or "best burger", recommend from the actual menu.
3. If an item is NOT in the menu, politely say so and suggest the closest alternative from the menu.
4. When a customer wants to add an item to cart, reply with this EXACT format on its own line:
   ADD_TO_CART:{"id":"<item_id>","name":"<item_name>","price":<price>}
5. Upsell naturally — if someone orders a burger, suggest fries or a drink if available.
6. Keep responses short, warm, and conversational.
7. You can respond in Urdu or English — match whatever language the customer uses.
8. Never make up items that are not in the menu above.
9. If cart has items, you can remind them or suggest they checkout.

TONE: Friendly, helpful, like a real waiter. Not robotic.`;
    };

    // Parse ADD_TO_CART commands from AI response
    const parseAndDispatchCartActions = (text) => {
        const regex = /ADD_TO_CART:(\{.*?\})/g;
        let match;
        let cleanText = text;

        while ((match = regex.exec(text)) !== null) {
            try {
                const item = JSON.parse(match[1]);
                dispatch(
                    addItem({
                        ...item,
                        qty: 1,
                        orderType: "DELIVERY",
                        restaurant: restaurant?.id,
                    })
                );
                cleanText = cleanText.replace(
                    match[0],
                    `✅ **${item.name}** has been added to your cart!`
                );
            } catch (e) {
                cleanText = cleanText.replace(match[0], "");
            }
        }

        return cleanText.trim();
    };

    const getAIReply = async (userMessage) => {
        conversationHistory.current.push({
            role: "user",
            content: userMessage,
        });

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 1000,
                system: buildSystemPrompt(),
                messages: conversationHistory.current,
            }),
        });

        if (!response.ok) {
            throw new Error("API call failed");
        }

        const data = await response.json();
        const rawReply = data.content?.[0]?.text || "Sorry, I couldn't understand that.";

        conversationHistory.current.push({
            role: "assistant",
            content: rawReply,
        });

        return parseAndDispatchCartActions(rawReply);
    };

    const sendMessage = async (customMessage = null) => {
        const finalMessage = customMessage || message;
        if (!finalMessage.trim()) return;

        setMessages((prev) => [...prev, { sender: "user", text: finalMessage }]);
        setMessage("");
        setTyping(true);

        try {
            const reply = await getAIReply(finalMessage);
            setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    sender: "bot",
                    text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
                },
            ]);
        } finally {
            setTyping(false);
        }
    };

    const renderText = (text) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-bold text-yellow-950">{part}</strong> : part
        );
    };

    const cartCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);

    return (
        <>
            {/* Chat toggle button */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-950 text-yellow-400 shadow-2xl ring-2 ring-yellow-400/40 transition-all"
                aria-label="Open AI dining assistant"
            >
                {open ? (
                    <X size={22} className="text-yellow-400" />
                ) : (
                    <div className="relative">
                        <MessageCircle size={24} className="text-yellow-400" />
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black shadow-md">
                                {cartCount}
                            </span>
                        )}
                    </div>
                )}
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed z-50"
                        style={{
                            bottom: "86px",
                            right: "24px",
                            width: "min(380px, calc(100vw - 48px))",
                            height: "min(540px, calc(100vh - 160px))",
                        }}
                    >
                        <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 bg-green-950 px-4 py-3.5 text-white shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-black shadow-md">
                                        <Bot size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold leading-tight text-white flex items-center gap-1.5">
                                            {restaurant?.name || "EasyServe Assistant"}
                                            <Sparkles className="h-3 w-3 text-yellow-400" />
                                        </p>
                                        <p className="text-[10px] text-green-300 font-medium">AI Concierge · Online</p>
                                    </div>
                                </div>
                                {cartCount > 0 && (
                                    <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-yellow-400 border border-yellow-400/20">
                                        <ShoppingCart size={13} />
                                        <span>{cartCount} in cart</span>
                                    </div>
                                )}
                            </div>

                            {/* Suggestion Chips */}
                            {messages.length <= 1 && (
                                <div className="flex flex-wrap gap-1.5 bg-gray-50/80 px-3 py-2 shrink-0 border-b border-gray-100">
                                    {["Show menu specials", "Chef recommendations", "Take my order"].map((chip) => (
                                        <button
                                            key={chip}
                                            onClick={() => sendMessage(chip)}
                                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-green-200 hover:bg-green-50 hover:text-green-950"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white p-4">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                                msg.sender === "user"
                                                    ? "rounded-br-xs bg-green-950 text-yellow-400 font-medium shadow-md"
                                                    : "rounded-bl-xs border border-gray-200/80 bg-white text-gray-800 shadow-xs"
                                            }`}
                                        >
                                            {renderText(msg.text)}
                                        </div>
                                    </div>
                                ))}

                                {typing && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs border border-gray-200/80 bg-white px-4 py-3 shadow-xs">
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-yellow-500" style={{ animationDelay: "0ms" }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-yellow-500" style={{ animationDelay: "150ms" }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-yellow-500" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Bar */}
                            <div className="flex gap-2 border-t border-gray-100 bg-white p-3 shrink-0">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask for dishes, specials, allergens..."
                                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2 text-xs text-gray-900 outline-none transition focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-700/20"
                                    onKeyDown={(e) => e.key === "Enter" && !typing && sendMessage()}
                                    disabled={typing}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={typing || !message.trim()}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-950 text-yellow-400 shadow-md transition hover:bg-green-900 active:scale-95 disabled:opacity-40"
                                    aria-label="Send message"
                                >
                                    <Send size={15} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
