type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;

class EventEmitter<T extends EventMap> {
  private listeners: {
    [K in keyof T]?: Array<(p: T[K]) => void>;
  } = {};

  on<K extends EventKey<T>>(key: K, listener: (p: T[K]) => void) {
    this.listeners[key] = (this.listeners[key] || []).concat(listener);
    return () => {
      this.listeners[key] = (this.listeners[key] || []).filter(
        (l) => l !== listener
      );
    };
  }

  off<K extends EventKey<T>>(key: K, listener: (p: T[K]) => void) {
    this.listeners[key] = (this.listeners[key] || []).filter(
      (l) => l !== listener
    );
  }

  emit<K extends EventKey<T>>(key: K, payload: T[K]) {
    (this.listeners[key] || []).forEach((listener) => {
      listener(payload);
    });
  }
}

// Define the events and their payload types
interface AppEvents {
  'permission-error': any; 
}

// Create a single instance of the event emitter
export const errorEmitter = new EventEmitter<AppEvents>();
