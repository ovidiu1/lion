# Calendar

`lion-calendar` is a reusable and accessible calendar view.

```js script
import { html, css } from '@lion/core';
import './lion-calendar.js';

export default {
  title: 'Others/Calendar',
};

const calendarDemoStyle = css`
  .demo-calendar {
    border: 1px solid #adadad;
    box-shadow: 0 0 16px #ccc;
    max-width: 500px;
  }
`;
```

```js story
export const main = () => {
  return html`
    <style>
      ${calendarDemoStyle}
    </style>
    <lion-calendar class="demo-calendar"></lion-calendar>
  `;
};
```

## Features

- fully accessible keyboard navigation (Arrow Keys, PgUp, PgDn, ALT+PgUp, ALT+PgDn)
- **minDate**: disables all dates before a given date
- **maxDate**: disables all dates after a given date
- **disableDates**: disables some dates within an available range
- **selectedDate**: currently selected date
- **centralDate**: date that determines the currently visible month and that will be focused when keyboard moves the focus to the month grid
- **focusedDate**: (getter only) currently focused date (if there is any with real focus)
- **focusDate(date)**: focus on a certain date
- **focusSelectedDate()**: focus on the current selected date
- **focusCentralDate()**: focus on the current central date
- **firstDayOfWeek**: typically Sunday (default) or Monday
- **weekdayHeaderNotation**: long/short/narrow for the current locale (e.g. Thursday/Thu/T)
- **locale**: different locale for the current component only

## How to use

### Installation

```bash
npm i --save @lion/calendar
```

```js
import '@lion/calendar/lion-calendar.js';
```

### Example

```html
<lion-calendar></lion-calendar>
```

## Move to the selected date

The `selectedDate` is the date which is currently marked as selected.
You usually select a date by clicking on it with the mouse or hitting Enter on the keyboard.

The `selectedDate` might not be within the dates in the current month view.

```js preview-story
export const selectedDate = () => html`
  <style>
    ${calendarDemoStyle}
  </style>
  <lion-calendar class="demo-calendar" .selectedDate=${new Date(1988, 2, 5)}></lion-calendar>
`;
```

## Central Date

The `centralDate` defines which day will be focused when keyboard moves the focus to the current month grid.
By default it is set to today, or the enabled day of the current month view that is closest to today's date.

The next and previous months' buttons work by changing the `centralDate` with plus or minus one month.
Changing the `centralDate` may mean a different view will be displayed to your users if it is in a different month.
Usually if you change only the day, "nothing" happens as it's already currently in view.

The `centralDate` can be different from `selectedDate` as you can have today as actively selected but still look at date that is years ago.
When the `selectedDate` changes, it will sync its value to the `centralDate`.

```js preview-story
export const centralDate = () => {
  const today = new Date();
  const centralDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return html`
    <style>
      ${calendarDemoStyle}
    </style>
    <lion-calendar class="demo-calendar" .centralDate="${centralDate}"></lion-calendar>
  `;
};
```

## Controlling focus

You can control the focus by calling the following methods

- `focusCentralDate()`
- `focusSelectedDate()`
- `focusDate(dateInstanceToFocus)`

Be aware that the central date changes when a new date is focused.

```js preview-story
export const controllingFocus = () => {
  const today = new Date();
  const selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const centralDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return html`
    <style>
      ${calendarDemoStyle}
    </style>
    <lion-calendar
      id="js-demo-calendar"
      class="demo-calendar"
      .selectedDate="${selectedDate}"
      .centralDate="${centralDate}"
    ></lion-calendar>
    <p>
      Focus
      <button @click="${() => document.querySelector('#js-demo-calendar').focusCentralDate()}">
        Central date
      </button>
      <button @click="${() => document.querySelector('#js-demo-calendar').focusSelectedDate()}">
        Selected date
      </button>
      <button @click="${() => document.querySelector('#js-demo-calendar').focusDate(today)}">
        Today
      </button>
    </p>
  `;
};
```

## Limiting selectable values

### Providing a lower limit

To give a lower limit you can bind a date to the `minDate` property.

```js preview-story
export const providingLowerLimit = () => {
  const minDate = new Date();
  return html`
    <style>
      ${calendarDemoStyle}
    </style>
    <lion-calendar class="demo-calendar" .minDate="${minDate}"></lion-calendar>
  `;
};
```

### Provide a higher limit

To give a higher limit you can bind a date to the `maxDate` property. In this example, we show how to create an offset of + 2 days.

```js preview-story
export const providingHigherLimit = () => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  return html`
    <style>
      ${calendarDemoStyle}
    </style>
    <lion-calendar class="demo-calendar" .maxDate="${maxDate}"></lion-calendar>
  `;
};
```

### Provide a list of disabled dates

In some cases a specific date or day of the week needs to be disabled, supply those days to the `disableDates` property.

```js preview-story
export const disabledDates = () => html`
  <style>
    ${calendarDemoStyle}
  </style>
  <lion-calendar
    class="demo-calendar"
    .disableDates=${day => day.getDay() === 6 || day.getDay() === 0}
  ></lion-calendar>
`;
```

### Combined disable dates

To limit the scope of possible dates further, combine the methods mentioned above.

```js preview-story
export const combinedDisabledDates = () => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
  return html`
    <style>
      ${calendarDemoStyle}
    </style>
    <lion-calendar
      class="demo-calendar"
      .disableDates=${day => day.getDay() === 6 || day.getDay() === 0}
      .minDate="${new Date()}"
      .maxDate="${maxDate}"
    ></lion-calendar>
  `;
};
```
