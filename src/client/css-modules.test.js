import { test } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { extractClassNames } from './dom-utils.js'


const cssRules = [
	{ cssText: '.TopLevelPascal { color: red; }' },
	{ cssText: '.topLevelCamel { color: blue; }' },
	{ cssText: '.top_level_snake { color: green; }' },
	{ cssText: '.top-level-kebab { color: yellow; }' },
	{ cssText: '.Level2Parent {\n  & .level2ChildCamel { color: purple; }\n}' },
	{ cssText: '.level2Base {\n  &.level2ModifierCamel { font-weight: bold; }\n}' },
	{ cssText: '.Level3Parent {\n  & .level3ChildCamel {\n  & .level3_grand_child_snake { color: orange; }\n}\n}' },
	{ cssText: '.pseudoParent {\n  &:hover { background: red; }\n  & .pseudoNestedChild { color: pink; }\n}' },
	{ cssText: '.multiClass1, .multi_class_2 { padding: 10px; }' },
	{ cssText: '.combParent {\n  & > .combChildDirect { margin: 5px; }\n}' },
	{ cssText: '.siblingBase {\n  & + .siblingAdjacent { border: 1px solid; }\n}' },
	{ cssText: '@media (max-width: 768px) {\n  .mediaQueryClass {\n  & .mqNestedChild { display: none; }\n}\n}' },
	{ cssText: '.class_with_123_numbers { color: cyan; }' },
	{ cssText: '._privateStyleClass { opacity: 0.5; }' },
	{ cssText: '.stringTest { content: ".shouldNotBeExtracted"; background: url(".alsoIgnored"); }' },
	{ cssText: '.ComplexRoot {\n  & .level2-kebab {\n  &.level2ModCamel { color: red; }\n  & .level3_snake {\n  & .level4PascalChild { color: blue; }\n}\n}\n}' }
]

const expected = {
	TopLevelPascal: null,
	topLevelCamel: null,
	top_level_snake: null,
	'top-level-kebab': null,

	Level2Parent: null,
	level2ChildCamel: null,
	level2Base: null,
	level2ModifierCamel: null,

	Level3Parent: null,
	level3ChildCamel: null,
	level3_grand_child_snake: null,

	pseudoParent: null,
	pseudoNestedChild: null,

	multiClass1: null,
	multi_class_2: null,

	combParent: null,
	combChildDirect: null,

	siblingBase: null,
	siblingAdjacent: null,

	mediaQueryClass: null,
	mqNestedChild: null,

	class_with_123_numbers: null,
	_privateStyleClass: null,

	stringTest: null,

	ComplexRoot: null,
	'level2-kebab': null,
	level2ModCamel: null,
	level3_snake: null,
	level4PascalChild: null
}
for (const k of Object.keys(expected))
	expected[k] = k


test('extracts', () => deepEqual(extractClassNames(cssRules), expected))

