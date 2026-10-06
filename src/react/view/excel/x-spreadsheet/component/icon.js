import { Element, h } from './element';
import { cssPrefix } from '../config';

const CODICON_MAP = {
  ellipsis: 'more',
  find: 'search',
  autofilter: 'filter',
  freeze: 'pin',
};

function codiconClass(codicon) {
  return `codicon codicon-${codicon}`;
}

export default class Icon extends Element {
  constructor(name) {
    super('div', `${cssPrefix}-icon`);
    const codicon = CODICON_MAP[name];
    if (codicon) {
      this.iconNameEl = h('i', codiconClass(codicon));
    } else {
      this.iconNameEl = h('div', `${cssPrefix}-icon-img ${name}`);
    }
    this.child(this.iconNameEl);
  }

  setName(name) {
    const codicon = CODICON_MAP[name];
    if (codicon) {
      this.iconNameEl.className(codiconClass(codicon));
    } else {
      this.iconNameEl.className(`${cssPrefix}-icon-img ${name}`);
    }
  }
}
