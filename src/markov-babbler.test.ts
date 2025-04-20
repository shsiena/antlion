import fs from 'fs';
import MarkovBabbler, {cleanString, whitelistString} from './markov-babbler';
import {beforeEach, describe, expect, it, jest} from '@jest/globals';


jest.mock('fs');

const mockedFS = fs as jest.Mocked<typeof fs>;

describe('cleanString', () => {
    it('removes empty lines and joins with spaces', () => {
        const input = `Hello

World


This is a test


        `;
        const expected = 'Hello World This is a test';
        expect(cleanString(input)).toBe(expected);
    });

    it('returns an empty string when given only whitespace and newlines', () => {
        const input = `





   
        

        `;
        expect(cleanString(input)).toBe('');
    });
});

describe('whitelistString', () => {
    it('removes characters not in the whitelist', () => {
        const input = 'Hello, 世界! 👋🏽 660';
        const expected = 'Hello, !  ';
        expect(whitelistString(input)).toBe(expected);
    });

    it('preserves punctuation and letters', () => {
        const input = 'Test 123 #hashtag @mention $money';
        const expected = 'Test  hashtag mention money';
        expect(whitelistString(input)).toBe(expected);
    });

    it('handles empty strings', () => {
        expect(whitelistString('')).toBe('');
    });
});


describe('MarkovBabbler', () => {
    const sampleText = `
According to all known laws of aviation, there is no way a bee should be able to fly.
Its wings are too small to get its fat little body off the ground.
The bee, of course, flies anyway because bees don't care what humans think is impossible.
Yellow, black. Yellow, black. Yellow, black. Yellow, black.
Ooh, black and yellow!
Let's shake it up a little.
Barry! Breakfast is ready!
Coming!
Hang on a second.
Hello?
Barry?
Adam?
Can you believe this is happening?
I can't.
I'll pick you up.
Looking sharp.
Use the stairs, Your father paid good money for those.
Sorry. I'm excited.
Here's the graduate.
We're very proud of you, son.
A perfect report card, all B's.
Very proud.
Ma! I got a thing going here.
You got lint on your fuzz.
Ow! That's me!
Wave to us! We'll be in row 118,000.
Bye!
Barry, I told you, stop flying in the house!
    `;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('train', () => {
        it('builds a model from a given dataset', () => {
            mockedFS.readFileSync.mockReturnValue(sampleText);

            const babbler = new MarkovBabbler(2);
            babbler.train('dummy/path.txt');

            const modelKeys = Array.from(babbler['model'].keys());
            expect(modelKeys.length).toBeGreaterThan(0);
        });

        it(`throws if file can't be read`, () => {
            mockedFS.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const babbler = new MarkovBabbler(2);
            expect(() => babbler.train('bad/path.txt')).toThrow(
                'Failed to read dataset'
            );
        });

        it('throws if dataset is below 100 characters', () => {
            mockedFS.readFileSync.mockReturnValue('less than 100 characters');

            const babbler = new MarkovBabbler(2);
            expect(() => babbler.train('dummy/path.txt')).toThrow(
                'Dataset must be larger than 100 words. Current length: 3' // cleanDataset will remove 100
            );
        });
    });

    describe('generate', () => {
        it('generates text from trained model', () => {
            mockedFS.readFileSync.mockReturnValue(sampleText);
            const babbler = new MarkovBabbler(2);
            babbler.train('dummy/path.txt');

            const output = babbler.generate(10, 20);
            expect(Array.isArray(output)).toBe(true);
            expect(output.length).toBeGreaterThanOrEqual(10);
            expect(output.length).toBeLessThanOrEqual(20);
        });

        it('throws if minWords is greater than maxWords', () => {
            mockedFS.readFileSync.mockReturnValue(sampleText);
            const babbler = new MarkovBabbler(2);
            babbler.train('dummy/path.txt');

            expect(() => babbler.generate(30, 20)).toThrow(
                'minWords cannot be greater than maxWords'
            );
        });

        it('continues generation if output ends early', () => {
            mockedFS.readFileSync.mockReturnValue(sampleText);

            const babbler = new MarkovBabbler(2);
            babbler.train('dummy/path.txt');

            const inputLength = cleanString(sampleText).split(/\s+/).length;

            const output = babbler.generate(Math.floor(inputLength * 5), inputLength * 10);
            expect(output.length).toBeGreaterThanOrEqual(inputLength * 5);
        });
    });
});

