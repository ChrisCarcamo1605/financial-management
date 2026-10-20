import { DEMO_STATE_VERSION, type DemoState } from './schema';

const STORAGE_KEY = 'caudal:demo:state';
const SAVE_DELAY_MS = 250;

/**
 * Estado del demo en memoria, persistido en el navegador del visitante.
 * Si el almacenamiento no está disponible (modo privado) el demo sigue
 * funcionando en memoria durante la sesión.
 */
export interface DemoStore {
  read(): DemoState;
  /** Aplica cambios al estado y programa su guardado. */
  write<T>(mutate: (state: DemoState) => T): T;
  /** Vuelve a los datos de ejemplo. */
  reset(): void;
}

function load(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as DemoState;
    return state.version === DEMO_STATE_VERSION ? state : null;
  } catch {
    return null;
  }
}

export function createDemoStore(seed: () => DemoState, persist = typeof window !== 'undefined'): DemoStore {
  let state = (persist && load()) || seed();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function flush() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* sin almacenamiento: el demo sigue en memoria */
    }
  }

  function save() {
    if (!persist) return;
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  }

  if (persist) save();

  return {
    read: () => state,
    write(mutate) {
      const result = mutate(state);
      save();
      return result;
    },
    reset() {
      state = seed();
      clearTimeout(timer);
      if (persist) flush();
    },
  };
}
