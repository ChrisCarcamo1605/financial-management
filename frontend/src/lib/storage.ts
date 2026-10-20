/** localStorage tolerante a fallos (modo privado, cuota, JSON corrupto). */
export const storage = {
  read<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  write(key: string, value: unknown) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* sin almacenamiento: las preferencias siguen en memoria y en la API */
    }
  },
};
