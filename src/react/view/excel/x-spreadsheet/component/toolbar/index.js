/* global window */

import Autofilter from './autofilter';
import Find from './find';
import Freeze from './freeze';
import More from './more';
import Item from './item';

import { h } from '../element';
import { cssPrefix } from '../../config';
import { bind } from '../event';

function buildDivider() {
  return h('div', `${cssPrefix}-toolbar-divider`);
}

function initBtns2() {
  this.btns2 = [];
  this.items.forEach((it) => {
    if (Array.isArray(it)) {
  it.forEach(({ el }) => {
        const rect = el.box();
        const { marginLeft, marginRight } = el.computedStyle();
        this.btns2.push([el, rect.width + parseInt(marginLeft, 10) + parseInt(marginRight, 10)]);
      });
    } else {
      const rect = it.box();
      const { marginLeft, marginRight } = it.computedStyle();
      this.btns2.push([it, rect.width + parseInt(marginLeft, 10) + parseInt(marginRight, 10)]);
    }
  });
}

function moreResize() {
  const {
    el, btns, moreEl, btns2,
  } = this;
  const { moreBtns, contentEl } = moreEl.dd;
  el.css('width', `${this.widthFn()}px`);
  const elBox = el.box();

  let sumWidth = 60;
  let sumWidth2 = 12;
  const list1 = [];
  const list2 = [];
  btns2.forEach(([it, w], index) => {
    sumWidth += w;
    if (index === btns2.length - 1 || sumWidth < elBox.width) {
      list1.push(it);
    } else {
      sumWidth2 += w;
      list2.push(it);
    }
  });
  btns.html('').children(...list1);
  moreBtns.html('').children(...list2);
  contentEl.css('width', `${sumWidth2}px`);
  if (list2.length > 0) {
    moreEl.show();
  } else {
    moreEl.hide();
  }
}

function genBtn(it) {
  const btn = new Item();
  btn.el.on('click', () => {
    if (it.onClick) it.onClick(this.data.getData(), this.data);
  });
  btn.tip = it.tip || '';

  let { el } = it;

  if (it.icon) {
    el = h('img').attr('src', it.icon);
  }

  if (el) {
    const icon = h('div', `${cssPrefix}-icon`);
    icon.child(el);
    btn.el.child(icon);
  }

  return btn;
}

export default class Toolbar {
  constructor(data, widthFn, isHide = false) {
    this.data = data;
    this.change = () => {};
    this.widthFn = widthFn;
    this.isHide = isHide;
    // The viewer is read-only: only navigation aids are exposed.
    this.items = [
      [
        this.findEl = new Find(),
        this.autofilterEl = new Autofilter(),
        this.freezeEl = new Freeze(),
      ],
    ];

    const { extendToolbar = {} } = data.settings;

    if (extendToolbar.left && extendToolbar.left.length > 0) {
      this.items.unshift(buildDivider());
      const btns = extendToolbar.left.map(genBtn.bind(this));

      this.items.unshift(btns);
    }
    if (extendToolbar.right && extendToolbar.right.length > 0) {
      this.items.push(buildDivider());
      const btns = extendToolbar.right.map(genBtn.bind(this));
      this.items.push(btns);
    }

    this.items.push([this.moreEl = new More()]);

    this.el = h('div', `${cssPrefix}-toolbar`);
    this.btns = h('div', `${cssPrefix}-toolbar-btns`);

    this.items.forEach((it) => {
      if (Array.isArray(it)) {
        it.forEach((i) => {
          this.btns.child(i.el);
          i.change = (...args) => {
            this.change(...args);
          };
        });
      } else {
        this.btns.child(it.el);
      }
    });

    this.el.child(this.btns);
    if (isHide) {
      this.el.hide();
    } else {
      this.reset();
      setTimeout(() => {
        initBtns2.call(this);
        moreResize.call(this);
      }, 0);
      bind(window, 'resize', () => {
        moreResize.call(this);
      });
    }
  }

  resetData(data) {
    this.data = data;
    this.reset();
  }

  reset() {
    if (this.isHide) return;
    const { data } = this;
    this.autofilterEl.setState(!data.canAutofilter());
    this.freezeEl.setState(data.freezeIsActive());
  }
}
