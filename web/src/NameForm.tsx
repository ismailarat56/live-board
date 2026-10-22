import { MemberNameSchema } from "@live-board/shared";
import { useState, type SubmitEvent } from "react";

interface NameFormProps {
  name: string;
  onChange: (name: string) => void;
}

export function NameForm({ name, onChange }: NameFormProps) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = MemberNameSchema.safeParse(draft);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ad geçersiz.");
      return;
    }

    setError(null);
    setDraft(parsed.data);
    onChange(parsed.data);
  }

  return (
    <form className="name-form" onSubmit={handleSubmit} noValidate>
      <label>
        Adın{" "}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={30}
        />
      </label>
      <button type="submit" disabled={draft.trim() === name}>
        Kaydet
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
