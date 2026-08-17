import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ProjectId, ScopedProjectRef } from "@t3tools/contracts";
import type { DraftThreadEnvMode } from "../composerDraftStore";

interface ThreadContextLike {
  environmentId: EnvironmentId;
  projectId: ProjectId;
}

interface ThreadWorkspaceContextLike extends ThreadContextLike {
  branch: string | null;
  worktreePath: string | null;
}

interface DraftWorkspaceContextLike extends ThreadWorkspaceContextLike {
  envMode: DraftThreadEnvMode;
  startFromOrigin: boolean;
}

type ThreadWorkspaceSelectionLike = Omit<DraftWorkspaceContextLike, "environmentId" | "projectId">;

interface NewThreadHandler {
  (
    projectRef: ScopedProjectRef,
    options?: {
      branch?: string | null;
      worktreePath?: string | null;
      envMode?: DraftThreadEnvMode;
      startFromOrigin?: boolean;
    },
    // The opened draft's identity, which most callers have no use for.
  ): Promise<unknown>;
}

export interface ChatThreadActionContext {
  readonly activeDraftThread: DraftWorkspaceContextLike | null;
  readonly activeThread: ThreadWorkspaceContextLike | undefined;
  readonly activeThreadWorkspace?: ThreadWorkspaceSelectionLike | null;
  readonly defaultProjectRef: ScopedProjectRef | null;
  readonly handleNewThread: NewThreadHandler;
}

export function resolveNewDraftStartFromOrigin(input: {
  envMode: DraftThreadEnvMode;
  newWorktreesStartFromOrigin: boolean;
}): boolean {
  return input.envMode === "worktree" && input.newWorktreesStartFromOrigin;
}

export function resolveThreadActionProjectRef(
  context: ChatThreadActionContext,
): ScopedProjectRef | null {
  if (context.activeThread) {
    return scopeProjectRef(context.activeThread.environmentId, context.activeThread.projectId);
  }
  if (context.activeDraftThread) {
    return scopeProjectRef(
      context.activeDraftThread.environmentId,
      context.activeDraftThread.projectId,
    );
  }
  return context.defaultProjectRef;
}

// New threads inherit only the *project* from the current context. Branch,
// worktree, and env mode always come from the user's configured defaults —
// carrying them over from the viewed thread meant "new thread" silently
// reused checkouts and branches. Explicit affordances (branch toolbar's
// "new thread in this worktree") pass those options to handleNewThread
// directly instead.
export async function startNewThreadFromContext(
  context: ChatThreadActionContext,
): Promise<boolean> {
  const projectRef = resolveThreadActionProjectRef(context);
  if (!projectRef) {
    return false;
  }

  await context.handleNewThread(projectRef);
  return true;
}

/**
 * Starts a clean conversation in the viewed thread's workspace. Model,
 * runtime, and interaction settings are carried by useNewThreadHandler from
 * the current route; this helper supplies the workspace fields that normal
 * new-thread entry points intentionally leave to configured defaults.
 */
export async function startNewThreadMatchingContext(
  context: ChatThreadActionContext,
): Promise<boolean> {
  const projectRef = resolveThreadActionProjectRef(context);
  if (!projectRef) {
    return false;
  }

  if (context.activeThread) {
    const workspace = context.activeThreadWorkspace ?? {
      branch: context.activeThread.branch,
      worktreePath: context.activeThread.worktreePath,
      envMode: context.activeThread.worktreePath ? "worktree" : "local",
      startFromOrigin: false,
    };
    await context.handleNewThread(projectRef, {
      branch: workspace.branch,
      worktreePath: workspace.worktreePath,
      envMode: workspace.envMode,
      startFromOrigin: workspace.startFromOrigin,
    });
    return true;
  }

  if (context.activeDraftThread) {
    await context.handleNewThread(projectRef, {
      branch: context.activeDraftThread.branch,
      worktreePath: context.activeDraftThread.worktreePath,
      envMode: context.activeDraftThread.envMode,
      startFromOrigin: context.activeDraftThread.startFromOrigin,
    });
    return true;
  }

  await context.handleNewThread(projectRef);
  return true;
}
