import express, { Request, Response } from 'express';
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from 'fs';
import path from 'path';
import antlion from './main';


jest.mock('fs');
jest.mock('path');
jest.mock('./markov-babbler');

const mockedFS = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;



describe('antlion middleware', () => {
    let app: ReturnType<typeof express>;

    beforeEach(() => {
        app = express();
        mockedFS.readFileSync.mockReset();
        mockedPath.resolve.mockImplementation((_cwd, p) => p);
    });

    it('throws if robotsPath is missing', () => {
        expect(() =>
            antlion(app, {
                robotsPath: '',
                trainingDataPath: 'train.txt',
                trappedRoutes: ['/test/']
            })
        ).toThrow('[antlion] robotsPath parameter cannot be empty');
    });

    it('throws if trainingDataPath is missing', () => {
        expect(() =>
            antlion(app, {
                robotsPath: 'robots.txt',
                trainingDataPath: '',
                trappedRoutes: ['/test/']
            })
        ).toThrow('[antlion] trainingDataPath parameter cannot be empty');
    });

    it('throws if no trappedRoutes are provided', () => {
        expect(() =>
            antlion(app, {
                robotsPath: 'robots.txt',
                trainingDataPath: 'train.txt',
                trappedRoutes: []
            })
        ).toThrow('[antlion] At least one trapped route must be provided');
    });

    it('injects disallow lines into existing robots.txt with universal user-agent', () => {
        mockedFS.readFileSync.mockReturnValue('User-agent: *\nDisallow: /old/');

        const getMock = jest.fn();
        const routeMock = { get: getMock };
        jest.spyOn(app, 'route').mockReturnValue(routeMock as any);


        antlion(app, {
            robotsPath: 'robots.txt',
            trainingDataPath: 'train.txt',
            trappedRoutes: ['/test/']
        });

        const handler = routeMock.get.mock.calls[0][0] as (req: Request, res: Response) => void;

        const req = {} as Request;
        const res = {
            type: jest.fn().mockReturnThis(),
            send: jest.fn(),
        } as unknown as Response;

        handler(req, res);

        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Disallow: /test/'));
    });

    it('adds new user-agent block if not present', () => {
        mockedFS.readFileSync.mockReturnValue('User-agent: googlebot\nDisallow: /old/');

        const getMock = jest.fn();
        const routeMock = { get: getMock };
        jest.spyOn(app, 'route').mockReturnValue(routeMock as any);

        antlion(app, {
            robotsPath: 'robots.txt',
            trainingDataPath: 'train.txt',
            trappedRoutes: ['/test/']
        });

        const handler = routeMock.get.mock.calls[0][0] as (req: Request, res: Response) => void;

        const req = {} as Request;
        const res = {
            type: jest.fn().mockReturnThis(),
            send: jest.fn(),
        } as unknown as Response;

        handler(req, res);

        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('User-agent: *\nDisallow: /test/'));
    });

    it("registers tarpit route handlers", () => {
        const useSpy = jest.spyOn(app, "use");
        (fs.readFileSync as jest.Mock).mockReturnValue("User-agent: *");

        antlion(app, {
            robotsPath: "robots.txt",
            trainingDataPath: "train.txt",
            trappedRoutes: ["/alpha", "/beta"],
        });

        expect(useSpy).toHaveBeenCalledWith("/alpha", expect.any(Function));
        expect(useSpy).toHaveBeenCalledWith("/alpha/*route", expect.any(Function));
        expect(useSpy).toHaveBeenCalledWith("/beta", expect.any(Function));
        expect(useSpy).toHaveBeenCalledWith("/beta/*route", expect.any(Function));
    });
});
