import diff from 'jest-diff';
import {MAXYEAR, MINYEAR, TimeDelta, Date, TimeZone, Time, DateTime,
        cmp, add, sub, ValueDateTimeError, RangeDateTimeError, LOCALTZINFO
} from './datetime.js';


const StdDate = Function('return this')().Date;


function datetimeCmpMatcherHelper(_this, matcherName, comparison,
                                  received, expected) {
    const isNot = _this.isNot;
    const options = {
        comment: 'datetime cmp order',
        isNot,
        promise: _this.promise,
    };

    let pass;
    if(comparison === '>')
        pass = cmp(received, expected) > 0;
    else if(comparison === '<')
        pass = cmp(received, expected) < 0;
    else if(comparison === '>=')
        pass = cmp(received, expected) >= 0;
    else if(comparison === '<=')
        pass = cmp(received, expected) <= 0;
    else
        throw new Error();

    const message = () =>
        _this.utils.matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        `Expected:${isNot ? ' not' : ''} ${comparison} ${_this.utils.printExpected(expected)}\n` +
        `Received:${isNot ? '    ' : ''} ${' '.repeat(comparison.length)} ${_this.utils.printReceived(received)}`;

    return {message, pass};
}


expect.extend({
    toBeEqualDateTime(received, expected) {
        const matcherName = 'toBeEqualDateTime';
        const options = {
            comment: 'datetime cmp equality',
            isNot: this.isNot,
            promise: this.promise,
        };
      
        const pass = cmp(received, expected) === 0;
      
        const message = pass
            ? () =>
                this.utils.matcherHint(matcherName, undefined, undefined, options) +
                '\n\n' +
                `Expected: ${this.utils.printExpected(expected)}\n` +
                `Received: ${this.utils.printReceived(received)}`
            : () => {
                const diffString = diff(expected, received, {
                    expand: this.expand,
                });
                return (
                    this.utils.matcherHint(matcherName, undefined, undefined, options) +
                    '\n\n' +
                    (diffString && diffString.includes('- Expect')
                        ? `Difference:\n\n${diffString}`
                        : `Expected: ${this.utils.printExpected(expected)}\n` +
                          `Received: ${this.utils.printReceived(received)}`)
                );
            };
        return {actual: received, message, pass};
    },

    toBeGreaterDateTimeThan(received, expected) {
        const matcherName = 'toBeGreaterDateTimeThan';
        return datetimeCmpMatcherHelper(
            this, matcherName, '>', received, expected);
    },

    toBeGreaterThanOrEqualDateTime(received, expected) {
        const matcherName = 'toBeGreaterThanOrEqualDateTime';
        return datetimeCmpMatcherHelper(
            this, matcherName, '>=', received, expected);
    },

    toBeLessDateTimeThan(received, expected) {
        const matcherName = 'toBeLessDateTimeThan';
        return datetimeCmpMatcherHelper(
            this, matcherName, '<', received, expected);
    },

    toBeLessThanOrEqualDateTime(received, expected) {
        const matcherName = 'toBeLessThanOrEqualDateTime';
        return datetimeCmpMatcherHelper(
            this, matcherName, '<=', received, expected);
    },
});


describe('TimeDelta', () => {
    test('days, second and microseconds props', () => {
        const td = new TimeDelta({days: 198, seconds: 43, microseconds: 8});
        expect(td.days).toBe(198);
        expect(td.seconds).toBe(43);
        expect(td.microseconds).toBe(8);
    });

    test.each([
        [undefined, 60 * 60 * 24 * 3 + 12345, undefined,
         undefined, undefined, undefined, undefined, 3, 12345, 0],
        [undefined, undefined, 189287955,
         undefined, undefined, undefined, undefined, 0, 189, 287955],
        [undefined, undefined, undefined,
         873, undefined, undefined, undefined, 0, 0, 873000],
        [undefined, undefined, undefined,
         undefined, 60 * 24 * 3295 + 1090, undefined, undefined,
         3295, 1090 * 60, 0],
        [undefined, undefined, undefined,
         undefined, undefined, 24 * 108 + 4, undefined,
         108, 4 * 60 * 60, 0],
        [38221383, 78276759, 77745343, 22282008, 91443959, 93016217, 68836049,
         524013810, 60258, 753343],
        [1.5, 0, 0, 0, 0, 0, 0, 1, 3600 * 12, 0, 0],
        [0, 7.75, 0, 0, 0, 0, 0, 0, 7, 750000],
        [0, 0, 389.5, 0, 0, 0, 0, 0, 0, 390],
        [0, 0, 0, 3000.005, 3.25, 0.125, 0,
         0, 3 + 3.25 * 60 + 0.125 * 3600, 5],
    ])('can normalizes constructor arguments of days=%j, seconds=%j, ' +
       'microseconds=%j, milliseconds=%j, minutes=%j, hours=%j, weeks=%j',
       (days, seconds, microseconds, milliseconds, minutes, hours, weeks,
        expectedDays, expectedSeconds, expectedMicroseconds) => {
        const td = new TimeDelta({
            days, seconds, microseconds, milliseconds, minutes, hours, weeks});
        expect(td.days).toBe(expectedDays);
        expect(td.seconds).toBe(expectedSeconds);
        expect(td.microseconds).toBe(expectedMicroseconds);
    });

    test.each([
        [new TimeDelta({days: 19940, seconds: 49328, microseconds: 89343}),
         new TimeDelta({days: 19940, seconds: 49328, microseconds: 89343}),
         0],
        [new TimeDelta({days: 18, seconds: 13546, microseconds: 1849}),
         new TimeDelta({days: 18, seconds: 13547, microseconds: 1848}),
         -1],
        [new TimeDelta({days: -4902, seconds: 4830, microseconds: 93454}),
         new TimeDelta({days: -4902, seconds: 4830, microseconds: 93453}),
         +1],
       ])('cmp(%o, %o)', (a, b, expected) => {
        expect(cmp(a, b)).toBe(expected);
    });

    test('has correct static prop "min"', () => {
        expect(cmp(TimeDelta.min, new TimeDelta({days: -999999999}))).toBe(0);
    });

    test('has correct static prop "max"', () => {
        expect(cmp(TimeDelta.max, new TimeDelta({
            days: 999999999, hours: 23, minutes: 59, seconds: 59,
            microseconds: 999999}))).toBe(0);
    });

    test('has correct static prop "resolution"', () => {
        expect(cmp(TimeDelta.resolution, new TimeDelta({microseconds: 1}))).toBe(0);
    });

    test('throws error constructing TimeDelta lesser than "min"', () => {
        const min = TimeDelta.min;
        expect(() => new TimeDelta(
            {days: min.days, seconds: min.seconds, microseconds: min.microseconds - 1}
        )).toThrow(RangeDateTimeError);
    });

    test('throws error constructing TimeDelta greater than "max"', () => {
        const max = TimeDelta.max;
        expect(() => new TimeDelta(
            {days: max.days, seconds: max.seconds, microseconds: max.microseconds + 1}
        )).toThrow(RangeDateTimeError);
    });

    test('totalSeconds()', () => {
        const td = new TimeDelta({seconds: 9037, microseconds: 375601});
        expect(td.totalSeconds()).toBeCloseTo(9037.375601);
    });

    test.each([
        [390, 18  * 60 * 60 + 45 * 60 + 21, 1274, '390 day(s), 18:45:21.001274'],
        [-29, 3 * 60 * 60, 0, '-29 day(s), 3:00:00'],
        [0, 23 * 60 * 60 + 21, 984104, '23:00:21.984104'],
    ])('toString() of days=%j, seconds=%j, microseconds=%j',
       (days, seconds, microseconds, expected) => {
        const td = new TimeDelta({days, seconds, microseconds});
        expect(td.toString()).toBe(expected);
    });

    test('valueOf()', () => {
        const td = new TimeDelta(
            {days: 4, seconds: 1984, milliseconds: 193870});
        expect(td.valueOf()).toBeCloseTo(td.totalSeconds());
    });
});


