import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WishGenerationParams {
  name: string;
  vibe: "funny" | "heartfelt" | "professional" | "poetic";
  interests?: string[];
  relationship?: string;
}

export async function generateSmartWish({ name, vibe, interests, relationship }: WishGenerationParams): Promise<string> {
  const prompt = `Generate a ${vibe} birthday wish for ${name}. ${
    relationship ? `They are my ${relationship}.` : ""
  } ${
    interests && interests.length > 0 ? `They are interested in: ${interests.join(", ")}.` : ""
  } Keep it concise and suitable for WhatsApp.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a creative birthday wish generator. Provide only the message text, no extra commentary. Tailor the tone based on the relationship provided.",
      },
    });

    return response.text || "Happy Birthday! Hope you have a fantastic day!";
  } catch (error) {
    console.error("Error generating wish:", error);
    return "Happy Birthday! Wishing you all the best on your special day!";
  }
}

export async function generateGiftIdeas(name: string, interests: string[], relationship?: string): Promise<string[]> {
  const prompt = `Suggest 5 unique gift ideas for ${name} ${relationship ? `(who is my ${relationship})` : ""} based on their interests: ${interests.join(", ")}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a thoughtful gift concierge. Provide a JSON array of 5 strings, each being a gift idea. Consider the relationship when suggesting gifts.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return ["A personalized journal", "A high-quality water bottle", "A subscription to a hobby magazine"];
  } catch (error) {
    console.error("Error generating gift ideas:", error);
    return ["A thoughtful book", "A cozy blanket", "A gift card to their favorite store"];
  }
}

export async function polishWish(transcript: string, name: string, relationship?: string): Promise<string> {
  const prompt = `The user said: "${transcript}". Polish this into a beautiful, warm, and natural-sounding birthday wish for ${name} ${relationship ? `(who is my ${relationship})` : ""}. Keep it concise and suitable for WhatsApp.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a warm and creative birthday wish polisher. Provide only the polished message text, no extra commentary. Ensure the tone matches the relationship.",
      },
    });

    return response.text || transcript;
  } catch (error) {
    console.error("Error polishing wish:", error);
    return transcript;
  }
}
