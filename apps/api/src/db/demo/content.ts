import { newId } from '@cofarm/core/id';

import { db } from '../client.ts';
import { activityLogEntries, misReports, projectUpdates, updatePhotos } from '../schema.ts';
import { createDocument } from './assets.ts';
import type { DemoContext, DemoProject } from './context.ts';
import type { ProjectPlan } from './plan.ts';

export type ContentResult = { mis: number; updates: number; activity: number };

export async function seedContent(
  context: DemoContext,
  project: DemoProject,
  plan: ProjectPlan,
): Promise<ContentResult> {
  for (const report of plan.mis) {
    // A published report must have its PDF; the publish check refuses one
    // without. A draft is left without a document on purpose, so the console
    // shows the attach-then-publish path.
    const documentId = report.published
      ? await createDocument({
          projectId: project.projectId,
          type: 'mis_report',
          kind: 'mis_report',
          originalName: `mis-${project.code}-${report.year.toString()}-${report.month.toString().padStart(2, '0')}.pdf`,
          title: `${project.code} MIS, ${report.title}`,
          uploadedBy: context.adminUserId,
          ownerUserId: null,
        })
      : null;

    await db.insert(misReports).values({
      id: newId(),
      projectId: project.projectId,
      month: report.month,
      year: report.year,
      title: report.title,
      narrative: report.narrative,
      outlook: report.outlook,
      source: 'uploaded',
      documentId,
      status: report.published ? 'published' : 'draft',
      publishedAt: report.published ? endOfMonth(report.year, report.month) : null,
      createdBy: context.adminUserId,
    });
  }

  for (const update of plan.updates) {
    const updateId = newId();
    await db.insert(projectUpdates).values({
      id: updateId,
      projectId: project.projectId,
      cycleId: project.cycleId,
      milestoneTag: update.tag,
      title: update.title,
      description: update.description,
      activityDate: update.on,
      status: update.published ? 'published' : 'draft',
      notifyPartners: update.notify,
      publishedAt: update.published ? new Date(`${update.on}T10:30:00Z`) : null,
      createdBy: context.adminUserId,
    });

    for (let index = 0; index < update.photos; index += 1) {
      const documentId = await createDocument({
        projectId: project.projectId,
        type: 'update_photo',
        kind: 'update_photo',
        originalName: `update-${(index + 1).toString()}.jpg`,
        title: `${update.title}, photo ${(index + 1).toString()}`,
        uploadedBy: context.adminUserId,
        ownerUserId: null,
      });
      await db.insert(updatePhotos).values({
        id: newId(),
        projectId: project.projectId,
        updateId,
        documentId,
        sortOrder: index,
      });
    }
  }

  for (const entry of plan.activity) {
    await db.insert(activityLogEntries).values({
      id: newId(),
      projectId: project.projectId,
      cycleId: project.cycleId,
      title: entry.title,
      detail: entry.detail,
      activityDate: entry.on,
      createdBy: context.adminUserId,
    });
  }

  return { mis: plan.mis.length, updates: plan.updates.length, activity: plan.activity.length };
}

function endOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0, 11, 0, 0));
}
