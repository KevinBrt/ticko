import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectResponse, UpdateProjectRequest } from '@toppo/shared';
import { Alert, Button, Dialog, DialogClose, DialogContent, DialogTrigger } from '@toppo/ui';
import { ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react';
import { useState } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { Projects } from '../../api/projects.api.ts';
import { ProjectsQueries } from '../../queries/projects.queries.ts';
import { ProjectForm } from '../forms/project-form.tsx';

/**
 * A project's name, key and description, and the way to archive it or bring it back. Reports a
 * new key, for the screen to follow it.
 */
export function GeneralSettings({
  project,
  onKeyChanged,
}: {
  project: ProjectResponse;
  onKeyChanged: (key: string) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (changes: UpdateProjectRequest) => Projects.update(project.key, changes),
    onSuccess: async (_nothing, changes) => {
      await queryClient.invalidateQueries({ queryKey: ProjectsQueries.all });
      if (changes.key !== project.key) {
        await onKeyChanged(changes.key);
      }
    },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {project.archived ? null : (
        <section className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
          <ProjectForm
            initial={{ key: project.key, name: project.name, description: project.description }}
            keyEditable={project.keyEditable}
            submitLabel={t('projectSettings.save')}
            pendingLabel={t('projectSettings.saving')}
            pending={save.isPending}
            error={save.error}
            notice={save.isSuccess ? <Alert>{t('projectSettings.saved')}</Alert> : null}
            onSubmit={(changes) => save.mutate(changes)}
          />
        </section>
      )}
      <ArchiveSection project={project} />
    </div>
  );
}

/** Archiving asks first; bringing a project back does not, it undoes nothing. */
function ArchiveSection({ project }: { project: ProjectResponse }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      project.archived ? Projects.unarchive(project.key) : Projects.archive(project.key),
    onSuccess: async () => {
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: ProjectsQueries.all });
    },
  });

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-semibold text-foreground">
        {project.archived ? t('projectSettings.unarchiveTitle') : t('projectSettings.archiveTitle')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {project.archived
          ? t('projectSettings.unarchiveDescription')
          : t('projectSettings.archiveDescription')}
      </p>
      {change.isError ? (
        <Alert tone="danger" className="mt-4">
          {requestErrorMessage(change.error, t)}
        </Alert>
      ) : null}
      <div className="mt-4 flex justify-end">
        {project.archived ? (
          <Button variant="secondary" disabled={change.isPending} onClick={() => change.mutate()}>
            <ArchiveRestoreIcon aria-hidden="true" />
            {t('projectSettings.unarchive')}
          </Button>
        ) : (
          <Dialog open={confirming} onOpenChange={setConfirming}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <ArchiveIcon aria-hidden="true" />
                {t('projectSettings.archive')}
              </Button>
            </DialogTrigger>
            <DialogContent
              title={t('projectSettings.archiveConfirmTitle', { name: project.name })}
              description={t('projectSettings.archiveDescription')}
              closeLabel={t('projectSettings.close')}
            >
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <DialogClose asChild>
                  <Button variant="secondary">{t('projectSettings.cancel')}</Button>
                </DialogClose>
                <Button disabled={change.isPending} onClick={() => change.mutate()}>
                  {t('projectSettings.archiveConfirm')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
