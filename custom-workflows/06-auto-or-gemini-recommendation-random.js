/**
 * 06. 자동 또는 Gemini 추천 번호 중 랜덤 1게임 구매
 *
 * 실행할 때마다 아래 둘 중 하나를 랜덤으로 선택합니다.
 * - 자동 구매 1게임
 * - Gemini 추천 번호 1게임
 *
 * Gemini 응답이 비어 있거나 형식이 올바르지 않으면
 * 자동 구매 1게임으로 대체합니다.
 *
 * 필요 설정:
 * - GitHub Secrets에 GEMINI_API_KEY 추가
 * - workflow yml에 아래 env 설정 추가
 *   GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
 *
 * 실행이 완료되면 구매 결과는 GitHub Issue 1개로 정리됩니다.
 */

const MODEL = 'gemini-2.5-flash';

export default async ({ purchaseAuto, purchaseManual }) => {
  console.log('=== 06-auto-or-gemini-recommendation-random.js 시작 ===');

  const mode = Math.random() < 0.5 ? 'auto' : 'gemini';
  console.log(`이번 실행의 구매 방식: ${mode}`);

  if (mode === 'auto') {
    console.log('자동 구매 1게임을 진행합니다.');
    const purchased = await purchaseAuto(1);
    console.log('자동 구매 완료:', purchased);
    return;
  }

  console.log('Gemini 추천 번호 1게임 구매를 진행합니다.');

  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY가 없어 자동 구매 1게임으로 대체합니다.');
    const purchased = await purchaseAuto(1);
    console.log('자동 구매 완료:', purchased);
    return;
  }

  try {
    const recommended = await requestGeminiNumbers();

    if (!recommended) {
      console.log('Gemini 응답을 해석하지 못해 자동 구매 1게임으로 대체합니다.');
      const purchased = await purchaseAuto(1);
      console.log('자동 구매 완료:', purchased);
      return;
    }

    console.log('Gemini 추천 번호를 사용합니다:', recommended);
    const purchased = await purchaseManual([recommended]);
    console.log('Gemini 추천 번호 구매 완료:', purchased);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Gemini 호출에 실패해 자동 구매 1게임으로 대체합니다: ${message}`);

    const purchased = await purchaseAuto(1);
    console.log('자동 구매 완료:', purchased);
  }
};

async function requestGeminiNumbers() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: '로또 번호 1게임을 추천해 주세요. 1부터 45 사이 숫자 6개를 중복 없이 골라서 쉼표로만 답변해 주세요. 예: 3, 7, 12, 23, 31, 42'
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API 요청 실패 (${response.status})`);
  }

  const data = await response.json();
  const text =
    data.candidates
      ?.flatMap(candidate => candidate.content?.parts ?? [])
      .map(part => part.text ?? '')
      .join('\n') ?? '';

  console.log('Gemini 응답:', text);

  return parseRecommendedNumbers(text);
}

function parseRecommendedNumbers(text) {
  const numbers = text
    .match(/\d+/g)
    ?.map(Number)
    .filter(num => num >= 1 && num <= 45);

  if (!numbers) {
    return null;
  }

  const uniqueNumbers = [...new Set(numbers)].slice(0, 6).sort((a, b) => a - b);

  if (uniqueNumbers.length !== 6) {
    return null;
  }

  return uniqueNumbers;
}
