import {
  store, view, writer, forward, change, mount, just, fx
} from '../dist/store-element.js'
import {el} from './dom.js'

// Actions
const click = () => ({type: 'click'})
const tick = () => ({type: 'tick'})

const after = async (action, timeout)  => new Promise(
  succeed => {
    setTimeout(() => succeed(action), timeout)
  }
)

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
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  #time {
    font-size: 16px;
    color: #fff;
    text-align: center;
    display: block;
  }
`

const writeMain = writer({
  setup: (host, curr, handle) => {
    el(host)
      .append(
        el.create('div')
          .id('main')
          .append(
            el.create('div')
              .id('time')
              .text(curr.t)
              .done()
          )
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
    el.select('#time', host)
      .text(curr.t)
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
  t: Date.now(),
  clicks: 0
}

const update = (state, action) => {
  if (action.type === 'click') {
    return change(
      {...state, clicks: state.clicks + 1},
      fx(after(tick(), 1000))
    )
  } else if (action.type === 'tick') {
    return change(
      {...state, t: Date.now()}
    )
  }
  return change(state)
}

const mainStore = store({
  state,
  update
})

const mainEl = el.create('my-main').done()
const bodyEl = el.select('body').done()

mount(
  bodyEl,
  mainEl,
  mainStore
)