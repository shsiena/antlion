import { Application } from "express";
import { minimatch } from 'minimatch';

export function getRoutes(app: Application): string[] {
    const stack = app._router?.stack || [];

    console.log('stack:', stack);
    console.log('app', app);
    console.log('app router:', app._router);

    const routes: Set<string> = new Set();

    for (const layer of stack) {
        if (layer.route && layer.route.methods.get) {
            routes.add(layer.route.path);
        } else if (layer.name === 'router' && layer.handle.stack) {
            for (const handler of layer.handle.stack) {
                if (handler.route && handler.route.methods.get) {
                    routes.add(handler.route.path);
                }
            }
        }
    }
    return Array.from(routes);
}

export function expressPathToWildcard(path: string): string {
    const segments = path.split('/');
    const result: string[] = [];

    for (const seg of segments) {
        if (seg.startsWith(':')) {
            result.push('*');
        } else {
            result.push(seg);
        }
    }
    return result.join('/')
}

interface RobotsGuardOptions {
    disallow?: string[];
    allowRoot?: boolean;
    path?: string;
}

export function generateRobotsTxt(app: Application, options: RobotsGuardOptions = {}): string {
    const { disallow = [], allowRoot = true } = options;
    const allRoutes = getRoutes(app);
    console.log(allRoutes);

    const allowed = new Set<string>();

    if (allowRoot) {
        allowed.add('/');
    }

    for (const path of allRoutes) {
        const pathWithWildcard = expressPathToWildcard(path);
        if (!disallow.some(pattern => minimatch(pathWithWildcard, pattern))) {
            allowed.add(expressPathToWildcard(pathWithWildcard));
        }
    }

    console.log('allowed:', allowed);

    return [
        'User-agent: *',
        'Disallow: /',
        ...[...allowed].map(p => `Allow: ${p}`)
    ].join('\n');
}

export function robotsGuard(app: Application, options: RobotsGuardOptions = {}): void {
    const path = options.path || '/robots.txt';
    const txt = generateRobotsTxt(app, options);
    app.get(path, (_req, res) => {
        res.type('text/plain').send(txt);
    });
}
