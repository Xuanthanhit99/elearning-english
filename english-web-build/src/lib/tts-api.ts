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
    if (!audioUrl) throw new Error("Không có audio trả về");
    return audioUrl as string;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Không tạo được audio phát âm"),
    );
  }
}

const pendingSpeech = new Map<string, Promise<string>>();

/**
 * Phát audio nhanh cho các nút loa "fire-and-forget" đã dùng
 * `new Audio(word.audio).play()` sẵn trong VocabularyPage/Review — ưu
 * tiên `audioUrl` có sẵn, nếu rỗng thì gọi backend TTS. Gộp các lượt
 * gọi trùng (cùng text/lang) khi audio đang được tổng hợp để tránh
 * spam click bắn nhiều request.
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
