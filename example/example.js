import {create} from "../store-element.js"
import {writer} from "../writer.js"

const html = string => {
  let template = document.createElement("template")
  template.innerHTML = string
  return template.content
}

const init = el => {
  let count = parseInt(el.getAttribute('count'))
  return [
    {
      count: Number.isNaN(count) ? 0 : count
    },
    null
  ]
}

const update = (state, msg) => {
  if (msg.type === "increment") {
    return [
      {
        ...state,
        count: state.count + 1
      },
      null
    ]
  } else if (msg.type === 'count') {
    return [
      {
        ...state,
        count: msg.value
      }
    ]
  } else {
    return [
      state,
      null
    ]
  }
}

const event = event => {
  if (event.type == "click" && event.target.matches("#button")) {
    event.preventDefault()
    event.stopPropagation()
    return {type: "increment"}
  }
}

const template = html(`
<style>
:host {
  display: block;
}
</style>
<p>The count is: <span id="count"></span></p>
<button id="button">Increment</button>
`)

const mount = (shadow, curr, handle) => {
  let html = template.cloneNode(true)
  shadow.appendChild(html)
  let count = shadow.querySelector("#count")
  count.innerText = curr.count
  let button = shadow.querySelector("#button")
  button.addEventListener('click', handle)
}

const write = (shadow, prev, curr, handle) => {
  if (prev.count != curr.count) {
    let count = shadow.querySelector("#count")
    count.innerText = curr.count
  }
}

let el = create()
  .init(init)
  .update(update)
  .event(event)
  .write(writer({mount, write}))
  .prop(
    'count',
    state => state.count,
    value => ({type: 'count', value})
  )
  .attr(['count'], (name, value) => {
    if (name === 'count') {
      return {type: 'count', value: parseInt(value)}
    }
  })

customElements.define('example-element', el)