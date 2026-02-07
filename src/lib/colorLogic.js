
// RGB to Emotion mapping (Magnet Method)
// Based on nearest neighbor search in RGB space

export const COLOR_ANCHORS = [
  { r: 220, g: 20, b: 60, keywords: "情熱, 怒り, エネルギー, 焦り", label: "赤" },
  { r: 25, g: 25, b: 112, keywords: "静寂, 深い悲しみ, 孤独, 沈静, 冷たい雨", label: "深い青" },
  { r: 0, g: 191, b: 255, keywords: "自由, 開放感, 希望, 冷静, 空", label: "水色" },
  { r: 34, g: 139, b: 34, keywords: "癒し, 成長, 安らぎ, 調和, 自然", label: "森の緑" },
  { r: 255, g: 215, b: 0, keywords: "幸福, 輝き, 成功, 楽観, 光", label: "金" },
  { r: 138, g: 43, b: 226, keywords: "神秘, 不安, 高貴, 創造性, 魔法", label: "紫" },
  { r: 255, g: 105, b: 180, keywords: "愛情, 優しさ, 甘え, 依存, 恋", label: "ピンク" },
  { r: 255, g: 140, b: 0, keywords: "陽気, 社交的, 活発, 興奮, 太陽", label: "オレンジ" },
  { r: 128, g: 128, b: 128, keywords: "迷い, 曖昧, 中立, 不安, 曇り", label: "グレー" },
  { r: 0, g: 0, b: 0, keywords: "恐怖, 絶望, 拒絶, 終焉, 闇", label: "黒" },
  { r: 255, g: 255, b: 255, keywords: "純粋, 空白, リセット, 真実, 光", label: "白" },
  { r: 139, g: 69, b: 19, keywords: "安定, 堅実, 保守, 大地, 根", label: "茶" },
  { r: 0, g: 255, b: 127, keywords: "新しい始まり, 新鮮, 生命力, 若さ", label: "春の緑" },
  { r: 70, g: 130, b: 180, keywords: "信頼, 誠実, 知性, 落ち着き, 鋼", label: "スチール青" },
  { r: 220, g: 20, b: 147, keywords: "激しい感情, 衝動, 大胆, 挑発", label: "濃いピンク" },
  { r: 176, g: 196, b: 222, keywords: "儚さ, 記憶, 遠い過去, 淡い夢", label: "淡い青" },
  { r: 255, g: 250, b: 205, keywords: "安堵, 微かな希望, ぬくもり, 日差し", label: "レモン" },
  { r: 47, g: 79, b: 79, keywords: "重圧, 抑圧, 閉塞感, 深海", label: "ダークスレート" },
  { r: 255, g: 99, b: 71, keywords: "警告, 危険, 緊急, 注目", label: "トマト赤" },
  { r: 147, g: 112, b: 219, keywords: "直感, インスピレーション, 夢想, 霊性", label: "ラベンダー" },
];

/**
 * Calculates Euclidean distance between two RGB colors
 */
function getDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Finds the closest color anchor for a given RGB value
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {typeof COLOR_ANCHORS[0]}
 */
export function findClosestEmotionKeywords(r, g, b) {
  let minDistance = Infinity;
  let closestAnchor = COLOR_ANCHORS[0];

  for (const anchor of COLOR_ANCHORS) {
    const distance = getDistance({ r, g, b }, anchor);
    if (distance < minDistance) {
      minDistance = distance;
      closestAnchor = anchor;
    }
  }

  return closestAnchor;
}
