import { createRoot } from 'react-dom/client'
import { UserContextProvider } from './UserContext.jsx'
import { QaId } from './QaId.js'
import { Header } from './Header.jsx'
import { ColorList } from './ColorList.jsx'
import { Instructions } from './Instructions.jsx'
import './App.css'


const root = document.createElement('div')
root.setAttribute('data-qaid', QaId.App)
document.body.appendChild(root)
createRoot(root).render(<App />)

function App() {
	return (
		<UserContextProvider>
			<Header />
			<Instructions />
			<ColorList />
		</UserContextProvider>
	)
}
