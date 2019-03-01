import { LitElement, html, css } from "lit-element";
import { asyncReplace } from "lit-html/directives/async-replace";
import { repeat } from "lit-html/directives/repeat";
import { until } from "lit-html/directives/until";

function sleep( delay) {
  return new Promise(( resolve, reject) => setTimeout( resolve, delay));
}

async function* countUp() {
  let i = 0;
  while( true) {
    yield ++i;
    await sleep( 1000);
  }
}

export class StreamingElement extends LitElement {

  static get styles() {
    return css`
      :host { display: block }
      :host([ hidden]) { display: none }
    `;
  }

  static get properties() {
    return {
      messages: { type: Array }
    };
  }

  render() {
    return html`
      <slot></slot>
      <p>Time: ${asyncReplace(countUp())}</p>
      <p>${repeat( this.messages, (message, index) =>
        html`${index}: ${message}<br/>`)}</p>`;
  }

  constructor() {
    super();
    const that = this;

    this.messages = new Array();
    this.writable = new WritableStream({
      write( message) {
        that.messages.push( message);
        that.requestUpdate();
      },
      abort( err) {
        console.error( "Sink unexpectedly aborted:", err);
      }
    });
  }
}

// Register the element with the browser
customElements.define( "streaming-element", StreamingElement);