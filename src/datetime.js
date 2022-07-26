import {
    NotImplementedDateTimeError, TypeDateTimeError, ValueDateTimeError,
} from './errors.js';


/**
 * The smallest year number allowed in a date or datetime object.
 */
export const MINYEAR = 1
/**
 * The largest year number allowed in a date or datetime object.
 */
export const MAXYEAR = 9999


const stdDate = globalThis.Date;


/**
 * "stdDate.UTC" converts years between 0 and 99 to a year in the 20th century.
 * Usually it can be avoided just adding setUTCFullYear(year)
 * after constructing the "stdDate" instance.
 * Buf if the parameters from month to milliseconds are outside of their
 * range, year can be updated to accommodate these values.
 * In this case, this function must be used.

 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {number} millisecond
 */
function safeStdDateUTC(year, month, day, hour, minute, second, millisecond) {
    const d = new stdDate(2000, 0, 1);
    d.setUTCFullYear(year, month - 1, day);
    d.setUTCHours(hour, minute, second, millisecond);
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

/**
 * Represents a duration, the difference between two dates or times.
 * Javascript version of
 * https://docs.python.org/3/library/datetime.html#datetime.timedelta.
 */
export class TimeDelta {
    /**
     * @param {Object} [duration] An object consisting of duration values.
     * @param {number} [duration.days]
     * @param {number} [duration.seconds]
     * @param {number} [duration.microseconds]
     * @param {number} [duration.milliseconds]
     * @param {number} [duration.minutes]
     * @param {number} [duration.hours]
     * @param {number} [duration.weeks]
     */
    constructor({
            days=0, seconds=0, microseconds=0,
            milliseconds=0, minutes=0, hours=0, weeks=0}={}) {

        microseconds += milliseconds * 1000
        seconds += minutes * 60
        seconds += hours * 3600
        days += weeks * 7

        let frac;
        [days, frac] = divmod(days, 1);
        seconds += frac * 3600 * 24;
        [seconds, frac] = divmod(seconds, 1);
        microseconds += frac * 1000 ** 2;
        microseconds = Math.round(microseconds);

        let div, mod;
        [div, mod] = divmod(microseconds, 1000 ** 2)
        microseconds = mod
        seconds += div;

        [div, mod] = divmod(seconds, 3600 * 24)
        seconds = mod
        days += div

        if(!(-999999999 <= days && days <= 999999999)) {
            throw new ValueDateTimeError(
                'Cannot handle duration greater than "TimeDelta.max" or ' +
                'lesser than "TimeDelta.min".'
            );
        }
        /**
         * @private
         * @readonly
         */
        this._days = days
        /**
         * @private
         * @readonly
         */
        this._seconds = seconds
        /**
         * @private
         * @readonly
         */
        this._microseconds = microseconds
    }

    /**
     * Between -999999999 and 999999999 inclusive.
     * @type {number}
     */
    get days() { return this._days }
    /**
     * Between 0 and 86399 inclusive
     * @type {number}
     */
    get seconds() { return this._seconds }
    /**
     * Between 0 and 999999 inclusive
     * @type {number}
     */
    get microseconds() { return this._microseconds }

    /**
     * Return the total number of seconds contained in the duration.
     * @returns {number}
     */
    totalSeconds() {
        return this.days * 3600 * 24 + this.seconds + this.microseconds / (1000 ** 2)
    }

    /**
     * Return the human-readable string respresentation.
     * @returns {string}
     */
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

    /**
     * Same as totalSeconds().
     * @returns {number}
     */
    valueOf() {
        return this.totalSeconds()
    }
}
/**
 * The most negative timedelta object, new TimeDelta({days: -999999999}).
 * @type {!TimeDelta}
 */
TimeDelta.min = new TimeDelta({days: -999999999});
/**
 * The most positive timedelta object, new TimeDelta({days: 999999999,
 * hours: 23, minutes: 59, seconds: 59, microseconds: 999999}).
 * @type {!TimeDelta}
 */
TimeDelta.max = new TimeDelta({days: 999999999, hours: 23, minutes: 59,
                               seconds: 59, microseconds: 999999});
/**
 * The smallest possible difference between non-equal timedelta objects,
 * new TimeDelta({microseconds: 1}).
 * @type {!TimeDelta}
*/
TimeDelta.resolution = new TimeDelta({microseconds: 1});


/**
 * Represents a date (year, month and day) in an idealized calendar.
 * Javascript version of
 * https://docs.python.org/3/library/datetime.html#datetime.date.
 */
export class Date {
    /**
     * @param {number} year Between MINYEAR and MAXYEAR.
     * @param {number} month Between 1 and 12.
     * @param {number} day Between 1 and the number of days in the given month
     *                     and year.
     */
    constructor(year, month, day) {
        if(!(MINYEAR <= year && year <= MAXYEAR))
            throw new ValueDateTimeError(
                '"year" must be between "MINYEAR" and "MAXYEAR".')
        if(!(1 <= month && month <= 12))
            throw new ValueDateTimeError('"month" must be between 1 and 12.')
        if(!(1 <= day && day <= (
            isLeapYear(year) ?
            leapedDaysPerMonth[month - 1] : daysPerMonth[month - 1]
        )))
            throw new ValueDateTimeError('Invalid day for the year and month.')
        /**
         * @private
         * @readonly
         */
        this._year = year
        /**
         * @private
         * @readonly
         */
        this._month = month
        /**
         * @private
         * @readonly
         */
        this._day = day
    }

    /**
     * Between MINYEAR and MAXYEAR.
     * @type {number}
     */
    get year() { return this._year }
    /**
     * Between 1 and 12.
     * @type {number}
     */
    get month() { return this._month }
    /**
     * Between 1 and the number of days in the given month and year.
     * @type {number}
     */
    get day() { return this._day }
    /**
     * Return the Date corresponding to the given standard library Date object.
     * @param {!stdDate} d The standard library Date object.
     * @param {boolean} utc If true, use getUTC***() instead of get***()
     *                      to construct Date.
     * @returns {!Date}
     */
    static fromStdDate(d, utc=false) {
        if(!utc)
            return new Date(
                d.getFullYear(), d.getMonth() + 1, d.getDate())
        else
            return new Date(
                d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    }
    /**
     * Return the current local date.
     * @returns {!Date}
     */
    static today() {
        const today = new stdDate()
        return Date.fromStdDate(today)
    }
    /**
     * Return the Date corresponding to the proleptic Gregorian ordinal, where
     * January 1 of year 1 has ordinal 1.
     * @param {number} ordinal The proleptic Gregorian ordinal.
     * @returns {!Date}
     */
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
    /**
     * Return a Date corresponding to a dateString given in the format
     * `YYYY-MM-DD` or `YYYYMMDD`.
     * @param {string} dateString The date string.
     * @returns {!Date}
     */
    static fromISOFormat(dateString) {
        let match = (/^(\d\d\d\d)-(\d\d)-(\d\d)$/.exec(dateString) ||
                     /^(\d\d\d\d)(\d\d)(\d\d)$/.exec(dateString));
        if(match == null) {
            throw new ValueDateTimeError('Invalid format.');
        }
        const [year, month, day] = match.slice(1).map(Number);
        return new Date(year, month, day);
    }
    /**
     * Return a standard library Date object corresponding to this Date.
     * @param {boolean} utc If true, the value of getUTC***(), instead of
     *                      get***(), will correspond to this Date.
     * @returns {!stdDate}
     */
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
    /**
     * Return a Date with the same value, except for those parameters given new
     * values by whichever keyword arguments are specified.
     * @param {Object} newValues The object consisting of new values.
     * @param {number} [newValues.year]
     * @param {number} [newValues.month]
     * @param {number} [newValues.day]
     * @returns {!Date}
     */
    replace({ year=this.year, month=this.month, day=this.day }) {
        return new Date(year, month, day);
    }
    /**
     * Return the proleptic Gregorian ordinal of the Date,
     * where January 1 of year 1 has ordinal 1.
     * For any Date object d, Date.fromordinal(d.toordinal()) == d.
     * @returns {number}
     */
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
    /**
     * Return the day of the week as an integer, where Monday is 0 and Sunday
     * is 6. For example, date(2002, 12, 4).weekday() == 2, a Wednesday.
     * @returns {number}
    */
    weekday() {
        return (this.toStdDate().getDay() + 6) % 7
    }
    /**
     * Return a string representing the date in ISO 8601 format, YYYY-MM-DD.
     * @returns {string}
     */
    isoFormat() {
        return `${zeroPad(this.year, 4)}-${zeroPad(this.month, 2)}-${zeroPad(this.day, 2)}`
    }
    /**
     * Return a string representing the date, controlled by an explicit format
     * string. Format codes referring to hours, minutes or seconds will see 0
     * values.
     * @param {string} format The format string.
     * @returns {string}
     */
    strftime(format) {
        const dt = DateTime.combine(this, new Time());
        return strftime(dt, format);
    }
    /**
     * Same as isoFormat().
     * @returns {string}
     */
    toString() {
        return this.isoFormat()
    }
    /**
     * Same as toOrdinal().
     * @returns {number}
     */
    valueOf() {
        return this.toOrdinal();
    }
}
/**
 * The earliest representable date, new Date(MINYEAR, 1, 1).
 * @type {!Date}
 */
Date.min = new Date(MINYEAR, 1, 1);
/**
 * The latest representable date, new Date(MAXYEAR, 12, 31).
 * @type {!Date}
 */
Date.max = new Date(MAXYEAR, 12, 31);
/**
 * The smallest possible difference between non-equal date objects,
 * new TimeDelta({days: 1}).
 * @type {!TimeDelta}
 */
Date.resolution = new TimeDelta({days: 1});


/**
 * This is an abstract base class, meaning that this class should not be
 * instantiated directly. Define a subclass of tzinfo to capture information
 * about a particular time zone.
 * Javascript version of
 * https://docs.python.org/3/library/datetime.html#datetime.tzinfo.
 */
export class TZInfo {
    /**
     * Return offset of local time from UTC, as a TimeDelta object that is
     * positive east of UTC. If local time is west of UTC, this should be
     * negative.
     * @param {?DateTime} dt The DateTime object.
     * @returns {?TimeDelta}
     */
    utcOffset(dt) {
        throw new NotImplementedDateTimeError()
    }
    /**
     * Return the daylight saving time (DST) adjustment, as a TimeDelta object
     * or null if DST information isn’t known.
     * @param {?DateTime} dt The DateTime object.
     * @returns {?TimeDelta}
     */
    dst(dt) {
        throw new NotImplementedDateTimeError()
    }
    /**
     * Return the time zone name corresponding to the datetime object dt, as a
     * string.
     * @param {?DateTime} dt The DateTime object.
     * @returns {?string}
     */
    tzName(dt) {
        throw new NotImplementedDateTimeError()
    }
    /**
     * This is called from the default datetime.astimezone() implementation.
     * When called from that, dt.tzinfo is self, and dt’s date and time data are
     * to be viewed as expressing a UTC time. The purpose of fromutc() is to
     * adjust the date and time data, returning an equivalent datetime in self’s
     * local time.
     * @param {!DateTime} dt The DateTime object.
     * @returns {!DateTime}
     */
    fromUTC(dt) {
        if(dt.tzInfo !== this) {
            throw new ValueDateTimeError(
                '"dt.tzInfo" must be same instance as "this".')
        }
        let dtoff = dt.utcOffset()
        let dtdst = dt.dst()
        if(dtoff == null || dtdst == null) {
            throw new ValueDateTimeError(
                '"dt.utcOffset()" and "dt.dst()" must not return null.')
        }
        const delta = sub(dtoff, dtdst)
        if(cmp(delta, new TimeDelta()) !== 0) {
            dt = add(dt, delta)
            dtdst = dt.dst()
        }
        if(dtdst == null)
            return dt
        else
            return add(dt, dtdst)
    }
}


/**
 * The TimeZone class is a subclass of TZInfo, each instance of which represents
 * a timezone defined by a fixed offset from UTC.
 * Objects of this class cannot be used to represent timezone information in the
 * locations where different offsets are used in different days of the year or
 * where historical changes have been made to civil time.
 * Javascript version of
 * https://docs.python.org/3/library/datetime.html#datetime.timezone.
 */
export class TimeZone extends TZInfo {
    /**
     *
     * @param {!TimeDelta} offset Represents the difference between the local
     *                            time and UTC. It must be strictly between
     *                            -TimeDelta({hours: 24}) and
     *                            TimeDelta({hours: 24}), otherwise
     *                            ValueDateTimeError is raised.
     * @param {?string} name If specified, it must be a string that will be used
     *                       as the value returned by the DateTime.tzname()
     *                       method.
     */
    constructor(offset, name=null) {
        super()
        if(!(cmp(new TimeDelta({hours: -24}), offset) < 0 &&
           cmp(offset, new TimeDelta({hours: 24})) < 0))
            throw new ValueDateTimeError(
                '"offset" must be "TimeDelta({hours: -24}) < offset < ' +
                'TimeDelta({hours: 24})".')

        if(name == null) {
            name = 'UTC'
            if(cmp(offset, new TimeDelta()) != 0 ) {
                name += toOffsetString(offset)
            }
        }
        /**
         * @private
         * @readonly
         */
        this._offset = offset
        /**
         * @private
         * @readonly
         */
        this._name = name
    }
    /**
     * Return the fixed value specified when the TimeZone instance is
     * constructed.
     * @param {?DateTime} dt This argument is ignored.
     * @returns {!TimeDelta}
     */
    utcOffset(dt) {
        return this._offset
    }
    /**
     * Return the fixed value specified when the timezone instance is
     * constructed.
     * If name is not provided in the constructor, the name returned by
     * tzName(dt) is generated from the value of the offset as follows.
     * If offset is TimeDelta({}), the name is “UTC”, otherwise it is a string
     * in the format UTC±HH:MM, where ± is the sign of offset, HH and MM are two
     * digits of offset.hours and offset.minutes respectively.
     * @param {?DateTime} dt This argument is ignored.
     * @returns {string}
     */
    tzName(dt) {
        return this._name
    }
    /**
     * Always returns null.
     * @param {?DateTime} dt This argument is ignored.
     * @returns {null}
     */
    dst(dt) {
        return null
    }
    /**
     * Return add(dt, offset). The dt argument must be an aware datetime
     * instance, with tzInfo set to this.
     * @param {!DateTime} dt The DateTime object.
     * @returns {!DateTime}
     */
    fromUTC(dt) {
        if(dt.tzInfo !== this) {
            throw new ValueDateTimeError(
                '"dt.tzInfo" must be same instance as "this".')
        }
        return add(dt, this._offset)
    }
}
/**
 * The UTC timezone, new TimeZone(new TimeDelta({})).
 * @type {!TimeZone}
 */
TimeZone.utc =  new TimeZone(new TimeDelta({}));


/**
 * Instance of a class which is subclass of TZInfo, representing local timezone
 * of the execution environment.
 */
export const LOCALTZINFO = new (class extends TZInfo {
    constructor() {
        super()
        // Offset without DST
        const stdOffset = -new stdDate(2000, 0, 1).getTimezoneOffset()
        /**
         * @private
         * @readonly
         */
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
                '"dt.tzInfo" must be same instance as "this".')

        const local = DateTime.fromStdDate(dt.toStdDate(true), false).replace({
            microsecond: dt.microsecond, tzInfo: this, fold: 0})
        return local
    }
})()


/**
 * A time object represents a (local) time of day, independent of any particular
 * day, and subject to adjustment via a tzinfo object.
 * Javascript version of
 * https://docs.python.org/3/library/datetime.html#datetime.time.
 */
export class Time {
    /**
     * @param {number} hour Between 0 and 23.
     * @param {number} minute Between 0 and 59.
     * @param {number} second Between 0 and 59.
     * @param {number} microsecond Between 0 and 999999.
     * @param {?TZInfo} tzInfo The timezone information.
     * @param {number} fold 0 or 1.
     */
    constructor(hour=0, minute=0, second=0, microsecond=0, tzInfo=null, fold=0) {
        if(!(0 <= hour && hour <= 23))
            throw new ValueDateTimeError(
                '"hour" must be between 0 and 23.'
            );
        if(!(0 <= minute && minute <= 59))
            throw new ValueDateTimeError(
                '"minute" must be between 0 and 59.'
            );
        if(!(0 <= second && second <= 59))
            throw new ValueDateTimeError(
                '"second" must be between 0 and 59.'
            );
        if(!(0 <= microsecond && microsecond <= 999999))
            throw new ValueDateTimeError(
                '"microsecond" must be between 0 and 999999.'
            );
        if(!(fold === 0 || fold === 1))
            throw new ValueDateTimeError(
                '"fold" must be 0 or 1.'
            );
        /**
         * @private
         * @readonly
         */
        this._hour = hour;
        /**
         * @private
         * @readonly
         */
        this._minute = minute;
        /**
         * @private
         * @readonly
         */
        this._second = second;
        /**
         * @private
         * @readonly
         */
        this._microsecond = microsecond;
        /**
         * @private
         * @readonly
         */
        this._tzInfo = tzInfo;
        /**
         * @private
         * @readonly
         */
        this._fold = fold;
    }
    /**
     * Between 0 and 23.
     * @type {number}
     */
    get hour() { return this._hour }
    /**
     * Between 0 and 59.
     * @type {number}
     */
    get minute() { return this._minute }
    /**
     * Between 0 and 59.
     * @type {number}
     */
    get second() { return this._second }
    /**
     * Between 0 and 999999.
     * @type {number}
     */
    get microsecond() { return this._microsecond }
    /**
     * The object passed as the tzInfo argument to the Time constructor, or null
     * if none was passed.
     * @type {?TZInfo}
     */
    get tzInfo() { return this._tzInfo }
    /**
     * 0 or 1. Used to disambiguate wall times during a repeated interval.
     * (A repeated interval occurs when clocks are rolled back at the end of
     * daylight saving time or when the UTC offset for the current zone is
     * decreased for political reasons.) The value 0 (1) represents the earlier
     * (later) of the two moments with the same wall time representation.
     * @type {number}
     */
    get fold() { return this._fold }
    /**
     * Return a Time corresponding to a dateString given in the format
     * `HH[:MM[:SS[.fff[fff]]]][Z|((+|-)HH[:MM[:SS[.fff[fff]]]])]` or
     * `HH[MM[SS[.fff[fff]]]][Z|((+|-)HH[MM[SS[.fff[fff]]]])]`.

     * @param {string} timeString The time string.
     * @returns {!Time}
     */
    static fromISOFormat(timeString) {
        function parseTimeString(str) {
            const match = (
                /^(\d\d)(?:\:(\d\d)(?:\:(\d\d)(?:\.(\d{3})(\d{3})?)?)?)?$/.exec(str) ||
                /^(\d\d)(?:(\d\d)(?:(\d\d)(?:\.(\d{3})(\d{3})?)?)?)?$/.exec(str)
            )
            if(match == null)
                return null
            match.splice(0, 1)
            const ret = match.map(x => x == null ? 0 : parseInt(x, 10))
            ret[3] = ret[3] * 1000 + ret[4]
            ret.splice(4, 1)
            return ret
        }

        let sepIdx = timeString.search(/[Z+-]/)
        if(sepIdx === -1)
            sepIdx = timeString.length
        const timeStr = timeString.slice(0, sepIdx)
        const offsetStr = timeString.slice(sepIdx)

        const timeArray = parseTimeString(timeStr)
        if(timeArray == null)
            throw new ValueDateTimeError(
                'Invalid format.')

        let tzInfo = null
        if(offsetStr === 'Z') {
            tzInfo = new TimeZone(new TimeDelta({}));
        } else if(offsetStr !== '') {
            const offsetArray = parseTimeString(offsetStr.slice(1))
            if(offsetArray == null) {
                throw new ValueDateTimeError(
                    'Invalid format.')
            }
            let offset = new TimeDelta({
                hours: offsetArray[0],
                minutes: offsetArray[1],
                seconds: offsetArray[2],
                microseconds: offsetArray[3],
            })
            if(offsetStr[0] === '-')
                offset = neg(offset)
            tzInfo = new TimeZone(offset)
        }

        return new Time(
            timeArray[0], timeArray[1], timeArray[2], timeArray[3], tzInfo)
    }
    /**
     * Return a time with the same value, except for those attributes given new
     * values by whichever keyword arguments are specified. Note that
     * {tzinfo: null} can be specified to create a naive time from an aware
     * time, without conversion of the time data.
     * @param {Object} newValues The object consisting of new values.
     * @param {number} [newValues.hour]
     * @param {number} [newValues.minute]
     * @param {number} [newValues.second]
     * @param {number} [newValues.microsecond]
     * @param {?TZInfo} [newValues.tzInfo]
     * @param {number} [newValues.fold]
     * @returns {!Time}
     */
    replace({ hour=this.hour, minute=this.minute, second=this.second,
              microsecond=this.microsecond, tzInfo=this.tzInfo,
              fold=this.fold }) {
        return new Time(hour, minute, second, microsecond, tzInfo, fold)
    }
    /**
     * Return a string representing the time in ISO 8601 format.
     * @param {"auto"|"microseconds"|"milliseconds"|"seconds"|"minutes"|"hours"
     * } timeSpec Specifies the number of additional components of the time to
     *            include.
     * @returns {string}
     */
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
                '"timeSpec" must be either "auto", "microseconds", "milliseconds", ' +
                '"seconds", "minutes" or "hours".')
        }

        const offset = this.utcOffset()
        if(offset != null) {
            ret += toOffsetString(offset)
        }
        return ret
    }
    /**
     * If tzInfo is null, returns null, else returns this.tzInfo.utcOffset(null).
     * @returns {(TimeDelta|null)}
     */
    utcOffset() {
        return this.tzInfo == null ? null : this.tzInfo.utcOffset(null)
    }
    /**
     * If tzInfo is null, returns null, else returns this.tzInfo.dst(null).
     * @returns {(TimeDelta|null)}
     */
    dst() {
        return this.tzInfo == null ? null : this.tzInfo.dst(null)
    }
    /**
     * If tzInfo is null, returns null, else returns this.tzInfo.tzName(null).
     * @returns {(string|null)}
     */
    tzName() {
        return this.tzInfo == null ? null : this.tzInfo.tzName(null)
    }
    /**
     * Return a string representing the time, controlled by an explicit format
     * string.
     * @param {string} format The format string.
     * @returns {string}
     */
    strftime(format) {
        const dt = DateTime.combine(new Date(1900, 1, 1), this);
        return strftime(dt, format);
    }
    /**
     * Same as isoFormat().
     * @returns {string}
     */
    toString() {
        return this.isoFormat()
    }
}
/**
 * The earliest representable time, new Time(0, 0, 0, 0).
 * @type {!Time}
 */
