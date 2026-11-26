"use client";

// Header checkbox for the bulk toolbar. Checkboxes live inside the table but
// are associated with the toolbar form via their `form` attribute, so the
// table itself never has to be wrapped in a form (which would forbid the
// per-row action forms).
export function SelectAllCheckbox({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className="h-4 w-4"
      onChange={(event) => {
        const checked = event.currentTarget.checked;
        document
          .querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="ids"]`)
          .forEach((box) => {
            box.checked = checked;
          });
      }}
    />
  );
}
