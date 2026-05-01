import { useCallback, useEffect, useRef } from "react";
import { type UseFormReturn, type FieldValues } from "react-hook-form";

const DRAFT_PREFIX = "pixocraft_draft_";

export function useFormDraft<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  options: {
    enabled?: boolean;
  } = {},
) {
  const { enabled = true } = options;
  const storageKey = DRAFT_PREFIX + key;
  const subscribedRef = useRef(false);

  const loadDraft = useCallback((): Partial<T> | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as Partial<T>;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const saveDraft = useCallback(
    (values: Partial<T>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {}
    },
    [storageKey],
  );

  useEffect(() => {
    if (!enabled || subscribedRef.current) return;
    subscribedRef.current = true;

    const draft = loadDraft();
    if (draft) {
      const current = form.getValues();
      form.reset({ ...current, ...draft } as T);
    }

    const sub = form.watch((values) => saveDraft(values as Partial<T>));
    return () => {
      sub.unsubscribe();
      subscribedRef.current = false;
    };
  }, [enabled, form, loadDraft, saveDraft]);

  return { clearDraft, loadDraft };
}
