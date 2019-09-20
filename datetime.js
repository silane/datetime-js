export const MINYEAR = 1
export const MAXYEAR = 9999


export class DateTimeError extends Error {
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
export class ValueDateTimeError extends DateTimeError {
    constructor(parameterName, parameterValue, message) {
        super(message);
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
    }
}
export class RangeDateTimeError extends ValueDateTimeError {
}


const stdDate = Function('return this')().Date;

// "stdDate.UTC" converts years between 0 and 99 to a year in the 20th century.
// Usually it can be avoided just adding setUTCFullYear(year)
// after constructing the "stdDate" instance.
// Buf if the parameters from month to milliseconds are outside of their
// range, year can be updated to accommodate these values.
// In this case, below function must be used.
function safeStdDateUTC(year, month, day, hour, minute, second, millisecond) {
    const d = new stdDate();
    d.setUTCFullYear(year);
    d.setUTCMonth(month - 1);
    d.setUTCDate(day);
    d.setUTCHours(hour);
    d.setUTCMinutes(minute);
    d.setUTCSeconds(second);
    d.setUTCMilliseconds(millisecond);
    return d;
}


const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const leapedDaysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


const totalDaysPerMonth = (function() {
    let sum = 0
    const ret = daysPerMonth.map(x => sum += x)
    ret.unshift(0)
    return ret
})()
const totalLeapedDaysPerMonth = (function() {
    let sum = 0
    const ret = leapedDaysPerMonth.map(x => sum += x)
    ret.unshift(0)
    return ret
})()


function divmod(a, b) {
    const quotient = Math.floor(a / b)
    return [quotient, a - quotient * b]
}


function zeroPad(integer, length) {
    return integer.toString().padStart(length, '0')
}


// "timeDelta" must be "TimeDelta({hours: -24}) < timeDelta < 
// TimeDelta({hours: 24})"
function toOffsetString(timeDelta) {
    let offset = timeDelta
    const minus = offset.days < 0 
    if(minus) {
        offset = neg(offset)
    }
    
    const seconds = offset.seconds % 60
    const totalMinutes = Math.floor(offset.seconds / 60)
    const minutes = zeroPad(totalMinutes % 60, 2)
    const hours = zeroPad(Math.floor(totalMinutes / 60), 2)

    let ret = `${minus ? '-' : '+'}${hours}:${minutes}`
    if(offset.microseconds) {
        ret += `:${zeroPad(seconds, 2)}.${zeroPad(offset.microseconds, 6)}`
    } else if (seconds) {
        ret += `:${zeroPad(seconds, 2)}`
    }
    return ret
}


function isLeapYear(year) {
    if(year % 4 !== 0)
        return false
    if(year % 100 === 0 && year % 400 !==0)
        return false
    return true
}


function strftime(dt, format) {
    const a = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const A = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
               'Saturday', 'Sunday']
    const b = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const B = ['January', 'February', 'March', 'April',
               'May', 'June','July', 'August',
               'September', 'October', 'November', 'December']

    let ret = ''
    for(let i=0; i < format.length; ++i) {
        if(format[i] !== '%' || i + 1 >= format.length) {
            ret += format[i]
            continue
        }
        let s
        switch(format[i + 1]) {
            case 'a': s = a[dt.weekday()]
            break
            case 'A': s = A[dt.weekday()]
            break
            case 'w': s = ((dt.weekday() + 1) % 7).toString()
            break
            case 'd': s = zeroPad(dt.day, 2)
            break
            case 'b': s = b[dt.month - 1]
            break
            case 'B': s = B[dt.month - 1]
            break
            case 'm': s = zeroPad(dt.month, 2)
            break
            case 'y': s = zeroPad(dt.year % 100, 2)
            break
            case 'Y': s = zeroPad(dt.year, 4)
            break
            case 'H': s = zeroPad(dt.hour, 2)
            break
            case 'I': s = zeroPad(dt.hour % 12, 2)
            break
            case 'p': s = dt.hour < 12 ? 'AM' : 'PM'
            break
            case 'M': s = zeroPad(dt.minute, 2)
            break
            case 'S': s = zeroPad(dt.second, 2)
            break
            case 'f': s = zeroPad(dt.microsecond, 6)
            break
            case 'z':
                const offset = dt.utcOffset();
                if(offset == null) s = '';
                else s = toOffsetString(offset).replace(':', '');
                break;
            case 'Z':
                const tzName = dt.tzName();
                if(tzName == null) s = '';
                else s = tzName;
                break;
            case '%': s = '%'
            break;
        }
        ret += s
        ++i
    }
    return ret
}


