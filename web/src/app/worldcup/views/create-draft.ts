export type SavedCreateDraft = {
  title: string;
  description: string;
  items: Array<{ id: number; name: string; file: File | null }>;
};

let writes: Promise<unknown> = Promise.resolve();

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pickon-editor", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(key: string, value?: SavedCreateDraft | null) {
  const db = await database();
  try {
    return await new Promise<SavedCreateDraft | undefined>(
      (resolve, reject) => {
        const transaction = db.transaction(
          "drafts",
          value === undefined ? "readonly" : "readwrite",
        );
        const store = transaction.objectStore("drafts");
        const request =
          value === undefined
            ? store.get(key)
            : value === null
              ? store.delete(key)
              : store.put(value, key);
        transaction.oncomplete = () =>
          resolve(value === undefined ? request.result : undefined);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      },
    );
  } finally {
    db.close();
  }
}

export async function readCreateDraft(key: string) {
  await writes.catch(() => undefined);
  return transact(key);
}

export function writeCreateDraft(key: string, value: SavedCreateDraft | null) {
  const next = writes.catch(() => undefined).then(() => transact(key, value));
  writes = next;
  return next;
}

export function splitDescription(value: string | null) {
  const description = value ?? "";
  const sourcePattern =
    /(?:\r?\n)?[ \t]*사진\s*출처\s*[·ㆍ/]?\s*라이선스\s*:\s*(https?:\/\/\S+)/gu;
  const sources = [...description.matchAll(sourcePattern)].map(
    (match) => match[1],
  );
  return {
    summary: description.replace(sourcePattern, "").trim(),
    sources: [...new Set(sources)],
  };
}
