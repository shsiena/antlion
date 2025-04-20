import { describe, expect, it, jest } from "@jest/globals";
import MarkovBabbler from "./markov-babbler";

jest.spyOn(MarkovBabbler.prototype, 'generate')
    .mockImplementation((minWords?: number, maxWords?: number) => {
        const arr: string[] = [];
        for (let i = 0; i < minWords!; i++) {
            arr.push(`w${i}`);
        }
        return arr;
    });

import { generateRandomString, formatLinkText, generatePage } from "./main";

describe('generateRandomString', () => {
    it('generates a string within a set length range', () => {
        const result = generateRandomString();
        expect(result.length).toBeGreaterThanOrEqual(15);
        expect(result.length).toBeLessThanOrEqual(50);
        expect(result).toMatch(/^[A-Za-z\-~]+$/);
    });
});

describe('formatLinkText', () => {
    it('strips non-letters and converts an input string to lowercase', () => {
        expect(formatLinkText('Hello123! World_')).toBe('helloworld');
        expect(formatLinkText('S p a c e')).toBe('space');
    });
});

describe('generatePage', () => {
    it('returns array of chunked HTML', () => {
        const mockRoutes = ['/trap1/', '/trap2/'];
        const chunks = generatePage(mockRoutes);
        const html = chunks.join('');

        expect(Array.isArray(chunks)).toBe(true);
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toMatch(/<title>w0(<\/title>| w1<\/title>)/);
        expect(html).toMatch(/<p>w\d+( w\d+)*<\/p>/);
        expect(html).toMatch(/<a href="\/trap\/.+">w\d+<\/a>/); 
    });
});