Time.min = new Time(0, 0, 0, 0);
/**
 * The latest representable time, new Time(23, 59, 59, 999999).
 * @type {!Time}
 */
Time.max = new Time(23, 59, 59, 999999);
/**
 * The smallest possible difference between non-equal time objects,
 * new TimeDelta({microseconds: 1}), although note that arithmetic on time
 * objects is not supported.
 * @type {!TimeDelta}
 */
Time.resolution = new TimeDelta({microseconds: 1});


/**
 * A DateTime object is a single object containing all the information from a
 * Date object and a Time object.
 * Javascript version of
 * https://docs.python.org/3/library/datetime.html#datetime.datetime.
 */
export class DateTime extends Date {
    /**
     * @param {number} year Between MINYEAR and MAXYEAR.
     * @param {number} month Between 1 and 12.
     * @param {number} day Between 1 and the number of days in the given month
     *                     and year.
     * @param {number} hour Between 0 and 23.
     * @param {number} minute Between 0 and 59.
     * @param {number} second Between 0 and 59.
     * @param {number} microsecond Between 0 and 999999.
     * @param {?TZInfo} tzInfo The timezone information.
     * @param {number} fold 0 or 1.
     */
    constructor(year, month, day, hour=0, minute=0, second=0, microsecond=0,
                tzInfo=null, fold=0) {
        super(year, month, day);
        if(!(0 <= hour && hour <= 23))
            throw new ValueDateTimeError(
                '"hour" must be between 0 and 23.'
            );
        if(!(0 <= minute && minute <= 59))
            throw new ValueDateTimeError(
                '"minute" must be between 0 and 59.'
            );
        if(!(0 <= second && second <= 59))
            throw new ValueDateTimeError(
                '"second" must be between 0 and 59.'
            );
        if(!(0 <= microsecond && microsecond <= 999999))
            throw new ValueDateTimeError(
                '"microsecond" must be between 0 and 999999.'
            );
        if(!(fold === 0 || fold === 1))
            throw new ValueDateTimeError(
                '"fold" must be 0 or 1.'
            );
        /**
         * @private
         * @readonly
         */
        this._hour = hour;
        /**
         * @private
         * @readonly
         */
        this._minute = minute;
        /**
         * @private
         * @readonly
         */
        this._second = second;
        /**
         * @private
         * @readonly
         */
        this._microsecond = microsecond;
        /**
         * @private
         * @readonly
         */
        this._tzInfo = tzInfo;
        /**
         * @private
         * @readonly
         */
        this._fold = fold;
    }
    /**
     * Between 0 and 23.
     * @type {number}
     */
    get hour() { return this._hour }
    /**
     * Between 0 and 59.
     * @type {number}
     */
    get minute() { return this._minute }
    /**
     * Between 0 and 59.
     * @type {number}
     */
    get second() { return this._second }
    /**
     * Between 0 and 999999.
     * @type {number}
     */
    get microsecond() { return this._microsecond }
    /**
     * The object passed as the tzInfo argument to the Time constructor, or null
     * if none was passed.
     * @type {?TZInfo}
     */
    get tzInfo() { return this._tzInfo }
    /**
     * 0 or 1. Used to disambiguate wall times during a repeated interval.
     * (A repeated interval occurs when clocks are rolled back at the end of
     * daylight saving time or when the UTC offset for the current zone is
     * decreased for political reasons.) The value 0 (1) represents the earlier
     * (later) of the two moments with the same wall time representation.
     * @type {number}
     */
    get fold() { return this._fold }
    /**
     * Return a DateTime corresponding to the given standard library Date object.
     * @param {!stdDate} d The standard library Date object.
     * @param {boolean} utc If true, use getUTC***() instead of get***()
     *                      to construct DateTime.
     * @returns {!DateTime}
     */
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
    /**
     * Return the current local date and time, with tzInfo null.
     * @returns {!DateTime}
     */
    static today() {
        return DateTime.fromStdDate(new stdDate())
    }
    /**
     * Return the current date and time.
     * @param {?TZInfo} tz If specified, the current date and time are converted
     *                     to tz's time zone, else same as today().
     * @returns {!DateTime}
     */
    static now(tz=null) {
        if(tz == null)
            return DateTime.today()
        return tz.fromUTC(DateTime.utcNow().replace({tzInfo: tz}))
    }
    /**
     * Return the current UTC date and time, with tzInfo null.
     * @returns {!DateTime}
     */
    static utcNow() {
        return DateTime.fromStdDate(new stdDate(), true)
    }
    /**
     * Return the local date and time corresponding to the POSIX timestamp.
     * @param {number} timeStamp The POSIX timestamp.
     * @param {?TZInfo} tz If null, the timestamp is converted to the platform's
     *                     local date and time, and the returned DateTime object
     *                     is naive. If not null, the timestamp is converted to
     *                     tz's time zone.
     * @returns {!DateTime}
     */
    static fromTimeStamp(timeStamp, tz=null) {
        if(tz == null)
            return DateTime.fromStdDate(new stdDate(timeStamp * 1000))
        return tz.fromUTC(
            DateTime.utcFromTimeStamp(timeStamp).replace({tzInfo: tz}))
    }
    /**
     * Return the UTC date and time corresponding to the POSIX timestamp, with
     * tzInfo null. (The resulting object is naive.)
     * @param {number} timeStamp The POSIX timestamp.
     * @returns {!DateTime}
     */
    static utcFromTimeStamp(timeStamp) {
        return DateTime.fromStdDate(new stdDate(timeStamp * 1000), true)
    }
    /**
     * Return a new DateTime object whose date components are equal to the given
     * Date object’s, and whose time components are equal to the given Time
     * object’s. If the tzInfo argument is provided, its value is used to set
     * the tzInfo attribute of the result, otherwise the tzInfo attribute of the
     * time argument is used.
     * @param {!Date} date The Date object.
     * @param {!Time} time The Time object.
     * @param {?TZInfo} [tzInfo] The TZInfo object.
     * @returns {!DateTime}
     */
    static combine(date, time, tzInfo=undefined) {
        if(tzInfo === undefined)
            tzInfo = time.tzInfo
        return new DateTime(
            date.year, date.month, date.day,
            time.hour, time.minute, time.second, time.microsecond,
            tzInfo, time.fold)
    }
    /**
     * Return a DateTime corresponding to a dateString in one of the formats
     * emitted by Date.isoFormat() and DateTime.isoFormat().
     * @param {string} dateString The date string.
     */
    static fromISOFormat(dateString) {
        let sepIdx = dateString.search(/[^\d\-]/);
        if(sepIdx === -1)
            sepIdx = dateString.length;
        const dateStr = dateString.slice(0, sepIdx);
        const timeStr = dateString.slice(sepIdx + 1);
        return DateTime.combine(
            Date.fromISOFormat(dateStr),
            timeStr ? Time.fromISOFormat(timeStr) : new Time(),
        );
    }
    /**
     * Return a standard library Date object corresponding to this DateTime.
     * Since standard library Date object has only millisecond resolution, the
     * microsecond value is truncated.
     * @param {boolean} utc If true, the value of getUTC***(), instead of
     *                      get***(), will correspond to this Date.
     * @returns {!stdDate}
     */
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
    /**
     * Return Date object with same year, month and day.
     * @returns {!Date}
     */
    date() {
        return new Date(this.year, this.month, this.day)
    }
    /**
     * Return Time object with same hour, minute, second, microsecond and fold.
     * tzInfo is null.
     * @returns {!Time}
     */
    time() {
        return new Time(this.hour, this.minute, this.second, this.microsecond,
                        null, this.fold)
    }
    /**
     * Return Time object with same hour, minute, second, microsecond, fold, and
     * tzInfo attributes.
     * @returns {!Time}
     */
    timetz() {
        return new Time(this.hour, this.minute, this.second, this.microsecond,
                        this.tzInfo, this.fold)
    }
    /**
     * Return a DateTime with the same attributes, except for those attributes
     * given new values by whichever keyword arguments are specified. Note that
     * {tzInfo: null} can be specified to create a naive DateTime from an aware
     * DateTime with no conversion of date and time data.
     * @param {Object} newValues The object consisting of new values.
     * @param {number} [newValues.year]
     * @param {number} [newValues.month]
     * @param {number} [newValues.day]
     * @param {number} [newValues.hour]
     * @param {number} [newValues.minute]
     * @param {number} [newValues.second]
     * @param {number} [newValues.microsecond]
     * @param {?TZInfo} [newValues.tzInfo]
     * @param {number} [newValues.fold]
     * @returns {!DateTime}
     */
    replace({
        year=this.year, month=this.month, day=this.day, hour=this.hour,
        minute=this.minute, second=this.second, microsecond=this.microsecond,
        tzInfo=this.tzInfo, fold=this.fold,
    }) {
        return new DateTime(year, month, day,
                            hour, minute, second, microsecond, tzInfo, fold)
    }
    /**
     * Return a DateTime object with new tzInfo attribute tz, adjusting the date
     * and time data so the result is the same UTC time as self, but in tz’s
     * local time.
     * If self is naive, it is presumed to represent time in the system timezone.
     * @param {?TZInfo} tz The target timezone. If null, the system local
     *                     timezone is assumed for the target timezone.
     * @returns {!DateTime}
     */
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
    /**
     * If tzInfo is null, returns null, else returns this.tzInfo.utcOffset(this).
     * @returns {(TimeDelta|null)}
     */
    utcOffset() {
        return this.tzInfo == null ? null : this.tzInfo.utcOffset(this)
    }
    /**
     * If tzInfo is null, returns null, else returns this.tzInfo.dst(this).
     * @returns {(TimeDelta|null)}
     */
    dst() {
        return this.tzInfo == null ? null : this.tzInfo.dst(this)
    }
    /**
     * If tzInfo is null, returns null, else returns this.tzInfo.tzName(this).
     * @returns {(string|null)}
     */
    tzName() {
        return this.tzInfo == null ? null : this.tzInfo.tzName(this)
    }
    /**
     * Return POSIX timestamp corresponding to the DateTime instance.
     * @returns {number}
     */
    timeStamp() {
        let dt = this
        if(this.utcOffset() == null) {
            dt = this.replace({tzInfo: LOCALTZINFO})
        }
        return sub(dt, new DateTime(
            1970, 1, 1, 0, 0, 0, 0, TimeZone.utc)).totalSeconds()
    }
    /**
     * Return a string representing the date and time in ISO 8601 format.
     * @param {string} sep One-character separator placed between the date and
     *                     time portions of the result.
     * @param {"auto"|"microseconds"|"milliseconds"|"seconds"|"minutes"|"hours"
     * } timespec The number of additional components of the time to
     *            include.
     * @returns {string}
     */
    isoFormat(sep='T', timespec='auto') {
        return this.date().isoFormat() + sep +
               this.timetz().isoFormat(timespec)
    }
    /**
     * Return a string representing the date and time, controlled by an explicit
     * format string
     * @param {string} format The format string.
     * @returns {string}
     */
    strftime(format) {
        return strftime(this, format)
    }
    /**
     * Same as isoFormat(' ').
     * @returns {string}
     */
    toString() {
        return this.isoFormat(' ')
    }
    /**
     * Same as timeStamp().
     * @returns {number}
     */
    valueOf() {
        return this.timeStamp()
    }
}
/**
 * The earliest representable DateTime, new DateTime(MINYEAR, 1, 1).
 * @type {!DateTime}
 */