describe('Date', () => {
    test('year, month and day props', () => {
        const date = new Date(1999, 3, 28);
        expect(date.year).toBe(1999);
        expect(date.month).toBe(3);
        expect(date.day).toBe(28);
    });

    test.each([
        [MINYEAR - 1, 1, 1],
        [MAXYEAR + 1, 1, 1],
        [2019, -1, 1],
        [2019, 13, 1],
        [2019, 1, -1],
        [2019, 1, 32],
        [2019, 2, 29],
    ])('throws an error calling constructor with year=%i, month=%i, day=%i',
        (year, month, day) => {
            expect(() => new Date(year, month, day)).toThrow(RangeDateTimeError);
    });

    test.each([
        [new Date(2019, 3, 31), new Date(2019, 3, 31), 0],
        [new Date(2019, 3, 31), new Date(2019, 4, 1), -1],
        [new Date(2019, 1, 1), new Date(2018, 12, 31), 1],
    ])('cmp(%o, %o) to %i',
        (a, b, expected) => {
            expect(cmp(a, b)).toBe(expected);
    });

    test('has correct static prop "min"', () => {
        expect(cmp(Date.min, new Date(MINYEAR, 1, 1))).toBe(0);
    });

    test('has correct static prop "max"', () => {
        expect(cmp(Date.max, new Date(MAXYEAR, 12, 31))).toBe(0);
    });

    test('has correct static prop "resolution"', () => {
        expect(cmp(Date.resolution, new TimeDelta({days: 1}))).toBe(0);
    });

    test('fromStdDate with utc=false', () => {
        const stdDate = new StdDate(2020, 1, 29);
        const date = new Date(2020, 2, 29);
        expect(cmp(Date.fromStdDate(stdDate), date)).toBe(0);
    });

    test('fromStdDate with utc=true', () => {
        const stdDate = new StdDate(StdDate.UTC(2020, 1, 29));
        const date = new Date(2020, 2, 29);
        expect(cmp(Date.fromStdDate(stdDate, true), date)).toBe(0);
    });


    test('today', () => {
        const stdDate = new StdDate();
        expect(cmp(Date.today(), Date.fromStdDate(stdDate))).toBe(0);
    });

    test.each([
        [1, new Date(1, 1, 1)],
        [365, new Date(1, 12, 31)],
        [689578, new Date(1888, 12, 31)],
        [737484, new Date(2020, 2, 29)],
        [1000000, new Date(2738, 11, 28)],
    ])('fromOrdinal(%i) to be %o', (ordinal, expected) => {
        expect(cmp(Date.fromOrdinal(ordinal), expected)).toBe(0);
    });

    test.each([
        ['0980-09-03', new Date(980, 9, 3)],
        ['2145-10-26', new Date(2145, 10, 26)],
    ])('fromISOFormat("%s")', (str, date) => {
        expect(cmp(Date.fromISOFormat(str), date)).toBe(0);
    });

    test.each([
        ['201-09-23'], ['0938/02/11'], ['8477-11-31'], ['03789-04-12'],
        ['2940-01-aa'],
    ])('fromISOFormat("%s") throws error', (str) => {
        expect(() => Date.fromISOFormat(str)).toThrow();
    })

    test('toStdDate with utc=false', () => {
        const date = new Date(2007, 7, 17);
        const stdDate = new StdDate(2007, 6, 17);
        expect(date.toStdDate(false).getTime()).toBe(stdDate.getTime());
    });

    test('toStdDate with utc=true', () => {
        const date = new Date(2007, 7, 17);
        const stdDate = new StdDate(StdDate.UTC(2007, 6, 17));
        expect(date.toStdDate(true).getTime()).toBe(stdDate.getTime());
    });

    test.each([
        [2016, undefined, undefined, new Date(2016, 5, 9)],
        [undefined, 12, undefined, new Date(710, 12, 9)],
        [undefined, undefined, 31, new Date(710, 5, 31)],
        [1134, 8, 15, new Date(1134, 8, 15)],
    ])('replace({year: %j, month: %j, day: %j})', (year, month, day, expected) => {
        const date = new Date(710, 5, 9);
        expect(cmp(date.replace({year, month, day}), expected)).toBe(0);
    });

    test.each([
        [new Date(1, 1, 1), 1],
        [new Date(1, 1, 29), 29],
        [new Date(2, 1, 1), 366],
        [new Date(3876, 4, 21), 1415426],
    ])('toOrdinal() of %o to be %i', (date, ordinal) => {
        expect(date.toOrdinal()).toBe(ordinal);
    });

    test.each([
        [new Date(2019, 9, 3), 1],
        [new Date(1920, 2, 12), 3],
    ])('weekday of %o to be %i', (date, weekday) => {
        expect(date.weekday()).toBe(weekday);
    });

    test('isoFormat()', () => {
        const date = new Date(34, 8, 29);
        expect(date.isoFormat()).toBe('0034-08-29');
    });

    test.each([
        ['%a', 'Thu'],
        ['%A', 'Thursday'],
        ['%w', '4'],
        ['%d', '07'],
        ['%b', 'Mar'],
        ['%B', 'March'],
        ['%m', '03'],
        ['%y', '65'],
        ['%Y', '0965'],
        ['%%', '%'],
        ['%Y/%m/%d %%(%a)', '0965/03/07 %(Thu)'],
    ])('strftime("%s")', (format, expected) => {
        const date = new Date(965, 3, 7);
        expect(date.strftime(format)).toBe(expected);
    });

    test('toString()', () => {
        const date = new Date(2839, 12, 8);
        expect(date.toString()).toBe('2839-12-08');
    });

    test('valueOf()', () => {
        const date = new Date(89, 1, 30);
        expect(date.valueOf()).toBe(date.toOrdinal());
    });
});

