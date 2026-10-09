type Operator = '>' | '>=' | '<' | '<=' | '=' | '^' | '~' | '!='

interface VersionDiff {
    operator: Operator
    version: string
}

const OPERATOR_REGEX = /^(>=|<=|!=|[><=^~])?\s*(\d+(?:\.\d+)*)$/

export function parseVersionDiff(constraint: string): VersionDiff {
    const match = constraint.trim().match(OPERATOR_REGEX)

    if (!match || !match[2]) {
        return {
            operator: '>=',
            version: '0.0.0',
        }
    }

    const [, operator, version] = match

    return {
        operator: (operator as Operator) ?? '>=',
        version: version.trim(),
    }
}

function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] ?? 0
        const nb = pb[i] ?? 0

        if (Number.isNaN(na) || Number.isNaN(nb)) {
            throw NaN
        }

        if (na !== nb) {
            return na < nb ? -1 : 1
        }
    }

    return 0
}

export function versionsSatisfies(actualVersion: string, constraints: (string | VersionDiff)[]) {
    return constraints.every(constraint => versionSatisfies(actualVersion, constraint))
}

export function versionSatisfies(actualVersion: string, constraint: string | VersionDiff): boolean {
    if (typeof constraint === 'string') {
        constraint = parseVersionDiff(constraint)
    }
    const { operator, version } = constraint
    const cmp = compareVersions(actualVersion, version)

    switch (operator) {
        case '>':
            return cmp > 0
        case '>=':
            return cmp >= 0
        case '<':
            return cmp < 0
        case '<=':
            return cmp <= 0
        case '=':
            return cmp === 0
        case '!=':
            return cmp !== 0
        case '^':
        case '~': {
            if (cmp < 0) return false

            const parts = version.split('.').map(Number)
            const [major = 0, minor = 0, patch = 0] = parts

            let upperBound: string
            if (operator === '^') {
                if (major > 0 || parts.length === 1) {
                    upperBound = `${major + 1}.0.0`
                } else if (minor > 0 || parts.length === 2) {
                    upperBound = `0.${minor + 1}.0`
                } else {
                    upperBound = `0.0.${patch + 1}`
                }
            } else {
                if (parts.length === 1) {
                    upperBound = `${major + 1}.0.0`
                } else {
                    upperBound = `${major}.${minor + 1}.0`
                }
            }

            return compareVersions(actualVersion, upperBound) < 0
        }
        default:
            return false
    }
}
