import { createElement as r, t } from './utils/dom.js'
import { Logo, HelpIcon } from './graphics.js'
import { store } from './app-store.js'

import CSS from './app.css' with { type: 'css' }
import { extractClassNames } from './utils/css.js'


Object.assign(CSS, extractClassNames(CSS))

export function Header() {
	return (
		r('header', null,
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
	function onWheel(event) {
		if (event.deltaY > 0)
			this.stepUp()
		else
			this.stepDown()
		clearTimeout(onWheel.timer)
		onWheel.timer = setTimeout(onChange.bind(this), 300)
	}
	return (
		r('label', { className: CSS.GlobalDelay },
			r('span', null, t`Delay (ms)`),
			r('input', {
				type: 'number',
				min: 0,
				step: 100,
				autocomplete: 'none',
				value: store.delay,
				onWheel: [onWheel, { passive: true }],
				onChange
			})))
}


function GlobalDelayJitterField() {
	function onChange() {
		this.value = this.valueAsNumber.toFixed(0)
		this.value = Math.max(0, this.valueAsNumber)
		this.value = Math.min(300, this.valueAsNumber)
		store.setGlobalDelayJitter(this.valueAsNumber / 100)
	}
	function onWheel(event) {
		if (event.deltaY > 0)
			this.stepUp()
		else
			this.stepDown()
		clearTimeout(onWheel.timer)
		onWheel.timer = setTimeout(onChange.bind(this), 300)
	}
	return (
		r('label', { className: CSS.GlobalDelayJitter },
			r('span', null, t`Max Jitter %`),
			r('input', {
				type: 'number',
				autocomplete: 'none',
				min: 0,
				max: 300,
				step: 10,
				value: (store.delayJitter * 100).toFixed(0),
				onWheel: [onWheel, { passive: true }],
				onChange
			})))
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
