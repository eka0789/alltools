"use client";

import { useMemo, useState } from "react";

interface Cat {
  id: number;
  name: string;
}
interface Sub {
  id: number;
  categoryId: number;
  name: string;
}

// Category + subcategory pair with dependent filtering. Offering all 103
// subcategories under any category let admins silently create cross-category
// rows, which then never show under the right chip.
export function CategorySubcategoryFields({
  categories,
  subcategories,
  initialCategoryId,
  initialSubcategoryId,
}: {
  categories: Cat[];
  subcategories: Sub[];
  initialCategoryId?: number | string;
  initialSubcategoryId?: number | null;
}) {
  const [categoryId, setCategoryId] = useState<string>(
    initialCategoryId ? String(initialCategoryId) : "",
  );

  const subs = useMemo(
    () => subcategories.filter((s) => String(s.categoryId) === categoryId),
    [subcategories, categoryId],
  );

  const initialValid =
    initialSubcategoryId != null &&
    subs.some((s) => s.id === initialSubcategoryId);
  const [subId, setSubId] = useState<string>(
    initialValid ? String(initialSubcategoryId) : "",
  );

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Category *</label>
        <select
          name="category"
          required
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubId("");
          }}
          className="input"
        >
          <option value="" disabled>
            Select…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Subcategory</label>
        <select
          name="subcategory"
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          className="input"
        >
          <option value="">None</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
