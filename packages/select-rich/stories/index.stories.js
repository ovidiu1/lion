import { storiesOf, html } from '@open-wc/demoing-storybook';
import { css, LitElement } from '@lion/core';

import { overlays, LocalOverlayController } from '@lion/overlays';
import { LionRadioGroup } from '@lion/radio-group';

import '../../button/lion-button.js';
import '../../form/lion-form.js';
import '../../listbox/lion-listbox.js';
import '../../listbox/lion-option.js';
import '../lion-select-rich.js';

export class LionSelectRich extends LitElement {
  get modelValue() {
    return this.contentNode.modelValue;
  }

  connectedCallback() {
    super.connectedCallback();
    this.contentNode = this.querySelector('[slotpoc="content"]');
    this.invokerNode = this.querySelector('[slotpoc="invoker"]');

    this._popup = overlays.add(
      new LocalOverlayController({
        hidesOnEsc: true,
        hidesOnOutsideClick: false,
        placement: this.position,
        contentNode: this.contentNode,
        invokerNode: this.invokerNode,
      }),
    );
    this._show = () => this._popup.show();
    this._hide = () => {
      this._popup.hide();
    };

    this._toggle = () => {
      this._popup.toggle();
    };

    this.invokerNode.addEventListener('click', this._toggle);
    this.contentNode.addEventListener('checked-value-changed', ev => {
      this.invokerNode.innerText = ev.target.checkedValue;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.invokerNode.removeEventListener('click', this._toggle);
  }

  render() {
    return html`
      <slot></slot>
    `;
  }
}

customElements.define('lion-select-rich2', LionSelectRich);

export class LionListbox extends LionRadioGroup {}

customElements.define('lion-listbox2', LionListbox);

const selectRichDemoStyle = css`
  .demo-listbox {
    background-color: white;
  }

  .demo-option[focused] {
    background-color: lightgray;
  }
`;

storiesOf('Forms|Select Rich', module)
  .add(
    'SELECT',
    () => html`
      <lion-form>
        <form>
          <lion-select-rich2 name="dinosGroup" label="What are your favourite dinosaurs?">
            <button slotpoc="invoker">click</button>
            <lion-listbox2 slotpoc="content" name="foo">
              <lion-radio
                name="dinos[]"
                label="allosaurus"
                .choiceValue=${'allosaurus'}
              ></lion-radio>
              <lion-radio
                name="dinos[]"
                label="brontosaurus"
                .choiceValue=${'brontosaurus'}
              ></lion-radio>
              <lion-radio
                name="dinos[]"
                label="diplodocus"
                .modelValue=${{ value: 'diplodocus', checked: true }}
              ></lion-radio>
            </lion-listbox2>
          </lion-select-rich2>
        </form>
      </lion-form>
    `,
  )
  .add(
    'Default',
    () => html`
      <style>
        ${selectRichDemoStyle}
      </style>
      <lion-select-rich label="Favorite color" name="color">
        <lion-listbox slot="input" class="demo-listbox">
          <lion-option value="red" class="demo-option">Red</lion-option>
          <lion-option value="hotpink" class="demo-option">Hotpink</lion-option>
          <lion-option value="teal" class="demo-option">Teal</lion-option>
        </lion-listbox>
      </lion-select-rich>
    `,
  )
  .add(
    'Complex options',
    () => html`
      <style>
        ${selectRichDemoStyle} .demo-option__title {
          font-size: 24px;
          font-weight: bold;
        }

        .demo-option__sub {
          font-size: 16px;
          color: grey;
        }
      </style>
      <lion-select-rich label="Favorite color" name="color">
        <lion-listbox slot="input" class="demo-listbox">
          <lion-option value="nr1" class="demo-option">
            <div class="demo-option__title">Title 1</div>
            <div class="demo-option__sub">Sub text 1</div>
          </lion-option>
          <lion-option value="nr2" class="demo-option">
            <div class="demo-option__title">Title 2</div>
            <div class="demo-option__sub">Sub text 2</div>
          </lion-option>
          <lion-option value="nr3" class="demo-option">
            <div class="demo-option__title">Title 3</div>
            <div class="demo-option__sub">Sub text 3</div>
          </lion-option>
        </lion-listbox>
      </lion-select-rich>
    `,
  )
  .add(
    'Disabled',
    () => html`
      <style>
        ${selectRichDemoStyle}
      </style>
      <lion-select-rich label="Disabled select" disabled name="color1">
        <lion-listbox slot="input" class="demo-listbox">
          <lion-option value="red" class="demo-option">Red</lion-option>
          <lion-option value="hotpink" class="demo-option">Hotpink</lion-option>
          <lion-option value="teal" class="demo-option">Teal</lion-option>
        </lion-listbox>
      </lion-select-rich>

      <lion-select-rich label="Disabled option" name="color2">
        <lion-listbox slot="input" class="demo-listbox">
          <lion-option value="red" class="demo-option">Red</lion-option>
          <lion-option value="hotpink" class="demo-option">Hotpink</lion-option>
          <lion-option value="teal" class="demo-option" disabled>Teal</lion-option>
        </lion-listbox>
      </lion-select-rich>
    `,
  )
  .add('Validation', () => {
    const submit = () => {
      const form = document.querySelector('#form');
      if (form.errorState === false) {
        console.log(form.serializeGroup());
      }
    };
    return html`
      <style>
        ${selectRichDemoStyle}
      </style>
      <lion-form id="form" @submit="${submit}">
        <form>
          <lion-select-rich
            id="color"
            name="color"
            label="Favorite color"
            .errorValidators="${[['required']]}"
          >
            <lion-listbox slot="input" class="demo-listbox">
              <lion-option value="red" class="demo-option">Red</lion-option>
              <lion-option value="hotpink" class="demo-option">Hotpink</lion-option>
              <lion-option value="teal" class="demo-option">Teal</lion-option>
            </lion-listbox>
          </lion-select-rich>
          <lion-button type="submit">Submit</lion-button>
        </form>
      </lion-form>
    `;
  });
