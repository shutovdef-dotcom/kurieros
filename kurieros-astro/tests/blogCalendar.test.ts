import { describe, expect, it } from 'vitest';
import calendar from '../src/data/blog-calendar.json';

type CalendarEntry = {
  sequence: number;
  slug: string;
  title: string;
  type: 'rewrite' | 'new' | 'research';
  nominalPublishAt: string;
  primaryIntent: string;
  pillarHref: string;
  commercialHref?: string;
  researchGate: {
    required: boolean;
    minimumEvidence?: string;
  };
  sourceGate: {
    required: boolean;
    kind: 'standard' | 'official-role-employer';
  };
};

const entries = calendar.entries as CalendarEntry[];

function expectInternalPath(value: string) {
  expect(value).toMatch(/^\/(?:[^/?#]+\/)*$/);
  expect(value).not.toContain('//');
  expect(value).not.toContain('..');
}

describe('blog publication calendar', () => {
  it('contains one unique, ordered entry for each of the 100 planned releases', () => {
    expect(entries).toHaveLength(100);
    expect(entries.map((entry) => entry.sequence)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    );
    expect(new Set(entries.map((entry) => entry.slug)).size).toBe(100);

    for (const entry of entries) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(entry.title.trim().length).toBeGreaterThan(20);
      expect(entry.primaryIntent.trim().length).toBeGreaterThan(3);
      expectInternalPath(entry.pillarHref);
      if (entry.commercialHref) {
        expectInternalPath(entry.commercialHref);
      }
    }
  });

  it('uses the approved Moscow-time slot every 24 hours without fabricating publication dates', () => {
    expect(calendar.cadenceHours).toBe(24);
    expect(entries[0]?.nominalPublishAt).toBe('2026-07-23T09:00:00+03:00');
    expect(entries.at(-1)?.nominalPublishAt).toBe('2026-10-30T09:00:00+03:00');

    for (const [index, entry] of entries.entries()) {
      expect(entry).not.toHaveProperty('datePublished');
      expect(entry).not.toHaveProperty('dateModified');

      if (index > 0) {
        const previous = entries[index - 1]!;
        expect(
          new Date(entry.nominalPublishAt).getTime() -
            new Date(previous.nominalPublishAt).getTime(),
        ).toBe(24 * 60 * 60 * 1000);
      }
    }
  });

  it('keeps research and source-dependent briefs behind explicit release gates', () => {
    const researchEntries = entries.filter((entry) => entry.type === 'research');

    expect(researchEntries).toHaveLength(10);
    expect(
      researchEntries.every(
        (entry) =>
          entry.researchGate.required &&
          Boolean(entry.researchGate.minimumEvidence) &&
          entry.sourceGate.required,
      ),
    ).toBe(true);

    const sourceGatedSequences = [66, 71, 73, 74];
    for (const sequence of sourceGatedSequences) {
      const entry = entries.find((item) => item.sequence === sequence);
      expect(entry?.sourceGate).toMatchObject({
        required: true,
        kind: 'official-role-employer',
      });
    }
  });
});
