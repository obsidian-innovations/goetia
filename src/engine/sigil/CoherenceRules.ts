export const COHERENCE_RULES = {
  contradictions: [
    { glyphA: 'VECTOR_OUT',       glyphB: 'VECTOR_IN' },
    { glyphA: 'QUALITY_SHARP',    glyphB: 'QUALITY_SUSTAIN' },
    { glyphA: 'DURATION_INSTANT', glyphB: 'DURATION_SUSTAINED' },
    { glyphA: 'DURATION_INSTANT', glyphB: 'DURATION_TRIGGERED' },
    { glyphA: 'VECTOR_DIFFUSE',   glyphB: 'QUALITY_SHARP' },
  ],
  chainRequirements: [
    {
      name: 'vector',
      requiredOneOf: ['VECTOR_OUT', 'VECTOR_IN', 'VECTOR_DIFFUSE']
    },
    {
      name: 'target',
      requiredOneOf: ['TARGET_PERSON', 'TARGET_PLACE', 'TARGET_OBJECT']
    }
  ],
  isolatedCategories: [
    'QUALITY_SHARP',
    'QUALITY_SUSTAIN',
    'QUALITY_DELAY',
    'DURATION_INSTANT',
    'DURATION_SUSTAINED',
    'DURATION_TRIGGERED',
  ]
} as const
