class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
  }
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => cb(data));
  }
}
export const bus = new EventBus();
