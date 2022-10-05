import {store, view, writer, forward, change, connect} from '../dist/store-element.js'
import {el} from './dom.js'

// Actions
const click = () => ({type: 'click'})

const cssButton = `
  .button {
    font-size: 24px;
  }
`

const writeButton = writer({
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('button')
          .classes(['button'])
          .on('click', forward(handle, click))
          .text(`Clicks: ${curr.clicks}`)
          .done()
      )
  },
  patch: (host, prev, curr, handle) => {
    el.select('.button', host)
      .text(`Clicks: ${curr.clicks}`)
  }
})

const button = view({
  css: cssButton,
  write: writeButton
})

customElements.define('my-button', button)

const cssMain = `
  #main {
    background: #222;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`

const writeMain = writer({
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('div')
          .id('main')
          .append(
            el.create('my-button')
              .id('button')
              .send(handle)
              .render(curr)
              .done()
          )
          .done()
      )
  },
  patch: (host, prev, curr, handle) => {
    el.select('my-button#button', host)
      .render(curr)
  }
})

const main = view({
  css: cssMain,
  write: writeMain
})

customElements.define('my-main', main)

const state = {
  clicks: 0
}

const update = (state, msg) => {
  if (msg.type === 'click') {
    return change({...state, clicks: state.clicks + 1})
  }
  return change(state)
}

const mainStore = store({
  state,
  update
})

const mainView = el.create('my-main').done()

connect(
  mainStore,
  mainView,
)

el.select('body').append(mainView)