export class TimeDelta {
    constructor({
            days=0, seconds=0, microseconds=0,
            milliseconds=0, minutes=0, hours=0, weeks=0}={}) {
        
        microseconds += milliseconds * 1000
        seconds += minutes * 60
        seconds += hours * 3600
        days += weeks * 7

        let div, mod;
        [div, mod] = divmod(microseconds, 1000 ** 2)
        microseconds = mod
        seconds += div;
        
        [div, mod] = divmod(seconds, 3600 * 24)
        seconds = mod
        days += div

        if(days >= 1000000000 || days <= -1000000000)
            throw new RangeDateTimeError();

        this._days = days
        this._seconds = seconds
        this._microseconds = microseconds
    }

    get days() { return this._days }
    get seconds() { return this._seconds }
    get microseconds() { return this._microseconds }
    
    totalSeconds() {
        return this.days * 3600 * 24 + this.seconds + this.microseconds / (1000 ** 2)
    }

    toString() {
        let ret = ''
        if(this.days) {
            ret += `${this.days} day(s), `
        }
        const totalMinutes = Math.floor(this.seconds / 60)
        ret += `${Math.floor(totalMinutes / 60)}:${zeroPad(totalMinutes % 60, 2)}:` +
               `${zeroPad(this.seconds % 60, 2)}`
        if(this.microseconds) {
            ret += `.${zeroPad(this.microseconds, 6)}`
        }
        return ret
    }

    valueOf() {
        return this.totalSeconds()
    }
}
TimeDelta.min = new TimeDelta({days: -999999999});
TimeDelta.max = new TimeDelta({days: 999999999, hours: 23, minutes: 59,
                               seconds: 59, microseconds: 999999});
TimeDelta.resolution = new TimeDelta({microseconds: 1});


export class Date {
    constructor(year, month, day) {
        if(year < MINYEAR || year > MAXYEAR)
            throw new RangeDateTimeError(
                'year', year, '"year" should be between "MINYEAR" and "MAXYEAR"')
        if(month < 1 || month > 12)
            throw new RangeDateTimeError(
                'month', month, '"month" should be between 1 and 12')
        if(day < 1 || day > (
                isLeapYear(year) ?
                leapedDaysPerMonth[month - 1] : daysPerMonth[month - 1]))
            throw new RangeDateTimeError(
                'day', day, 'Invalid day for the year and month')

        this._year = year
        this._month = month
        this._day = day
    }

    get year() { return this._year }
    get month() { return this._month }
    get day() { return this._day }

