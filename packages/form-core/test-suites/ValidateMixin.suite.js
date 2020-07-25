import { LitElement } from '@lion/core';
import { aTimeout, defineCE, expect, fixture, html, unsafeStatic } from '@open-wc/testing';
import sinon from 'sinon';
import {
  MaxLength,
  MinLength,
  Required,
  ResultValidator,
  Unparseable,
  ValidateMixin,
  Validator,
} from '../index.js';
import {
  AlwaysInvalid,
  AlwaysValid,
  AsyncAlwaysInvalid,
  AsyncAlwaysValid,
} from '../test-helpers.js';

export function runValidateMixinSuite(customConfig) {
  const cfg = {
    tagString: null,
    ...customConfig,
  };

  const lightDom = cfg.lightDom || '';
  const tagString =
    cfg.tagString ||
    defineCE(
      class extends ValidateMixin(LitElement) {
        static get properties() {
          return { modelValue: String };
        }
      },
    );

  const tag = unsafeStatic(tagString);
  const withInputTagString =
    cfg.tagString ||
    defineCE(
      class extends ValidateMixin(LitElement) {
        connectedCallback() {
          super.connectedCallback();
          this.appendChild(document.createElement('input'));
        }

        get _inputNode() {
          return this.querySelector('input');
        }
      },
    );
  const withInputTag = unsafeStatic(withInputTagString);

  describe('ValidateMixin', () => {
    /**
     *   Terminology
     *
     * - *validatable-field*
     *   The element ('this') the ValidateMixin is applied on.
     *
     * - *input-node*
     *   The 'this._inputNode' property (usually a getter) that returns/contains a reference to an
     *   interaction element that receives focus, displays the input value, interaction states are
     *   derived from, aria properties are put on and setCustomValidity (if applicable) is called on.
     *   Can be input, textarea, my-custom-slider etc.
     *
     * - *feedback-node*
     *   The 'this._feedbackNode' property (usually a getter) that returns/contains a reference to
     *   the output container for validation feedback. Messages will be written to this element
     *   based on user defined or default validity feedback visibility conditions.
     *
     * - *show-{type}-feedback-condition*
     *   The 'this.hasErrorVisible value that stores whether the
     *   feedback for the particular validation type should be shown to the end user.
     */

    describe('Validation initiation', () => {
      it('throws and console.errors if adding not Validator instances to the validators array', async () => {
        // we throw and console error as constructor throw are not visible to the end user
        const stub = sinon.stub(console, 'error');
        const el = await fixture(html`<${tag}></${tag}>`);
        const errorMessage =
          'Validators array only accepts class instances of Validator. Type "array" found.';
        expect(() => {
          el.validators = [[new Required()]];
        }).to.throw(errorMessage);
        expect(stub.args[0][0]).to.equal(errorMessage);

        const errorMessage2 =
          'Validators array only accepts class instances of Validator. Type "string" found.';
        expect(() => {
          el.validators = ['required'];
        }).to.throw(errorMessage2);
        expect(stub.args[1][0]).to.equal(errorMessage2);

        stub.restore();
      });

      it('throws and console error if adding a not supported Validator type', async () => {
        // we throw and console error to improve DX
        const stub = sinon.stub(console, 'error');
        const errorMessage = `This component does not support the validator type "major error" used in "MajorValidator". You may change your validators type or add it to the components "static get validationTypes() {}".`;
        class MajorValidator extends Validator {
          constructor() {
            super();
            this.type = 'major error';
          }

          static get validatorName() {
            return 'MajorValidator';
          }
        }
        const el = await fixture(html`<${tag}></${tag}>`);
        expect(() => {
          el.validators = [new MajorValidator()];
        }).to.throw(errorMessage);
        expect(stub.args[0][0]).to.equal(errorMessage);

        stub.restore();
      });

      it('validates on initialization (once form field has bootstrapped/initialized)', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new Required()]}
          >${lightDom}</${tag}>
        `);
        expect(el.hasFeedbackFor).to.deep.equal(['error']);
      });

      it('revalidates when ".modelValue" changes', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new AlwaysValid()]}
            .modelValue=${'myValue'}
          >${lightDom}</${tag}>
        `);

        const validateSpy = sinon.spy(el, 'validate');
        el.modelValue = 'x';
        expect(validateSpy.callCount).to.equal(1);
      });

      it('revalidates when ".validators" changes', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new AlwaysValid()]}
            .modelValue=${'myValue'}
          >${lightDom}</${tag}>
        `);

        const validateSpy = sinon.spy(el, 'validate');
        el.validators = [new MinLength(3)];
        expect(validateSpy.callCount).to.equal(1);
      });

      it('clears current results when ".modelValue" changes', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new AlwaysValid()]}
            .modelValue=${'myValue'}
          >${lightDom}</${tag}>
        `);

        const clearSpy = sinon.spy(el, '__clearValidationResults');
        const validateSpy = sinon.spy(el, 'validate');
        el.modelValue = 'x';
        expect(clearSpy.callCount).to.equal(1);
        expect(validateSpy.args[0][0]).to.eql({
          clearCurrentResult: true,
        });
      });

      /**
       * Inside "Validator integration" we test reinitiation on Validator param change
       */
    });

    describe('Validation process: internal flow', () => {
      it('firstly checks for empty values', async () => {
        const alwaysValid = new AlwaysValid();
        const alwaysValidExecuteSpy = sinon.spy(alwaysValid, 'execute');
        const el = await fixture(html`
          <${tag} .validators=${[alwaysValid]}>${lightDom}</${tag}>
        `);
        const isEmptySpy = sinon.spy(el, '__isEmpty');
        const validateSpy = sinon.spy(el, 'validate');
        el.modelValue = '';
        expect(validateSpy.callCount).to.equal(1);
        expect(alwaysValidExecuteSpy.callCount).to.equal(0);
        expect(isEmptySpy.callCount).to.equal(1);

        el.modelValue = 'nonEmpty';
        expect(validateSpy.callCount).to.equal(2);
        expect(alwaysValidExecuteSpy.callCount).to.equal(1);
        expect(isEmptySpy.callCount).to.equal(2);
      });

      it('secondly checks for synchronous Validators: creates RegularValidationResult', async () => {
        const el = await fixture(html`
          <${tag} .validators=${[new AlwaysValid()]}>${lightDom}</${tag}>
        `);
        const isEmptySpy = sinon.spy(el, '__isEmpty');
        const syncSpy = sinon.spy(el, '__executeSyncValidators');
        el.modelValue = 'nonEmpty';
        expect(isEmptySpy.calledBefore(syncSpy)).to.be.true;
      });

      it('thirdly schedules asynchronous Validators: creates RegularValidationResult', async () => {
        const el = await fixture(html`
          <${tag} .validators=${[new AlwaysValid(), new AsyncAlwaysValid()]}>
            ${lightDom}
          </${tag}>
        `);
        const syncSpy = sinon.spy(el, '__executeSyncValidators');
        const asyncSpy = sinon.spy(el, '__executeAsyncValidators');
        el.modelValue = 'nonEmpty';
        expect(syncSpy.calledBefore(asyncSpy)).to.be.true;
      });

      it('finally checks for ResultValidators: creates TotalValidationResult', async () => {
        class MyResult extends ResultValidator {
          static get validatorName() {
            return 'ResultValidator';
          }
        }

        let el = await fixture(html`
          <${tag}
            .validators=${[new AlwaysValid(), new MyResult()]}>
            ${lightDom}
          </${tag}>
        `);

        const syncSpy = sinon.spy(el, '__executeSyncValidators');
        const resultSpy2 = sinon.spy(el, '__executeResultValidators');

        el.modelValue = 'nonEmpty';
        expect(syncSpy.calledBefore(resultSpy2)).to.be.true;

        el = await fixture(html`
          <${tag}
            .validators=${[new AsyncAlwaysValid(), new MyResult()]}>
            ${lightDom}
          </${tag}>
        `);

        const asyncSpy = sinon.spy(el, '__executeAsyncValidators');
        const resultSpy = sinon.spy(el, '__executeResultValidators');

        el.modelValue = 'nonEmpty';
        expect(resultSpy.callCount).to.equal(1);
        expect(asyncSpy.callCount).to.equal(1);
        await el.validateComplete;
        expect(resultSpy.callCount).to.equal(2);
      });

      describe('Finalization', () => {
        it('fires private "validate-performed" event on every cycle', async () => {
          const el = await fixture(html`
            <${tag} .validators=${[new AlwaysValid(), new AsyncAlwaysInvalid()]}>
              ${lightDom}
            </${tag}>
          `);
          const cbSpy = sinon.spy();
          el.addEventListener('validate-performed', cbSpy);
          el.modelValue = 'nonEmpty';
          expect(cbSpy.callCount).to.equal(1);
        });

        it('resolves ".validateComplete" Promise', async () => {
          const el = await fixture(html`
            <${tag} .validators=${[new AsyncAlwaysInvalid()]}>
              ${lightDom}
            </${tag}>
          `);
          el.modelValue = 'nonEmpty';
          const validateResolveSpy = sinon.spy(el, '__validateCompleteResolve');
          await el.validateComplete;
          expect(validateResolveSpy.callCount).to.equal(1);
        });
      });
    });

    describe('Validator Integration', () => {
      class IsCat extends Validator {
        constructor(...args) {
          super(...args);
          this.execute = (modelValue, param) => {
            const validateString = param && param.number ? `cat${param.number}` : 'cat';
            const showError = modelValue !== validateString;
            return showError;
          };
        }

        static get validatorName() {
          return 'IsCat';
        }
      }

      class OtherValidator extends Validator {
        constructor(...args) {
          super(...args);
          this.execute = () => true;
        }

        static get validatorName() {
          return 'otherValidator';
        }
      }

      it('Validators will be called with ".modelValue" as first argument', async () => {
        const otherValidator = new OtherValidator();
        const otherValidatorSpy = sinon.spy(otherValidator, 'execute');
        await fixture(html`
          <${tag}
            .validators=${[new Required(), otherValidator]}
            .modelValue=${'model'}
          >${lightDom}</${tag}>
        `);
        expect(otherValidatorSpy.calledWith('model')).to.be.true;
      });

      it('Validators will be called with viewValue as first argument when modelValue is unparseable', async () => {
        const otherValidator = new OtherValidator();
        const otherValidatorSpy = sinon.spy(otherValidator, 'execute');
        await fixture(html`
          <${tag}
            .validators=${[new Required(), otherValidator]}
            .modelValue=${new Unparseable('view')}
          >${lightDom}</${tag}>
        `);
        expect(otherValidatorSpy.calledWith('view')).to.be.true;
      });

      it('Validators will be called with param as a second argument', async () => {
        const param = { number: 5 };
        const validator = new IsCat(param);
        const executeSpy = sinon.spy(validator, 'execute');
        await fixture(html`
          <${tag}
            .validators=${[validator]}
            .modelValue=${'cat'}
          >${lightDom}</${tag}>
        `);
        expect(executeSpy.args[0][1]).to.equal(param);
      });

      it('Validators will be called with a config that has { node } as a third argument', async () => {
        const validator = new IsCat();
        const executeSpy = sinon.spy(validator, 'execute');
        const el = await fixture(html`
          <${tag}
            .validators=${[validator]}
            .modelValue=${'cat'}
          >${lightDom}</${tag}>
        `);
        expect(executeSpy.args[0][2].node).to.equal(el);
      });

      it('Validators will not be called on empty values', async () => {
        const el = await fixture(html`
          <${tag} .validators=${[new IsCat()]}>${lightDom}</${tag}>
        `);

        el.modelValue = 'cat';
        expect(el.validationStates.error.IsCat).to.be.undefined;
        el.modelValue = 'dog';
        expect(el.validationStates.error.IsCat).to.be.true;
        el.modelValue = '';
        expect(el.validationStates.error.IsCat).to.be.undefined;
      });

      it('Validators get retriggered on parameter change', async () => {
        const isCatValidator = new IsCat('Felix');
        const catSpy = sinon.spy(isCatValidator, 'execute');
        const el = await fixture(html`
          <${tag}
            .validators=${[isCatValidator]}
            .modelValue=${'cat'}
          >${lightDom}</${tag}>
        `);
        el.modelValue = 'cat';
        expect(catSpy.callCount).to.equal(1);
        isCatValidator.param = 'Garfield';
        expect(catSpy.callCount).to.equal(2);
      });
    });

    describe('Async Validator Integration', () => {
      let asyncVPromise;
      let asyncVResolve;

      beforeEach(() => {
        asyncVPromise = new Promise(resolve => {
          asyncVResolve = resolve;
        });
      });

      class IsAsyncCat extends Validator {
        static get validatorName() {
          return 'delayed-cat';
        }

        static get async() {
          return true;
        }

        /**
         * @desc the function that determines the validator. It returns true when
         * the Validator is "active", meaning its message should be shown.
         * @param {string} modelValue
         */
        async execute(modelValue) {
          await asyncVPromise;
          const hasError = modelValue !== 'cat';
          return hasError;
        }
      }

      // default execution trigger is keyup (think of password availability backend)
      // can configure execution trigger (blur, etc?)
      it('handles "execute" functions returning promises', async () => {
        const el = await fixture(html`
          <${tag}
            .modelValue=${'dog'}
            .validators=${[new IsAsyncCat()]}>
          ${lightDom}
          </${tag}>
        `);

        const validator = el.validators[0];
        expect(validator instanceof Validator).to.be.true;
        expect(el.hasFeedbackFor).to.deep.equal([]);
        asyncVResolve();
        await aTimeout();
        expect(el.hasFeedbackFor).to.deep.equal(['error']);
      });

      it('sets ".isPending/[is-pending]" when validation is in progress', async () => {
        const el = await fixture(html`
          <${tag} .modelValue=${'dog'}>${lightDom}</${tag}>
        `);
        expect(el.isPending).to.be.false;
        expect(el.hasAttribute('is-pending')).to.be.false;

        el.validators = [new IsAsyncCat()];
        expect(el.isPending).to.be.true;
        await aTimeout();
        expect(el.hasAttribute('is-pending')).to.be.true;

        asyncVResolve();
        await aTimeout();
        expect(el.isPending).to.be.false;
        expect(el.hasAttribute('is-pending')).to.be.false;
      });

      // TODO: 'mock' these methods without actually waiting for debounce?
      it.skip('debounces async validation for performance', async () => {
        const asyncV = new IsAsyncCat();
        const asyncVExecuteSpy = sinon.spy(asyncV, 'execute');

        const el = await fixture(html`
          <${tag} .modelValue=${'dog'}>
            ${lightDom}
          </${tag}>
        `);
        // debounce started
        el.validators = [asyncV];
        expect(asyncVExecuteSpy.called).to.equal(0);
        // TODO: consider wrapping debounce in instance/ctor function to make spying possible
        // await debounceFinish
        expect(asyncVExecuteSpy.called).to.equal(1);

        // New validation cycle. Now change modelValue inbetween, so validation is retriggered.
        asyncVExecuteSpy.reset();
        el.modelValue = 'dogger';
        expect(asyncVExecuteSpy.called).to.equal(0);
        el.modelValue = 'doggerer';
        // await original debounce period...
        expect(asyncVExecuteSpy.called).to.equal(0);
        // await original debounce again without changing mv inbetween...
        expect(asyncVExecuteSpy.called).to.equal(1);
      });

      // TODO: nice to have...
      it.skip('developer can configure debounce on FormControl instance', async () => {});

      it.skip('cancels and reschedules async validation on ".modelValue" change', async () => {
        const asyncV = new IsAsyncCat();
        const asyncVAbortSpy = sinon.spy(asyncV, 'abort');

        const el = await fixture(html`
          <${tag} .modelValue=${'dog'}>
            ${lightDom}
          </${tag}>
        `);
        // debounce started
        el.validators = [asyncV];
        expect(asyncVAbortSpy.called).to.equal(0);
        el.modelValue = 'dogger';
        // await original debounce period...
        expect(asyncVAbortSpy.called).to.equal(1);
      });

      // TODO: nice to have
      it.skip('developer can configure condition for asynchronous validation', async () => {
        const asyncV = new IsAsyncCat();
        const asyncVExecuteSpy = sinon.spy(asyncV, 'execute');

        const el = await fixture(html`
          <${tag}
            .isFocused=${true}
            .modelValue=${'dog'}
            .validators=${[asyncV]}
            .asyncValidateOn=${({ formControl }) => !formControl.isFocused}
            >
          ${lightDom}
          </${tag}>
        `);

        expect(asyncVExecuteSpy.called).to.equal(0);
        el.isFocused = false;
        el.validate();
        expect(asyncVExecuteSpy.called).to.equal(1);
      });
    });

    describe('ResultValidator Integration', () => {
      let MySuccessResultValidator;
      let withSuccessTagString;
      let withSuccessTag;

      before(() => {
        MySuccessResultValidator = class extends ResultValidator {
          constructor(...args) {
            super(...args);
            this.type = 'success';
          }

          // eslint-disable-next-line class-methods-use-this
          executeOnResults({ regularValidationResult, prevValidationResult }) {
            const errorOrWarning = v => v.type === 'error' || v.type === 'warning';
            const hasErrorOrWarning = !!regularValidationResult.filter(errorOrWarning).length;
            const prevHadErrorOrWarning = !!prevValidationResult.filter(errorOrWarning).length;
            return !hasErrorOrWarning && prevHadErrorOrWarning;
          }
        };

        withSuccessTagString = defineCE(
          class extends ValidateMixin(LitElement) {
            static get validationTypes() {
              return [...super.validationTypes, 'success'];
            }
          },
        );
        withSuccessTag = unsafeStatic(withSuccessTagString);
      });

      it('calls ResultValidators after regular validators', async () => {
        const resultValidator = new MySuccessResultValidator();
        const resultValidateSpy = sinon.spy(resultValidator, 'executeOnResults');

        // After regular sync Validators
        const validator = new MinLength(3);
        const validateSpy = sinon.spy(validator, 'execute');
        await fixture(html`
          <${withSuccessTag}
            .validators=${[resultValidator, validator]}
            .modelValue=${'myValue'}
          >${lightDom}</${withSuccessTag}>
        `);
        expect(validateSpy.calledBefore(resultValidateSpy)).to.be.true;

        // Also after regular async Validators
        const validatorAsync = new AsyncAlwaysInvalid();
        const validateAsyncSpy = sinon.spy(validatorAsync, 'execute');
        await fixture(html`
        <${withSuccessTag}
          .validators=${[resultValidator, validatorAsync]}
          .modelValue=${'myValue'}
        >${lightDom}</${withSuccessTag}>
      `);
        expect(validateAsyncSpy.calledBefore(resultValidateSpy)).to.be.true;
      });

      it(`provides "regular" ValidationResult and previous FinalValidationResult as input to
        "executeOnResults" function`, async () => {
        const resultValidator = new MySuccessResultValidator();
        const resultValidateSpy = sinon.spy(resultValidator, 'executeOnResults');

        const el = await fixture(html`
            <${withSuccessTag}
              .validators=${[new MinLength(3), resultValidator]}
              .modelValue=${'myValue'}
            >${lightDom}</${withSuccessTag}>
          `);
        const prevValidationResult = el.__prevValidationResult;
        const regularValidationResult = [
          ...el.__syncValidationResult,
          ...el.__asyncValidationResult,
        ];

        expect(resultValidateSpy.args[0][0]).to.eql({
          prevValidationResult,
          regularValidationResult,
        });
      });

      it('adds ResultValidator outcome as highest prio result to the FinalValidationResult', async () => {
        class AlwaysInvalidResult extends ResultValidator {
          // eslint-disable-next-line class-methods-use-this
          executeOnResults() {
            const hasError = true;
            return hasError;
          }
        }

        const validator = new AlwaysInvalid();
        const resultV = new AlwaysInvalidResult();

        const el = await fixture(html`
          <${tag}
            .validators=${[validator, resultV]}
            .modelValue=${'myValue'}
          >${lightDom}</${tag}>
        `);

        const /** @type {TotalValidationResult} */ totalValidationResult = el.__validationResult;
        expect(totalValidationResult).to.eql([resultV, validator]);
      });
    });

    describe('Required Validator integration', () => {
      it('will result in erroneous state when form control is empty', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new Required()]}
            .modelValue=${''}
          >${lightDom}</${tag}>
        `);
        expect(el.validationStates.error.Required).to.be.true;
        expect(el.hasFeedbackFor).to.deep.equal(['error']);

        el.modelValue = 'foo';
        expect(el.validationStates.error.Required).to.be.undefined;
        expect(el.hasFeedbackFor).to.deep.equal([]);
      });

      it('calls private ".__isEmpty" by default', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new Required()]}
            .modelValue=${''}
          >${lightDom}</${tag}>
        `);
        const validator = el.validators.find(v => v instanceof Required);
        const executeSpy = sinon.spy(validator, 'execute');
        const privateIsEmptySpy = sinon.spy(el, '__isEmpty');
        el.modelValue = null;
        expect(executeSpy.callCount).to.equal(0);
        expect(privateIsEmptySpy.callCount).to.equal(1);
      });

      it('calls "._isEmpty" when provided (useful for different modelValues)', async () => {
        const customRequiredTagString = defineCE(
          class extends ValidateMixin(LitElement) {
            _isEmpty() {
              return this.modelValue.model === '';
            }
          },
        );
        const customRequiredTag = unsafeStatic(customRequiredTagString);

        const el = await fixture(html`
          <${customRequiredTag}
            .validators=${[new Required()]}
            .modelValue=${{ model: 'foo' }}
          >${lightDom}</${customRequiredTag}>
        `);

        const providedIsEmptySpy = sinon.spy(el, '_isEmpty');
        el.modelValue = { model: '' };
        expect(providedIsEmptySpy.callCount).to.equal(1);
        expect(el.validationStates.error.Required).to.be.true;
      });

      it('prevents other Validators from being called when input is empty', async () => {
        const alwaysInvalid = new AlwaysInvalid();
        const alwaysInvalidSpy = sinon.spy(alwaysInvalid, 'execute');
        const el = await fixture(html`
          <${tag}
            .validators=${[new Required(), alwaysInvalid]}
            .modelValue=${''}
          >${lightDom}</${tag}>
        `);
        expect(alwaysInvalidSpy.callCount).to.equal(0); // __isRequired returned false (invalid)
        el.modelValue = 'foo';
        expect(alwaysInvalidSpy.callCount).to.equal(1); // __isRequired returned true (valid)
      });

      it('adds [aria-required="true"] to "._inputNode"', async () => {
        const el = await fixture(html`
          <${withInputTag}
            .validators=${[new Required()]}
            .modelValue=${''}
          >${lightDom}</${withInputTag}>
        `);
        expect(el._inputNode.getAttribute('aria-required')).to.equal('true');
        el.validators = [];
        expect(el._inputNode.getAttribute('aria-required')).to.be.null;
      });
    });

    describe('Default (preconfigured) Validators', () => {
      const preconfTagString = defineCE(
        class extends ValidateMixin(LitElement) {
          constructor() {
            super();
            this.defaultValidators = [new AlwaysInvalid()];
          }
        },
      );
      const preconfTag = unsafeStatic(preconfTagString);

      it('can be stored for custom inputs', async () => {
        const el = await fixture(html`
        <${preconfTag}
          .validators=${[new MinLength(3)]}
          .modelValue=${'12'}
        ></${preconfTag}>`);

        expect(el.validationStates.error.AlwaysInvalid).to.be.true;
        expect(el.validationStates.error.MinLength).to.be.true;
      });

      it('can be altered by App Developers', async () => {
        const altPreconfTagString = defineCE(
          class extends ValidateMixin(LitElement) {
            constructor() {
              super();
              this.defaultValidators = [new MinLength(3)];
            }
          },
        );
        const altPreconfTag = unsafeStatic(altPreconfTagString);

        const el = await fixture(html`
          <${altPreconfTag}
            .modelValue=${'12'}
          ></${altPreconfTag}>`);

        expect(el.validationStates.error.MinLength).to.be.true;
        el.defaultValidators[0].param = 2;
        expect(el.validationStates.error.MinLength).to.be.undefined;
      });

      it('can be requested via "._allValidators" getter', async () => {
        const el = await fixture(html`
        <${preconfTag}
          .validators=${[new MinLength(3)]}
        ></${preconfTag}>`);

        expect(el.validators.length).to.equal(1);
        expect(el.defaultValidators.length).to.equal(1);
        expect(el._allValidators.length).to.equal(2);

        expect(el._allValidators[0] instanceof MinLength).to.be.true;
        expect(el._allValidators[1] instanceof AlwaysInvalid).to.be.true;

        el.validators = [new MaxLength(5)];
        expect(el._allValidators[0] instanceof MaxLength).to.be.true;
        expect(el._allValidators[1] instanceof AlwaysInvalid).to.be.true;
      });
    });

    describe('State storage and reflection', () => {
      it('stores validity of individual Validators in ".validationStates.error[validator.validatorName]"', async () => {
        const el = await fixture(html`
          <${tag}
            .modelValue=${'a'}
            .validators=${[new MinLength(3), new AlwaysInvalid()]}
          >${lightDom}</${tag}>`);

        expect(el.validationStates.error.MinLength).to.be.true;
        expect(el.validationStates.error.AlwaysInvalid).to.be.true;

        el.modelValue = 'abc';
        expect(el.validationStates.error.MinLength).to.equal(undefined);
        expect(el.validationStates.error.AlwaysInvalid).to.be.true;
      });

      it('removes "non active" states whenever modelValue becomes undefined', async () => {
        const el = await fixture(html`
          <${tag}
            .validators=${[new MinLength(3)]}
          >${lightDom}</${tag}>
        `);
        el.modelValue = 'a';
        expect(el.hasFeedbackFor).to.deep.equal(['error']);
        expect(el.validationStates.error).to.not.eql({});

        el.modelValue = undefined;
        expect(el.hasFeedbackFor).to.deep.equal([]);
        expect(el.validationStates.error).to.eql({});
      });

      it('clears current validation results when validators array updated', async () => {
        const validators = [new Required()];
        const el = await fixture(html`
          <${tag}
            .validators=${validators}
          >${lightDom}</${tag}>
        `);
        expect(el.hasFeedbackFor).to.deep.equal(['error']);
        expect(el.validationStates.error).to.eql({ Required: true });

        el.validators = [];
        expect(el.hasFeedbackFor).to.not.deep.equal(['error']);
        expect(el.validationStates.error).to.eql({});

        el.validators = [new Required()];
        expect(el.hasFeedbackFor).to.deep.equal(['error']);
        expect(el.validationStates.error).to.not.eql({});
      });

      describe('Events', () => {
        it('fires "showsFeedbackForChanged" event async after feedbackData got synced to feedbackElement', async () => {
          const spy = sinon.spy();
          const el = await fixture(html`
            <${tag}
              .submitted=${true}
              .validators=${[new MinLength(7)]}
              @showsFeedbackForChanged=${spy};
            >${lightDom}</${tag}>
          `);
          el.modelValue = 'a';
          await el.updateComplete;
          expect(spy).to.have.callCount(1);

          el.modelValue = 'abc';
          await el.updateComplete;
          expect(spy).to.have.callCount(1);

          el.modelValue = 'abcdefg';
          await el.updateComplete;
          expect(spy).to.have.callCount(2);
        });

        it('fires "showsFeedbackFor{type}Changed" event async when type visibility changed', async () => {
          const spy = sinon.spy();
          const el = await fixture(html`
            <${tag}
              .submitted=${true}
              .validators=${[new MinLength(7)]}
              @showsFeedbackForErrorChanged=${spy};
            >${lightDom}</${tag}>
          `);
          el.modelValue = 'a';
          await el.updateComplete;
          expect(spy).to.have.callCount(1);

          el.modelValue = 'abc';
          await el.updateComplete;
          expect(spy).to.have.callCount(1);

          el.modelValue = 'abcdefg';
          await el.updateComplete;
          expect(spy).to.have.callCount(2);
        });
      });
    });

    describe('Accessibility', () => {
      it.skip('calls "._inputNode.setCustomValidity(errorMessage)"', async () => {
        const el = await fixture(html`
          <${tag}
            .modelValue=${'123'}
            .validators=${[new MinLength(3, { message: 'foo' })]}>
            <input slot="input">
          </${tag}>`);
        const spy = sinon.spy(el.inputElement, 'setCustomValidity');
        el.modelValue = '';
        expect(spy.callCount).to.be(1);
        expect(el.validationMessage).to.be('foo');
        el.modelValue = '123';
        expect(spy.callCount).to.be(2);
        expect(el.validationMessage).to.be('');
      });

      // TODO: check with open a11y issues and find best solution here
      it.skip(`removes validity message from DOM instead of toggling "display:none", to trigger Jaws
          and VoiceOver [to-be-implemented]`, async () => {});
    });

    describe('Extensibility: Custom Validator types', () => {
      const customTypeTagString = defineCE(
        class extends ValidateMixin(LitElement) {
          static get validationTypes() {
            return [...super.validationTypes, 'x', 'y'];
          }
        },
      );
      const customTypeTag = unsafeStatic(customTypeTagString);

      it('supports additional validationTypes in .hasFeedbackFor', async () => {
        const el = await fixture(html`
          <${customTypeTag}
            .validators=${[
              new MinLength(2, { type: 'x' }),
              new MinLength(3, { type: 'error' }),
              new MinLength(4, { type: 'y' }),
            ]}
            .modelValue=${'1234'}
          >${lightDom}</${customTypeTag}>
        `);
        expect(el.hasFeedbackFor).to.deep.equal([]);

        el.modelValue = '123'; // triggers y
        expect(el.hasFeedbackFor).to.deep.equal(['y']);

        el.modelValue = '12'; // triggers error and y
        expect(el.hasFeedbackFor).to.deep.equal(['error', 'y']);

        el.modelValue = '1'; // triggers x, error and y
        expect(el.hasFeedbackFor).to.deep.equal(['x', 'error', 'y']);
      });

      it('supports additional validationTypes in .validationStates', async () => {
        const el = await fixture(html`
          <${customTypeTag}
            .validators=${[
              new MinLength(2, { type: 'x' }),
              new MinLength(3, { type: 'error' }),
              new MinLength(4, { type: 'y' }),
            ]}
            .modelValue=${'1234'}
          >${lightDom}</${customTypeTag}>
        `);
        expect(el.validationStates).to.eql({
          x: {},
          error: {},
          y: {},
        });

        el.modelValue = '123'; // triggers y
        expect(el.validationStates).to.eql({
          x: {},
          error: {},
          y: { MinLength: true },
        });

        el.modelValue = '12'; // triggers error and y
        expect(el.validationStates).to.eql({
          x: {},
          error: { MinLength: true },
          y: { MinLength: true },
        });

        el.modelValue = '1'; // triggers x, error and y
        expect(el.validationStates).to.eql({
          x: { MinLength: true },
          error: { MinLength: true },
          y: { MinLength: true },
        });
      });

      // we no longer have a flag for when the error message got displayed - not really useful right?
      it.skip('only shows highest prio "has{Type}Visible" flag by default', async () => {
        const el = await fixture(html`
          <${customTypeTag}
            .validators=${[
              new MinLength(2, { type: 'x' }),
              new MinLength(3), // implicit 'error type'
              new MinLength(4, { type: 'y' }),
            ]}
            .modelValue=${'1234'}
          >${lightDom}</${customTypeTag}>
        `);
        expect(el.hasYVisible).to.be.false;
        expect(el.hasErrorVisible).to.be.false;
        expect(el.hasXVisible).to.be.false;

        el.modelValue = '1'; // triggers y, x and error
        await el.feedbackComplete;
        expect(el.hasYVisible).to.be.false;
        // Only shows message with highest prio (determined in el.constructor.validationTypes)
        expect(el.hasErrorVisible).to.be.true;
        expect(el.hasXVisible).to.be.false;
      });

      it('orders feedback based on provided "validationTypes"', async () => {
        // we set submitted to always show error message in the test
        const el = await fixture(html`
          <${customTypeTag}
            .submitted=${true}
            ._visibleMessagesAmount=${Infinity}
            .validators=${[
              new MinLength(2, { type: 'x' }),
              new MinLength(3, { type: 'error' }),
              new MinLength(4, { type: 'y' }),
            ]}
            .modelValue=${'1'}
          >${lightDom}</${customTypeTag}>
        `);
        await el.feedbackComplete;

        const resultOrder = el._feedbackNode.feedbackData.map(v => v.type);
        expect(resultOrder).to.deep.equal(['error', 'x', 'y']);

        el.modelValue = '12';
        await el.updateComplete;
        await el.feedbackComplete;
        const resultOrder2 = el._feedbackNode.feedbackData.map(v => v.type);
        expect(resultOrder2).to.deep.equal(['error', 'y']);
      });

      /**
       * Out of scope:
       * - automatic reflection of attrs (we would need to add to constructor.properties). See
       * 'Subclassers' for an example on how to do this
       */
    });

    describe('Subclassers', () => {
      describe('Adding new Validator types', () => {
        it('can add helpers for validation types', async () => {
          const elTagString = defineCE(
            class extends ValidateMixin(LitElement) {
              static get validationTypes() {
                return [...super.validationTypes, 'x'];
              }

              get hasX() {
                return this.hasFeedbackFor.includes('x');
              }

              get hasXVisible() {
                return this.showsFeedbackFor.includes('x');
              }
            },
          );
          const elTag = unsafeStatic(elTagString);

          // we set submitted to always show errors
          const el = await fixture(html`
            <${elTag}
              .submitted=${true}
              .validators=${[new MinLength(2, { type: 'x' })]}
              .modelValue=${'1'}
            >${lightDom}</${elTag}>
          `);
          await el.feedbackComplete;
          expect(el.hasX).to.be.true;
          expect(el.hasXVisible).to.be.true;

          el.modelValue = '12';
          expect(el.hasX).to.be.false;
          await el.updateComplete;
          await el.feedbackComplete;
          expect(el.hasXVisible).to.be.false;
        });

        it('can fire custom events if needed', async () => {
          function arrayDiff(array1 = [], array2 = []) {
            return array1
              .filter(x => !array2.includes(x))
              .concat(array2.filter(x => !array1.includes(x)));
          }
          const elTagString = defineCE(
            class extends ValidateMixin(LitElement) {
              static get validationTypes() {
                return [...super.validationTypes, 'x'];
              }

              updateSync(name, oldValue) {
                super.updateSync(name, oldValue);
                if (name === 'hasFeedbackFor') {
                  const diff = arrayDiff(this.hasFeedbackFor, oldValue);
                  if (diff.length > 0 && diff.includes('x')) {
                    this.dispatchEvent(new Event(`hasFeedbackForXChanged`, { bubbles: true }));
                  }
                }
              }
            },
          );
          const elTag = unsafeStatic(elTagString);

          const spy = sinon.spy();
          // we set prefilled to always show errors
          const el = await fixture(html`
            <${elTag}
              .prefilled=${true}
              @hasFeedbackForXChanged=${spy}
              .validators=${[new MinLength(2, { type: 'x' })]}
              .modelValue=${'1'}
            >${lightDom}</${elTag}>
          `);
          expect(spy).to.have.callCount(1);
          el.modelValue = '1';
          expect(spy).to.have.callCount(1);
          el.modelValue = '12';
          expect(spy).to.have.callCount(2);
          el.modelValue = '123';
          expect(spy).to.have.callCount(2);
          el.modelValue = '1';
          expect(spy).to.have.callCount(3);
        });
      });

      describe('Changing feedback visibility conditions', () => {
        // TODO: add this test on FormControl layer
        it('reconsiders feedback visibility when interaction states changed', async () => {
          const elTagString = defineCE(
            class extends ValidateMixin(LitElement) {
              static get properties() {
                return {
                  modelValue: String,
                  dirty: Boolean,
                  touched: Boolean,
                  prefilled: Boolean,
                  submitted: Boolean,
                };
              }

              _showFeedbackConditionFor() {
                return true;
              }
            },
          );
          const elTag = unsafeStatic(elTagString);
          const el = await fixture(html`
            <${elTag}
              .validators=${[new AlwaysInvalid()]}
              .modelValue=${'myValue'}
            >${lightDom}</${elTag}>
          `);

          const spy = sinon.spy(el, '_updateFeedbackComponent');
          let counter = 0;
          // for ... of is already allowed we should update eslint...
          // eslint-disable-next-line no-restricted-syntax
          for (const state of ['dirty', 'touched', 'prefilled', 'submitted']) {
            counter += 1;
            el[state] = false;
            // eslint-disable-next-line no-await-in-loop
            await el.updateComplete;
            expect(spy.callCount).to.equal(counter);
            counter += 1;
            el[state] = true;
            // eslint-disable-next-line no-await-in-loop
            await el.updateComplete;
            expect(spy.callCount).to.equal(counter);
          }
        });

        // already shown how to add it yourself
        it.skip('supports multiple "has{Type}Visible" flags', async () => {
          const elTagString = defineCE(
            class extends ValidateMixin(LitElement) {
              static get validationTypes() {
                return [...super.validationTypes, 'x', 'y'];
              }

              constructor() {
                super();
                this._visibleMessagesAmount = Infinity;
              }
            },
          );
          const elTag = unsafeStatic(elTagString);

          const el = await fixture(html`
            <${elTag}
              .validators=${[
                new MinLength(2, { type: 'x' }),
                new MinLength(3), // implicit 'error type'
                new MinLength(4, { type: 'y' }),
              ]}
              .modelValue=${'1234'}
            >${lightDom}</${elTag}>
          `);
          expect(el.hasYVisible).to.be.false;
          expect(el.hasErrorVisible).to.be.false;
          expect(el.hasXVisible).to.be.false;

          el.modelValue = '1'; // triggers y
          await el.feedbackComplete;
          expect(el.hasYVisible).to.be.true;
          expect(el.hasErrorVisible).to.be.true;
          expect(el.hasXVisible).to.be.true; // only shows message with highest
        });
      });

      describe('Changing feedback messages globally', () => {
        // Please see tests of Validation Feedback
      });
    });
  });
}
