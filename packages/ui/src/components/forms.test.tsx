import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Alert } from './alert.tsx';
import { Avatar, initialsOf } from './avatar.tsx';
import { Field } from './field.tsx';
import { Input } from './input.tsx';
import { PasswordInput } from './password-input.tsx';

describe('Field', () => {
  it('labels the control and announces its help and error', async () => {
    const screen = await render(
      <Field label="Email" description="Used to sign in" error="Enter a valid email">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });

    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect.element(input).toHaveAccessibleDescription('Used to sign in Enter a valid email');
  });

  it('is valid and undescribed by default', async () => {
    const screen = await render(<Field label="Name">{(control) => <Input {...control} />}</Field>);
    const input = screen.getByRole('textbox', { name: 'Name' });

    await expect.element(input).toHaveAttribute('aria-invalid', 'false');
    await expect.element(input).not.toHaveAttribute('aria-describedby');
  });
});

describe('PasswordInput', () => {
  it('hides the password until asked to show it', async () => {
    const screen = await render(
      <Field label="Password">
        {(control) => <PasswordInput {...control} showLabel="Show" hideLabel="Hide" />}
      </Field>,
    );
    const input = screen.getByLabelText('Password', { exact: true });
    await expect.element(input).toHaveAttribute('type', 'password');

    await screen.getByRole('button', { name: 'Show' }).click();

    await expect.element(input).toHaveAttribute('type', 'text');
    await expect
      .element(screen.getByRole('button', { name: 'Hide' }))
      .toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Alert', () => {
  it('announces danger immediately and information politely', async () => {
    const screen = await render(
      <>
        <Alert tone="danger">Wrong password</Alert>
        <Alert>Saved</Alert>
      </>,
    );

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Wrong password');
    await expect.element(screen.getByRole('status')).toHaveTextContent('Saved');
  });
});

describe('Avatar', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['Grace Brewster Hopper', 'GH'],
    ['ada', 'AD'],
    ['  Émile  ', 'ÉM'],
    ['𝓐da 𝓛ovelace', '𝓐𝓛'],
    ['', ''],
  ])('initials of %j are %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });

  it('is hidden from assistive technologies', async () => {
    const screen = await render(<Avatar name="Ada Lovelace" />);

    expect(screen.container.querySelector('[aria-hidden="true"]')?.textContent).toBe('AL');
  });
});
