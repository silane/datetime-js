# datetime

Date and time library for JavaScript similar to Python's "datetime" package.

Available for ES Module, Common JS and browser(CDN).

## Getting Started with Browser
Add `script` tag to your HTML.
```html
<script src="https://cdn.jsdelivr.net/npm/@silane/datetime/umd/datetime.js"></script>
```
Then a global variable `datetime` contains all objects exported by this library.
```html
<script>
const Date = datetime.Date;
const TimeDelta = datetime.TimeDelta;
const dtexpr = datetime.dtexpr;
// So on...
</script>
```

## Getting Started with Node
### Install
```shell
npm install @silane/datetime
```

### ES Module
If you want to use `Date`, `TimeDelta` and `dtexpr`:
```javascript
import { Date, TimeDelta, dtexpr } from '@silane/datetime';
```

### Common JS
If you want to use `Date`, `TimeDelta` and `dtexpr`:
```javascript
const { Date, TimeDelta, dtexpr } = require('@silane/datetime');
```

## Features
This library has the almost same classes and functions as ["datetime" package in Python](https://docs.python.org/3/library/datetime.html).

The differences are as follows.
- Identifier names are changed in order to adapt to JavaScript's naming style.
- Some methods are not implemented.
- Has some methods that are not in Python's package.
- Parameter form of some methods are different (because JavaScript does not support keyword argument passing).
- Operator's are not supported because JavaScript does not support operator overriding.
  Instead, you can use `dtexpr` feature as explained below.

### Main Classes
Here introduce 4 main classes. See JSDoc and python's doc for the detail and other classes.

#### TimeDelta
Represents a duration, the difference between two dates or times.
```javascript
const td = new TimeDelta({ days: 1, hours: 22, minutes: 53, seconds: 12, microseconds: 324987});
```
#### Date
Represents a date (year, month and day) in an idealized calendar.
```javascript
const d = new Date(2020, 5, 28); // 2020/05/28
```
#### Time
A Time object represents a (local) time of day, independent of any particular
day, and subject to adjustment via a tzinfo object.
```javascript
const t = new Time(8, 15, 37, 38899); // 08:15:37.038899
```
#### DateTime
A DateTime object is a single object containing all the information from a
Date object and a Time object.
```javascript
const dt = new DateTime(2020, 5, 28, 8, 15, 37, 38899); // 2020/05/28 08:15:37.038899
```

## dtexpr (alternative to operator overriding)
Since JavaScript does not support operator overriding, dtexpr is used to write
an expression.
`dtexpr` is a [tagged template function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)
and used like:
```javascript
const td1 = new TimeDelta({ hours: 7 });
const td2 = new TimeDelta({ days: 2 });
const d1 = new Date(2020, 3, 19);
const d2 = new Date(2020, 3, 17);

dtexpr`${td1} + ${td2}` // returns new TimeDelta({hours: 55})
dtexpr`${d1} - ${td2} == ${d2}` // returns true
```

### Supported Expression
- Negation -
  - -TimeDelta -> TimeDelta
- Addition +
  - TimeDelta + TimeDelta -> TimeDelta
  - Date + TimeDelta -> Date
  - DateTime + TimeDelta -> DateTime
- Subtraction -
  - TimeDelta - TimeDelta -> TimeDelta
  - DateTime - TimeDelta -> DateTime
  - DateTime - DateTime -> TimeDelta
  - Date - TimeDelta -> Date
  - Date - Date -> TimeDelta
- Equality ==, !=
  - TimeDelta == TimeDelta -> boolean
  - DateTime == DateTime -> boolean
  - Date == Date -> boolean
  - Time == Time -> boolean
- Comparison <, >, <=, >=
  - TimeDelta < TimeDelta -> boolean
  - DateTime < DateTme -> boolean
  - Date < Date -> boolean
  - Time < Time -> boolean
- Brackets ()

Note that multiplication and division are not supported.
Also operation with boolean type is not supported.