DateTime.min = new DateTime(MINYEAR, 1, 1)
/**
 * The latest representable DateTime, new DateTime(MAXYEAR, 12, 31, 23, 59, 59,
 * 999999).
 * @type {!DateTime}
 */
DateTime.max = new DateTime(MAXYEAR, 12, 31, 23, 59, 59, 999999);
/**
 * The smallest possible difference between non-equal DateTime objects,
 * new TimeDelta({microseconds: 1}).
 * @type {!TimeDelta}
 */
DateTime.resolution = new TimeDelta({microseconds: 1});


function typeName(obj) {
    if(obj === null) {
        return 'null';
    } else if(obj === undefined) {
        return 'undefined';
    } else {
        return obj.constructor.name;
    }
}

/**
 * Add two datetime objects.
 * @param {(TimeDelta|DateTime|Date|Time)} a Left side value.
 * @param {(TimeDelta|DateTime|Date|Time)} b Right side value.
 * @returns {(TimeDelta|DateTime|Date|Time)}
 */
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

    function time_plus_timedelta(t, td) {
        const total_microseconds = t.microsecond + td.microseconds;
        const total_seconds = t.second + t.minute * 60
                              + t.hour * 3600 + td.seconds;

        let [q, r] = divmod(total_microseconds, 1000000);
        const microsecond = r;
        [q, r] = divmod(total_seconds + q, 60);
        const second = r;
        [q, r] = divmod(q, 60);
        const minute = r;
        [q, r] = divmod(q, 24);
        const hour = r;
        return new Time(hour, minute, second, microsecond, t.tzInfo, t.fold);
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
    if(a instanceof Time && b instanceof TimeDelta) {
        return time_plus_timedelta(a, b);
    }
    if(a instanceof TimeDelta && b instanceof Time) {
        return time_plus_timedelta(b, a);
    }
    throw new TypeDateTimeError(
        `Cannot add type "${typeName(a)}" and type "${typeName(b)}".`)
}


