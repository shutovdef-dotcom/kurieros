import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('llms-full generated knowledge base', () => {
	it('does not emit trailing whitespace', () => {
		const output = readFileSync(resolve(process.cwd(), 'public/llms-full.txt'), 'utf8');

		expect(output.split('\n').filter((line) => /[\t ]+$/.test(line))).toEqual([]);
	});
});
