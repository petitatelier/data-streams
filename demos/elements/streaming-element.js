import { LitElement, html, css } from "lit-element";
import { asyncReplace } from "lit-html/directives/async-replace";
import { repeat } from "lit-html/directives/repeat";

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
      // Number of messages to keep and display
      take: { type: Number }
    };
  }

  // Getter and setter to constrain given attribute value as a
  // positive integer, defaulting to 1 if value is not numeric
  get take() { return this._take; }
  set take( newVal) {
    const oldVal = this._take;
    this._take = (newVal && Number.isInteger( newVal) && newVal > 1) ? newVal : 1;
    if( oldVal !== this._take)
      this.requestUpdate( "take", oldVal); // Ask Lit-Element to schedule an update
  }

  render() {
    return html`
      <slot></slot>
      <p>Time: ${asyncReplace(countUp())}</p>
      <p>${repeat( this._messages, (message, index) =>
          html`${this._messageCount - index}: ${message}<br/>`
      )}</p>${this._messageCount > this._take ?
          html`<p>(Displaying last ${this._take} messages)</p>` : ""}`;
  }

  constructor() {
    super();
    const that = this;

    // Initialize public observed properties
    this._take = 50;          // Underlying value of `take` property

    // Initialize private property
    this._messages = [];
    this._messageCount = 0;

    // Initialize public writable stream
    this.writable = new WritableStream({
      write( message) {
        that._messageCount += 1;
        that._messages.unshift( message);
        if( that._messages.length > that._take)
          that._messages.splice( that._take);
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