/**
 * Subtract two datetime objects.
 * @param {(TimeDelta|DateTime|Date|Time)} a Left side value.
 * @param {(TimeDelta|DateTime|Date|Time)} b Right side value.
 * @returns {(TimeDelta|DateTime|Date|Time)}
 */
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
                throw new TypeDateTimeError(
                    'Cannot subtract between naive "DateTime" and aware "DateTime"')
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
    if(a instanceof Time && b instanceof TimeDelta) {
        return add(a, neg(b));
    }
    if(a instanceof Time && b instanceof Time) {
        const aOffset = a.utcOffset();
        const bOffset = b.utcOffset();
        if(!(aOffset == null && bOffset == null) &&
           a.tzInfo !== b.tzInfo) {
            if(aOffset == null || bOffset == null)
                throw new TypeDateTimeError(
                    'Cannot subtract between naive "Time" and aware "Time"'
                );
            a = sub(a, aOffset)
            b = sub(b, bOffset)
        }

        const aTimeDelta = new TimeDelta({
            hours: a.hour, minutes: a.minute, seconds: a.second,
            microseconds: a.microsecond
        });
        const bTimeDelta = new TimeDelta({
            hours: b.hour, minutes: b.minute, seconds: b.second,
            microseconds: b.microsecond
        });

        const ret = sub(aTimeDelta, bTimeDelta);
        return new TimeDelta({
            seconds: ret.seconds, microseconds: ret.microseconds
        });
    }
    throw new TypeDateTimeError(
        `Cannnot subtract type "${typeName(b)}" from type "${typeName(a)}".`)
}


/**
 * Negate datetime objects.
 * @param {TimeDelta} a The value.
 * @returns {TimeDelta}
 */
export function neg(a) {
    if(a instanceof TimeDelta) {
        return new TimeDelta({
            days: -a.days,
            seconds: -a.seconds,
            microseconds: -a.microseconds,
        })
    }
    throw new TypeDateTimeError(`Cannot negate type "${typeName(a)}".`)
}


/**
 * Compare two datetime objects.
 * Return 0 if two are the same, 1 if left side is greater than right,
 * -1 if right side is greater than left.
 * @param {(TimeDelta|DateTime|Date|Time)} a Left side value.
 * @param {(TimeDelta|DateTime|Date|Time)} b Right side value.
 * @returns {number}
 */
export function cmp(a, b) {
    function _comp(a, b) {
        if(a === b) return 0
        if(a > b) return 1
        if(a < b) return -1
        throw new TypeError()
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
                throw new TypeDateTimeError(
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
                throw new TypeDateTimeError(
                    'Cannot compare naive "Time" object to aware "Time" object')
            a = sub(a, aOffset)
            b = sub(b, bOffset)
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
    throw new TypeDateTimeError(
        `Cannot compare type "${typeName(a)}" to type "${typeName(b)}".`)
}
