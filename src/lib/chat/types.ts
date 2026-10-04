export type ChatLang = "id" | "en";

export type ChatIntent =
  | "greeting"
  | "help"
  | "thanks"
  | "career"
  | "career-list"
  | "recommend"
  | "stack"
  | "language"
  | "glossary"
  | "fallback";

export interface ChatToolRef {
  slug: string;
  name: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  pricing: string;
  url: string;
  openSource: boolean;
}

export interface ChatLink {
  label: string;
  href: string;
}

export interface ChatResponse {
  intent: ChatIntent;
  responseLang: ChatLang;
  reply: string;
  tools: ChatToolRef[];
  chips: string[];
  links?: ChatLink[];
}

export interface ChatHistoryTurn {
  role: "user" | "bot";
  text: string;
}
