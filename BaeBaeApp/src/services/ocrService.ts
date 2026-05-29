import * as FileSystem from 'expo-file-system/legacy';

// Google Cloud Vision API 키 — Cloud Console에서 발급 후 입력
// https://console.cloud.google.com → API 및 서비스 → Vision API 활성화
export const GOOGLE_VISION_API_KEY = 'AIzaSyAd9jwhaifbGCXn7EmcwFl_3IKd812sX4Q';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// 한국 영수증 금액 패턴 (우선순위 순)
const AMOUNT_PATTERNS = [
  /(?:합계|결제금액|총금액|승인금액|실결제|청구금액)[^\d]*(\d[\d,]+)/,
  /₩\s*(\d[\d,]+)/,
  /(\d[\d,]+)\s*원/,
];

export async function extractAmountFromImage(imageUri: string): Promise<number | null> {
  if (!GOOGLE_VISION_API_KEY) return null;

  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
    });

    const data = await response.json();
    const text: string = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
    if (!text) return null;

    // 패턴 매칭으로 금액 추출
    for (const pattern of AMOUNT_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ''), 10);
        if (amount > 0) return amount;
      }
    }

    // fallback: 100원~1000만원 범위 숫자 중 최대값
    const numbers = text.match(/\d[\d,]+/g) ?? [];
    const candidates = numbers
      .map(n => parseInt(n.replace(/,/g, ''), 10))
      .filter(n => n >= 100 && n <= 10_000_000);

    return candidates.length > 0 ? Math.max(...candidates) : null;
  } catch {
    return null;
  }
}