describe('TimeZone', () => {
    test('throws an error calling constructor with offset of 24 or greater hours', () => {
        expect(() => new TimeZone(new TimeDelta({days: 1}))).toThrow(
            RangeDateTimeError);
    });

    test('throws an error calling constructor with offset of -24 or lesser hours', () => {
        expect(() => new TimeZone(new TimeDelta({days: -1}))).toThrow(
            RangeDateTimeError);
    });

    test('utcOffset() and tzName()', () => {
        const offset = new TimeDelta({hours: -3, minutes: 12, seconds: 42});
        const name = 'MyTimeZoneName';
        const tz = new TimeZone(offset, name);
        expect(cmp(tz.utcOffset(), offset)).toBe(0);
        expect(tz.tzName()).toBe(name);
    });

    test('tzName() when ommited in constructor', () => {
        expect(new TimeZone(new TimeDelta({hours: 22, minutes: 34})).tzName()).toBe('UTC+22:34');
        expect(new TimeZone(new TimeDelta({hours: -4})).tzName()).toBe('UTC-04:00');
    });

    test('dst() returns null', () => {
        expect(new TimeZone(new TimeDelta({hours: -23})).dst()).toBe(null);
    });

    test('has correct static property "utc"', () => {
        const utc = TimeZone.utc;
        expect(cmp(utc.utcOffset(), new TimeDelta({}))).toBe(0);
        expect(utc.tzName()).toBe('UTC');
    });

    test('fromUTC', () => {
        const tz = new TimeZone(new TimeDelta({hours: -10, minutes: -18}));
        const dtUTC = new DateTime(2019, 9, 6, 2, 45, 32, 312800, tz);
        const dt = new DateTime(2019, 9, 5, 16, 27, 32, 312800, tz);
        expect(cmp(tz.fromUTC(dtUTC), dt)).toBe(0);
    });

    test('throws error calling "fromUTC(dt)" with "dt" of different TimeZone instance', () => {
        const offset = new TimeDelta({hours: -15, minutes: -34});
        const tz1 = new TimeZone(offset);
        const tz2 = new TimeZone(offset);
        const dt = new DateTime(1284, 5, 31, 0, 0, 0, 0, tz1);
        expect(() => tz2.fromUTC(dt)).toThrow(ValueDateTimeError);
    });
});

