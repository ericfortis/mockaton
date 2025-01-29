import { createRoot } from 'react-dom/client'
import { Header } from './Header.jsx'
import { ColorList } from './ColorList.jsx'
import { Instructions } from './Instructions.jsx'
import { UserContextProvider } from './UserContext.jsx'
import './App.css'


const root = document.createElement('div')
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
