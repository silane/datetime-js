import {
    neg, add, sub, cmp, TimeDelta, Date, Time, DateTime
} from "./datetime.js";
import { DateTimeError, NotImplementedDateTimeError } from './errors.js';


/**
 * Base exception of other exceptions raised in dtexpr.
 */
export class DtexprDateTimeError extends DateTimeError {
    /**
     * @param {*[]} expression The expression caused this error.
     * @param {[number, number]} pos Position of the error in the expression.
     * @param {string} message Error message.
     */
    constructor(expression, pos, message) {
        super(message);
        this.expression = expression;
        this.pos = pos;
    }
    toString() {
        const [pos1, pos2] = this.pos;
        const expressionStr = this.expression.map(
            x => typeof x === 'string' ? x : '${...}').join('');
        const pos = this.expression.slice(0, pos1).map(
            x => typeof x === 'string' ? x.length : 6
        ).reduce((acc, cur) => acc + cur, 0) + pos2;
        return `[${this.constructor.name}] ${this.message}
${expressionStr}
${' '.repeat(pos)}^`;
    }
}
/**
 * Raised when there is a syntax error in dtexpr.
 */
export class SyntaxDtexprDateTimeError extends DtexprDateTimeError {
}
/**
 * Raised when there occur an error in execution phase in dtexpr, such as
 * inappropriate type passed to an operator.
 */
export class ExecutionDtexprDateTimeError extends DtexprDateTimeError {
    /**
     * @param {*[]} expression The expression caused this error.
     * @param {[number, number]} pos Position of the error in the expression.
     * @param {?Error} originalError The original error object.
     * @param {string} message Error message.
     */
    constructor(expression, pos, originalError, message) {
        super(expression, pos, message);
        this.originalError = originalError;
    }
    toString() {
        if(this.originalError) {
            return `${super.toString()}
Original Error: ${this.originalError}`;
        } else {
            return super.toString();
        }
    }
}

class Variable {
    constructor(name) {
        this.name = name;
    }
}

class Node {
    constructor(pos) {
        this.pos = pos;
    }
    execute(context) {
        throw new NotImplementedDateTimeError();
    }
}

class VariableNode extends Node {
    constructor(variableName, pos) {
        super(pos);
        this.variableName = variableName;
    }
    execute(context) {
        if(this.variableName in context.variables) {
            return context.variables[this.variableName];
        } else {
            throw new ExecutionDtexprDateTimeError(
                null, this.pos, null,
                `Varibale "${this.variableName}" is not defined in the execution context`,
            );
        }
    }
}

class NegNode extends Node {
    constructor(node, pos) {
        super(pos);
        this.node = node;
    }
    execute(context) {
        const value = this.node.execute(context);
        try {
            return neg(value);
        } catch(e) {
            if(e instanceof DateTimeError) {
                throw new ExecutionDtexprDateTimeError(
                    null, this.pos, e, 'Execution error in negation operator.'
                );
            }
            throw e;
        }
    }
}

class BinaryNode extends Node {
    constructor(lhs, rhs, pos) {
        super(pos);
        this.lhs = lhs;
        this.rhs = rhs;
    }
}
class CommonBinaryNode extends BinaryNode {
    get operatorName() {
        throw new NotImplementedDateTimeError();
    }
    operate(leftValue, rightValue) {
        throw new NotImplementedDateTimeError();
    }
    execute(context) {
        const lVal = this.lhs.execute(context);
        const rVal = this.rhs.execute(context);
        try {
            return this.operate(lVal, rVal);
        } catch(e) {
            if(e instanceof DateTimeError) {
                throw new ExecutionDtexprDateTimeError(
                    null, this.pos, e,
                    `Execution error in ${this.operatorName} operator.`,
                );
            }
            throw e;
        }
    }
}
class LesserNode extends CommonBinaryNode {
    get operatorName() {
        return 'lesser-than';
    }
    operate(leftValue, rightValue) {
        return cmp(leftValue, rightValue) < 0;
    }
}
class LesserEqualNode extends CommonBinaryNode {
    get operatorName() {
        return 'lesser-or-equal';
    }
    operate(leftValue, rightValue) {
        return cmp(leftValue, rightValue) <= 0;
    }
}
class EqualNode extends CommonBinaryNode {
    get operatorName() {
        return 'equal';
    }
    operate(leftValue, rightValue) {
        return cmp(leftValue, rightValue) == 0;
    }
}
class NotEqualNode extends CommonBinaryNode {
    get operatorName() {
        return 'not-equal';
    }
    operate(leftValue, rightValue) {
        return cmp(leftValue, rightValue) != 0;
    }
}
class GreaterNode extends CommonBinaryNode {
    get operatorName() {
        return 'greater-than';
    }
    operate(leftValue, rightValue) {
        return cmp(leftValue, rightValue) > 0;
    }
}
class GreaterEqualNode extends CommonBinaryNode {
    get operatorName() {
        return 'greater-or-equal';
    }
    operate(leftValue, rightValue) {
        return cmp(leftValue, rightValue) >= 0;
    }
}
class AddNode extends CommonBinaryNode {
    get operatorName() {
        return 'addition';
    }
    operate(leftValue, rightValue) {
        return add(leftValue, rightValue);
    }
}
class SubNode extends CommonBinaryNode {
    get operatorName() {
        return 'subtraction';
    }
    operate(leftValue, rightValue) {
        return sub(leftValue, rightValue);
    }
}


