import assert from "node:assert/strict";
import test from "node:test";
import {
  STORAGE_KEY,
  checkStorageAvailability,
  clearTried,
  getLocalStorageSafely,
  isTried,
  loadTried,
  normalizeTried,
  saveTried,
  toggleTried,
} from "../js/state.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

test("記録は「やってみた」の番号だけを持つ", () => {
  assert.deepEqual(normalizeTried(null), []);
  assert.deepEqual(normalizeTried([3, 1, 1, "2"]), [1, 2, 3]);
  assert.deepEqual(normalizeTried([0, 31, null, "x", 1.5]), []);
  assert.deepEqual(normalizeTried({ tried: [5] }), [5]);
});

test("印は付け外しできる", () => {
  let tried = toggleTried([], 7);
  assert.deepEqual(tried, [7]);
  assert.ok(isTried(tried, 7));
  assert.ok(!isTried(tried, 8));
  tried = toggleTried(tried, 3);
  assert.deepEqual(tried, [3, 7]);
  tried = toggleTried(tried, 7);
  assert.deepEqual(tried, [3]);
  assert.deepEqual(toggleTried(tried, 99), [3]);
});

// GitHub Pages のプロジェクトサイトは kumaken-1.github.io という同じオリジンを共有する。
// そのためシリーズの全巻が同じ localStorage を見る。巻ごとにキーを分けないと記録が混ざる。
test("保存先は学級通信・学年通信版専用で、他の巻の記録を読まない", () => {
  assert.equal(STORAGE_KEY, "newsletter-ai-30-tried-v1");

  const otherVolumes = memoryStorage({
    "ai-summer-research-30-tried-v3": "[1,2,3]",
    "ai-summer-research-30-progress-v2": JSON.stringify({ steps: { 5: ["sent"] } }),
    "lesson-improve-ai-30-tried-v1": "[4,5,6]",
    "curriculum-management-ai-50-tried-v1": "[7,8,9]",
    "classroom-community-ai-30-tried-v1": "[10,11]",
  });
  assert.deepEqual(loadTried(otherVolumes), [], "他の巻の記録を引き継いでしまっている");

  assert.deepEqual(loadTried(memoryStorage({ [STORAGE_KEY]: "[1,2]" })), [1, 2]);
  assert.deepEqual(loadTried(memoryStorage({ [STORAGE_KEY]: "{" })), []);
  assert.deepEqual(loadTried(memoryStorage()), []);
});

test("保存と削除は専用のキーだけを触る", () => {
  const storage = memoryStorage({ "ai-summer-research-30-tried-v3": "[9]" });
  saveTried([2, 1, 1], storage);
  assert.equal(storage.getItem(STORAGE_KEY), "[1,2]");

  clearTried(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(
    storage.getItem("ai-summer-research-30-tried-v3"),
    "[9]",
    "他の講座の記録まで消している",
  );
});

test("保存可否の確認は既存の値を壊さない", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "[4]" });
  checkStorageAvailability(storage);
  assert.equal(storage.getItem(STORAGE_KEY), "[4]");

  const empty = memoryStorage();
  checkStorageAvailability(empty);
  assert.equal(empty.getItem(STORAGE_KEY), null);
});

test("localStorage が使えない環境でも例外を投げない", () => {
  assert.equal(getLocalStorageSafely({}), null);
  assert.equal(getLocalStorageSafely({
    get localStorage() {
      throw new Error("blocked");
    },
  }), null);
});
