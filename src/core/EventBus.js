export class EventBus {
    constructor() {
        this.events = {};
    }
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }
    emit(eventName, data) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(callback => callback(data));
        }
    }
    off(eventName, callbackToRemove) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(
            callback => callback !== callbackToRemove
        );
    }
}
