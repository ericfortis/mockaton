import { useContext } from 'react'
import { UserContext } from './UserContext.jsx'
import { QaId } from './QaId.js'
import CSS from './Header.module.css'


const Strings = {
	admin: '(Admin)',
	non_admin: '(Non-Admin)'
}

export function Header() {
	const { isAdmin, name } = useContext(UserContext)
	return (
		<header className={CSS.Header} data-qaid={QaId.Header}>
			{name} <span className={CSS.roleBadge}>{isAdmin
			? Strings.admin
			: Strings.non_admin}</span>
		</header>
	)
}