    static fromStdDate(d, utc=false) {
        if(!utc)
            return new Date(
                d.getFullYear(), d.getMonth() + 1, d.getDate())
        else
            return new Date(
                d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    }

    static today() {
        const today = new stdDate()
        return Date.fromStdDate(today)
    }

    static fromOrdinal(ordinal) {
        let q, r;
        let year = 1 ,month = 1, day = 1;
        [q, r] = divmod(ordinal - 1, 365 * 303 + 366 * 97);
        year += q * 400;
        [q, r] = divmod(r, 365 * 76 + 366 * 24);
        year += q * 100;
        [q, r] = divmod(r, 365 * 3 + 366 * 1);
        year += q * 4;
        [q, r] = divmod(r, 365);
        if(q <= 2) {
            // not a leap year
            year += q;
            for(month = 1; month <= 12 && r >= totalDaysPerMonth[month];
                ++month);
            day += r - totalDaysPerMonth[month - 1];
        } else {
            // leap year
            year += 3;
            if(q === 4) r += 365;
            for(month = 1; month <= 12 && r >= totalLeapedDaysPerMonth[month];
                ++month);
            day += r - totalLeapedDaysPerMonth[month - 1];
        }
        return new Date(year, month, day);
    }

    static fromISOFormat(dateString) {
        const match = /^(\d\d\d\d)-(\d\d)-(\d\d)$/.exec(dateString);
        if(match == null)
            throw new ValueDateTimeError('dateString', dateString,
                                         'invalid format');
        const [year, month, day] = match.slice(1).map(Number);
        return new Date(year, month, day);
    }

    toStdDate(utc=false) {
        let ret;
        if(!utc) {
            ret = new stdDate(this.year, this.month - 1, this.day);
            ret.setFullYear(this.year);
        } else {
            ret = new stdDate(stdDate.UTC(this.year, this.month - 1, this.day));
            ret.setUTCFullYear(this.year);
        }
        return ret;
    }

    replace({year, month, day}) {
        if(year === undefined) year = this.year;
        if(month === undefined) month = this.month;
        if(day === undefined) day = this.day;
        return new Date(year, month, day);
    }

    toOrdinal() {
        let totalDays = 0

        const lastYear = this.year - 1
        const nLeapYear = Math.floor(lastYear / 4) -
            Math.floor(lastYear / 100) + Math.floor(lastYear / 400)
        totalDays += nLeapYear * 366 + (lastYear - nLeapYear) * 365

        if(isLeapYear(this.year)) {
            totalDays += totalLeapedDaysPerMonth[this.month - 1]
        } else {
            totalDays += totalDaysPerMonth[this.month - 1]
        }
        
        totalDays += this.day

        return totalDays
    }

    weekday() {
        return (this.toStdDate().getDay() + 6) % 7
    }

    isoFormat() {
        return `${zeroPad(this.year, 4)}-${zeroPad(this.month, 2)}-${zeroPad(this.day, 2)}`
    }

    strftime(format) {
        // TODO: If format contains hour, minute, second or microsecond code,
        //       behavior is undefined.
        return strftime(this, format)
    }

    toString() {
        return this.isoFormat()
    }

    valueOf() {
        return this.toOrdinal();
    }
}
Date.min = new Date(MINYEAR, 1, 1);
Date.max = new Date(MAXYEAR, 12, 31);
Date.resolution = new TimeDelta({days: 1});


export class TZInfo {
    utcOffset(dt) {
        throw new NotImplementedDateTimeError()
    }

    dst(dt) {
        throw new NotImplementedDateTimeError()
    }

    tzName(dt) {
        throw new NotImplementedDateTimeError()
    }

    fromUTC(dt) {
        if(dt.tzInfo !== this) {
            throw new ValueDateTimeError('dt', dt)
        }
        let dtoff = dt.utcOffset()
        let dtdst = dt.dst()
        if(dtoff == null || dtdst == null) {
            throw new ValueDateTimeError('dt', dt)
        }
        const delta = sub(dtoff, dtdst)
        if(cmp(delta, new TimeDelta()) !== 0) {
            dt = add(dt, delta)
            dtdst = td.dst()
        }
        if(dtdst == null)
            return dt
        else
            return add(dt, dtdst)
    }
}


export class TimeZone extends TZInfo {
    constructor(offset, name=null) {
        super()
        if(!(cmp(new TimeDelta({hours: -24}), offset) < 0 &&
           cmp(offset, new TimeDelta({hours: 24})) < 0))
            throw new RangeDateTimeError(
                'offset', offset,
                '"offset" must be "TimeDelta({hours: -24}) < offset < ' + 
                'TimeDelta({hours: 24})".')
        
        if(name == null) {
            name = 'UTC'
            if(cmp(offset, new TimeDelta()) != 0 ) {
                name += toOffsetString(offset)
            }
        }
        this._offset = offset
        this._name = name
    }

