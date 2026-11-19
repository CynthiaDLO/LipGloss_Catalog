import { englishMessages } from "./messages";

export type Language = "es" | "en";
let activeLanguage: Language = "es";
export const setActiveLanguage = (language: Language) => { activeLanguage = language; };
export const getActiveLanguage = () => activeLanguage;

// Text from the API is not blindly translated: unknown text is preserved.
export function translateText(value: string, language: Language = activeLanguage): string {
  if (language === "es" || !value.trim()) return value;
  if (englishMessages[value]) return englishMessages[value];
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  const normalized = value.trim();
  if (englishMessages[normalized]) return leading + englishMessages[normalized] + trailing;
  // Translate anchored segments of dynamic labels while preserving names, counts and prices.
  const patterns: [RegExp, (match: string, tail: string) => string][] = [
    [/^Página (.+)$/, (_, count) => `Page ${count}`],
    [/^(.+) productos encontrados$/, (_, count) => `${count} products found`],
    [/^Tu pedido #(.+) se registró correctamente\.$/, (_, id) => `Your order #${id} was placed successfully.`],
    [/^✦ El brillo que va contigo, (.+)\.$/, (_, name) => `✦ Shine that goes with you, ${name}.`],
    [/^Ver (.+)$/, (_, name) => `View ${name}`],
  ];
  for (const [pattern, render] of patterns) {
    const match = normalized.match(pattern);
    if (match) return leading + render(match[0],match[1]) + trailing;
  }
  return value;
}
