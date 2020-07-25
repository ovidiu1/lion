import { html, LitElement } from '@lion/core';

/**
 * @desc Takes care of accessible rendering of error messages
 * Should be used in conjunction with FormControl having ValidateMixin applied
 */
export class LionValidationFeedback extends LitElement {
  static get properties() {
    return {
      /**
       * @property {FeedbackData} feedbackData
       */
      feedbackData: Array,
    };
  }

  /**
   * @overridable
   */
  // eslint-disable-next-line class-methods-use-this
  _messageTemplate({ message }) {
    return message;
  }

  updated() {
    super.updated();
    if (this.feedbackData && this.feedbackData[0]) {
      this.setAttribute('type', this.feedbackData[0].type);
      this.currentType = this.feedbackData[0].type;
      window.clearTimeout(this.removeMessage);
      if (this.currentType === 'success') {
        this.removeMessage = window.setTimeout(() => {
          this.removeAttribute('type');
          this.feedbackData = '';
        }, 3000);
      }
    } else if (this.currentType !== 'success') {
      this.removeAttribute('type');
    }
  }

  render() {
    return html`
      ${this.feedbackData &&
      this.feedbackData.map(
        ({ message, type, validator }) => html`
          ${this._messageTemplate({ message, type, validator })}
        `,
      )}
    `;
  }
}
