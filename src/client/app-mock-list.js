import { createElement as r, t, Fragment } from './utils/dom.js'

import { store } from './app-store.js'
import { previewMock } from './app-payload-viewer.js'
import { extractClassNames, classNames } from './utils/css.js'
import { TimerIcon, CloudIcon, ChevronDownIcon } from './graphics.js'

import CSS from './app-mock-list.css' with { type: 'css' }
CSS.__url = 'app-mock-list.css'
document.adoptedStyleSheets.push(CSS)
Object.assign(CSS, extractClassNames(CSS))


export function MockList() {
	return Fragment(
		r('div', { className: CSS.SubToolbar },
			GroupByMethod(),
			BulkSelector()),
		Table())
}


function GroupByMethod() {
	return (
		r('label', { className: CSS.GroupByMethod },
			r('input', {
				type: 'checkbox',
				checked: store.groupByMethod,
				onChange: store.toggleGroupByMethod
			}),
			r('span', { className: CSS.checkboxBody }, t`Group by Method`)))
}


function BulkSelector() {
	const { comments } = store
	const firstOption = t`Pick Comment…`
	function onChange() {
		const value = this.value
		this.value = firstOption // hack so it’s always selected
		store.bulkSelectByComment(value)
	}
	const disabled = !comments.length
	return (
		r('label', { className: CSS.BulkSelector },
			r('span', null, t`Bulk Select`),
			r('select', {
					disabled,
					autocomplete: 'off',
					title: disabled
						? t`No mock files have comments which are anything within parentheses on the filename.`
						: undefined,
					onChange
				},
				r('option', { value: firstOption }, firstOption),
				r('hr'),
				comments.map(value => r('option', { value }, value)))))
}

function Table() {
	return (
		r('div', {
				ref: Table.ref,
				className: CSS.Table
			},
			TableContent()))
}
Table.ref = { width: undefined }
Table.$ = selector => Table.ref.elem.querySelector(selector)
Table.$$ = selector => Table.ref.elem.querySelectorAll(selector)




function TableContent() {
	if (!Object.keys(store.brokersByMethod).length)
		return r('div', null, t`No mocks found`)

	if (store.groupByMethod)
		return Object.keys(store.brokersByMethod).map(method => Fragment(
			r('div', {
				className: classNames(CSS.TableHeading, store.canProxy && CSS.canProxy)
			}, method),
			FolderGroups(store.folderGroupsByMethod(method))))

	return FolderGroups(store.folderGroupsByMethod('*'))
}


function FolderGroups(brokersTree) {
	const res = []
	for (const b of brokersTree) {
		if (!b.children.length)
			res.push(Row(b))
		else
			res.push(FolderGroup(b))
	}
	return res
}

function FolderGroup(broker) {
	const folder = broker.urlMask
	const children = broker.children
	return (
		r('details', {
				className: CSS.FolderGroup,
				open: !store.collapsedFolders.has(folder),
				onToggle() {
					store.setFolderCollapsed(folder, !this.open)
				}
			},
			r('summary', null,
				r('span', { className: CSS.FolderChevron }, ChevronDownIcon()),
				r('span', {
						className: classNames(
							CSS.FolderName,
							store.groupByMethod && CSS.groupedByMethod,
							store.canProxy && CSS.canProxy)
					},
					folder + '…')),
			Row(broker),
			children.map(c => c.children.length
				? FolderGroup(c)
				: Row(c))))
}

/** @param {BrokerRowModel} row */
function Row(row) {
	const { method, urlMask } = row
	return (
		r('div', {
				key: row.key,
				className: classNames(CSS.TableRow, store.mounted && row.isNew && CSS.animIn)
			},

			store.canProxy && ClickDragToggler({
				className: CSS.ProxyToggler,
				title: t`Proxy Toggler`,
				body: CloudIcon(),
				checked: row.proxied,
				commit(checked) {
					store.setProxied(method, urlMask, checked)
				}
			}),

			ClickDragToggler({
				className: CSS.DelayToggler,
				title: t`Delay`,
				body: TimerIcon(),
				checked: row.delayed,
				commit(checked) {
					store.setDelayed(method, urlMask, checked)
				}
			}),

			ClickDragToggler(
				row.isStatic
					? {
						className: CSS.StatusCodeToggler,
						title: t`Not Found`,
						body: t`404`,
						disabled: row.opts.length === 1 && row.status === 404,
						checked: !row.proxied && row.status === 404,
						commit() { store.toggleStatus(method, urlMask, 404) }
					}
					: {
						className: CSS.StatusCodeToggler,
						title: t`Internal Server Error`,
						body: t`500`,
						disabled: row.opts.length === 1 && row.status === 500,
						checked: !row.proxied && row.status === 500,
						commit() { store.toggleStatus(method, urlMask, 500) }
					}),

			!store.groupByMethod && r('span', { className: CSS.Method }, method),

			PreviewLink(method, urlMask, row.urlMaskDittoed),

			MockSelector(row)))
}


