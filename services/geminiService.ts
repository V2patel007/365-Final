
import { GoogleGenAI, Type } from "@google/genai";
import { IdeaSuggestion, ProjectEntry, PlatformPosts } from "../types";

export class GeminiService {
  private getEnv(name: string): string | undefined {
    const v = (process.env as any)?.[name];
    return typeof v === 'string' && v.trim() ? v : undefined;
  }

  private getModel(envName: string, fallback: string): string {
    return this.getEnv(envName) ?? fallback;
  }

  private getFriendlyErrorMessage(error: unknown): string {
    const anyErr = error as any;
    const status = anyErr?.error?.code ?? anyErr?.status ?? anyErr?.code;
    const message = anyErr?.error?.message ?? anyErr?.message;

    if (status === 429 || anyErr?.error?.status === 'RESOURCE_EXHAUSTED') {
      let retryDelay: string | undefined;
      const details = anyErr?.error?.details;
      if (Array.isArray(details)) {
        const retryInfo = details.find((d: any) => d?.['@type']?.includes('RetryInfo'));
        retryDelay = retryInfo?.retryDelay;
      }

      const retryHint = retryDelay ? ` Retry after ${retryDelay}.` : '';
      return `Gemini quota/rate limit exceeded (429).${retryHint} Check billing/quota for your API key/project, or switch to a cheaper model (e.g. flash).`;
    }

    return typeof message === 'string' && message.trim()
      ? message
      : 'Gemini request failed.';
  }

