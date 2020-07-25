# Textarea

`lion-textarea` is a webcomponent that enhances the functionality of the native `<input type="textarea">` element.
Its purpose is to provide a way for users to write text that is multiple lines long.

```js script
import { html } from 'lit-html';
import { MaxLength, MinLength, Required } from '@lion/form-core';
import { loadDefaultFeedbackMessages } from '@lion/validate-messages';

import './lion-textarea.js';

export default {
  title: 'Forms/Textarea',
};

loadDefaultFeedbackMessages();
```

```js preview-story
export const main = () => html`
  <lion-textarea label="Stops growing after 4 rows" max-rows="4"></lion-textarea>
`;
```

## Features

- Default rows is 2 and it will grow to max-rows of 6.
- `max-rows` attribute to set the amount of rows it should resize to, before it will scroll
- `rows` attribute to set the minimum amount of rows
- `readonly` attribute to prevent changing the content

## How to use

### Installation

```bash
npm i --save @lion/textarea
```

```js
import { LionTextare } from '@lion/textarea';
// or
import '@lion/textarea/lion-textarea.js';
```

## Examples

### Prefilled

You can prefill the textarea. If you want to prefill on multiline, you will have to add newline characters `'\n'`.

```js preview-story
export const prefilled = () => html`
  <lion-textarea
    label="Prefilled"
    .modelValue=${['batman', 'and', 'robin'].join('\n')}
  ></lion-textarea>
`;
```

### Disabled

The textarea can be disabled with the `disabled` attribute.

```js preview-story
export const disabled = () => html` <lion-textarea label="Disabled" disabled></lion-textarea> `;
```

### Readonly

`readonly` attribute indicate that you can't change the content. Compared with `disabled` attribute, the `readonly` attribute doesn't prevent clicking or selecting the element.

```js preview-story
export const readonly = () => html`
  <lion-textarea
    label="Readonly"
    readonly
    .modelValue=${['batman', 'and', 'robin'].join('\n')}
  ></lion-textarea>
`;
```

### Stop growing

Use the `max-rows` attribute to make it stop growing after a certain amount of lines.

```js preview-story
export const stopGrowing = () => html`
  <lion-textarea
    label="Stop growing"
    max-rows="4"
    .modelValue=${['batman', 'and', 'robin'].join('\n')}
  ></lion-textarea>
`;
```

### Non-growing

To have a fixed size provide `rows` and `max-rows` with the same value.

```js preview-story
export const nonGrowing = () => html`
  <lion-textarea label="Non Growing" rows="3" max-rows="3"></lion-textarea>
`;
```

### Validation

The textarea can have validation.

```js preview-story
export const validation = () => {
  return html`
    <lion-textarea
      .validators="${[new Required(), new MinLength(10), new MaxLength(400)]}"
      label="String"
      .modelValue="${'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'}"
    ></lion-textarea>
  `;
};
```