    utcOffset(dt) {
        return this._offset
    }

    tzName(dt) {
        return this._name
    }

    dst(dt) {
        return null
    }

    fromUTC(dt) {
        if(dt.tzInfo !== this) {
            throw new ValueDateTimeError(
                'dt', dt, '"dt.tzInfo" must be same instance as "this".')
        }
        return add(dt, this._offset)
    }
}
TimeZone.utc =  new TimeZone(new TimeDelta({}));


export const LOCALTZINFO = new (class extends TZInfo {
    constructor() {
        super()
        const stdOffset = -new stdDate(2000, 0, 1).getTimezoneOffset()
        this._stdOffset = new TimeDelta({minutes: stdOffset})
    }
    utcOffset(dt) {
        if(dt == null)
            return this._stdOffset
        const offset = -dt.toStdDate(false).getTimezoneOffset()

        return new TimeDelta({minutes: offset})
    }
    dst(dt) {
        if(dt == null)
            return new TimeDelta()
        let offset = -dt.toStdDate(false).getTimezoneOffset()
        offset = new TimeDelta({minutes: offset})
        return sub(offset, this._stdOffset)
    }
    tzName(dt) {
        const offset = this.utcOffset(dt)
        return toOffsetString(offset)
    }
    fromUTC(dt) {
        if(dt.tzInfo !== this)
            throw new ValueDateTimeError(
                'dt', dt, '"dt.tzInfo" must be same instance as "this".')
        
        const local = DateTime.fromStdDate(dt.toStdDate(true), false).replace({
            microsecond: dt.microsecond, tzInfo: this, fold: 0})
        return local
    }
})()


export class Time {
    constructor(hour=0, minute=0, second=0, microsecond=0, tzInfo=null, fold=0) {
        if(hour < 0 || hour >= 24)
            throw new RangeDateTimeError(
                'hour', hour, '"hour" should be between 0 and 23.')
        if(minute < 0 || minute >= 60)
            throw new RangeDateTimeError(
                'minute', minute, '"minute" should be between 0 and 59.')
        if(second < 0 || second >= 60)
            throw new RangeDateTimeError(
                'second', second, '"second" should be between 0 and 59.')
        if(microsecond < 0 || microsecond >= 1000000)
            throw new RangeDateTimeError(
                'microsecond', microsecond, '"microsecond" should be between 0 and 999999.')
        if(fold !== 0 && fold !== 1)
            throw new RangeDateTimeError(
                'fold', fold, '"fold" should be 0 or 1.')
        this._hour = hour
        this._minute = minute
        this._second = second
        this._microsecond = microsecond
        this._tzInfo = tzInfo
        this._fold = fold
    }

    get hour() { return this._hour }
    get minute() { return this._minute }
    get second() { return this._second }
    get microsecond() { return this._microsecond }
    get tzInfo() { return this._tzInfo }
    get fold() { return this._fold }

    static fromISOFormat(timeString) {
        function parseTimeString(str) {
            const match = /^(\d\d)(?:\:(\d\d)(?:\:(\d\d)(?:\.(\d{3})(\d{3})?)?)?)?$/.exec(str)
            if(match == null)
                return null
            match.splice(0, 1)
            const ret = match.map(x => x == null ? 0 : parseInt(x, 10))
            ret[3] = ret[3] * 1000 + ret[4]
            ret.splice(4, 1)
            return ret
        }

        let sepIdx = timeString.search(/[+-]/)
        if(sepIdx === -1)
            sepIdx = timeString.length
        const timeStr = timeString.slice(0, sepIdx)
        const offsetStr = timeString.slice(sepIdx + 1)

        const timeArray = parseTimeString(timeStr)
        if(timeArray == null)
            throw new ValueDateTimeError(
                'timeString', timeString, 'invalid format')

        let tzInfo = null
        if(offsetStr !== '') {
            const offsetArray = parseTimeString(offsetStr)
            if(offsetArray == null) {
                throw new ValueDateTimeError(
                    'timeString', timeString, 'invalid format')
            }
            let offset = new TimeDelta({
                hours: offsetArray[0],
                minutes: offsetArray[1],
                seconds: offsetArray[2],
                microseconds: offsetArray[3],
            })
            if(timeString[sepIdx] === '-')
                offset = neg(offset)
            tzInfo = new TimeZone(offset)
        }

        return new Time(
            timeArray[0], timeArray[1], timeArray[2], timeArray[3], tzInfo)
    }