export function renderRow(method, urlMask) {
	unChooseOld()
	const row = store.brokerAsRow(method, urlMask)
	const tr = Table.$(`.${CSS.TableRow}[key="${row.key}"]`)
	mergeTableRow(tr, Row(row))
	previewMock()

	function unChooseOld() {
		return Table.$(`a.${CSS.chosen}`)
			?.classList.remove(CSS.chosen)
	}

	function mergeTableRow(oldRow, newRow) {
		for (let i = 0; i < newRow.children.length; i++) {
			const oldEl = oldRow.children[i]
			const newEl = newRow.children[i]
			switch (newEl.tagName) {
				case 'LABEL': {
					const oldInput = oldEl.querySelector('[type="checkbox"]')
					const newInput = newEl.querySelector('[type="checkbox"]')
					oldInput.checked = newInput.checked
					oldInput.disabled = newInput.disabled
					break
				}
				case 'A':
					oldEl.className = newEl.className
					break
				case 'SELECT':
					oldEl.replaceChildren(...newEl.cloneNode(true).children)
					oldEl.className = newEl.className
					oldEl.disabled = newEl.disabled
					oldEl.value = newEl.value
					break
			}
		}
	}
}


function PreviewLink(method, urlMask, urlMaskDittoed) {
	function onClick(event) {
		event.preventDefault()
		store.previewLink(method, urlMask)
	}
	const isChosen = store.chosenLink.method === method && store.chosenLink.urlMask === urlMask
	const [ditto, tail] = urlMaskDittoed
	return (
		r('a', {
			className: classNames(CSS.PreviewLink, isChosen && CSS.chosen),
			href: urlMask,
			onClick
		}, ditto
			? [r('span', { className: CSS.dittoDir }, ditto), tail]
			: tail))
}


/** @param {BrokerRowModel} row */
function MockSelector(row) {
	return (
		r('select', {
			onChange() {
				store.selectFile(this.value)
			},
			onKeyDown(event) {
				if (event.key === 'ArrowRight' || event.key === 'ArrowLeft')
					event.preventDefault()
				// Because in Firefox they change the select.option, and 
				// we use those keys for spreadsheet-like navigation.
			},
			'aria-label': t`Mock Selector`,
			disabled: row.opts.length < 2,
			className: classNames(
				CSS.MockSelector,
				row.selectedIdx > 0 && CSS.nonDefault,
				row.selectedFileIs4xx && CSS.status4xx)
		}, row.opts.map(([value, label, selected]) =>
			r('option', { value, selected }, label))))
}


function ClickDragToggler({ checked, commit, className, title, body }) {
	function onPointerEnter(event) {
		if (event.buttons === 1)
			onPointerDown.call(this, event)
	}

	function onPointerDown(event) {
		if (event.altKey) {
			onExclusiveClick.call(this)
			return
		}
		this.checked = !this.checked
		this.focus()
		commit(this.checked)
	}

	function onExclusiveClick() {
		const selector = selectorForColumnOf(this)
		if (!selector)
			return

		// Uncheck all other in the column. 
		for (const elem of Table.$$(selector))
			if (elem !== this && elem.checked && !elem.disabled) {
				elem.checked = false
				elem.dispatchEvent(new Event('change'))
			}

		if (!this.checked) {
			this.checked = true
			this.dispatchEvent(new Event('change'))
		}
		this.focus()
	}

	function onClick(event) {
		if (event.pointerType === 'mouse')
			event.preventDefault()
	}
	function onChange() {
		commit(this.checked)
	}
	return (
		r('label', { className: classNames(CSS.Toggler, className), title },
			r('input', {
				type: 'checkbox',
				checked,
				onPointerEnter,
				onPointerDown,
				onClick,
				onChange
			}),
			r('span', { className: CSS.checkboxBody }, body)))
}



function selectorForColumnOf(elem) {
	return columnSelectors().find(s => elem?.matches(s))
}

function columnSelectors() {
	return [
		`.${CSS.TableRow} .${CSS.ProxyToggler} input`,
		`.${CSS.TableRow} .${CSS.DelayToggler} input`,
		`.${CSS.TableRow} .${CSS.StatusCodeToggler} input`,
		`.${CSS.TableRow} .${CSS.PreviewLink}`,
		// No .MockSelector because down/up arrows have native behavior on them
	]
}

export function initKeyboardNavigation() {
	const rowSelectors = [
		...columnSelectors(),
		`.${CSS.TableRow} .${CSS.MockSelector}:enabled`,
	]

	addEventListener('keydown', function ({ key }) {
		switch (key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				const pivot = document.activeElement
				const sel = selectorForColumnOf(pivot)
				if (sel) {
					const offset = key === 'ArrowDown' ? +1 : -1
					const siblings = Table.$$(sel)
					circularAdjacent(offset, siblings, pivot).focus()
				}
				break
			}
			case 'ArrowRight':
			case 'ArrowLeft': {
				const pivot = document.activeElement
				const sel = rowSelectors.find(s => pivot?.matches(s))
				if (sel) {
					const offset = key === 'ArrowRight' ? +1 : -1
					const siblings = pivot.closest(`.${CSS.TableRow}`).querySelectorAll(rowSelectors.join(','))
					circularAdjacent(offset, siblings, pivot).focus()
				}
				break
			}
		}
	})

	function circularAdjacent(step, siblings, pivot) {
		const arr = Array.from(siblings)
		return arr[(arr.indexOf(pivot) + step + arr.length) % arr.length]
	}
}
