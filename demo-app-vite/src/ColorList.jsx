import { useState, useEffect, useContext } from 'react'
import { UserContext } from './UserContext.jsx'
import { ColorModel } from './ColorModel.js'
import { QaId } from './QaId.js'
import CSS from './ColorList.module.css'


const t = translation => translation[0]


export function ColorList() {
	const [loaded, setLoaded] = useState(false)
	const [colors, setColors] = useState([])
	const [error, setError] = useState('')

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch('/api/colors')
				if (res.ok)
					setColors((await res.json()).map(c => new ColorModel(c)))
				else
					setError(t`Something went wrong`)
			}
			catch {}
			finally {
				setLoaded(true)
			}
		})()
	}, [])

	if (!loaded)
		return (
			<div className={CSS.Spinner} data-qaid={QaId.ColorListPreloader}>
				{t`Loading…`}
			</div>
		)

	if (error)
		return (
			<div className={CSS.Error} data-qaid={QaId.ColorListErrorMsg}>
				{error}
			</div>
		)

	if (!colors.length)
		return (
			<div className={CSS.Empty} data-qaid={QaId.ColorListEmpty}>
				{t`No colors found`}
			</div>
		)

	return (
		<ul className={CSS.ColorList} data-qaid={QaId.ColorList}>
			{colors.map(c => <ColorCard key={c.color} {...c} />)}
		</ul>
	)
}


/** @param color {ColorModel} */
export function ColorCard(color) {
	const { isAdmin } = useContext(UserContext)

	return (
		<li className={CSS.ColorCard} style={{
			background: color.color,
			color: color.isDark ? '#fff' : '#000'
		}}>
			<h2>{color.name}</h2>
			<div>{color.isValid
				? color.color
				: t`Oops`}</div>

			<div className={CSS.foot}>
				{color.isNew && <div className={CSS.newBadge}>{t`New`}</div>}
				{color.discontinued && <div className={CSS.discontinuedBadge}>{t`Discontinued`}</div>}
				{color.inStock
					? <span className={CSS.stock}>{t`Stock`}: {color.stockFormatted}</span>
					: <span className={CSS.outOfStockBadge}>{t`Out of stock`}</span>}
			</div>

			{isAdmin && <div className={CSS.adminFoot}>
				<button type="button" onClick={() => {
					alert('TODO: Implement Delete')
				}}>{t`Delete`}</button>
			</div>}
		</li>
	)
}
