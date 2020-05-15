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
export class TypeDateTimeError extends DateTimeError {
    constructor(parameterName, parameterValue, message) {
        super(message);
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
    }
}
/**
 * Raised when an function receives an argument that has the right type but an
 * inappropriate value.
 */
export class ValueDateTimeError extends DateTimeError {
    /**
     * @param {string} parameterName Parameter name of the function
     * @param {*} parameterValue Passed value of the parameter
     * @param {string} message Message
     */
    constructor(parameterName, parameterValue, message) {
        super(message);
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
    }
}
