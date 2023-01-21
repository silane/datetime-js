# datetime

Date and time library for JavaScript similar to Python's "datetime" package.

Available for TypeScript, ES Module, Common JS and browser(CDN).

## Getting Started with Browser
Add `script` tag to your HTML.
```html
<script src="https://cdn.jsdelivr.net/npm/@silane/datetime/umd/datetime.js"></script>
```
Then a global variable `datetime` contains all objects exported by this library.
```html
<script>
const Date = datetime.Date;
const timedelta = datetime.timedelta;
const add = datetime.add;
const dtexpr = datetime.dtexpr;
// So on...
</script>
```

## Getting Started with Node
### Install
```shell
npm install @silane/datetime
```

### TypeScript or ES Module
```javascript
import { Date, TimeDelta, add, dtexpr } from '@silane/datetime';
```

### Common JS
```javascript
const { Date, TimeDelta, add, dtexpr } = require('@silane/datetime');
```

## Features
This library has the almost same classes and functions as ["datetime" package in Python](https://docs.python.org/3/library/datetime.html).

Differences are:
- Identifier names are changed in order to adapt to JavaScript's naming style.
- Some methods are not implemented.
- Has some methods that are not in Python's package.
- Parameter signature of some methods are different (because JavaScript does not support keyword argument passing).
- Arithmetic operators are not supported because JavaScript does not support operator overriding.
  Instead you must use corresponding functions or `dtexpr` as explained after.

### Major Classes
Here introduce 4 major classes. See JSDoc and python's doc for the detail and other classes.

#### TimeDelta
Represents a duration, the difference between two dates or times.
```javascript
const td = new TimeDelta({ days: 1, hours: 22, minutes: 53, seconds: 12, microseconds: 324987 });

const td2 = timedelta({ days: -10, minutes: -829 }); // Convenient function without `new`
```
#### Date
Represents a date (year, month and day) in an idealized calendar.
```javascript
const d = new Date(2020, 5, 28); // 2020/05/28

const d2 = date(1948, 12, 8);
```
#### Time
A Time object represents a (local) time of day, independent of any particular
day, and subject to adjustment via a tzinfo object.
```javascript
const t = new Time(8, 15, 37, 38899); // 08:15:37.038899

const t2 = time(23, 59, 59);
```
#### DateTime
A DateTime object is a single object containing all the information from a
Date object and a Time object.
```javascript
const dt = new DateTime(2020, 5, 28, 8, 15, 37, 38899); // 2020/05/28 08:15:37.038899

const dt2 = datetime(1830, 1, 1);
```

## Arithmetic Operations
Since JavaScript cannot override operator, arithmetic operation on datetime objects requires to use individual functions: `neg`, `add`, `sub`, `cmp`.

- `neg(a)`: Perform negation
  - `neg(a: TimeDelta): TimeDelta`
- `add(a, b)`: Perform addition
  - `add(a: TimeDelta, b: TimeDelta): TimeDelta`
  - `add(a: Date, b: TimeDelta): Date`
  - `add(a: DateTime, b: TimeDelta): DateTime`
  - `add(a: Time, b: TimeDelta): Time`
    - Not defined in the Python library.
    - Time cycles every 24 hours, which means 21:00 plus 6 hours is 03:00.
- `sub(a, b)`: Perform subtraction
  - `sub(a: TimeDelta, b: TimeDelta): TimeDelta`
  - `sub(a: DateTime, b: TimeDelta): DateTime`
  - `sub(a: DateTime, b: DateTime): TimeDelta`
  - `sub(a: Date, b: TimeDelta): Date`
  - `sub(a: Date, b: Date): TimeDelta`
  - `sub(a: Time, b: TimeDelta): Time`
    - Not defined in the Python library.
    - Same as `add(a, neg(b))`.
  - `sub(a: Time, b: Time): TimeDelta`
    - Not defined in the Python library.
    - Result is always positive duration, which means 9:00 minus 10:00 is 23 hours.
- `cmp(a, b)`: Perform comparison - returns `0` if two are equal, `1` if `a` is greater than `b` and `-1` if `b` is greater than `a`.
  - `cmp(a: TimeDelta, b: TimeDelta): -1 | 0 | 1`
  - `cmp(a: DateTime, b: DateTime): -1 | 0 | 1`
  - `cmp(a: Date, b: Date): -1 | 0 | 1`
  - `cmp(a: Time, b: Time): -1 | 0 | 1`

Note that multiplication and division are not supported.


### dtexpr
Using individual function can make code complex and hard to read.
In that case, `dtexpr` can be used to write an arithmetic expression in a more natual manner.

`dtexpr` is a [tagged template function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)
and used like the following.
```javascript
const td1 = timedelta({ hours: 7 });
const td2 = timedelta({ days: 2 });
const d1 = date(2020, 3, 19);
const d2 = date(2020, 3, 17);

dtexpr`${td1} + ${td2}` // returns timedelta({hours: 55})
dtexpr`${d1} - ${td2} == ${d2}` // returns true
dtexpr`${td1} < -${td2}` // returns false
```

A drawback is that `dtexpr` is not typed in TypeScript.
