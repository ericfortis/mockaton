import scores, { type Scores } from './typescript-scores.GET.200'

export default [
	...scores,
	{ id: 103 },
	{ id: 104 },
	{ id: 105 },
] satisfies Scores[]

