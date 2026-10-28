// Browser preview: secrets stay in memory, never in localStorage/AsyncStorage.
// Metro selects storage.native.ts for Android/iOS.
export interface SecretStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
const values = new Map<string, string>();
export const secrets: SecretStorage = {
  get: async (key) => values.get(key) ?? null,
  set: async (key, value) => {
    values.set(key, value);
  },
  remove: async (key) => {
    values.delete(key);
  },
};
