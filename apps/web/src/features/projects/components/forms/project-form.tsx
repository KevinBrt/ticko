import {
  createProjectRequestSchema,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_KEY_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  type UpdateProjectRequest,
} from '@toppo/shared';
import { Alert, Button, Field, Input, Textarea } from '@toppo/ui';
import { type FormEvent, type ReactNode, useState } from 'react';
import { fieldErrors, requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { suggestProjectKey } from '../../utils/project-key.util.ts';

const KNOWN_ERRORS = {
  PROJECT_KEY_TAKEN: 'projects.keyTaken',
  PROJECT_KEY_FIXED: 'projects.keyFixedError',
  PROJECT_ARCHIVED: 'projects.archivedNotice',
} as const;

/**
 * A project's name, key and description. A new project's key follows its name until the person
 * types one; an existing project's key is fixed once it has had issues.
 */
export function ProjectForm({
  initial,
  keyEditable = true,
  submitLabel,
  pendingLabel,
  pending,
  error,
  notice,
  onSubmit,
}: {
  initial?: UpdateProjectRequest;
  keyEditable?: boolean;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  /** The server's refusal of the last attempt, if any. */
  error: unknown;
  /** Shown above the fields, e.g. that the changes are saved. */
  notice?: ReactNode;
  onSubmit: (project: UpdateProjectRequest) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  // A new project's key follows its name, until the person changes the key themselves.
  const [keyTyped, setKeyTyped] = useState(initial !== undefined);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createProjectRequestSchema.safeParse({ key, name, description });
    setErrors(parsed.success ? {} : fieldErrors(parsed.error, t));
    if (parsed.success) {
      onSubmit(parsed.data);
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={pending} className="flex flex-col gap-5">
      {error ? <Alert tone="danger">{requestErrorMessage(error, t, KNOWN_ERRORS)}</Alert> : notice}
      <Field label={t('projects.name')} error={errors['name']}>
        {(control) => (
          <Input
            {...control}
            value={name}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            autoComplete="off"
            onChange={(event) => {
              setName(event.target.value);
              if (!keyTyped) {
                setKey(suggestProjectKey(event.target.value));
              }
            }}
          />
        )}
      </Field>
      <Field
        label={t('projects.key')}
        description={keyEditable ? t('projects.keyHelp') : t('projects.keyFixed')}
        error={errors['key']}
      >
        {(control) => (
          <Input
            {...control}
            value={key}
            maxLength={PROJECT_KEY_MAX_LENGTH}
            readOnly={!keyEditable}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(event) => {
              setKey(event.target.value.toUpperCase());
              setKeyTyped(true);
            }}
            className="w-40 font-mono read-only:bg-surface-muted read-only:text-muted-foreground"
          />
        )}
      </Field>
      <Field label={t('projects.description')} error={errors['description']}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            value={description}
            maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>
      <Button type="submit" disabled={pending} className="self-end">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
