import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CreateIssueRequest,
  createIssueRequestSchema,
  ISSUE_TITLE_MAX_LENGTH,
} from '@toppo/shared';
import { Alert, Button, cn, Field, Input, Select, swatchClassName } from '@toppo/ui';
import { type FormEvent, useId, useState } from 'react';
import { fieldErrors, requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { Issues } from '../../api/issues.api.ts';
import { IssuesQueries } from '../../queries/issues.queries.ts';
import { MarkdownEditor } from '../markdown/markdown-editor.tsx';

const KNOWN_ERRORS = {
  INVALID_CATEGORY: 'issues.invalidCategory',
  INVALID_PRIORITY: 'issues.invalidPriority',
  PROJECT_ARCHIVED: 'projects.archivedNotice',
} as const;

/**
 * A new issue of a project: its subject and description, then its priority and category, the
 * project's defaults chosen. Whoever reports it is its requester. Reports the new issue's key.
 */
export function NewIssueForm({
  projectKey,
  onCreated,
  onCancel,
}: {
  projectKey: string;
  onCreated: (key: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fields = useQuery(IssuesQueries.fields(projectKey));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Empty until chosen: the project's default applies.
  const [priorityId, setPriorityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: (issue: CreateIssueRequest) => Issues.create(projectKey, issue),
    onSuccess: async (key) => {
      await queryClient.invalidateQueries({ queryKey: IssuesQueries.allOf(projectKey) });
      await onCreated(key);
    },
  });

  const defaultPriority = fields.data?.priorities.find(({ isDefault }) => isDefault)?.id ?? '';
  const defaultCategory = fields.data?.categories.find(({ isDefault }) => isDefault)?.id ?? '';
  const chosenPriority = priorityId || defaultPriority;
  const chosenCategory = categoryId || defaultCategory;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createIssueRequestSchema.safeParse({
      title,
      description,
      ...(chosenPriority ? { priorityId: chosenPriority } : {}),
      ...(chosenCategory ? { categoryId: chosenCategory } : {}),
    });
    setErrors(parsed.success ? {} : fieldErrors(parsed.error, t));
    if (parsed.success) {
      create.mutate(parsed.data);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-busy={create.isPending}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <section className="flex flex-col rounded-xl border border-border bg-surface shadow-xs">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {create.isError ? (
            <Alert tone="danger">{requestErrorMessage(create.error, t, KNOWN_ERRORS)}</Alert>
          ) : null}
          <Field label={t('issues.subject')} error={errors['title']}>
            {(control) => (
              <Input
                {...control}
                required
                value={title}
                maxLength={ISSUE_TITLE_MAX_LENGTH}
                autoComplete="off"
                onChange={(event) => setTitle(event.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('issues.description')}
            description={t('issues.markdownHelp')}
            error={errors['description']}
          >
            {(control) => (
              <MarkdownEditor
                label={t('issues.description')}
                control={control}
                value={description}
                onChange={setDescription}
              />
            )}
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="secondary" onClick={onCancel}>
            {t('issues.cancel')}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t('issues.creating') : t('issues.create')}
          </Button>
        </div>
      </section>
      <aside className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-semibold text-foreground">{t('issues.properties')}</h2>
        <Field label={t('issues.priority')}>
          {(control) => (
            <Select
              {...control}
              value={chosenPriority}
              disabled={!fields.data}
              onChange={(event) => setPriorityId(event.target.value)}
            >
              {(fields.data?.priorities ?? []).map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <CategoryChoice
          categories={fields.data?.categories ?? []}
          value={chosenCategory}
          onChange={setCategoryId}
        />
      </aside>
    </form>
  );
}

/** The categories as buttons side by side: radio buttons, each with its color. */
function CategoryChoice({
  categories,
  value,
  onChange,
}: {
  categories: readonly { id: string; name: string; color: Parameters<typeof swatchClassName>[0] }[];
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const { t } = useI18n();
  const id = useId();

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-foreground">{t('issues.category')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => (
          <label
            key={category.id}
            className="relative flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover has-checked:border-primary has-checked:bg-primary-subtle has-checked:text-primary-subtle-foreground has-focus-visible:outline-2 has-focus-visible:outline-ring pointer-coarse:min-h-11"
          >
            <input
              type="radio"
              name={`${id}-category`}
              value={category.id}
              checked={value === category.id}
              onChange={() => onChange(category.id)}
              // Transparent over the button: clicked and focused where it is seen.
              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            />
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', swatchClassName(category.color))}
            />
            {category.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
