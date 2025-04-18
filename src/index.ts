import { Application, Request, RequestHandler, Response } from "express";
import fs from "fs";
import { resolve as resolvePath} from "path";

interface AntlionOptions {
  filePath: string;
  /** List of free routes to trap (e.g. ['/secret/', '/blog/']) to append as Disallow lines */
  trappedRoutes?: string[];
  urlPath?: string;
}


export default function antlion(app: Application, options: AntlionOptions): void {
    if (!options.filePath) {
        throw new Error("`filePath` option is required");
    }

    const servePath = options.urlPath || "/robots.txt";
    const rawTrappedRoutes = options.trappedRoutes || [];

    const disallows = rawTrappedRoutes.map(route => route.endsWith('/') ? route : route + '/');

    let raw: string;
    try {
        raw = fs.readFileSync(resolvePath(options.filePath), "utf-8");
    } catch (err) {
        throw new Error(`Failed to read robots.txt at ${options.filePath}: ${err}`);
    }

    raw = raw.replace(/\r\n?/g, '\n');
    if (!raw.endsWith('\n')) {
        raw += '\n';
    }

    const lines = raw.split('\n');
    const globalUserAgentLineIndex = lines.findIndex(l => /^User-agent:\s*\*\s*$/i.test(l));

    const disallowLines = disallows.map(endpoint => `Disallow: ${endpoint}`);

    if (globalUserAgentLineIndex !== -1) {
        let insertAt = globalUserAgentLineIndex + 1;
        while (insertAt < lines.length && lines[insertAt].trim() !== '') {
            insertAt++
        }

        lines.splice(insertAt, 0, ...disallowLines);
    } else {
        // no wildcard user agent block, prepend one
        
        const block = ['User-agent: *', ...disallowLines, ''];
        lines.unshift(...block);
    }

    const finalRobotsTxt = lines.join('\n');

    console.log(`[antlion] Loaded robots.txt with ${disallows.length} injected trapped route${disallows.length !== 1 ? 's' : ''}`);

    app.route(servePath)
        .get((req: Request, res: Response) => {
            res.type('text/plain').send(finalRobotsTxt);
            console.log(`[antlion] Served trapped robots.txt`);
        });
}

