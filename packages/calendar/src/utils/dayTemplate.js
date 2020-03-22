import { html, ifDefined } from '@lion/core';

const defaultMonthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function dayTemplate(day, { weekdays, monthsLabels = defaultMonthLabels } = {}) {
  const dayNumber = day.date.getDate();
  const monthName = monthsLabels[day.date.getMonth()];
  const year = day.date.getFullYear();
  const weekdayName = weekdays[day.weekOrder];

  return html`
    <td role="gridcell" class="calendar__day-cell">
      <div
        role="button"
        .date=${day.date}
        class="calendar__day-button"
        tabindex=${day.tabindex}
        aria-label=${`${dayNumber} ${monthName} ${year} ${weekdayName}`}
        aria-pressed=${day.ariaPressed}
        aria-current=${ifDefined(day.ariaCurrent)}
        aria-disabled=${ifDefined(day.disabled ? 'true' : undefined)}
        ?disabled=${day.disabled}
        ?selected=${day.selected}
        ?past=${day.past}
        ?today=${day.today}
        ?future=${day.future}
        ?previous-month=${day.previousMonth}
        ?current-month=${day.currentMonth}
        ?next-month=${day.nextMonth}
      >
        ${day.date.getDate()}
      </div>
    </td>
  `;
}
