// services/tts.api.ts
import { getApiErrorMessage } from "./api-error";
import { api } from "./axios";

export type TtsLang = "en" | "vi";

export async function synthesizeSpeech(
  text: string,
  lang: TtsLang = "en",
): Promise<string> {
  try {
    const { data } = await api.post("/tts/speak", { text, lang });
    const audioUrl = (data?.data ?? data)?.audioUrl;
    if (!audioUrl) throw new Error("KhÃ´ng cÃ³ audio tráº£ vá»");
    return audioUrl as string;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "KhÃ´ng táº¡o Ä‘Æ°á»£c audio phÃ¡t Ã¢m"),
    );
  }
}

const pendingSpeech = new Map<string, Promise<string>>();

/**
 * PhÃ¡t audio nhanh cho cÃ¡c nÃºt loa "fire-and-forget" Ä‘Ã£ dÃ¹ng
 * `new Audio(word.audio).play()` sáºµn trong VocabularyPage/Review â€” Æ°u
 * tiÃªn `audioUrl` cÃ³ sáºµn, náº¿u rá»—ng thÃ¬ gá»i backend TTS. Gá»™p cÃ¡c lÆ°á»£t
 * gá»i trÃ¹ng (cÃ¹ng text/lang) khi audio Ä‘ang Ä‘Æ°á»£c tá»•ng há»£p Ä‘á»ƒ trÃ¡nh
 * spam click báº¯n nhiá»u request.
 */
export async function speakWord(
  text: string,
  audioUrl?: string | null,
  lang: TtsLang = "en",
): Promise<void> {
  if (!audioUrl && !text) return;

  try {
    let url = audioUrl || undefined;

    if (!url) {
      const cacheKey = `${lang}:${text}`;
      let pending = pendingSpeech.get(cacheKey);

      if (!pending) {
        pending = synthesizeSpeech(text, lang);
        pendingSpeech.set(cacheKey, pending);
        pending.finally(() => pendingSpeech.delete(cacheKey));
      }

      url = await pending;
    }

    await new Audio(url).play();
  } catch (error) {
    console.error(error);
  }
}
