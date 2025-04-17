import { Application, Request, Response } from "express";
import { minimatch } from 'minimatch';

interface RobotsGuardOptions {
    disallow?: string[];
    allowRoot?: boolean;
    path?: string;
    methods?: string[];  // Optional array to specify which methods to track
}

interface RouteInfo {
    path: string;
    methods: Set<string>;
}

export function antlion(app: Application, options: RobotsGuardOptions = {}): void {
    const path = options.path || '/robots.txt';
    const { disallow = [], allowRoot = true, methods = ['all'] } = options;
    
    // Store routes with their methods
    const registeredRoutes = new Map<string, RouteInfo>();
    
    // List of standard HTTP methods in Express
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all'];
    const methodsToTrack = methods[0] === 'all' ? httpMethods : methods;
    
    // Override all HTTP method functions to track routes
    for (const method of methodsToTrack) {
        const originalMethod = app[method as keyof Application];
        if (typeof originalMethod === 'function') {
            app[method as keyof Application] = function(...args: any[]): any {
                // If this is a route registration (not a settings get)
                if (typeof args[0] === 'string' && typeof args[1] === 'function') {
                    const routePath = args[0];
                    
                    // Get or create route info
                    let routeInfo = registeredRoutes.get(routePath);
                    if (!routeInfo) {
                        routeInfo = { path: routePath, methods: new Set() };
                        registeredRoutes.set(routePath, routeInfo);
                    }
                    
                    // Add this method to the route
                    routeInfo.methods.add(method.toUpperCase());
                }
                return originalMethod.apply(app, args);
            };
        }
    }
    
    // Register the robots.txt route
    app.get(path, (req: Request, res: Response) => {
        console.log('Registered routes:', Array.from(registeredRoutes.entries()).map(([path, info]) => ({
            path,
            methods: Array.from(info.methods)
        })));
        
        const allowed = new Set<string>();
        if (allowRoot) {
            allowed.add('/');
        }

        for (const [routePath, routeInfo] of registeredRoutes.entries()) {
            if (routePath === path) continue; // Skip the robots.txt path itself

            let patternMatched = false;

            for (const pattern of disallow) {
                console.log(`pattern: ${pattern}, path: ${routePath}, minimatch: ${minimatch(routePath, pattern)}`);
                if (minimatch(routePath, pattern)) {
                    patternMatched = true;
                    break;
                }
            }

            if (!patternMatched) {
                const pathWithWildcard = expressPathToWildcard(routePath);
                allowed.add(pathWithWildcard);
            }
        }
        
        console.log('Allowed paths:', allowed);
        
        const txt = [
            'User-agent: *',
            'Disallow: /',
            ...[...allowed].map(p => `Allow: ${p}`)
        ].join('\n');
        
        res.type('text/plain').send(txt);
    });
}

function expressPathToWildcard(path: string): string {
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
