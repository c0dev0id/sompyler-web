import { render } from 'solid-js/web'
import { App } from './App'
import { log } from './debug'
import './index.css'

log('session', 'info', 'Sompyler boot')

const root = document.getElementById('root')
if (!root) throw new Error('#root missing from index.html')
render(() => <App />, root)
