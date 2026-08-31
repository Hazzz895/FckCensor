import addonConfig from "../../addon.config.mjs";

type Operator = '>' | '>=' | '<' | '<=' | '=';

interface VersionDiff {
  operator: Operator;
  version: string;
}

const OPERATOR_REGEX = /^(>=|<=|>|<|=)?\s*(.+)$/;

export function parseVersionDiff(constraint: string): VersionDiff {
    const match = constraint.trim().match(OPERATOR_REGEX);

    if (!match || !match[2]) {
        return {
            operator: '>=',
            version: '0.0.0'
        };
    }

    const [, operator, version] = match;

    return {
        operator: (operator as Operator) ?? '>=',
        version: version.trim(),
    };
}

function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] ?? 0;
        const nb = pb[i] ?? 0;

        if (Number.isNaN(na) || Number.isNaN(nb)) {
            throw NaN
        }

        if (na !== nb) {
            return na < nb ? -1 : 1;
        }
    }

    return 0;
}

export function versionSatisfies(actualVersion: string, constraint: string | VersionDiff): boolean {
    if (typeof constraint === "string") {
        constraint = parseVersionDiff(constraint as string);
    }
    const { operator, version } = constraint;
    const cmp = compareVersions(actualVersion, version);

    switch (operator) {
        case '>':
        return cmp > 0;
        case '>=':
        return cmp >= 0;
        case '<':
        return cmp < 0;
        case '<=':
        return cmp <= 0;
        case '=':
        return cmp === 0;
        default:
        return false;
    }
}