describe('Time', () => {
    test('hour, minute, second, microsecond, tzInfo and fold props', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -9}));
        const t = new Time(21, 53, 8, 49103, tzInfo, 1);
        expect(t.hour).toBe(21);
        expect(t.minute).toBe(53);
        expect(t.second).toBe(8);
        expect(t.microsecond).toBe(49103);
        expect(t.tzInfo).toBe(tzInfo);
        expect(t.fold).toBe(1);
    });

    test.each([
        [24, 0, 0, 0, null, 0],
        [23, 60, 0, 0, null, 0],
        [23, 59, 60, 0, null, 0],
        [23, 59, 59, 1000000, null, 0],
        [23, 59, 59, 999999, null, 2],
    ])('throws an error calling constructor with hour=%j, minute=%j, ' +
       'second=%j, microsecond=%j, tzInfo=%o, fold=%j',
        (hour, minute, second, microsecond, tzInfo, fold) => {
            expect(() => new Time(
                hour, minute, second, microsecond, tzInfo, fold
            )).toThrow(RangeDateTimeError);
    });

    test.each([
        [new Time(9, 0, 5, 10, null, 0), new Time(9, 0, 5, 10, null, 0), 0],
        [new Time(22, 45, 59, 0, null, 0), new Time(22, 46, 0, 0, null, 0), -1],
        [new Time(15, 12, 0, 4, null, 0), new Time(15, 12, 0, 3, null, 0), 1],
        [new Time(0, 3, 0, 10, null, 1), new Time(0, 3, 0, 10, null, 0), 1],
        [new Time(5, 40, 32, 0, new TimeZone(new TimeDelta({hours: -21})), 0),
         new Time(5, 40, 32, 0, new TimeZone(new TimeDelta({hours: -21})), 0),
         0],
        [new Time(12, 21, 47, 0, new TimeZone(new TimeDelta({hours: 6})), 0),
         new Time(13, 21, 47, 1, new TimeZone(new TimeDelta({hours: 7})), 0),
         -1],
        [new Time(19, 16, 7, 472940, new TimeZone(
            new TimeDelta({hours: -6, minutes: 20})), 0),
         new Time(19, 26, 7, 472940, new TimeZone(
            new TimeDelta({hours: -6, minutes: 30})), 0),
         0],
    ])('cmp(%o, %o) to be %i', (a, b, expected) => {
        expect(cmp(a, b)).toBe(expected);
    });

    test('throws an error comparing aware and naive Time', () => {
        expect(() => cmp(
            new Time(0, 0, 0, 0, null),
            new Time(0, 0, 0, 0, new TimeZone(new TimeDelta({})))
        )).toThrow();
    });

    test('omitting constructor arguments', () => {
        const expected = new Time(0, 0, 0, 0, null, 0);
        expect(cmp(new Time(), expected)).toBe(0);
    });

    test('has correct static prop "min"', () => {
        expect(cmp(Time.min, new Time(0, 0, 0, 0))).toBe(0);
    });

    test('has correct static prop "max"', () => {
        expect(cmp(Time.max, new Time(23, 59, 59, 999999))).toBe(0);
    });

    test('has correct static prop "resolution"', () => {
        expect(cmp(Time.resolution, new TimeDelta({microseconds: 1}))).toBe(0);
    });

    test.each([
        ['16', new Time(16, 0, 0)],
        ['21:22', new Time(21, 22, 0)],
        ['04:51:23', new Time(4, 51, 23)],
        ['12:00:03.099', new Time(12, 0, 3, 99000)],
        ['07:59:30.048210', new Time(7, 59, 30, 48210)],
        ['17:20:39.983027-01:32',
         new Time(17, 20, 39, 983027,
                  new TimeZone(new TimeDelta({hours: -1, minutes: -32})))],
        ['23:02:44+20:15',
         new Time(23, 2, 44, 0,
                  new TimeZone(new TimeDelta({hours: 20, minutes: 15})))],
    ])('fromISOFormat("%s")', (timeString, expected) => {
        const t = Time.fromISOFormat(timeString);
        expect(t).toBeEqualDateTime(expected);
        if(expected.utcOffset() == null)
            expect(t.utcOffset()).toBeNull();
        else
            expect(t.utcOffset()).toBeEqualDateTime(expected.utcOffset());
    });

    test.each([
        ['24'], ['02:60'], ['14:9'], ['10:20:41.3890'], ['19:41-03:103'],
    ])('fromISOFormat("%s") throws error', timeString => {
        expect(() => Time.fromISOFormat(timeString)).toThrow();
    });

    test.each([
        [18, undefined, undefined, undefined, undefined, undefined,
         new Time(18, 50, 32, 570398, null, 0)],
        [undefined, 7, undefined, undefined, undefined, undefined,
         new Time(2, 7, 32, 570398, null, 0)],
        [undefined, undefined, 20, undefined, undefined, undefined,
         new Time(2, 50, 20, 570398, null, 0)],
        [undefined, undefined, undefined, 30928, undefined, undefined,
         new Time(2, 50, 32, 30928, null, 0)],
        [undefined, undefined, undefined, undefined,
         new TimeZone(new TimeDelta({})), undefined,
         new Time(2, 50, 32, 570398, new TimeZone(new TimeDelta({})), 0)],
        [undefined, undefined, undefined, undefined, undefined, 1,
         new Time(2, 50, 32, 570398, null, 1)],
    ])('replace({hour: %j, minute: %j, second: %j, microsecond: %j, ' +
       'tzInfo: %o, fold: %j})',
        (hour, minute, second, microsecond, tzInfo, fold, expected) => {
            const time = new Time(2, 50, 32, 570398, null, 0);
            const replaced = time.replace(
                {hour, minute, second, microsecond, tzInfo, fold});
            expect(replaced).toBeEqualDateTime(expected);
            expect(replaced.tzInfo)
                .toBe(tzInfo === undefined ? time.tzInfo : tzInfo);
            expect(replaced.fold).toBe(expected.fold);
    });

    test.each([
        ['auto', '07:51:12.039500-06:30'],
        ['microseconds', '07:51:12.039500-06:30'],
        ['milliseconds', '07:51:12.039-06:30'],
        ['seconds', '07:51:12-06:30'],
        ['minutes', '07:51-06:30'],
        ['hours', '07-06:30'],
    ])('isoFormat("%s") of aware Time', (timeSpec, expected) => {
        const time = new Time(
            7, 51, 12, 39500,
            new TimeZone(new TimeDelta({hours: -6, minutes: -30})));
        expect(time.isoFormat(timeSpec)).toBe(expected);
    });

    test('isoFormat() of naive Time', () => {
        const time = new Time(0, 9, 39);
        expect(time.isoFormat()).toBe('00:09:39');
    });

    test('utcOffset()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: 20}));
        let time = new Time(0, 0, 0, 0, tzInfo);
        expect(cmp(time.utcOffset(), tzInfo.utcOffset())).toBe(0);
        time = new Time(0, 0, 0);
        expect(time.utcOffset()).toBeNull();
    });

    test('dst()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -6}));
        let time = new Time(0, 0, 0, 0, tzInfo);
        expect(time.dst()).toBe(tzInfo.dst());
        time = new Time(0, 0, 0);
        expect(time.dst()).toBeNull();
    });

    test('tzName()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -6}));
        let time = new Time(0, 0, 0, 0, tzInfo);
        expect(time.tzName()).toBe(tzInfo.tzName());
        time = new Time(0, 0, 0);
        expect(time.tzName()).toBeNull();
    });

    test.each([
        ['%H', '17'],
        ['%I', '05'],
        ['%p', 'PM'],
        ['%M', '27'],
        ['%S', '40'],
        ['%f', '040029'],
        ['%z', '-0345'],
        ['%Z', 'UTC-03:45'],
    ])('strftime("%s") of aware Time to be "%s"', (format, expected) => {
        const t = new Time(
            17, 27, 40, 40029,
            new TimeZone(new TimeDelta({hours: -3, minutes: -45}))
        );
        expect(t.strftime(format)).toBe(expected);
    });

    test.each([
        ['%z', ''],
        ['%Z', ''],
    ])('strftime("%s") of naive Time to be "%s"', (format, expected) => {
        const t = new Time(3, 10, 55, 503830);
        expect(t.strftime(format)).toBe(expected);
    });

    test('toString()', () => {
        const t = new Time(
            18, 9, 29, 0,
            new TimeZone(new TimeDelta({hours: 20, minutes: 38})));
        expect(t.toString()).toBe('18:09:29+20:38');
    });
});

