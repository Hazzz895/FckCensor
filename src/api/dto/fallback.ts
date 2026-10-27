export const FALLBACK_ENTITY = {
    id: 500019925474099, // Math.trunc(Number.MAX_SAFE_INTEGER / 10) - 4e14 - 7e11
    title: 'Без имени',
    available: false,
}

export const FALLBACK_ENTITY_STR = {
    ...FALLBACK_ENTITY,
    id: `__fck_censor_fallback_entity_${FALLBACK_ENTITY.id}__`,
}
