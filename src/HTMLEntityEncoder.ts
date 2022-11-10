import {FSIServerClientUtils} from "./FSIServerClientUtils";

const modeNode: boolean = FSIServerClientUtils.GET_MODE_NODE();

export class HTMLEntityEncoder {
  private entityNode: HTMLSpanElement | null = (modeNode) ? null : window.document.createElement("span");

  public encode(str: string): string {
    if (this.entityNode) {
      this.entityNode.innerText = str;
      return this.entityNode.innerHTML;
    } else {
      return str;
    }
  }
}
