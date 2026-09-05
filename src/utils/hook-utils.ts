import { debug, error, log, warn } from "@/utils/logger";
import addonConfig from "../../addon.config.mjs";

type AppRequire = Function & {
  m: number[]
};

let _appRequire: AppRequire | null = null;

function initAppRequire(): AppRequire | null {
    if (_appRequire === null) {
        try {
            const webpackGlobal = window.webpackChunk_N_E;
            if (webpackGlobal === null || webpackGlobal === undefined) {
                error("Failed to init app require: webpackChunks is " + webpackGlobal)
                return null;
            }

            webpackGlobal.push([
                [Symbol(addonConfig.id)],
                {},
                (internalRequire: AppRequire | null) => {
                    _appRequire = internalRequire;
                }
            ])
            webpackGlobal.pop()
            if (!_appRequire) {
                error("Failed to init app require: appRequire is " + _appRequire)
                _appRequire = null;
            }
        }
        catch (e) {
            error("Failed to init app require: ", e)
        }
    }
    return _appRequire;
}

export function appRequire(module: number): any {
    initAppRequire();
    if (_appRequire) {
        return _appRequire(module)
    }
    return null;
}

export function findModule(
    expOrString: ((obj: any) => boolean) | string,
    ...requiredStrings: (string | object)[]
): any | null {
    initAppRequire();

    if (_appRequire) {
        let func: ((obj: any) => boolean) | null = null;

        if (expOrString instanceof Function) {
            func = expOrString;
        } else {
            requiredStrings.push(expOrString);
        }

        for (const id in _appRequire.m) {
            try {
                const mod = appRequire(id as any as number);

                const hasPath = (obj: any, path: string): boolean => {
                    const pSplit = path.split(".");

                    for (const key of pSplit) {
                        if (obj == null || !(key in obj)) {
                            return false;
                        }

                        obj = obj[key];
                    }

                    return true;
                };

                if (
                    requiredStrings.every(str => {
                        if (typeof str !== "string") {
                            return true;
                        }

                        return hasPath(mod, str);
                    }) &&
                    (!func || func(mod))
                ) {
                    return mod;
                }
            } catch (e) {
                error(`Error while checking module ${id} while finding module`, e);
            }
        }
    }

    warn("Module was not found with strings", requiredStrings);
    return null;
}

type diGetType = (key: string) => any

type Di = {
    shared: { get: diGetType }
    get: diGetType;
    prototype: Di
}

let diClass: Di | null = null

function initDiModule(): Di | null {
    if (diClass) {
        return diClass;
    }
    var diModule = findModule("Dt", "P9", "Gr", "do");
    if (!diModule?.Dt) {
        error("Failed to find DI module. Wait for addon to update!");
        return null;
    }
    diClass = diModule.Dt
    return diClass
}

let originalDiGet: diGetType | null = null;
let pendingHooks: Record<string, Function[]> = {}
let di: Di | null = null;

export function getDiResource(resource: string) {
    return di?.get(resource) || null;
}

function diGet(ts: Di, args: any, key: string): any {
    di = ts;
    if (!originalDiGet) {
        return null;
    }

    const result = originalDiGet.apply(ts, args)
    const hook = pendingHooks[key];
    if (hook && result) {
        delete pendingHooks[key]; 
        for (const h of hook) {
            h(result)
        }
    }

    return result;
}

export function hookDi(values: Record<string, (dimodule: any) => any>): boolean {
    initDiModule();
    if (!diClass) {
        return false;
    }

    for (const key in values) {
        if (!pendingHooks[key]) {
            pendingHooks[key] = [values[key]];
        } else {
            pendingHooks[key].push(values[key]);
        }
    }

    if (!originalDiGet) {
        originalDiGet = diClass.prototype.get
    }

    if (Object.keys(pendingHooks).length > 0) {
        diClass.prototype.get = function(key: string) {
            return diGet(this, arguments, key);
        }
    }

    return true;
}

export type HookMethod = (result: any, ...args: any[]) => Promise<any | void>;
export class FunctionHook {
    public before(originalMethod: Function, ...args: any[]): Promise<any | void> | any | void {}

    public after(result: any, ...args: any[]): Promise<any | void> | any | void {}
}
export type Hook = FunctionHook | HookMethod;

export function hookMethods(obj: any, hook: Hook, ...methodNames: string[]): boolean {
    if (!obj || !methodNames || !hook) {
        return false;
    }
    methodNames.forEach(methodName => {
        const originalMethod = obj[methodName];
        if (!originalMethod) {
            warn(`Method ${methodName} not found in`, obj)
            return
        }
        obj[methodName] = async function(...args: any) {
            let result: any | undefined = undefined;
            if (hook instanceof FunctionHook) {
                result = await hook.before(originalMethod, ...args);
            }

            if (result === undefined) {
                result = await originalMethod.apply(this, args);
            }

            let hookResult: any | undefined = undefined;
            if (hook instanceof FunctionHook) {
                hookResult = await hook.after(result, ...args);
            }
            else {
                hookResult = await hook(result, ...args);
            }

            if (hookResult !== undefined) {
                result = hookResult;
            }

            return result;
        }
    });
    return true;
}

export function getCurrentTraceLine() {
    const originalFunc = Error.prepareStackTrace;
  
    Error.prepareStackTrace = (_, stack) => stack;
    
    const err = new Error();
    const stack = err.stack;

    if (!stack) return -1;
    
    Error.prepareStackTrace = originalFunc; 
    return (stack[2] as any).getLineNumber(); 
}