    replace({hour, minute, second, microsecond, tzInfo, fold}) {
        // we have to distinguish null and undefined because tzInfo may be null
        if(hour === undefined) hour = this.hour
        if(minute === undefined) minute = this.minute
        if(second === undefined) second = this.second
        if(microsecond === undefined) microsecond = this.microsecond
        if(tzInfo === undefined) tzInfo = this.tzInfo
        if(fold === undefined) fold = this.fold
        return new Time(hour, minute, second, microsecond, tzInfo, fold)
    }

    isoFormat(timeSpec='auto') {
        if(timeSpec === 'auto') {
            timeSpec = this.microsecond ? 'microseconds' : 'seconds'
        }

        let ret = ''
        switch(timeSpec) {
            case 'microseconds':
            case 'milliseconds':
            if(timeSpec === 'microseconds')
                ret = zeroPad(this.microsecond, 6) + ret
            else
                ret = zeroPad(Math.floor(this.microsecond / 1000), 3) + ret
            ret = '.' + ret
            case 'seconds':
            ret = ':' + zeroPad(this.second, 2) + ret
            case 'minutes':
            ret = ':' + zeroPad(this.minute, 2) + ret
            case 'hours':
            ret = zeroPad(this.hour, 2) + ret
            break
            default:
            throw new ValueDateTimeError(
                'timeSpec', timeSpec,
                '"timeSpec" should be either "auto", "microseconds", "milliseconds", ' +
                '"seconds", "minutes" or "hours"')
        }

        const offset = this.utcOffset()
        if(offset != null) {
            ret += toOffsetString(offset)
        }
        return ret
    }

    utcOffset() {
        return this.tzInfo == null ? null : this.tzInfo.utcOffset(null)
    }

    dst() {
        return this.tzInfo == null ? null : this.tzInfo.dst(null)
    }

    tzName() {
        return this.tzInfo == null ? null : this.tzInfo.tzName(null)
    }

    strftime(format) {
        // TODO: If format contains year, month or day code,
        //       behavior is undefined.
        return strftime(this, format)
    }

    toString() {
        return this.isoFormat()
    }
}
Time.min = new Time(0, 0, 0, 0);
Time.max = new Time(23, 59, 59, 999999);
Time.resolution = new TimeDelta({microseconds: 1});


export class DateTime extends Date {
    constructor(year, month, day, hour=0, minute=0, second=0, microsecond=0,
                tzInfo=null, fold=0) {
        super(year, month, day)
        if(hour < 0 || hour >= 24)
            throw new RangeDateTimeError(
                'hour', hour, '"hour" should be between 0 and 23.')
        if(minute < 0 || minute >= 60)
            throw new RangeDateTimeError(
                'minute', minute, '"minute" should be between 0 and 59.')
        if(second < 0 || second >= 60)
            throw new RangeDateTimeError(
                'second', second, '"second" should be between 0 and 59.')
        if(microsecond < 0 || microsecond >= 1000000)
            throw new RangeDateTimeError(
                'microsecond', microsecond, '"microsecond" should be between 0 and 999999.')
        if(fold !== 0 && fold !== 1)
            throw new RangeDateTimeError(
                'fold', fold, '"fold" should be 0 or 1.')
        this._hour = hour
        this._minute = minute
        this._second = second
        this._microsecond = microsecond
        this._tzInfo = tzInfo
        this._fold = fold
    }

