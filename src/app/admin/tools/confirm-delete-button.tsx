"use client";

// Permanent actions deserve a speed bump: one click used to delete a tool.
export function ConfirmDeleteButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(`Delete "${name}" permanently? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
      className="text-xs text-red-500 hover:underline"
    >
      Delete
    </button>
  );
}
