/*
 * @license MIT
 * Copyright (c) 2025 Simon Siena <ssiena@uwaterloo.ca>
*/

import fs from "fs";
import { resolve as resolvePath} from "path";

export function cleanString(input: string) {
    return input
        .split(/\r?\n/)
        .filter((line: string) => line.trim() !== '')
        .join(' ');
}

export function whitelistString(input: string): string {
    const whitelist = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,!?'"`;
    const escaped = whitelist.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    const regex = new RegExp(`[^${escaped}]`, 'g');
    return input.replace(regex, '');
}

export default class MarkovBabbler {
    private model: Map<string, string[]>;
    private order: number;

    constructor(order: number = 2) {
        this.order = order;
        this.model = new Map();
    }

    train(datasetFilePath: string): void {

        let raw: string;
        try {
            raw = fs.readFileSync(resolvePath(datasetFilePath), "utf-8");
            raw = whitelistString(raw);
        } catch (err) {
            throw new Error(`Failed to read dataset at ${datasetFilePath}: ${err}`);
        }

        const words = cleanString(raw).split(/\s+/);

        if (words.length < 100) {
            throw new Error(`Dataset must be larger than 100 words. Current length: ${words.length}`);
        }

        for (let i = 0; i < words.length - this.order; i++) {
            const key = words.slice(i, i + this.order).join(' ');
            const nextWord = words[i + this.order];
            if (!this.model.has(key)) {
                this.model.set(key, []);
            }
            this.model.get(key)?.push(nextWord);
        }
    }

    generate(minWords: number = 500, maxWords: number = 1000): string[] {

        if (minWords > maxWords) {
            throw new Error('minWords cannot be greater than maxWords');
        }

        const keys = Array.from(this.model.keys());
        let currentKey = keys[Math.floor(Math.random() * (keys.length - 1))];

        let output: string[] = currentKey.split(' ');

        while (output.length < maxWords) {
            const nextWords = this.model.get(currentKey);
            if (!nextWords || nextWords.length === 0) {
                if (output.length >= minWords) {
                    return output;
                } else {
                    currentKey = keys[Math.floor(Math.random() * (keys.length - 1))];
                    continue;
                }
            }

            const nextWord = nextWords[Math.floor(Math.random() * nextWords.length)];
            output.push(nextWord);

            const nextKey = output.slice(output.length - this.order, output.length).join(' ');
            currentKey = nextKey;
        }

        return output;
    }
}
