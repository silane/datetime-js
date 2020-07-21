import {
    neg, add, sub, cmp, TimeDelta, Date, Time, DateTime
} from "./datetime.js";
import { DateTimeError, NotImplementedDateTimeError } from './errors.js';


export class DtexprDateTimeError extends DateTimeError {
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
export class SyntaxDtexprDateTimeError extends DtexprDateTimeError {
}
export class ExecutionDtexprDateTimeError extends DtexprDateTimeError {
    constructor(expression, pos, originalError, message) {
        super(expression, pos, message);
        this.originalError = originalError;
    }
    toString() {
        return `${super.toString()}
Original Error: ${this.originalError}`;
    }
}

class Node {
    constructor(pos) {
        this.pos = pos;
    }
    execute() {
        throw new NotImplementedDateTimeError();
    }
}

class ValueNode extends Node {
    constructor(value, pos) {
        super(pos);
        this.value = value;
    }
    execute() {
        return this.value;
    }
}

class NumberNode extends ValueNode {}
class TimeDeltaNode extends ValueNode {}
class DateNode extends ValueNode {}
class TimeNode extends ValueNode {}
class DateTimeNode extends ValueNode {}

class NegNode extends Node {
    constructor(node, pos) {
        super(pos);
        this.node = node;
    }
    execute() {
        const value = this.node.execute();
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
    execute() {
        const lVal = this.lhs.execute();
        const rVal = this.rhs.execute();
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
     * @param {(string|number|TimeDelta|Date|Time|DateTime)[]} s 
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
    consumeIfTimeDelta() {
        if(this.s[this.pos1] instanceof TimeDelta) {
            return this.s[this.pos1++];
        } else {
            return null;
        }
    }
    consumeIfDate() {
        if(this.s[this.pos1] instanceof Date) {
            return this.s[this.pos1++];
        } else {
            return null;
        }
    }
    consumeIfTime() {
        if(this.s[this.pos1] instanceof Time) {
            return this.s[this.pos1++];
        } else {
            return null;
        }
    }
    consumeIfDateTime() {
        if(this.s[this.pos1] instanceof DateTime) {
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
    const td = s.consumeIfTimeDelta();
    if(td != null) {
        return new TimeDeltaNode(td, pos);
    }
    const date = s.consumeIfDate();
    if(date != null) {
        return new DateNode(date, pos);
    }
    const time = s.consumeIfTime();
    if(time != null) {
        return new TimeNode(time, pos);
    }
    const dt = s.consumeIfDateTime();
    if(dt != null) {
        return new DateTimeNode(dt, pos);
    }
    throw new SyntaxDtexprDateTimeError(
        s.s, pos, 'Unexpected token.');
}


export function dtexpr(strings, ...values) {
    let list = [strings[0]];
    values.forEach((value, i) => {
        list.push(value);
        list.push(strings[i + 1]);
    });
    list = list.filter(x => !(typeof x === 'string' && !x));
    const expression = expr(new ParsingStr(list));
    try {
        return expression.execute();
    } catch (e) {
        if(e instanceof ExecutionDtexprDateTimeError) {
            e.expression = list;
        }
        throw e;
    }
}
