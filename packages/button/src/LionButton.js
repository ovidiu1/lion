import {
  browserDetection,
  css,
  DisabledWithTabIndexMixin,
  html,
  LitElement,
  SlotMixin,
} from '@lion/core';

const isKeyboardClickEvent = e => e.keyCode === 32 /* space */ || e.keyCode === 13; /* enter */
const isSpaceKeyboardClickEvent = e => e.keyCode === 32 || e.key === 32; /* space */

export class LionButton extends DisabledWithTabIndexMixin(SlotMixin(LitElement)) {
  static get properties() {
    return {
      role: {
        type: String,
        reflect: true,
      },
      active: {
        type: Boolean,
        reflect: true,
      },
      type: {
        type: String,
        reflect: true,
      },
    };
  }

  render() {
    return html`
      <div class="btn">
        <div class="click-area"></div>
        ${this._beforeTemplate()}
        ${browserDetection.isIE11
          ? html`<div id="${this._buttonId}"><slot></slot></div>`
          : html`<slot></slot>`}
        ${this._afterTemplate()}
        <slot name="_button"></slot>
      </div>
    `;
  }

  // eslint-disable-next-line class-methods-use-this
  _beforeTemplate() {
    return html``;
  }

  // eslint-disable-next-line class-methods-use-this
  _afterTemplate() {
    return html``;
  }

  static get styles() {
    return [
      css`
        :host {
          display: inline-block;
          min-height: 40px; /* src = https://www.smashingmagazine.com/2012/02/finger-friendly-design-ideal-mobile-touchscreen-target-sizes/ */
          outline: 0;
          background-color: transparent;
          box-sizing: border-box;
        }

        .btn {
          min-height: 24px;
          display: flex;
          align-items: center;
          position: relative;
          background: #eee; /* minimal styling to make it recognizable as btn */
          padding: 8px; /* vertical padding to fix with host min-height */
          outline: none; /* focus style handled below, else it follows boundaries of click-area */
        }

        :host .btn ::slotted(button) {
          position: absolute;
          top: 0;
          left: 0;
          clip: rect(0 0 0 0);
          clip-path: inset(50%);
          overflow: hidden;
          white-space: nowrap;
          height: 1px;
          width: 1px;
          padding: 0; /* reset default agent styles */
          border: 0; /* reset default agent styles */
        }

        .click-area {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          margin: 0;
          padding: 0;
        }

        :host(:focus:not([disabled])) .btn {
          /* if you extend, please overwrite */
          outline: 2px solid #bde4ff;
        }

        :host(:hover) .btn {
          /* if you extend, please overwrite */
          background: #f4f6f7;
        }

        :host(:active) .btn, /* keep native :active to render quickly where possible */
        :host([active]) .btn /* use custom [active] to fix IE11 */ {
          /* if you extend, please overwrite */
          background: gray;
        }

        :host([disabled]) {
          pointer-events: none;
        }

        :host([hidden]) {
          display: none;
        }

        :host([disabled]) .btn {
          /* if you extend, please overwrite */
          background: lightgray;
          color: #adadad;
          fill: #adadad;
        }
      `,
    ];
  }

  get _nativeButtonNode() {
    return Array.from(this.children).find(child => child.slot === '_button');
  }

  get _form() {
    return this._nativeButtonNode.form;
  }

  get slots() {
    return {
      ...super.slots,
      _button: () => {
        if (!this.constructor._button) {
          this.constructor._button = document.createElement('button');
          this.constructor._button.setAttribute('tabindex', '-1');
          this.constructor._button.setAttribute('aria-hidden', 'true');
        }
        return this.constructor._button.cloneNode();
      },
    };
  }

  constructor() {
    super();
    this.role = 'button';
    this.type = 'submit';
    this.active = false;
    this.__setupDelegationInConstructor();

    if (browserDetection.isIE11) {
      this._buttonId = `button-${Math.random().toString(36).substr(2, 10)}`;
      this.updateComplete.then(() => this.setAttribute('aria-labelledby', this._buttonId));
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.__setupEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.__teardownEvents();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('type')) {
      const native = this._nativeButtonNode;
      if (native) {
        native.type = this.type;
      }
    }
    if (changedProperties.has('disabled')) {
      this.setAttribute('aria-disabled', `${this.disabled}`); // create mixin if we need it in more places
    }
  }

  /**
   * Delegate click, by flashing a native button as a direct child
   * of the form, and firing click on this button. This will fire the form submit
   * without side effects caused by the click bubbling back up to lion-button.
   */
  __clickDelegationHandler(e) {
    if ((this.type === 'submit' || this.type === 'reset') && e.target === this) {
      if (this._form) {
        const nativeButton = document.createElement('button');
        nativeButton.type = this.type;
        this._form.appendChild(nativeButton);
        nativeButton.click();
        this._form.removeChild(nativeButton);
      }
    }
  }

  __setupDelegationInConstructor() {
    // do not move to connectedCallback, otherwise IE11 breaks.
    // more info: https://github.com/ing-bank/lion/issues/179#issuecomment-511763835
    this.addEventListener('click', this.__clickDelegationHandler, true);
  }

  __setupEvents() {
    this.addEventListener('mousedown', this.__mousedownHandler);
    this.addEventListener('keydown', this.__keydownHandler);
    this.addEventListener('keyup', this.__keyupHandler);
  }

  __teardownEvents() {
    this.removeEventListener('mousedown', this.__mousedownHandler);
    this.removeEventListener('keydown', this.__keydownHandler);
    this.removeEventListener('keyup', this.__keyupHandler);
  }

  __mousedownHandler() {
    this.active = true;
    const mouseupHandler = () => {
      this.active = false;
      document.removeEventListener('mouseup', mouseupHandler);
      this.removeEventListener('mouseup', mouseupHandler);
    };
    document.addEventListener('mouseup', mouseupHandler);
    this.addEventListener('mouseup', mouseupHandler);
  }

  __keydownHandler(e) {
    if (this.active || !isKeyboardClickEvent(e)) {
      if (isSpaceKeyboardClickEvent(e)) {
        e.preventDefault();
      }
      return;
    }

    if (isSpaceKeyboardClickEvent(e)) {
      e.preventDefault();
    }

    this.active = true;
    const keyupHandler = keyupEvent => {
      if (isKeyboardClickEvent(keyupEvent)) {
        this.active = false;
        document.removeEventListener('keyup', keyupHandler, true);
      }
    };
    document.addEventListener('keyup', keyupHandler, true);
  }

  __keyupHandler(e) {
    if (isKeyboardClickEvent(e)) {
      // Fixes IE11 double submit/click. Enter keypress somehow triggers the __keyUpHandler on the native <button>
      if (e.srcElement && e.srcElement !== this) {
        return;
      }
      // dispatch click
      this.click();
    }
  }
}
