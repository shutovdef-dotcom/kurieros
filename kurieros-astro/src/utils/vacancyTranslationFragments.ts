import type { JobTranslationEntry } from '../data/jobs';

type TranslationEntry = Record<string, string>;

export type RuntimeTranslationValue = string | number;

export interface RuntimeTranslationFragment {
  defaults: TranslationEntry;
  dict?: Record<string, string[]>;
  entries: Record<string, Record<string, RuntimeTranslationValue>>;
}

const runtimeTranslatedFieldPattern = /^(?:shortDescription|description|req_\d+|ben_\d+|doc_\d+)$/;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

export const isRuntimeTranslatedVacancyField = (key: string): boolean =>
  runtimeTranslatedFieldPattern.test(key);

export const pickRuntimeTranslationDelta = (
  entry: JobTranslationEntry,
  baseEntry?: JobTranslationEntry,
): TranslationEntry => {
  const delta: TranslationEntry = {};
  for (const [key, value] of Object.entries(entry)) {
    if (!isRuntimeTranslatedVacancyField(key)) continue;
    if (baseEntry && baseEntry[key as keyof JobTranslationEntry] === value) continue;
    delta[key] = value;
  }
  return delta;
};

export const compactFragment = (
  jobs: Record<string, TranslationEntry>,
): { defaults: TranslationEntry; entries: Record<string, TranslationEntry> } => {
  const ids = Object.keys(jobs);
  if (ids.length === 0) {
    return { defaults: {}, entries: {} };
  }

  const fieldStats = new Map<
    string,
    { presenceCount: number; firstValue: string; allEqual: boolean }
  >();
  for (const id of ids) {
    const entry = jobs[id];
    for (const [key, value] of Object.entries(entry)) {
      const stat = fieldStats.get(key);
      if (!stat) {
        fieldStats.set(key, { presenceCount: 1, firstValue: value, allEqual: true });
      } else {
        stat.presenceCount += 1;
        if (stat.allEqual && stat.firstValue !== value) {
          stat.allEqual = false;
        }
      }
    }
  }

  const defaultKeys = new Set<string>();
  const defaults: TranslationEntry = {};
  for (const [key, stat] of fieldStats) {
    if (stat.presenceCount === ids.length && stat.allEqual) {
      defaultKeys.add(key);
      defaults[key] = stat.firstValue;
    }
  }

  const entries: Record<string, TranslationEntry> = {};
  for (const id of ids) {
    const stripped: TranslationEntry = {};
    for (const [key, value] of Object.entries(jobs[id])) {
      if (!defaultKeys.has(key)) {
        stripped[key] = value;
      }
    }
    entries[id] = stripped;
  }

  return { defaults, entries };
};

export const encodeRepeatedFragmentValues = (
  fragment: { defaults: TranslationEntry; entries: Record<string, TranslationEntry> },
  minSavingsBytes = 256,
): RuntimeTranslationFragment => {
  const fieldValues: Record<string, string[]> = {};
  for (const entry of Object.values(fragment.entries)) {
    for (const [key, value] of Object.entries(entry)) {
      fieldValues[key] = fieldValues[key] ?? [];
      fieldValues[key].push(value);
    }
  }

  const dict: Record<string, string[]> = {};
  const dictIndexes: Record<string, Map<string, number>> = {};

  for (const [field, values] of Object.entries(fieldValues)) {
    const uniqueValues = Array.from(new Set(values));
    if (uniqueValues.length < 2 || uniqueValues.length >= values.length) continue;

    const currentBytes = values.reduce((sum, value) => sum + byteLength(JSON.stringify(value)), 0);
    const dictionaryBytes = byteLength(JSON.stringify(uniqueValues));
    const encodedValueBytes = values.reduce((sum, value) => {
      const index = uniqueValues.indexOf(value);
      return sum + String(index).length;
    }, 0);
    const fieldOverheadBytes = byteLength(JSON.stringify(field)) + 2;
    const savings = currentBytes - dictionaryBytes - encodedValueBytes - fieldOverheadBytes;

    if (savings > minSavingsBytes) {
      dict[field] = uniqueValues;
      dictIndexes[field] = new Map(uniqueValues.map((value, index) => [value, index]));
    }
  }

  const entries: RuntimeTranslationFragment['entries'] = {};
  for (const [id, entry] of Object.entries(fragment.entries)) {
    const encoded: Record<string, RuntimeTranslationValue> = {};
    for (const [key, value] of Object.entries(entry)) {
      encoded[key] = dictIndexes[key]?.get(value) ?? value;
    }
    entries[id] = encoded;
  }

  return {
    defaults: fragment.defaults,
    ...(Object.keys(dict).length ? { dict } : {}),
    entries,
  };
};

export const buildRuntimeTranslationFragment = (
  jobs: Record<string, JobTranslationEntry>,
  baseJobs: Record<string, JobTranslationEntry> = {},
): RuntimeTranslationFragment => {
  const deltas: Record<string, TranslationEntry> = {};
  for (const [id, entry] of Object.entries(jobs)) {
    const delta = pickRuntimeTranslationDelta(entry, baseJobs[id]);
    if (Object.keys(delta).length > 0) {
      deltas[id] = delta;
    }
  }

  return encodeRepeatedFragmentValues(compactFragment(deltas));
};
