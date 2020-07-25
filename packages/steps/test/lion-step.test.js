import { expect, fixture, html, oneEvent } from '@open-wc/testing';

import '../lion-step.js';

describe('lion-step', () => {
  it('has a condition which allows it to become active (condition is true by default)', async () => {
    const el = await fixture(html`
      <fake-lion-steps>
        <lion-step>Step 1</lion-step>
      </fake-lion-steps>
    `);
    expect(el.children[0].condition()).to.equal(true);
    expect(el.children[0].passesCondition()).to.equal(true);
  });

  it('does not invert condition by default', async () => {
    const el = await fixture(html`
      <fake-lion-steps>
        <lion-step>Step 1</lion-step>
      </fake-lion-steps>
    `);
    expect(el.children[0].invertCondition).to.equal(false);
    expect(el.children[0].passesCondition()).to.equal(true);
  });

  it('can invert its condition', async () => {
    const el = await fixture(html`
      <fake-lion-steps>
        <lion-step>Step 1</lion-step>
      </fake-lion-steps>
    `);
    el.children[0].condition = () => true;
    el.children[0].invertCondition = true;
    expect(el.children[0].condition()).to.equal(true);
    expect(el.children[0].passesCondition()).to.equal(false);
  });

  it('has "untouched" status by default', async () => {
    const el = await fixture(html`
      <fake-lion-steps>
        <lion-step>Step 1</lion-step>
      </fake-lion-steps>
    `);
    expect(el.children[0].status).to.equal('untouched');
  });

  it('is hidden when attribute hidden is true', async () => {
    const el = await fixture(
      html`
        <fake-lion-steps>
          <lion-step hidden>Step 1</lion-step>
        </fake-lion-steps>
      `,
    );
    expect(el.children[0]).not.to.be.displayed;
  });

  it('communicates with a parent steps controller to handles actions', async () => {
    const el = await fixture(html`
      <fake-lion-steps>
        <lion-step>Step 1</lion-step>
      </fake-lion-steps>
    `);
    expect(el.children[0].controller).to.equal(el);
  });

  describe('navigation', () => {
    it('can be entered', async () => {
      const el = await fixture(html`
        <fake-lion-steps>
          <lion-step>Step 1</lion-step>
        </fake-lion-steps>
      `);
      setTimeout(() => el.children[0].enter(), 0);
      await oneEvent(el.children[0], 'enter');
      expect(el.children[0].status).to.equal('entered');
    });

    it('can be left', async () => {
      const el = await fixture(html`
        <fake-lion-steps>
          <lion-step>Step 1</lion-step>
        </fake-lion-steps>
      `);
      setTimeout(() => el.children[0].leave(), 0);
      await oneEvent(el.children[0], 'leave');
      expect(el.children[0].status).to.equal('left');
    });

    it('can be skipped', async () => {
      const el = await fixture(html`
        <fake-lion-steps>
          <lion-step>Step 1</lion-step>
        </fake-lion-steps>
      `);
      setTimeout(() => el.children[0].skip(), 0);
      await oneEvent(el.children[0], 'skip');
      expect(el.children[0].status).to.equal('skipped');
    });
  });
});
