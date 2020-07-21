/**
 * The base class of the other exceptions in this module.
 * It is a subclass of Error.
 */
export class DateTimeError extends Error {
    /**
     * @param {string} message Some error message.
     */
    constructor(message) {
        super(message);
        Object.defineProperty(this, 'name', {
            configurable: true,
            enumerable: false,
            value: this.constructor.name,
            writable: true,
        });
        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
/**
 * Raised when derived classes should override the method.
 */
export class NotImplementedDateTimeError extends DateTimeError {
    constructor() {
        super("Not implemented.");
    }
}
/**
 * Raised when an operation or function is applied to an object of
 * inappropriate type.
 */
export class TypeDateTimeError extends DateTimeError {
    constructor(message='Type error.'){
        super(message);
    }
}
/**
 * Raised when an operation or function receives an argument that has the
 * right type but an inappropriate value.
 */
export class ValueDateTimeError extends DateTimeError {
    constructor(message='Value error.') {
        super(message);
    }
}