describe('DateTime', () => {
    test('hour, minute, second, microsecond, tzInfo and fold props', () =>{
        const tzInfo = new TimeZone(new TimeDelta({}));
        const dt = new DateTime(5934, 9, 12, 21, 19, 44, 871048, tzInfo, 1);
        expect(dt.year).toBe(5934);
        expect(dt.month).toBe(9);
        expect(dt.day).toBe(12);
        expect(dt.hour).toBe(21);
        expect(dt.minute).toBe(19);
        expect(dt.second).toBe(44);
        expect(dt.microsecond).toBe(871048);
        expect(dt.tzInfo).toBe(tzInfo);
        expect(dt.fold).toBe(1);
    });

    test.each([
        [MAXYEAR + 1, 1, 1, 0, 0, 0, 0, null, 0],
        [1, 13, 1, 0, 0, 0, 0, null, 0],
        [1, 2, 29, 0, 0, 0, 0, null, 0],
        [1, 1, 1, 24, 0, 0, 0, null, 0],
        [1, 1, 1, 0, 60, 0, 0, null, 0],
        [1, 1, 1, 0, 0, 60, 0, null, 0],
        [1, 1, 1, 0, 0, 0, 1000000, null, 0],
        [1, 1, 1, 0, 0, 0, 0, null, 2],
    ])('throws an error calling constructor with year=%j, month=%j, day=%j, ' +
       'hour=%j, minute=%j, second=%j, microsecond=%j, tzInfo=%o, fold=%j',
        (year, month, day, hour, minute, second, microsecond, tzInfo, fold) => {
            expect(() => new DateTime(
                year, month, day, hour, minute, second, microsecond, tzInfo, fold
            )).toThrow(RangeDateTimeError);
    });

    test.each([
        [new DateTime(3905, 4, 15, 9, 48, 30, 31803,
                      new TimeZone(new TimeDelta({hours: 14, minutes: 48}))),
         new DateTime(3905, 4, 15, 13, 31, 30, 31803,
                      new TimeZone(new TimeDelta({hours: 18, minutes: 31}))),
         0],
        [new DateTime(2189, 7, 1, 20, 10, 49, 0,
                      new TimeZone(new TimeDelta({hours: -1, minutes: -30}))),
         new DateTime(2189, 7, 1, 22, 10, 49, 0,
                      new TimeZone(new TimeDelta({hours: 1}))),
         +1],
        [new DateTime(2000, 2, 29, 0, 0, 0, 0,
                      new TimeZone(new TimeDelta({hours: 22, minutes: 30}))),
         new DateTime(2000, 2, 28, 1, 0, 0, 0,
                      new TimeZone(new TimeDelta({hours: -1}))),
         -1]
    ])('cmp(%o, %o) to be %i', (a, b, expected) => {
        expect(cmp(a, b)).toBe(expected);
    });

    test('throws an error comparing aware and naive DateTime', () => {
        expect(() => cmp(
            new DateTime(1, 1, 1, 0, 0, 0, 0, null),
            new DateTime(1, 1, 1, 0, 0, 0, 0, new TimeZone(new TimeDelta({})))
        )).toThrow();
    });

    test('omitting constructor arguments', () => {
        const expected = new DateTime(3940, 5, 23, 0, 0, 0, 0, null, 0);
        expect(cmp(new DateTime(3940, 5, 23), expected)).toBe(0);
    });

    test('has correct static prop "min"', () => {
        expect(cmp(DateTime.min, new DateTime(MINYEAR, 1, 1))).toBe(0);
    });

    test('has correct static prop "max"', () => {
        expect(cmp(DateTime.max, new DateTime(MAXYEAR, 12, 31, 23, 59, 59, 999999))).toBe(0);
    });

    test('has correct static prop "resolution"', () => {
        expect(cmp(DateTime.resolution, new TimeDelta({microseconds: 1}))).toBe(0);
    });

    test('fromStdDate() with utc=false', () => {
        const stdDate = new StdDate(209, 2, 10, 12, 34, 52, 108);
        const date = new DateTime(209, 3, 10, 12, 34, 52, 108000);
        expect(DateTime.fromStdDate(stdDate)).toBeEqualDateTime(date);
    });

    test('fromStdDate() with utc=true', () => {
        const stdDate = new StdDate(StdDate.UTC(209, 2, 10, 12, 34, 52, 108));
        const date = new DateTime(209, 3, 10, 12, 34, 52, 108000);
        expect(DateTime.fromStdDate(stdDate, true)).toBeEqualDateTime(date);
    });

    test('today()', () => {
        const today = DateTime.today();
        const expected = DateTime.fromStdDate(new StdDate());
        expect(today).toBeGreaterDateTimeThan(
            sub(expected, new TimeDelta({seconds: 1})));
        expect(today).toBeLessThanOrEqualDateTime(expected);
    });

    test('now() without argument', () => {
        const now = DateTime.now();
        const expected = DateTime.fromStdDate(new StdDate());
        expect(now).toBeGreaterDateTimeThan(
            sub(expected, new TimeDelta({seconds: 1})));
        expect(now).toBeLessThanOrEqualDateTime(expected);
    });

    test('now(tz) with argument', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -21}));
        const now = DateTime.now(tzInfo);
        let expected = DateTime.fromStdDate(new StdDate(), true);
        expected = tzInfo.fromUTC(expected.replace({tzInfo: tzInfo}));
        expect(now).toBeGreaterThanOrEqualDateTime(
            sub(expected, new TimeDelta({seconds: 1})));
        expect(now).toBeLessThanOrEqualDateTime(expected);
    })

    test('utcNow()', () => {
        const utcNow = DateTime.utcNow();
        const expected = DateTime.fromStdDate(new StdDate(), true);
        expect(utcNow).toBeGreaterThanOrEqualDateTime(
            sub(expected, new TimeDelta({seconds: 1})));
        expect(utcNow).toBeLessThanOrEqualDateTime(expected);
    });

    test('fromTimeStamp() with timezone unspeicified', () => {
        const dt = DateTime.fromTimeStamp(819004012);
        let expected = new DateTime(1995, 12, 15, 5, 6, 52, 0, TimeZone.utc);
        expected = expected.asTimeZone(LOCALTZINFO).replace({tzInfo: null});
        expect(dt).toBeEqualDateTime(expected);
    });

    test('fromTimeStamp() with timezone specified', () => {
        const dt = DateTime.fromTimeStamp(
            2404389194, new TimeZone(new TimeDelta({hours: -2})));
        const expected = new DateTime(
            2046, 3, 11, 11, 53, 14, 0,
            new TimeZone(new TimeDelta({hours: -2})));
        expect(dt).toBeEqualDateTime(expected);
        expect(dt.utcOffset()).toBeEqualDateTime(expected.utcOffset());
    });

    test('utcFromTimeStamp()', () => {
        const expected = new DateTime(2031, 7, 8, 0, 9, 51);
        expect(DateTime.utcFromTimeStamp(1941235791))
            .toBeEqualDateTime(expected);
    });

    test('combine() with timezone unspecified', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: 12, minutes: 36}));
        const combined = DateTime.combine(
            new Date(8105, 12, 9), new Time(3, 59, 12, 390590, tzInfo, 1));
        expect(combined).toBeEqualDateTime(
            new DateTime(8105, 12, 9, 3, 59, 12, 390590, tzInfo, 1));
        expect(combined.tzInfo).toBe(tzInfo);
    });

    test('combine() with timezone specified', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -22, minutes: -5}));
        const combined = DateTime.combine(
            new Date(192, 3, 28), new Time(20, 1, 32, 525456, null, 1),
            tzInfo);
        expect(combined).toBeEqualDateTime(
            new DateTime(192, 3, 28, 20, 1, 32, 525456, tzInfo, 1));
        expect(combined.tzInfo).toBe(tzInfo);
    });

    test.each([
        ['0983-02-28T12:47:20.981305',
         new DateTime(983, 2, 28, 12, 47, 20, 981305)],
        ['2899-06-02 05-23:13:46',
         new DateTime(2899, 6, 2, 5, 0, 0, 0, new TimeZone(
             new TimeDelta({hours: -23, minutes: -13, seconds: -46})))],
    ])('fromISOFormat("%s")', (timeString, expected) => {
        const received = DateTime.fromISOFormat(timeString);
        expect(received).toBeEqualDateTime(expected);
        if(expected.utcOffset() == null)
            expect(received.utcOffset()).toBeNull();
        else
            expect(received.utcOffset()).toBeEqualDateTime(expected.utcOffset());
    });

    test('toStdDate()', () => {
        const dt = new DateTime(3832, 4, 5, 12, 37, 15, 389119);
        const received = dt.toStdDate();
        expect(received.getFullYear()).toBe(3832);
        expect(received.getMonth()).toBe(3);
        expect(received.getDate()).toBe(5);
        expect(received.getHours()).toBe(12);
        expect(received.getMinutes()).toBe(37);
        expect(received.getSeconds()).toBe(15);
        expect(received.getMilliseconds()).toBe(389);
    });

    test('toStdDate(true)', () => {
        const dt = new DateTime(3832, 4, 5, 12, 37, 15, 389119);
        const received = dt.toStdDate(true);
        expect(received.getUTCFullYear()).toBe(3832);
        expect(received.getUTCMonth()).toBe(3);
        expect(received.getUTCDate()).toBe(5);
        expect(received.getUTCHours()).toBe(12);
        expect(received.getUTCMinutes()).toBe(37);
        expect(received.getUTCSeconds()).toBe(15);
        expect(received.getUTCMilliseconds()).toBe(389);
    });

    test('date()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: 11}));
        const dt = new DateTime(9284, 4, 26, 9, 34, 52, 294581, tzInfo, 1);
        expect(dt.date()).toBeEqualDateTime(new Date(9284, 4, 26));
    });

    test('time()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: 11}));
        const dt = new DateTime(9284, 4, 26, 9, 34, 52, 294581, tzInfo, 1);
        expect(dt.time())
            .toBeEqualDateTime(new Time(9, 34, 52, 294581, null, 1));
    });

    test('timetz()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: 11}));
        const dt = new DateTime(9284, 4, 26, 9, 34, 52, 294581, tzInfo, 1);
        const received = dt.timetz();
        expect(received)
            .toBeEqualDateTime(new Time(9, 34, 52, 294581, tzInfo, 1));
        expect(received.tzInfo).toBe(tzInfo);
    });

    test.each([
        [2900, undefined, undefined, undefined, undefined, undefined,
         undefined, undefined, undefined, new DateTime(
             2900, 6, 30, 18, 30, 28, 9842,
             new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, 10, undefined, undefined, undefined, undefined,
         undefined, undefined, undefined, new DateTime(
            459, 10, 30, 18, 30, 28, 9842,
            new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, undefined, 21, undefined, undefined, undefined,
         undefined, undefined, undefined, new DateTime(
            459, 6, 21, 18, 30, 28, 9842,
            new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, undefined, undefined, 8, undefined, undefined,
         undefined, undefined, undefined, new DateTime(
            459, 6, 30, 8, 30, 28, 9842,
            new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, undefined, undefined, undefined, 45, undefined,
         undefined, undefined, undefined, new DateTime(
            459, 6, 30, 18, 45, 28, 9842,
            new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, undefined, undefined, undefined, undefined, 2,
         undefined, undefined, undefined, new DateTime(
            459, 6, 30, 18, 30, 2, 9842,
            new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, undefined, undefined, undefined, undefined, undefined,
         829486, undefined, undefined, new DateTime(
            459, 6, 30, 18, 30, 28, 829486,
            new TimeZone(new TimeDelta({hours: 21})), 1)],
        [undefined, undefined, undefined, undefined, undefined, undefined,
         undefined, null, undefined, new DateTime(
            459, 6, 30, 18, 30, 28, 9842, null, 1)],
        [undefined, undefined, undefined, undefined, undefined, undefined,
         undefined, undefined, 0, new DateTime(
            459, 6, 30, 18, 30, 28, 9842,
            new TimeZone(new TimeDelta({hours: 21})), 0)],
    ])('replace({year: %j, month: %j, day: %j, hour: %j, minute: %j, ' +
       'second: %j, microsecond: %j, tzInfo: %o, fold: %j})',
       (year, month, day, hour, minute, second, microsecond, tzInfo, fold,
        expected) => {
        const tz = new TimeZone(new TimeDelta({hours: 21}));
        const dt = new DateTime(459, 6, 30, 18, 30, 28, 9842, tz, 1);
        const replaced = dt.replace({
            year, month, day, hour, minute, second, microsecond, tzInfo, fold
        });
        expect(replaced).toBeEqualDateTime(expected);
        expect(replaced.tzInfo)
            .toBe(tzInfo === undefined ? dt.tzInfo : tzInfo);
        expect(replaced.fold).toBe(expected.fold);
    });

    test.each([
        [new TimeZone(new TimeDelta({minutes: -32})), new DateTime(2083, 4, 27, 6, 49, 34, 949059)],
    ])('asTimeZone(%o) of aware DateTime', (tz, expectedWithoutTZInfo) => {
        const expected = expectedWithoutTZInfo.replace({tzInfo: tz});
        const tzInfo = new TimeZone(new TimeDelta(
            {hours: 10, minutes: 20, seconds: 53, microseconds: 190489}));
        const dt = new DateTime(2083, 4, 27, 17, 42, 28, 139548, tzInfo);
        const received = dt.asTimeZone(tz);
        expect(received).toBeEqualDateTime(expected);
        expect(received.tzInfo).toBe(expected.tzInfo);
    });

    test('asTimeZone(tz) of naive DateTime with tz', () => {
        const dt = new DateTime(298, 2, 3, 21, 39, 40, 928471);
        const tz = new TimeZone(new TimeDelta({hours: 21, seconds: 11}));
        const received = dt.asTimeZone(tz);
        const expected = dt.replace({tzInfo: LOCALTZINFO}).asTimeZone(tz);
        expect(received).toBeEqualDateTime(expected);
        expect(received.tzInfo).toBe(expected.tzInfo);
    });

    test('asTimeZone() of aware DateTime omitting argument', () => {
        const dt = new DateTime(5782, 8, 29, 16, 42, 14, 568358, new TimeZone(
            new TimeDelta({minutes: -35, microseconds: -3988})));
        const received = dt.asTimeZone();
        const expected = dt.asTimeZone(LOCALTZINFO).replace({tzInfo: null});
        expect(received).toBeEqualDateTime(expected);
        expect(received.tzInfo).toBe(expected.tzInfo);
    });

    test('asTimeZone() of naive DateTime omitting argument', () => {
        const dt = new DateTime(5782, 8, 29, 16, 42, 14, 568358);
        const received = dt.asTimeZone();
        const expected = received;
        expect(received).toBeEqualDateTime(expected);
        expect(received.tzInfo).toBe(expected.tzInfo);
    });

    test('utcOffset()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -20}));
        let dt = new DateTime(1, 1, 1, 0, 0, 0, 0, tzInfo);
        expect(dt.utcOffset()).toBeEqualDateTime(tzInfo.utcOffset());
        dt = new DateTime(1, 1, 1, 0, 0, 0, 0, null);
        expect(dt.utcOffset()).toBeNull();
    });

    test('dst()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -6}));
        let time = new DateTime(1, 1, 1, 0, 0, 0, 0, tzInfo);
        expect(time.dst()).toBe(tzInfo.dst());
        time = new DateTime(1, 1, 1, 0, 0, 0, 0, null);
        expect(time.dst()).toBeNull();
    });

    test('tzName()', () => {
        const tzInfo = new TimeZone(new TimeDelta({hours: -6}));
        let time = new DateTime(1, 1, 1, 0, 0, 0, 0, tzInfo);
        expect(time.tzName()).toBe(tzInfo.tzName());
        time = new DateTime(1, 1, 1, 0, 0, 0, 0, null);
        expect(time.tzName()).toBeNull();
    });

    test('timeStamp() of aware DateTime', () => {
        const dt = new DateTime(4920, 2, 29, 14, 43, 55, 289453,
                                new TimeZone(new TimeDelta({hours: 9})));
        expect(dt.timeStamp()).toBeCloseTo(93098094235.28946);
    });

    test('timeStamp() of naive DateTime', () => {
        const dt = new DateTime(7194, 8, 20, 8, 29, 0, 3029);
        expect(dt.timeStamp())
            .toBeCloseTo(dt.replace({tzInfo: LOCALTZINFO}).timeStamp());
    });

    test.each([
        [' ', 'auto', '2948-04-13 09:33:00+03:34'],
        ['T', 'microseconds', '2948-04-13T09:33:00.000000+03:34'],
        ['T', 'milliseconds', '2948-04-13T09:33:00.000+03:34'],
        [' ', 'seconds', '2948-04-13 09:33:00+03:34'],
        ['T', 'minutes', '2948-04-13T09:33+03:34'],
        ['abcd', 'hours', '2948-04-13abcd09+03:34'],
    ])('isoFormat("%s", "%s") of aware DateTime', (sep, timespec, expected) => {
        const dt = new DateTime(2948, 4, 13, 9, 33, 0, 0, new TimeZone(
            new TimeDelta({hours: 3, minutes: 34})));
        expect(dt.isoFormat(sep, timespec)).toBe(expected);
    });

    test.each([
        ['%a', 'Sun'],
        ['%A', 'Sunday'],
        ['%w', '0'],
        ['%d', '09'],
        ['%b', 'Oct'],
        ['%B', 'October'],
        ['%m', '10'],
        ['%y', '40'],
        ['%Y', '8540'],
        ['%H', '11'],
        ['%I', '11'],
        ['%p', 'AM'],
        ['%M', '52'],
        ['%S', '05'],
        ['%f', '839041'],
        ['%z', '+0000'],
        ['%Z', 'UTC'],
        ['%%%Y %b %d %p%I:%M:%S%Z%%', '%8540 Oct 09 AM11:52:05UTC%'],
    ])('strftime("%s")', (format, expected) => {
        const dt = new DateTime(8540, 10, 9, 11, 52, 5, 839041,
                                new TimeZone(new TimeDelta({})));
        expect(dt.strftime(format)).toBe(expected);
    });

    test('toString()', () => {
        const dt = new DateTime(39, 6, 23, 21, 39, 0, 0, new TimeZone(
            new TimeDelta({minutes: -51, seconds: -19, microseconds: -48819})
        ));
        expect(dt.toString()).toBe('0039-06-23 21:39:00-00:51:19.048819');
    });
});

describe('add', () => {
    test.each([
        [new TimeDelta({
            days: 194, seconds: 8 * 3600 + 31 * 60 + 4, microseconds: 103802,
         }), new TimeDelta({
            days: 39, seconds: 23 * 3600 + 9 * 60 + 50, microseconds: 38990,
         }), new TimeDelta({
            days: 234, seconds: 7 * 3600 + 40 * 60 + 54, microseconds: 142792,
         })],
        [new TimeDelta({
            days: -10, seconds: -(2 * 3600 + 30 * 60), microseconds: -928001,
         }), new TimeDelta({
            days: 11, seconds: 10 * 3600 + 42 * 60 + 21, microseconds: 201984,
         }), new TimeDelta({
            days: 1, seconds: 8 * 3600 + 12 * 60 + 21, microseconds: -726017,
         })],
        [new Date(29, 8, 3),
         new TimeDelta({days: -20, seconds: 49881, microseconds: 388810}),
         new Date(29, 7, 14)],
        [new TimeDelta({days: 1000, seconds: 8299, microseconds: 189581}),
         new Date(8400, 1, 28),
         new Date(8402, 10, 24)],
        [new DateTime(2001, 10, 23, 0, 29, 18, 839029),
         new TimeDelta({
             days: -490, seconds: -(3 * 3600 + 44 * 60 + 26),
             microseconds: -38189
         }),
         new DateTime(2000, 6, 19, 20, 44, 52, 800840)],
        [new TimeDelta({
             days: 38, seconds: 13 * 3600 + 48 * 60 + 11,
             microseconds: 572984
         }),
         new DateTime(4019, 4, 15, 22, 1, 57, 399027,
                      new TimeZone(new TimeDelta({hours: 5}))),
         new DateTime(4019, 5, 24, 11, 50, 8, 972011,
                      new TimeZone(new TimeDelta({hours: 5})))],
    ])('adds %s and %s to be %s', (a, b, expected) => {
        const added = add(a, b);
        expect(added).toBeEqualDateTime(expected);
        if(expected.tzInfo !== undefined) {
            const tz = a.tzInfo !== undefined ? a.tzInfo : b.tzInfo;
            expect(added.tzInfo).toBe(tz);
        }
    });
});

describe('sub', () => {
    test.each([
        [new TimeDelta({days: 29, seconds: 298, microseconds: 299990}),
         new TimeDelta({weeks: 3, minutes: 3489, milliseconds: 29948}),
         new TimeDelta({days: -6, seconds: 36271, microseconds: 648010})],
        [new TimeDelta({days: -387, hours: -14, seconds: -837978}),
         new DateTime(2984, 12, 11, 10, 39, 0, 928859,
                      new TimeZone(new TimeDelta({hours: -1}))),
         new DateTime(2986, 1, 12, 17, 25, 18, 928859,
                      new TimeZone(new TimeDelta({hours: -1})))],
        [new DateTime(3995, 4, 9, 12, 49, 21, 288549),
         new DateTime(1988, 8, 19, 3, 9, 40, 299800),
         new TimeDelta({days: -732910, seconds: 51619, microseconds: 11251})],
        [new DateTime(189, 5, 21, 1, 25, 32, 472028,
                      new TimeZone(new TimeDelta({microseconds: 208984}))),
         new DateTime(201, 7, 17, 5, 48, 53, 380590,
                      new TimeZone(new TimeDelta({hours: -10}))),
         new TimeDelta({days: 4439, seconds: 51801, microseconds: 117546})],
        [new TimeDelta({days: -365, hours: 23, minutes: 48}),
         new Date(682, 3, 14),
         new Date(683, 3, 14)],
        [new Date(8190, 5, 29),
         new Date(8481, 3, 24),
         new TimeDelta({days: 106220})],
    ])('subtracts %s from %s to be %s', (a, b, expected) => {
        const received = sub(b, a);
        expect(received).toBeEqualDateTime(expected);
        if(expected.tzInfo !== undefined) {
            const tz = a.tzInfo !== undefined ? a.tzInfo : b.tzInfo;
            expect(received.tzInfo).toBe(tz);
        }
    });

    test('throws error taking difference between naive and aware DateTime',
         () =>{
        const naive = new DateTime(1, 1, 1, 0, 0, 0, 0, null);
        const aware = new DateTime(1, 1, 1, 0, 0, 0, 0,
                                   new TimeZone(new TimeDelta({})));
        expect(() => sub(naive, aware)).toThrow();
        expect(() => sub(aware, naive)).toThrow();
    });
});