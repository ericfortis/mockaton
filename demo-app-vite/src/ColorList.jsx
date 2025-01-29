import { useState, useEffect, useContext } from 'react'
import { UserContext } from './UserContext.jsx'
import { ColorModel } from './ColorModel.js'
import CSS from './ColorList.module.css'


const Strings = {
	delete: 'Delete',
	discontinued: 'Discontinued',
	loading: 'Loading…',
	new: 'New',
	no_colors_found: 'No colors found',
	oops: 'Oops',
	out_of_stock: 'Out of stock',
	something_went_wrong: 'Something went wrong',
	stock: 'Stock'
}

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
					setError(Strings.something_went_wrong)
			}
			catch {}
			finally {
				setLoaded(true)
			}
		})()
	}, [])

	if (!loaded)
		return <div className={CSS.Spinner}>{Strings.loading}</div>

	if (error)
		return <div className={CSS.Error}>{error}</div>

	if (!colors.length)
		return <div className={CSS.Empty}>{Strings.no_colors_found}</div>

	return (
		<ul className={CSS.ColorList}>
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
				: Strings.oops}</div>

			<div className={CSS.foot}>
				{color.isNew && <div className={CSS.newBadge}>{Strings.new}</div>}
				{color.discontinued && <div className={CSS.discontinuedBadge}>{Strings.discontinued}</div>}
				{color.inStock
					? <span className={CSS.stock}>{Strings.stock}: {color.stockFormatted}</span>
					: <span className={CSS.outOfStockBadge}>{Strings.out_of_stock}</span>}
			</div>

			{isAdmin && <div className={CSS.adminFoot}>
				<button type="button" onClick={() => {
					alert('TODO: Implement Delete')
				}}>{Strings.delete}</button>
			</div>}
		</li>
	)
}
