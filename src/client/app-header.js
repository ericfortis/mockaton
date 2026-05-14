import { createElement as r, t } from './utils/dom.js'
import { Logo, HelpIcon } from './graphics.js'
import { adoptSheet } from './utils/css.js'
import { store } from './app-store.js'

import CSS from './app-header.css' with { type: 'css' }
adoptSheet(CSS, './app-header.css')


export function Header() {
	return (
		r('header', { className: CSS.Header },
			r('a', {
					className: CSS.Logo,
					href: 'https://mockaton.com',
					alt: t`Documentation`
				},
				Logo()),
			r('div', null,
				r('div', { className: CSS.GlobalDelayWrap },
					GlobalDelayField(),
					GlobalDelayJitterField()),
				CookieSelector(),
				store.showProxyField && ProxyFallbackField(),
				ResetButton(),
				HelpLink())))
}


function GlobalDelayField() {
	function onChange() {
		store.setGlobalDelay(this.valueAsNumber)
	}
	return SlidableNumberField({
		className: CSS.GlobalDelay,
		label: t`Delay (ms)`,
		min: 0,
		max: 120_000,
		step: 100,
		value: store.delay,
		onChange
	})
}


function GlobalDelayJitterField() {
	function onChange() {
		this.value = this.valueAsNumber.toFixed(0)
		this.value = Math.max(0, this.valueAsNumber)
		this.value = Math.min(300, this.valueAsNumber)
		store.setGlobalDelayJitter(this.valueAsNumber / 100)
	}
	return SlidableNumberField({
		className: CSS.GlobalDelayJitter,
		label: t`Max Jitter %`,
		min: 0,
		max: 300,
		step: 10,
		value: parseInt((store.delayJitter * 100).toFixed(0), 10),
		onChange
	})
}



function CookieSelector() {
	const { cookies } = store
	const disabled = cookies.length <= 1
	const list = cookies.length ? cookies : [[t`None`, true]]
	return (
		r('label', { className: CSS.CookieSelector },
			r('span', null, t`Cookie`),
			r('select', {
				autocomplete: 'off',
				disabled,
				title: disabled
					? t`No cookies specified in config.cookies`
					: undefined,
				onChange() { store.selectCookie(this.value) }
			}, list.map(([value, selected]) =>
				r('option', { value, selected }, value)))))
}


function ProxyFallbackField() {
	const checkboxRef = {}
	function onChange() {
		checkboxRef.elem.disabled = !this.validity.valid || !this.value.trim()
		if (!this.validity.valid)
			this.reportValidity()
		else
			store.setProxyFallback(this.value.trim())
	}
	return (
		r('div', { className: CSS.FallbackBackend },
			r('label', null,
				r('span', null, t`Fallback`),
				r('input', {
					type: 'url',
					name: 'fallback',
					placeholder: t`Type backend address`,
					value: store.proxyFallback,
					onChange
				})),
			SaveProxiedCheckbox(checkboxRef)))
}


function SaveProxiedCheckbox(ref) {
	return (
		r('label', { className: CSS.SaveProxiedCheckbox },
			r('input', {
				ref,
				type: 'checkbox',
				disabled: !store.canProxy,
				checked: store.collectProxied,
				onChange() { store.setCollectProxied(this.checked) }
			}),
			r('span', { className: CSS.checkboxBody }, t`Save Mocks`)))
}


function ResetButton() {
	return (
		r('button', {
			className: CSS.ResetButton,
			onClick: store.reset
		}, t`Reset`))
}


function HelpLink() {
	return (
		r('a', {
			target: '_blank',
			href: 'https://mockaton.com',
			title: t`Documentation`,
			className: CSS.HelpLink
		}, HelpIcon()))
}


function SlidableNumberField({ name, className, label, onChange, min, max, step, value }) {
	function clamp(val) {
		return Math.min(Math.max(val, min), max)
	}

	function cursorFor(val) {
		if (val === max) return 'w-resize'
		if (val === min) return 'e-resize'
		return 'col-resize'
	}

	function onPointerDown(event) {
		let lastX = event.clientX
		const input = /** @type {HTMLInputElement} */ event.target
		const initialVal = input.value

		input.setPointerCapture(event.pointerId)
		window.addEventListener('pointerup', onPointerUp, { once: true })
		window.addEventListener('pointermove', onPointerMove)

		function onPointerUp(ev) {
			input.releasePointerCapture(ev.pointerId)
			window.removeEventListener('pointermove', onPointerMove)
			if (input.value !== initialVal)
				input.dispatchEvent(new Event('change'))
		}

		function onPointerMove(ev) {
			const diff = ev.clientX - lastX
			if (Math.abs(diff) > 10) {
				lastX = ev.clientX

				let s = step
				if (ev.shiftKey) s *= 2
				else if (ev.altKey) s /= 2

				input.valueAsNumber = clamp(input.valueAsNumber + Math.sign(diff) * s)
				input.style.cursor = cursorFor(input.valueAsNumber)
			}
		}
	}

	return (
		r('label', { className },
			r('span', null, label),
			r('input', {
				type: 'number',
				autocomplete: 'none',
				style: { cursor: cursorFor(value) },
				min,
				max,
				step,
				value,
				onChange,
				onPointerDown
			})))
}

