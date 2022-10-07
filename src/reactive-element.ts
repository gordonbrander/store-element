import {html, render, TemplateResult} from 'lit-html'
import {RenderableElement} from './store-element'

export class ReactiveElement<State, Action>
extends RenderableElement<State, Action>
{
  html(state: State): TemplateResult {
    return html`<div>Hello World</div>`
  }

  write(
    container: ShadowRoot,
    state: State,
    send: (action: Action) => void
  ) {
    const template = this.html(state)
    render(template, container)
  }
}

// Create a new reactive element using an HTML template function
export const react = <State, Action>(
  html: (state: State) => TemplateResult
) => {
  class CustomReactiveElement<State, Action>
  extends ReactiveElement<State, Action> {}
  CustomReactiveElement.prototype.html = html
  return CustomReactiveElement
}