    get hour() { return this._hour }
    get minute() { return this._minute }
    get second() { return this._second }
    get microsecond() { return this._microsecond }
    get tzInfo() { return this._tzInfo }
    get fold() { return this._fold }

    static fromStdDate(d, utc=false) {
        if(!utc)
            return new DateTime(
                d.getFullYear(), d.getMonth() + 1, d.getDate(),
                d.getHours(), d.getMinutes(), d.getSeconds(),
                d.getMilliseconds() * 1000)
        else
            return new DateTime(
                d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
                d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),
                d.getUTCMilliseconds() * 1000)
    }

    static today() {
        return DateTime.fromStdDate(new stdDate())
    }

    static now(tz=null) {
        if(tz == null)
            return DateTime.today()
        return tz.fromUTC(DateTime.utcNow().replace({tzInfo: tz}))
    }

    static utcNow() {
        return DateTime.fromStdDate(new stdDate(), true)
    }

    static fromTimeStamp(timeStamp, tz=null) {
        if(tz == null)
            return DateTime.fromStdDate(new stdDate(timeStamp * 1000))
        return tz.fromUTC(
            DateTime.utcFromTimeStamp(timeStamp).replace({tzInfo: tz}))
    }

    static utcFromTimeStamp(timeStamp) {
        return DateTime.fromStdDate(new stdDate(timeStamp * 1000), true)
    }

    static combine(date, time, tzInfo=undefined) {
        if(tzInfo === undefined)
            tzInfo = time.tzInfo
        return new DateTime(
            date.year, date.month, date.day,
            time.hour, time.minute, time.second, time.microsecond,
            tzInfo, time.fold)
    }

    static fromISOFormat(dateString) {
        const dateStr = dateString.slice(0, 10);
        const timeStr = dateString.slice(11);
        return DateTime.combine(Date.fromISOFormat(dateStr),
                                Time.fromISOFormat(timeStr));
    }
    
    toStdDate(utc=false) {
        let ret;
        if(!utc) {
            ret = new stdDate(
                this.year, this.month - 1, this.day,
                this.hour, this.minute, this.second, this.microsecond / 1000);
            ret.setFullYear(this.year);
        } else {
            ret = new stdDate(stdDate.UTC(
                this.year, this.month - 1, this.day,
                this.hour, this.minute, this.second, this.microsecond / 1000));
            ret.setUTCFullYear(this.year);
        }
        return ret;
    }

    date() {
        return new Date(this.year, this.month, this.day)
    }

    time() {
        return new Time(this.hour, this.minute, this.second, this.microsecond,
                        null, this.fold)
    }

    timetz() {
        return new Time(this.hour, this.minute, this.second, this.microsecond,
                        this.tzInfo, this.fold)
    }

    replace({year, month, day, hour, minute, second, microsecond, tzInfo, fold}) {
        const newDate = super.replace({year, month, day})
        // we have to distinguish null and undefined becase tzInfo may be null
        if(hour === undefined) hour = this.hour
        if(minute === undefined) minute = this.minute
        if(second === undefined) second = this.second
        if(microsecond === undefined) microsecond = this.microsecond
        if(tzInfo === undefined) tzInfo = this.tzInfo
        if(fold === undefined) fold = this.fold
        return new DateTime(newDate.year, newDate.month, newDate.day,
                            hour, minute, second, microsecond, tzInfo, fold)
    }

    asTimeZone(tz=null) {
        if(this.tzInfo === tz) return this
        const offset = this.utcOffset()
        if(offset == null && tz == null) return this
        let utc
        if(offset == null) {
            const local = this.replace({tzInfo: LOCALTZINFO});
            utc = sub(local, local.utcOffset())
        } else {
            utc = sub(this, offset)
        }
        const tmpTZ = tz != null ? tz : LOCALTZINFO;
        const ret = tmpTZ.fromUTC(utc.replace({tzInfo: tmpTZ}))
        return ret.replace({tzInfo: tz});
    }

