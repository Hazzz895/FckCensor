export const FALLBACK_ENTITY = {
    id: -2949112530959423,
    title: 'Без имени',
    available: false,
}

export const FALLBACK_ENTITY_STR = {
    ...FALLBACK_ENTITY,
    id: `__fck_censor_fallback_entity_${FALLBACK_ENTITY.id}__`,
}
