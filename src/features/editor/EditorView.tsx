import { EditorForm } from "./EditorForm";
import { PreviewCard } from "../preview/PreviewCard";
import { MemberListLine } from "../preview/MemberListLine";
import type { PresencePayload } from "../../types/presence";
import type { FieldErrors } from "../../lib/validation";

interface EditorViewProps {
  draft: PresencePayload;
  onChange: (draft: PresencePayload) => void;
  errors: FieldErrors;
  appName: string;
}

export function EditorView({ draft, onChange, errors, appName }: EditorViewProps) {
  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
      <EditorForm draft={draft} onChange={onChange} errors={errors} />

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Profile preview</h2>
          <PreviewCard draft={draft} appName={appName} />
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Member list</h2>
          <MemberListLine draft={draft} appName={appName} />
        </div>
      </div>
    </main>
  );
}