    utcOffset() {
        return this.tzInfo == null ? null : this.tzInfo.utcOffset(this)
    }

    dst() {
        return this.tzInfo == null ? null : this.tzInfo.dst(this)
    }

    tzName() {
        return this.tzInfo == null ? null : this.tzInfo.tzName(this)
    }

    timeStamp() {
        let dt = this
        if(this.utcOffset() == null) {
            dt = this.replace({tzInfo: LOCALTZINFO})
        }
        return sub(dt, new DateTime(
            1970, 1, 1, 0, 0, 0, 0, TimeZone.utc)).totalSeconds()
    }

    isoFormat(sep='T', timespec='auto') {
        return this.date().isoFormat() + sep +
               this.timetz().isoFormat(timespec)
    }

    strftime(format) {
        return strftime(this, format)
    }

    toString() {
        return this.isoFormat(' ')
    }

    valueOf() {
        return this.timeStamp()
    }
}
DateTime.min = new DateTime(MINYEAR, 1, 1)
DateTime.max = new DateTime(MAXYEAR, 12, 31, 23, 59, 59, 999999);
DateTime.resolution = new TimeDelta({microseconds: 1});


export function add(a, b) {
    function date_plus_timedelta(d, td) {
        d = d.toStdDate()
        d.setDate(d.getDate() + td.days)
        return Date.fromStdDate(d)
    }

    function datetime_plus_timedelta(dt, td) {
        const microseconds = divmod(dt.microsecond + td.microseconds, 1000)
        const d = safeStdDateUTC(
            dt.year, dt.month, dt.day + td.days, dt.hour, dt.minute,
            dt.second + td.seconds, microseconds[0])
        const ret = DateTime.fromStdDate(d, true).replace({
            tzInfo: dt.tzInfo,
        })
        return ret.replace({microsecond: ret.microsecond + microseconds[1]})
    }

    if(a instanceof TimeDelta && b instanceof TimeDelta) {
        return new TimeDelta({
            days: a.days + b.days,
            seconds: a.seconds + b.seconds,
            microseconds: a.microseconds + b.microseconds,
        })
    }
    if(a instanceof DateTime && b instanceof TimeDelta) {
        return datetime_plus_timedelta(a, b)
    }
    if(a instanceof TimeDelta && b instanceof DateTime) {
        return datetime_plus_timedelta(b, a)
    }
    if(a instanceof Date && b instanceof TimeDelta) {
        return date_plus_timedelta(a, b)
    }
    if(a instanceof TimeDelta && b instanceof Date) {
        return date_plus_timedelta(b, a)
    }
    throw new TypeError('Cannot add these two types.')
}


export function sub(a, b) {
    if(a instanceof TimeDelta && b instanceof TimeDelta) {
        return new TimeDelta({
            days: a.days - b.days,
            seconds: a.seconds - b.seconds,
            microseconds: a.microseconds - b.microseconds,
        })
    }
    if(a instanceof DateTime && b instanceof TimeDelta) {
        const microseconds = divmod(a.microsecond - b.microseconds, 1000)
        const d = safeStdDateUTC(
            a.year, a.month, a.day - b.days, a.hour, a.minute,
            a.second - b.seconds, microseconds[0])
        const ret = DateTime.fromStdDate(d, true).replace({
            tzInfo: a.tzInfo,
        })
        return ret.replace({microsecond: ret.microsecond + microseconds[1]})
    }
    if(a instanceof DateTime && b instanceof DateTime) {
        const aOffset = a.utcOffset()
        const bOffset = b.utcOffset()
        if(!(aOffset == null && bOffset == null) &&
           a.tzInfo !== b.tzInfo) {
            if(aOffset == null || bOffset == null)
                throw new TypeError(
                    'Cannot subtract naive "DateTime" and aware "DateTime"')
            a = sub(a, aOffset)
            b = sub(b, bOffset)
        }
        const days = a.toOrdinal() - b.toOrdinal()
        return new TimeDelta({
            days: days, hours: a.hour - b.hour, minutes: a.minute - b.minute,
            seconds: a.second - b.second,
            microseconds: a.microsecond - b.microsecond})
    }
    if(a instanceof Date && b instanceof TimeDelta) {
        const d = a.toStdDate(true)
        d.setDate(d.getDate() - b.days)
        return Date.fromStdDate(d, true)
    }
    if(a instanceof Date && b instanceof Date) {
        return new TimeDelta({days: a.toOrdinal() - b.toOrdinal()})
    }
    throw new TypeError('Cannnot subtract these two types.')
}


