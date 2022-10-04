import {store, view, component, writer, forward} from '../store-element.js'
import {el, select} from '../dom.js'

// Actions
const click = () => ({type: 'click'})

const styleButton = `
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
  style: styleButton,
  write: writeButton
})

customElements.define('my-button', button)

const styleMain = `
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

const initMain = ({clicks=0}) => ({clicks})

const updateMain = (state, msg) => {
  if (msg.type === 'click') {
    return [
      {...state, clicks: state.clicks + 1},
      null
    ]
  }
  return [state, null]
}

const main = component({
  init: initMain,
  update: updateMain,
  style: styleMain,
  write: writeMain
})

customElements.define('my-main', main)