  private getClient() {
    // Correctly initialize with process.env.API_KEY directly as required by guidelines
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateIdeas(niche: string, count: number = 6): Promise<IdeaSuggestion[]> {
    const ai = this.getClient();
    const prompt = `Act as a senior product manager and developer. Generate ${count} innovative, distinct web app ideas for the year 2026.
    The niche is: ${niche}. 
    Constraints:
    1. Must be buildable as an MVP in 8 hours or less.
    2. Must utilize Google AI/Gemini or modern web APIs.
    3. Target: Solo-founders and indie hackers.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              techStack: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              complexity: { 
                type: Type.STRING, 
                enum: ['Easy', 'Medium', 'Hard'] 
              }
            },
            required: ["title", "description", "techStack", "complexity"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]') as IdeaSuggestion[];
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return [];
    }
  }

  async brainstormProjectDetails(title: string, category: string): Promise<Partial<ProjectEntry>> {
    const ai = this.getClient();
    const prompt = `Project: "${title}" in category "${category}".
    Suggest:
    1. A concise, catchy 1-sentence description.
    2. A typical use case for this application.
    3. The primary targeted audience.
    4. A modern tech stack (max 4 items).
    5. A suggested pricing model (e.g. "Freemium", "Credits", "LTD").
    6. A quick implementation tip.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            useCase: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
            pricingModel: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["description", "useCase", "targetAudience", "techStack", "pricingModel", "notes"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      return {};
    }
  }

  async generatePRD(title: string, description: string, useCase: string, audience: string): Promise<string> {
    const ai = this.getClient();
    const prompt = `Act as a World-Class Technical Product Manager and Lead Architect. Generate a DEEP and COMPREHENSIVE "Project Requirements Document" (PRD) for:
    
    App Title: ${title}
    Description: ${description}
    Use Case: ${useCase}
    Target Audience: ${audience}
    
    The PRD MUST be highly detailed and follow this exact structure:

    1. Executive Summary & Value Proposition:
       - Problem statement and unique solution.

    2. Comprehensive Functional Requirements:
       - Detailed breakdown of must-have vs. nice-to-have features.
       - Specific AI-powered features.

    3. Advanced User Flow & Journey Scenarios:
       - The "Happy Path": Standard successful user journey.
       - Edge Case A (First-time user): Discovery and zero-state experience.
       - Edge Case B (Input Failure/Empty State): How the app handles invalid or missing data.
       - Edge Case C (Power User): Advanced workflows or repetitive usage.

    4. Technical Architecture & System Design:
       - Frontend Component Breakdown: List of key UI components and their roles.
       - State Management: Suggested approach (e.g., React Context, Signals, or simple local state).
       - Data Schema: Define the core data objects and their properties.
       - API Design: Specific endpoints (or function definitions) needed for Gemini and other services.
       - Performance & Scalability: Key considerations for a high-quality 2026 web app.

    5. AI Interaction Model & Prompt Engineering:
       - Detailed logic on how user inputs are mapped to AI prompts.
       - Expected AI output format (JSON/Markdown) and parsing strategy.

    6. Success Metrics & Risk Management:
       - Key Performance Indicators (KPIs) for the MVP.
       - Technical risks (latency, cost, API rate limits) and mitigation strategies.
    
    Format the output in clean, professional, and visually structured Markdown.`;

    try {
      const response = await ai.models.generateContent({
        model: this.getModel('GEMINI_PRD_MODEL', 'gemini-3-flash-preview'),
        contents: prompt,
      });

      return response.text || "Failed to generate PRD.";
    } catch (error) {
      throw new Error(this.getFriendlyErrorMessage(error));
    }
  }

  async generateStudioPrompt(prd: string): Promise<string> {
    const ai = this.getClient();
    const prompt = `Act as an expert "AI System Instruction" Architect. Based on the following Project Requirements Document (PRD), develop a HIGHLY SPECIFIC "System Instruction" for Google AI Studio.
    
    PRD:
    ${prd}
    
    The System Instruction MUST be ready for production. It should include:
    - Persona & Voice: Define exactly how the AI speaks.
    - Deep Logic Constraints: Explicit rules on what it can/cannot do.
    - Output Formatting: Strict instructions for JSON or Markdown schemas if required by the PRD.
    - Context Handling: How it should treat previous turns or specific inputs.
    - Edge Case Management: Instructions for vague or malicious queries.
    
    Produce a professional, single-block prompt that a developer can copy-paste directly into Google AI Studio's System Instructions field.`;

    try {
      const response = await ai.models.generateContent({
        model: this.getModel('GEMINI_STUDIO_MODEL', 'gemini-3-flash-preview'),
        contents: prompt,
      });

      return response.text || "Failed to generate specialized AI Studio prompt.";
    } catch (error) {
      throw new Error(this.getFriendlyErrorMessage(error));
    }
  }

  async generatePlatformPosts(title: string, description: string, demoUrl: string): Promise<PlatformPosts> {
    const ai = this.getClient();
    const prompt = `Generate 5 platform-specific social media posts for the launch of my app: "${title}".
    App Context: ${description}
    Demo Link: ${demoUrl || 'Coming Soon'}
    Challenge context: "Day X of 365 Apps in 365 Days (2026)".
    
    Requirements for each platform:
    1. X (Twitter): Short, punchy, high energy, 2-3 hashtags, including the demo link.
    2. LinkedIn: Professional, authoritative, focus on value and problem-solving, structured with bullet points, including the demo link.
    3. Instagram: Casual, emoji-heavy, focus on visual description/vibes, including the demo link (mention "Link in bio" vibe but include the URL).
    4. Facebook: Community-focused, conversational, friendly tone, asking for feedback, including the demo link.
    5. Medium: A compelling, slightly longer-form "Introduction Story" snippet (150-200 words), storytelling style, including the demo link.
    
    Return the response as a valid JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            instagram: { type: Type.STRING },
            facebook: { type: Type.STRING },
            medium: { type: Type.STRING }
          },
          required: ["x", "linkedin", "instagram", "facebook", "medium"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}') as PlatformPosts;
    } catch (e) {
      console.error("Failed to parse social posts", e);
      return {};
    }
  }

  async generateSocialPost(projectTitle: string, description: string): Promise<string> {
    const ai = this.getClient();
    const prompt = `Create a viral-style post for X/Twitter for: "${projectTitle}".
    Context: ${description}.
    Challenge: Day X of 365 Apps in 365 Days (2026).
    Include 3 hashtags and a strong CTA for the demo link. Keep it punchy and authentic.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Failed to generate post.";
  }
}

export const gemini = new GeminiService();
