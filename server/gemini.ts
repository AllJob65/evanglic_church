import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateDevotionAI(topic: string, language: string = 'English') {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `You are a warm, spiritually grounded theological assistant for an Ethiopian Evangelical & Christian Church.
Generate a structured daily devotion on the theme/topic: "${topic}".
Language requested: ${language}.

Format your response as a JSON object with the following fields:
{
  "title": "Title of the Devotion",
  "scriptureReference": "Book Chapter:Verse",
  "scriptureText": "The actual scripture verse text",
  "reflection": "A 2-3 paragraph spiritual teaching and pastoral reflection",
  "lifeApplication": "Practical 2-3 bullet action steps for everyday life",
  "prayer": "A heartfelt prayer closing the devotion"
}

Provide pure JSON with no markdown fences.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: prompt,
  });

  const rawText = response.text || '';
  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      title: `Daily Devotion: ${topic}`,
      scriptureReference: 'Psalms 119:105',
      scriptureText: 'Your word is a lamp for my feet, a light on my path.',
      reflection: rawText,
      lifeApplication: 'Reflect on God\'s faithfulness today and share his grace with your community.',
      prayer: 'Lord, thank You for guiding our steps and illuminating our path with Your truth. Amen.',
    };
  }
}

export async function generateSermonOutlinesAI(title: string, passage: string) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `You are a pastoral sermon assistant for Church leaders.
Create an in-depth, biblically sound sermon outline.
Sermon Title: "${title}"
Passage: "${passage}"

Return JSON:
{
  "title": "${title}",
  "passage": "${passage}",
  "theme": "Core spiritual theme",
  "introduction": "Engaging hook and biblical context",
  "points": [
    {
      "pointNumber": 1,
      "heading": "First Main Point",
      "scriptureSupport": "Cross reference verses",
      "explanation": "Detailed biblical exegesis",
      "illustration": "Relatable modern or historical story/analogy"
    },
    {
      "pointNumber": 2,
      "heading": "Second Main Point",
      "scriptureSupport": "Cross reference verses",
      "explanation": "Detailed biblical exegesis",
      "illustration": "Relatable illustration"
    },
    {
      "pointNumber": 3,
      "heading": "Third Main Point",
      "scriptureSupport": "Cross reference verses",
      "explanation": "Detailed biblical exegesis",
      "illustration": "Relatable illustration"
    }
  ],
  "conclusion": "Summary recap",
  "callToAction": "Altar call and response prayer"
}
Provide pure JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: prompt,
  });

  const rawText = response.text || '';
  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      title,
      passage,
      theme: 'Spiritual Growth',
      introduction: 'Walking in faith through God\'s Word.',
      points: [
        { pointNumber: 1, heading: 'Foundations of Faith', scriptureSupport: passage, explanation: rawText, illustration: '' }
      ],
      conclusion: 'Standing firm in truth.',
      callToAction: 'Commit your heart to prayer.',
    };
  }
}