class ParsingStr {
    /**
     * @param {(string|number|!TimeDelta|!Date|!Time|!DateTime)[]} s
     */
    constructor(s) {
        this.s = s;
        this.pos1 = 0;
        this.pos2 = 0;
    }
    consumeIf(startstr) {
        if(typeof this.s[this.pos1] === 'string') {
            if(this.s[this.pos1].slice(this.pos2).startsWith(startstr)) {
                this.pos2 += startstr.length;
                if(this.pos2 >= this.s[this.pos1].length) {
                    ++this.pos1;
                    this.pos2 = 0;
                }
                return startstr;
            } else {
                return '';
            }
        } else {
            return '';
        }
    }
    consumeWhile(chars) {
        if(typeof this.s[this.pos1] === 'string') {
            let ret = '';
            for(; this.pos2 < this.s[this.pos1].length; ++this.pos2) {
                if(chars.includes(this.s[this.pos1][this.pos2]))
                    ret += this.s[this.pos1][this.pos2];
                else
                    break;
            }
            if(this.pos2 >= this.s[this.pos1].length) {
                ++this.pos1;
                this.pos2 = 0;
            }
            return ret;
        } else {
            return '';
        }
    }
    consumeIfVariable() {
        if(this.s[this.pos1] instanceof Variable) {
            return this.s[this.pos1++];
        } else {
            return null;
        }
    }
}


function whitespace(s) {
    s.consumeWhile(' \n');
}

function expr(s) {
    whitespace(s);
    const lhs = poly(s);
    const pos = [s.pos1, s.pos2];
    if(s.consumeIf('<=')) {
        whitespace(s);
        const rhs = expr(s);
        return new LesserEqualNode(lhs, rhs, pos);
    } else if(s.consumeIf('<')) {
        whitespace(s);
        const rhs = expr(s);
        return new LesserNode(lhs, rhs, pos);
    } else if(s.consumeIf('==')) {
        whitespace(s);
        const rhs = expr(s);
        return new EqualNode(lhs, rhs, pos);
    } else if(s.consumeIf('!=')) {
        whitespace(s);
        const rhs = expr(s);
        return new NotEqualNode(lhs, rhs, pos);
    } else if(s.consumeIf('>=')) {
        whitespace(s);
        const rhs = expr(s);
        return new GreaterEqualNode(lhs, rhs, pos);
    } else if(s.consumeIf('>')) {
        whitespace(s);
        const rhs = expr(s);
        return new GreaterNode(lhs, rhs, pos);
    } else {
        return lhs;
    }
}

function poly(s) {
    whitespace(s);
    const lhs = term(s);
    whitespace(s);
    const pos = [s.pos1, s.pos2];
    if(s.consumeIf('+')) {
        whitespace(s);
        const rhs = poly(s);
        return new AddNode(lhs, rhs, pos);
    } else if(s.consumeIf('-')) {
        whitespace(s);
        const rhs = poly(s);
        return new SubNode(lhs, rhs, pos);
    } else {
        return lhs;
    }
}

function term(s) {
    return negterm(s);
}

function negterm(s) {
    whitespace(s);
    const pos = [s.pos1, s.pos2];
    if(s.consumeIf('-')) {
        whitespace(s);
        const node = realexpr(s);
        return new NegNode(node, pos);
    } else {
        return realexpr(s);
    }
}

function realexpr(s) {
    whitespace(s);
    const pos = [s.pos1, s.pos2];
    if(s.consumeIf('(')) {
        whitespace(s);
        const lhs = poly(s);
        if(!s.consumeIf(')')) {
            throw new SyntaxDtexprDateTimeError(
                s.s, pos, 'Expected ")".');
        }
        return lhs;
    }
    const variable = s.consumeIfVariable();
    if(variable != null) {
        return new VariableNode(variable.name, pos);
    }
    throw new SyntaxDtexprDateTimeError(s.s, pos, 'Unexpected token.');
}


function isExpressionTokenListSame(a, b) {
    if(a.length !== b.length) return false;
    return a.map((x, i) => [x, b[i]]).every(([aToken, bToken]) => {
        if(aToken === bToken) return true;
        return (
            aToken instanceof Variable && bToken instanceof Variable
            && aToken.name === bToken.name
        );
    });
}
const expressionCache = [];

/**
 * Tagged template function to perform operations on datetime objects.
 * @param {string[]} strings Strings to be passed by tagged template.
 * @param  {...*} values Values to be passed by tagged template.
 */
export function dtexpr(strings, ...values) {
    const variables = values.map((x, i) => [new Variable(`var_${i}`), x]);
    let list = [strings[0]];
    variables.forEach((variable, i) => {
        list.push(variable[0]);
        list.push(strings[i + 1]);
    });
    list = list.filter(x => !(typeof x === 'string' && !x));

    let expression = expressionCache.find(
        x => isExpressionTokenListSame(x[0], list)
    )?.[1] ?? null;
    if(!expression) {
        expression = expr(new ParsingStr(list));
        expressionCache.push([list, expression]);
    }

    try {
        return expression.execute({ variables: Object.fromEntries(
            variables.map(x => [x[0].name, x[1]])
        )});
    } catch (e) {
        if(e instanceof ExecutionDtexprDateTimeError) {
            e.expression = list;
        }
        throw e;
    }
}
