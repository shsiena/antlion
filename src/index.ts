import { Application, Request, RequestHandler, Response } from "express";
import fs from "fs";
import { resolve as resolvePath} from "path";
import MarkovBabbler from "./markov-babbler";

interface AntlionOptions {
  filePath: string;
  /** List of free routes to trap (e.g. ['/secret/', '/blog/']) to append as Disallow lines */
  trappedRoutes?: string[];
  urlPath?: string;
}

const totalDelay = 5000;   // ms
const chunkSize = 50;      // chars
const minBodyChars = 500;
const maxBodyChars = 1000;
const minTitleLength = 1;  // words
const maxTitleLength = 7;  // words
const numLinks = 8;

const randomRouteMinLength = 15 // chars
const randomRouteMaxLength = 50 // chars

function generateRandomString() { // url safe
    const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-~`;
    const length = Math.floor(Math.random() * (randomRouteMaxLength - randomRouteMinLength)) + randomRouteMinLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}


// initialize Markov Babbler
const babbler = new MarkovBabbler(2);
babbler.train('training-data.txt');

type Link = { text: string, route: string };

// no trailing slash in trappedRoutes
function generatePage(trappedRoutes: Array<string>): Array<string> {
    let bodyWordList = babbler.generate(minBodyChars, maxBodyChars);
    
    const titleLength = Math.floor(Math.random() * (maxTitleLength - minTitleLength)) + minTitleLength;

    let title = bodyWordList.slice(0, titleLength).join(' ');
    bodyWordList = bodyWordList.slice(titleLength);

    function generateLink(): Link {
        const range = { min: 0, max: bodyWordList.length };
        const idx = Math.floor(Math.random() * (range.max - range.min)) + range.min;

        const topLevelRoute = trappedRoutes[Math.floor(Math.random() * trappedRoutes.length)];

        let link: Link = {
            text: bodyWordList[idx],
            route: topLevelRoute + '/' + generateRandomString(),
        };

        return link;
    }

    let links: Array<Link> = [];

    for (let i = 0; i < numLinks; i++) {
        links.push(generateLink());
    }

    const linkHtml = links.map(link => `<li><a href="${link.route}">${link.text}</a></li>`).join('');

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${title}</title>
            </head>
            <body>
                <p>${bodyWordList.join(' ')}</p>
                <ul>
                    ${linkHtml}
                </ul>
            </body>
        </html>
    `;

    const chunks = [];
    for (let i = 0; i < html.length; i += chunkSize) {
        chunks.push(html.slice(i, i + chunkSize));
    }

    return chunks;
}


export default function antlion(app: Application, options: AntlionOptions): void {
    if (!options.filePath) {
        throw new Error("`filePath` option is required");
    }

    const servePath = options.urlPath || "/robots.txt";
    const rawTrappedRoutes = options.trappedRoutes || [];

    const parsedTrappedRoutes = rawTrappedRoutes.map(route => route.endsWith('/') ? route : route + '/');

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

    const disallowLines = parsedTrappedRoutes.map(endpoint => `Disallow: ${endpoint}`);

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
    
    const count = parsedTrappedRoutes.length

    console.log(`[antlion] Loaded robots.txt with ${count} injected trapped route${count !== 1 ? 's' : ''}`);


    function dripLoadPage(req: Request, res: Response) {
        console.log('drip start');
        const chunks: Array<string> = generatePage(parsedTrappedRoutes);
        console.log('chunks:', chunks);
        const interval = totalDelay / chunks.length;

        res.setHeader('Content-Type', 'text/html; charset:utf-8');

        let i = 0;
        const sendChunk = () => {
            if (i < chunks.length) {
                console.log('drip');
                res.write(chunks[i]);
                i++;
                setTimeout(sendChunk, interval);
            } else {
                res.end();
            }
        };
        sendChunk();
    }


    // -- tar pit route handlers --
    parsedTrappedRoutes.forEach(route => {
        const safeRoute = route.replace(/\/+$/, ''); //remove trailing slashes for regex
        console.log(`safeRoute: ${safeRoute}`)

        app.use(safeRoute, dripLoadPage);

        app.use(safeRoute + '/*route', dripLoadPage);
    });

    app.route(servePath)
        .get((req: Request, res: Response) => {
            res.type('text/plain').send(finalRobotsTxt);
            console.log(`[antlion] Served trapped robots.txt`);
        });
}

