import { describe, expect, it } from "@jest/globals";
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
        const fullHTML = chunks.join('');

        expect(Array.isArray(chunks)).toBe(true);
        expect(fullHTML).toMatch(/<!DOCTYPE html>/);
        expect(fullHTML).toMatch(/<a href="\/trap[12]\/[A-Za-z\-~]+">/);
        expect(fullHTML).toMatch(/<p>.*<\/p>/);
        expect(chunks.length).toBeGreaterThan(1);
    });
});