export function neg(a) {
    if(a instanceof TimeDelta) {
        return new TimeDelta({
            days: -a.days,
            seconds: -a.seconds,
            microseconds: -a.microseconds,
        })
    }
    throw new TypeError('Cannot negate this type.')
}


export function cmp(a, b) {
    function _comp(a, b) {
        if(a === b) return 0
        if(a > b) return 1
        if(a < b) return -1
        throw new TypeError()
    }

    function subtractTimeDeltaFromTime(time, timeDelta) {
        const totalMicroseconds = time.microsecond - timeDelta.microseconds;
        const totalSeconds = time.second + 
            time.minute * 60 + time.hour * 3600 - timeDelta.seconds;

        let [q, r] = divmod(totalMicroseconds, 1000000);
        const microsecond = r;
        [q, r] = divmod(totalSeconds + q, 60);
        const second = r;
        [q, r] = divmod(q, 60);
        const minute = r;
        [q, r] = divmod(q, 24);
        const hour = r;
        return new Time(hour, minute, second, microsecond, null, time.fold);
    }


    if(a instanceof TimeDelta && b instanceof TimeDelta) {
        let c = _comp(a.days, b.days)
        if(c) return c
        c = _comp(a.seconds, b.seconds)
        if(c) return c
        c = _comp(a.microseconds, b.microseconds)
        return c
    }
    if(a instanceof DateTime && b instanceof DateTime) {
        const aOffset = a.utcOffset()
        const bOffset = b.utcOffset()
        if(!(aOffset == null && bOffset == null) &&
           a.tzInfo !== b.tzInfo) {
            if(aOffset == null || bOffset == null)
                throw new TypeError(
                    'Cannot compare naive "DateTime" to aware "DateTime"')
            a = sub(a, aOffset)
            b = sub(b, bOffset)
        }

        let c = _comp(a.year, b.year)
        if(c) return c
        c = _comp(a.month, b.month)
        if(c) return c
        c = _comp(a.day, b.day)
        if(c) return c
        c = _comp(a.hour, b.hour)
        if(c) return c
        c = _comp(a.minute, b.minute)
        if(c) return c
        c = _comp(a.second, b.second)
        if(c) return c
        c = _comp(a.microsecond, b.microsecond)
        if(c) return c
        c = _comp(a.fold, b.fold)
        return c
    }
    if(a instanceof Date && b instanceof Date) {
        return _comp(a.toOrdinal(), b.toOrdinal())
    }

    if(a instanceof Time && b instanceof Time) {
        const aOffset = a.utcOffset()
        const bOffset = b.utcOffset()
        if(!(aOffset == null && bOffset == null) &&
           a.tzInfo !== b.tzInfo) {
            if(aOffset == null || bOffset == null)
                throw new TypeError(
                    'Cannot compare naive "Time" object to aware "Time" object')
            a = subtractTimeDeltaFromTime(a, aOffset)
            b = subtractTimeDeltaFromTime(b, bOffset)
        }

        let c = _comp(a.hour, b.hour)
        if(c) return c
        c = _comp(a.minute, b.minute)
        if(c) return c
        c = _comp(a.second, b.second)
        if(c) return c
        c = _comp(a.microsecond, b.microsecond)
        if(c) return c
        c = _comp(a.fold, b.fold)
        return c
    }
    throw new TypeError('Cannot compare these two types.')
}
