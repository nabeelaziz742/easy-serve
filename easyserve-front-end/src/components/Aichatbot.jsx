"use client";

import { useDispatch, useSelector } from "react-redux";
import { addItem } from "@/store/slices/cartSlice";
import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, ShoppingCart } from "lucide-react";
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
            text: `Assalam o Alaikum! 👋 Welcome to **${restaurant?.name || "our restaurant"}**. I can help you with our menu, place orders, or answer any questions. What can I get for you today?`,
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
                // Replace the raw command with a friendly confirmation
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
        // Add user message to conversation history
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

        // Add assistant reply to history
        conversationHistory.current.push({
            role: "assistant",
            content: rawReply,
        });

        // Parse any cart actions and return clean text
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

    // Simple markdown bold renderer
    const renderText = (text) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
    };

    const cartCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);

    return (
        <>
            {/* Chat toggle button with cart badge */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 bg-black text-white p-4 rounded-full shadow-2xl z-50"
                style={{ position: "fixed" }}
            >
                {open ? (
                    <X size={24} />
                ) : (
                    <div className="relative">
                        <MessageCircle size={24} />
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {cartCount}
                            </span>
                        )}
                    </div>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed z-50"
                        style={{
                            bottom: "80px",
                            right: "24px",
                            width: "min(360px, calc(100vw - 48px))",
                            height: "min(520px, calc(100vh - 160px))",
                        }}
                    >
                        <div className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden w-full h-full">
                            {/* Header */}
                            <div className="bg-black text-white px-4 py-3 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Bot size={18} />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full"></span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium leading-tight">{restaurant?.name}</p>
                                        <p className="text-xs text-gray-400 leading-tight">Online</p>
                                    </div>
                                </div>
                                {cartCount > 0 && (
                                    <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
                                        <ShoppingCart size={14} />
                                        <span className="text-xs font-medium">{cartCount} items</span>
                                    </div>
                                )}
                            </div>

                            {/* Quick suggestion chips */}
                            {messages.length <= 1 && (
                                <div className="px-3 pt-3 pb-1 flex gap-2 flex-wrap shrink-0 bg-gray-50">
                                    {["Show menu", "Best sellers", "Take my order"].map((chip) => (
                                        <button
                                            key={chip}
                                            onClick={() => sendMessage(chip)}
                                            className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-700 hover:bg-black hover:text-white transition-colors"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed ${
                                                msg.sender === "user"
                                                    ? "bg-black text-white rounded-br-sm"
                                                    : "bg-white text-black shadow-sm rounded-bl-sm"
                                            }`}
                                        >
                                            {renderText(msg.text)}
                                        </div>
                                    </div>
                                ))}

                                {typing && (
                                    <div className="flex justify-start">
                                        <div className="bg-white shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef}></div>
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t flex gap-2 bg-white shrink-0">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-black transition-colors"
                                    onKeyDown={(e) => e.key === "Enter" && !typing && sendMessage()}
                                    disabled={typing}
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={typing || !message.trim()}
                                    className="bg-black text-white p-3 rounded-full shrink-0 disabled:opacity-40 transition-opacity"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
