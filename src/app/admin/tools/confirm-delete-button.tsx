"use client";

// Permanent actions deserve a speed bump: one click used to delete a tool.
export function ConfirmDeleteButton({
  name,
  permanent = false,
}: {
  name: string;
  permanent?: boolean;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const message = permanent
          ? `Delete "${name}" permanently? This cannot be undone.`
          : `Move "${name}" to trash? You can restore it later.`;
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
      className="text-xs text-red-500 hover:underline"
    >
      {permanent ? "Delete forever" : "Hapus"}
    </button>
  );
}
