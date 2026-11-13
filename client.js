/**
 * Notes — browser half of the Notes bundle.
 *
 * Contributes a global entry to the left sidebar (`sidebar.panellist`) whose id
 * is shared with the central panel (`main`), so the sidebar's click selects the
 * panel. The panel is a self-contained rich-text note editor: formatting,
 * images (upload + paste), links, a symbol picker, and page background themes.
 * Notes are persisted in localStorage (client-only).
 */
window.__ModuleLoader__.load({
  id: '@magic_01/dsh-notes',
  factory(require) {
    const React = require('react');
    const { useState, useEffect, useRef } = React;
    const h = React.createElement;

    const PANEL_ID = 'notes';
    const NS = 'dshNotes';
    const STORAGE_KEY = 'dsh-notes:v1';

    // ---- dictionaries -----------------------------------------------------

    const EN = {
      panel: 'Notes',
      headerSub: 'Rich-text notes',
      newNote: 'New note',
      deleteNote: 'Delete note',
      untitled: 'Untitled',
      unsaved: 'Unsaved', saved: 'Saved',
      categories: 'Categories', allNotes: 'All notes', uncategorized: 'Uncategorized', category: 'Category',
      addCategory: 'Add category', addSubcategory: 'Add subcategory', rename: 'Rename', deleteCategory: 'Delete category',
      categoryNamePlaceholder: 'Category name', categoryDeleteConfirm: 'Delete this category? Its notes become uncategorized.',
      expandCategory: 'Expand', collapseCategory: 'Collapse',
      titlePlaceholder: 'Title',
      emptyState: 'No notes yet. Create one to start writing.',
      undo: 'Undo', redo: 'Redo',
      bold: 'Bold', italic: 'Italic', underline: 'Underline', strikethrough: 'Strikethrough',
      h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', paragraph: 'Paragraph', quote: 'Quote',
      bulletList: 'Bullet list', orderedList: 'Numbered list',
      insertImage: 'Insert image', insertLink: 'Insert link', removeLink: 'Remove link', insertSymbol: 'Insert symbol',
      background: 'Background',
      export: 'Export',
      clearFormat: 'Clear formatting',
      fontColor: 'Text color', highlight: 'Highlight', fontSize: 'Font size',
      linkUrl: 'Link URL', linkPlaceholder: 'https://example.com', apply: 'Apply', cancel: 'Cancel',
      'bg.default': 'Default', 'bg.white': 'White', 'bg.paper': 'Paper', 'bg.cream': 'Cream',
      'bg.ivory': 'Ivory', 'bg.sand': 'Sand', 'bg.sky': 'Sky', 'bg.ice': 'Ice',
      'bg.mint': 'Mint', 'bg.sage': 'Sage', 'bg.lavender': 'Lavender', 'bg.lilac': 'Lilac',
      'bg.rose': 'Rose', 'bg.blush': 'Blush', 'bg.peach': 'Peach', 'bg.lemon': 'Lemon',
      'bg.sunset': 'Sunset', 'bg.dawn': 'Dawn', 'bg.candy': 'Candy', 'bg.rosegold': 'Rose gold',
      'bg.ocean': 'Ocean', 'bg.forest': 'Forest', 'bg.aurora': 'Aurora',
      'bg.lined': 'Lined', 'bg.grid': 'Grid', 'bg.dots': 'Dots',
      'bg.dark': 'Dark', 'bg.midnight': 'Midnight', 'bg.charcoal': 'Charcoal',
      'bg.custom': 'Custom',
    };

    const ZH = {
      panel: '笔记',
      headerSub: '富文本笔记',
      newNote: '新建笔记',
      deleteNote: '删除笔记',
      untitled: '未命名',
      unsaved: '未保存', saved: '已保存',
      categories: '分类', allNotes: '全部', uncategorized: '未分类', category: '分类',
      addCategory: '新建分类', addSubcategory: '新建子分类', rename: '重命名', deleteCategory: '删除分类',
      categoryNamePlaceholder: '分类名称', categoryDeleteConfirm: '删除该分类？其下笔记将变为未分类。',
      expandCategory: '展开', collapseCategory: '折叠',
      titlePlaceholder: '标题',
      emptyState: '还没有笔记，点击“新建笔记”开始记录。',
      undo: '撤销', redo: '重做',
      bold: '加粗', italic: '斜体', underline: '下划线', strikethrough: '删除线',
      h1: '标题 1', h2: '标题 2', h3: '标题 3', paragraph: '正文', quote: '引用',
      bulletList: '无序列表', orderedList: '有序列表',
      insertImage: '插入图片', insertLink: '插入链接', removeLink: '移除链接', insertSymbol: '插入符号',
      background: '背景',
      export: '导出',
      clearFormat: '清除格式',
      fontColor: '字体颜色', highlight: '高亮', fontSize: '字号',
      linkUrl: '链接地址', linkPlaceholder: 'https://example.com', apply: '确定', cancel: '取消',
      'bg.default': '默认', 'bg.white': '白色', 'bg.paper': '纸张', 'bg.cream': '米色',
      'bg.ivory': '象牙白', 'bg.sand': '沙色', 'bg.sky': '天蓝', 'bg.ice': '冰蓝',
      'bg.mint': '薄荷', 'bg.sage': '鼠尾草绿', 'bg.lavender': '薰衣草', 'bg.lilac': '丁香',
      'bg.rose': '玫瑰', 'bg.blush': '腮红', 'bg.peach': '蜜桃', 'bg.lemon': '柠檬',
      'bg.sunset': '日落', 'bg.dawn': '黎明', 'bg.candy': '糖果', 'bg.rosegold': '玫瑰金',
      'bg.ocean': '海洋', 'bg.forest': '森林', 'bg.aurora': '极光',
      'bg.lined': '横线纸', 'bg.grid': '方格纸', 'bg.dots': '点阵纸',
      'bg.dark': '深色', 'bg.midnight': '午夜', 'bg.charcoal': '炭黑',
      'bg.custom': '自定义',
    };

    // ---- data model -------------------------------------------------------

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
    }

    /** 标题层级（h1..h6 → 1..6；非标题 → 0） */
    function headingLevel(el) {
      const tag = el.tagName;
      if (tag.length === 2 && tag[0] === 'H' && tag[1] >= '1' && tag[1] <= '6') return Number(tag[1]);
      return 0;
    }

    /** 标题下的可折叠内容：其后兄弟节点，直到下一个同级或更高级标题 */
    function foldableContentOf(heading) {
      const level = headingLevel(heading);
      const content = [];
      let el = heading.nextElementSibling;
      while (el) {
        const lv = headingLevel(el);
        if (lv && lv <= level) break;
        content.push(el);
        el = el.nextElementSibling;
      }
      return content;
    }

    function normalizeNote(n) {
      return {
        id: n.id || uid(),
        title: n.title || '',
        html: n.html || '',
        preview: n.preview != null ? n.preview : stripHtml(n.html || ''),
        categoryId: n.categoryId || null,
        createdAt: n.createdAt || Date.now(),
        updatedAt: n.updatedAt || Date.now(),
      };
    }

    function normalizeCategory(c) {
      return { id: c.id || uid(), name: c.name || '', parentId: c.parentId || null };
    }

    function makeWelcomeNote() {
      const now = Date.now();
      return {
        id: uid(),
        title: '欢迎使用笔记',
        html: '<p>这是一个支持<strong>富文本</strong>的笔记。</p>'
          + '<ul><li>插入图片、链接与符号：→ ★ ☀ ∞</li>'
          + '<li>在工具栏可以设置页面背景</li></ul>',
        categoryId: null,
        createdAt: now,
        updatedAt: now,
      };
    }

    function makeEmptyNote() {
      const now = Date.now();
      return { id: uid(), title: '', html: '', preview: '', categoryId: null, createdAt: now, updatedAt: now };
    }

    function loadData() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.notes)) {
            return {
              notes: parsed.notes,
              categories: Array.isArray(parsed.categories) ? parsed.categories : [],
              background: parsed.background || 'default',
            };
          }
        }
      } catch (_e) { /* corrupted or unavailable storage: start fresh */ }
      return { notes: [], categories: [], background: 'default' };
    }

    function saveData(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_e) { /* quota exceeded (large images) or storage unavailable */ }
    }

    /** 两级分类树（纯函数）：parentId 为 null 或悬空 → 根 */
    function buildCategoryTree(categories) {
      const byParent = new Map();
      const roots = [];
      const ids = new Set(categories.map((c) => c.id));
      for (const c of categories) {
        const node = { category: c, children: [] };
        if (c.parentId && ids.has(c.parentId)) {
          if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
          byParent.get(c.parentId).push(node);
        } else {
          roots.push(node);
        }
      }
      for (const root of roots) {
        root.children.push(...(byParent.get(root.category.id) ?? []));
      }
      return roots;
    }

    /** 分类展平（树序 + 层级），用于 <select> 选项 */
    function flattenCategories(categories) {
      const out = [];
      const walk = (nodes, depth) => {
        for (const n of nodes) {
          out.push({ ...n.category, depth });
          walk(n.children, depth + 1);
        }
      };
      walk(buildCategoryTree(categories), 0);
      return out;
    }

    /** HTML 文本转义（导出 HTML 文档标题用） */
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /** HTML → Markdown（覆盖笔记常用标签） */
    function htmlToMarkdown(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      let out = '';
      const inline = (node) => {
        let s = '';
        node.childNodes.forEach((child) => {
          if (child.nodeType === 3) { s += child.textContent; return; }
          if (child.nodeType !== 1) return;
          const tag = child.tagName.toUpperCase();
          const text = inline(child);
          if (tag === 'STRONG' || tag === 'B') s += '**' + text + '**';
          else if (tag === 'EM' || tag === 'I') s += '*' + text + '*';
          else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') s += '~~' + text + '~~';
          else if (tag === 'CODE') s += '`' + text + '`';
          else if (tag === 'A') s += '[' + text + '](' + (child.getAttribute('href') || '') + ')';
          else if (tag === 'IMG') s += '![' + (child.getAttribute('alt') || '') + '](' + (child.getAttribute('src') || '') + ')';
          else if (tag === 'BR') s += '\n';
          else s += text;
        });
        return s;
      };
      const block = (node) => {
        node.childNodes.forEach((child) => {
          if (child.nodeType !== 1) return;
          const tag = child.tagName.toUpperCase();
          if (tag === 'H1') out += '# ' + inline(child) + '\n\n';
          else if (tag === 'H2') out += '## ' + inline(child) + '\n\n';
          else if (tag === 'H3') out += '### ' + inline(child) + '\n\n';
          else if (tag === 'H4') out += '#### ' + inline(child) + '\n\n';
          else if (tag === 'H5') out += '##### ' + inline(child) + '\n\n';
          else if (tag === 'H6') out += '###### ' + inline(child) + '\n\n';
          else if (tag === 'P') out += inline(child) + '\n\n';
          else if (tag === 'BLOCKQUOTE') out += inline(child).split('\n').map((l) => '> ' + l).join('\n') + '\n\n';
          else if (tag === 'PRE') out += '```\n' + (child.textContent || '') + '\n```\n\n';
          else if (tag === 'UL') {
            Array.from(child.children).forEach((li) => { if (li.tagName.toUpperCase() === 'LI') out += '- ' + inline(li) + '\n'; });
            out += '\n';
          } else if (tag === 'OL') {
            let i = 1;
            Array.from(child.children).forEach((li) => { if (li.tagName.toUpperCase() === 'LI') out += (i++) + '. ' + inline(li) + '\n'; });
            out += '\n';
          } else block(child);
        });
      };
      block(tmp);
      return out.replace(/\n{3,}/g, '\n\n').trim();
    }

    /** 触发浏览器下载 */
    function download(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    /** 时间戳 → 中文相对时间（刚刚 / N 分钟前 / N 小时前 / N 天前 / 年/月/日） */
    function formatRelativeTime(ts) {
      const t = new Date(ts).getTime();
      if (Number.isNaN(t)) return '';
      const diff = Date.now() - t;
      const minute = 60_000;
      const hour = 60 * minute;
      const day = 24 * hour;
      if (diff < minute) return '刚刚';
      if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
      if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
      if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
      const d = new Date(t);
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }

    function readImageAsDataUrl(file, cb) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1280;
          if (img.width <= maxW) { cb(reader.result); return; }
          const scale = maxW / img.width;
          const canvas = document.createElement('canvas');
          canvas.width = maxW;
          canvas.height = Math.round(img.height * scale);
          const c = canvas.getContext('2d');
          c.drawImage(img, 0, 0, canvas.width, canvas.height);
          cb(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => cb(reader.result);
        img.src = reader.result;
      };
      reader.onerror = () => {};
      reader.readAsDataURL(file);
    }

    // ---- backgrounds ------------------------------------------------------

    const BACKGROUNDS = [
      // solids — light
      { id: 'default', css: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)' },
      { id: 'white', css: '#ffffff', color: '#1a1a1a' },
      { id: 'paper', css: '#fbf6e9', color: '#2b2b2b' },
      { id: 'cream', css: '#fdf3e3', color: '#2b2b2b' },
      { id: 'ivory', css: '#fffdf0', color: '#2b2b2b' },
      { id: 'sand', css: '#f6efdc', color: '#3a3323' },
      // solids — pastel
      { id: 'sky', css: '#eef5ff', color: '#1a2a3a' },
      { id: 'ice', css: '#e8f7f7', color: '#12323a' },
      { id: 'mint', css: '#ecf8f1', color: '#173a2b' },
      { id: 'sage', css: '#eef3e8', color: '#2c3a22' },
      { id: 'lavender', css: '#f4f0fc', color: '#2a2438' },
      { id: 'lilac', css: '#f3eafa', color: '#2a2438' },
      { id: 'rose', css: '#fdeef2', color: '#3a1f28' },
      { id: 'blush', css: '#fdeef0', color: '#3a1f28' },
      { id: 'peach', css: '#fff0e6', color: '#3a2417' },
      { id: 'lemon', css: '#fdfbe4', color: '#3a3a17' },
      // gradients
      { id: 'sunset', css: 'linear-gradient(135deg,#fff1e0,#ffd9c2)', color: '#3a2417' },
      { id: 'dawn', css: 'linear-gradient(135deg,#fde7f3,#f6c6ea)', color: '#3a1f3a' },
      { id: 'candy', css: 'linear-gradient(135deg,#fce4ec,#e1f5fe)', color: '#3a1f28' },
      { id: 'rosegold', css: 'linear-gradient(135deg,#ffe0d9,#f8c8dc)', color: '#3a1f28' },
      { id: 'ocean', css: 'linear-gradient(135deg,#e0f4fb,#c6e8e2)', color: '#12323a' },
      { id: 'forest', css: 'linear-gradient(135deg,#e8f5e9,#c8e6c9)', color: '#173a2b' },
      { id: 'aurora', css: 'linear-gradient(135deg,#e0f7fa,#d1c4e9)', color: '#1a2a3a' },
      // patterns
      { id: 'lined', css: 'repeating-linear-gradient(to bottom, #ffffff 0 23px, #cfd8e3 23px 24px)', color: '#2b2b2b' },
      { id: 'grid', css: '#ffffff repeating-linear-gradient(to right, #e2e8f0 0 1px, transparent 1px 24px), repeating-linear-gradient(to bottom, #e2e8f0 0 1px, transparent 1px 24px)', color: '#2b2b2b' },
      { id: 'dots', css: '#ffffff radial-gradient(circle, #c3ccd9 1.2px, transparent 1.2px) 0 0 / 24px 24px', color: '#2b2b2b' },
      // dark
      { id: 'dark', css: '#1f2233', color: '#e6e8f0' },
      { id: 'midnight', css: 'linear-gradient(160deg,#141e30,#243b55)', color: '#e6e8f0' },
      { id: 'charcoal', css: '#262626', color: '#e6e8f0' },
    ];

    const HEX_RE = /^#[0-9a-fA-F]{6}$/;
    function isCustomBg(v) { return typeof v === 'string' && v.startsWith('custom:'); }
    function customHex(v) {
      if (typeof v !== 'string' || !v.startsWith('custom:')) return null;
      const hex = v.slice('custom:'.length);
      return HEX_RE.test(hex) ? hex : null;
    }
    function readableTextColor(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum < 140 ? '#e6e8f0' : '#1f2937';
    }
    function resolveBg(v) {
      if (isCustomBg(v)) {
        const hex = customHex(v);
        return hex ? { id: v, css: hex, color: readableTextColor(hex) } : BACKGROUNDS[0];
      }
      return BACKGROUNDS.find((b) => b.id === v) || BACKGROUNDS[0];
    }
    function normalizeBg(v) {
      if (isCustomBg(v) && !customHex(v)) return 'default';
      return v || 'default';
    }

    // ---- symbols ----------------------------------------------------------

    const SYMBOL_TABS = [
      {
        key: 'common', label: '常用',
        sections: [
          { key: 'common-main', label: '常用', cols: 10, symbols: ['※', '【', '▍', '→', '↑', '↓', '✓', '✗', '⚠', '●', '○', '■', '◆', '★', '☆', '▶', '✔', '√', '☐', '×'] }
        ]
      },
      {
        key: 'symbol', label: '符号',
        sections: [
          { key: 'symbol-bullet', label: '项目符号 / 层级', cols: 7, rowSizes: [7, 6, 5], symbols: ['●', '◆', '■', '★', '▶', '➤', '➢', '○', '◇', '□', '☆', '▸', '▹', '·', '•', '‣', '⁃', '–'] },
          { key: 'symbol-shape', label: '图形 / 分隔 / 注记', cols: 10, symbols: ['▪', '▫', '◦', '∙', '▍', '▰', '▱', '█', '░', '▓', '▮', '▯', '—', '⋮', '─', '━', '┈', '…', '※'] }
        ]
      },
      {
        key: 'number', label: '编号',
        sections: [
          { key: 'number-seq', label: '序号', cols: 10, symbols: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳', '❶', '❷', '❸', '❹', '❺', '➊', '➋', '➌', '⒈', '⒉', '⒊', '⑴', '⑵', '⑶', '㈠', '㈡', '㈢'] },
          { key: 'number-roman', label: '罗马数字', cols: 10, symbols: ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'] },
          { key: 'number-alpha', label: '圈字母 / 编号符', cols: 10, symbols: ['Ⓐ', 'Ⓑ', 'Ⓒ', 'ⓐ', 'ⓑ', 'ⓒ', '№'] }
        ]
      },
      {
        key: 'arrow', label: '箭头',
        sections: [
          { key: 'arrow-main', label: '箭头 / 流向', cols: 10, rowSizes: [8, 4, 9, 6], symbols: ['←', '→', '↑', '↓', '↔', '⇒', '⇐', '⇔', '↻', '↺', '⤴', '⤵', '◀', '↗', '↘', '↖', '↙', '▲', '▼', '△', '▽', '»', '➔', '➜', '➞', '➝', '⟶'] }
        ]
      },
      {
        key: 'status', label: '状态',
        sections: [
          { key: 'status-main', label: '对勾 / 状态', cols: 8, rowSizes: [8, 8], symbols: ['✓', '✗', '⚠', '✔', '√', '☐', '☑', '◐', '◔', '◑', '✕', '✘', '✦', '✚', '⛓', '‼'] }
        ]
      },
      {
        key: 'math', label: '数学',
        sections: [
          { key: 'math-main', label: '数学 / 度量', cols: 7, symbols: ['×', '÷', '±', '≈', '≠', '≤', '≥', '≡', '∞', '‰', '℃', '°', '％'] }
        ]
      },
      {
        key: 'bracket', label: '括号',
        sections: [
          { key: 'bracket-main', label: '括号', cols: 7, symbols: ['【', '】', '〔', '〕', '〖', '〗', '「', '」', '『', '』', '《', '》', '〈', '〉'] }
        ]
      }
    ];

    const ALL_SYMBOLS = new Set(SYMBOL_TABS.flatMap((t) => t.sections).flatMap((s) => s.symbols));
    const RECENT_SYMBOL_LIMIT = 8;
    const RECENT_SYMBOLS_KEY = 'dsh-notes:recent-symbols';

    /** 按 rowSizes 把 symbols 切成多段（无 rowSizes 则整体一段） */
    function splitRows(section) {
      if (!section.rowSizes) return [section.symbols];
      const rows = [];
      let i = 0;
      for (const size of section.rowSizes) { rows.push(section.symbols.slice(i, i + size)); i += size; }
      if (i < section.symbols.length) {
        if (rows.length === 0) rows.push([]);
        rows[rows.length - 1].push(...section.symbols.slice(i));
      }
      return rows;
    }

    /** 最近使用更新（纯函数）：去重、置顶、截断到 max */
    function pushRecent(list, sym, max) {
      return [sym, ...list.filter((s) => s !== sym)].slice(0, max);
    }

    function readRecentSymbols() {
      try {
        const raw = JSON.parse(localStorage.getItem(RECENT_SYMBOLS_KEY) ?? '[]');
        if (!Array.isArray(raw)) return [];
        return raw.filter((s) => typeof s === 'string' && ALL_SYMBOLS.has(s)).slice(0, RECENT_SYMBOL_LIMIT);
      } catch { return []; }
    }

    function writeRecentSymbols(list) {
      try { localStorage.setItem(RECENT_SYMBOLS_KEY, JSON.stringify(list)); } catch { /* 配额满：静默降级 */ }
    }

    const COLLAPSED_CATS_KEY = 'dsh-notes:collapsed-cats';

    function readCollapsedCats() {
      try {
        const raw = JSON.parse(localStorage.getItem(COLLAPSED_CATS_KEY) ?? '[]');
        if (!Array.isArray(raw)) return [];
        return raw.filter((s) => typeof s === 'string');
      } catch { return []; }
    }

    function writeCollapsedCats(list) {
      try { localStorage.setItem(COLLAPSED_CATS_KEY, JSON.stringify(list)); } catch { /* 配额满：静默降级 */ }
    }

    const FONT_COLORS = [
      { label: '黑', hex: '#1f2937' },
      { label: '灰', hex: '#6b7280' },
      { label: '白', hex: '#ffffff' },
      { label: '红', hex: '#ef4444' },
      { label: '橙', hex: '#f97316' },
      { label: '黄', hex: '#eab308' },
      { label: '绿', hex: '#22c55e' },
      { label: '青', hex: '#06b6d4' },
      { label: '蓝', hex: '#3b82f6' },
      { label: '紫', hex: '#8b5cf6' },
      { label: '粉', hex: '#ec4899' },
      { label: '棕', hex: '#92400e' },
      { label: '深红', hex: '#b91c1c' },
      { label: '深橙', hex: '#c2410c' },
      { label: '深绿', hex: '#15803d' },
      { label: '深青', hex: '#0e7490' },
      { label: '深蓝', hex: '#1d4ed8' },
      { label: '深紫', hex: '#6d28d9' },
      { label: '金黄', hex: '#d97706' },
      { label: '浅绿', hex: '#84cc16' },
      { label: '青绿', hex: '#0d9488' },
      { label: '天蓝', hex: '#0ea5e9' },
      { label: '靛蓝', hex: '#4f46e5' },
      { label: '玫红', hex: '#db2777' }
    ];

    const HIGHLIGHT_COLORS = [
      { label: '黄', bg: '#fde047', fg: '#1d1d1f' },
      { label: '绿', bg: '#86efac', fg: '#1d1d1f' },
      { label: '青', bg: '#67e8f9', fg: '#1d1d1f' },
      { label: '蓝', bg: '#93c5fd', fg: '#1d1d1f' },
      { label: '紫', bg: '#c4b5fd', fg: '#1d1d1f' },
      { label: '粉', bg: '#f9a8d4', fg: '#1d1d1f' },
      { label: '红', bg: '#fca5a5', fg: '#1d1d1f' },
      { label: '橙', bg: '#fdba74', fg: '#1d1d1f' },
      { label: '灰', bg: '#d1d5db', fg: '#1d1d1f' },
      { label: '深蓝', bg: '#1e3a8a', fg: '#ffffff' }
    ];

    const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '60', '72'];

    // ---- styles -----------------------------------------------------------

    const CSS = `
.dshn-root{--dshn-accent:var(--dsw-alias-brand-primary-new-colorprimary-new-color);display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-family:inherit;font-size:14px}
.dshn-root *{box-sizing:border-box}
.dshn-root ::-webkit-scrollbar{width:10px;height:10px}
.dshn-root ::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:6px;border:2px solid transparent;background-clip:content-box}
.dshn-root ::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-secondary);border:2px solid transparent;background-clip:content-box}
.dshn-header{display:flex;align-items:center;gap:12px;height:56px;padding:0 20px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;background:var(--dsw-alias-bg-base)}
.dshn-header-mark{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:var(--dshn-accent);color:#fff;flex:none;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.dshn-header-title{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:600;margin:0;letter-spacing:.01em;line-height:1.2}
.dshn-header-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:1px;font-weight:400}
.dshn-header-spacer{flex:1}
.dshn-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;cursor:pointer;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .15s ease}
.dshn-btn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.dshn-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dshn-btn-primary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-inverted);box-shadow:0 1px 3px rgba(0,0,0,.18)}
.dshn-btn-primary:hover{background:var(--dsw-alias-button-primary-hover);color:var(--dsw-alias-label-primary-inverted);transform:translateY(-1px)}
.dshn-body{display:flex;flex:1;min-height:0}
.dshn-list{width:284px;flex:none;border-right:1px solid var(--dsw-alias-border-l1);overflow-y:auto;padding:12px;background:var(--dsw-alias-bg-layer-1)}
.dshn-list-empty{padding:16px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.6}
.dshn-cats-header{display:flex;align-items:center;justify-content:space-between;padding:0 8px 6px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em}
.dshn-cat-row{display:flex;align-items:center;gap:4px;height:28px;padding-right:6px;border-radius:7px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:13px;transition:background .1s ease,color .1s ease}
.dshn-cat-row:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dshn-cat-row.is-active{background:var(--dsw-alias-bg-layer-2);color:var(--dshn-accent);font-weight:600}
.dshn-cat-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshn-cat-actions{display:flex;gap:2px;opacity:0;transition:opacity .1s ease}
.dshn-cat-row:hover .dshn-cat-actions{opacity:1}
.dshn-cat-btn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:5px;cursor:pointer;font-size:12px;line-height:1;transition:background .1s ease,color .1s ease}
.dshn-cat-btn:hover{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.dshn-cat-toggle{flex:none;width:16px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0;font-size:11px;line-height:1;color:var(--dsw-alias-label-secondary);border:none;background:transparent}
button.dshn-cat-toggle{cursor:pointer;border-radius:4px}
button.dshn-cat-toggle:hover{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.dshn-list-divider{height:1px;background:var(--dsw-alias-border-l1);margin:8px 0}
.dshn-cat-select{flex:none;margin-right:12px;height:28px;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;font-family:inherit;outline:none;max-width:160px}
.dshn-cat-select:focus{border-color:var(--dshn-accent)}
.dshn-note{position:relative;padding:12px 14px;border-radius:10px;cursor:pointer;margin-bottom:6px;border:1px solid transparent;transition:background .12s ease,border-color .12s ease}
.dshn-note:hover{background:var(--dsw-alias-bg-layer-2)}
.dshn-note.is-active{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.dshn-note.is-active::before{content:"";position:absolute;left:-1px;top:12px;bottom:12px;width:3px;border-radius:2px;background:var(--dshn-accent)}
.dshn-note-title{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4}
.dshn-note-preview{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;line-height:1.4}
.dshn-note-meta{display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dshn-note-del{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:15px;line-height:1;border-radius:6px;opacity:0;transition:opacity .12s ease,background .12s ease,color .12s ease}
.dshn-note:hover .dshn-note-del,.dshn-note:focus-within .dshn-note-del{opacity:1}
.dshn-note-del:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-overlay)}
.dshn-editor{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-base)}
.dshn-title-row{display:flex;align-items:center;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dshn-title{flex:1;min-width:0;border:none;background:transparent;color:var(--dsw-alias-label-primary);font-size:22px;font-weight:600;padding:16px 24px;outline:none;font-family:inherit;letter-spacing:.01em}
.dshn-title::placeholder{color:var(--dsw-alias-label-secondary);font-weight:400}
.dshn-save-state{flex:none;padding:0 20px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dshn-save-state[data-save-state='dirty']{color:var(--dsw-alias-state-warn-primary)}
.dshn-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:2px;padding:8px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);position:relative;flex:none;background:var(--dsw-alias-bg-base)}
.dshn-tool{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;padding:0 7px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:7px;cursor:pointer;font-size:13px;transition:background .12s ease,color .12s ease}
.dshn-tool:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dshn-tool.is-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.dshn-sep{width:1px;height:18px;background:var(--dsw-alias-border-l1);margin:0 7px;flex:none}
.dshn-editor-surface{flex:1;overflow-y:auto;min-height:0}
.dshn-content{min-height:100%;outline:none;padding:28px 36px 56px;font-size:16px;line-height:1.75}
.dshn-content h1{font-size:30px;font-weight:700;margin:.6em 0 .35em;line-height:1.3}
.dshn-content h2{font-size:24px;font-weight:700;margin:.55em 0 .3em 20px;line-height:1.3}
.dshn-content h3{font-size:19px;font-weight:600;margin:.5em 0 .28em 40px;line-height:1.3}
.dshn-content h4{font-size:16px;font-weight:600;margin:.45em 0 .26em 60px;line-height:1.3}
.dshn-content h5{font-size:14px;font-weight:600;margin:.4em 0 .24em 80px;line-height:1.3}
.dshn-content h6{font-size:13px;font-weight:600;margin:.4em 0 .22em 100px;line-height:1.3}
.dshn-content p{margin:.55em 0}
.dshn-content blockquote{border-left:3px solid var(--dshn-accent);margin:.75em 0;padding:8px 16px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-radius:0 8px 8px 0}
.dshn-content a{color:var(--dsw-alias-link);text-decoration:none;border-bottom:1px solid transparent;transition:border-color .12s ease}
.dshn-content a:hover{border-bottom-color:var(--dsw-alias-link)}
.dshn-content img{max-width:100%;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.12)}
.dshn-content ul,.dshn-content ol{padding-left:26px;margin:.5em 0}
.dshn-content li{margin:.2em 0}
.dshn-content .dshn-fold-toggle{display:inline-block;width:20px;margin-right:2px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;text-align:center;vertical-align:middle}
.dshn-content .dshn-fold-toggle::before{content:'▼'}
.dshn-content .dshn-folded>.dshn-fold-toggle::before{content:'▶'}
.dshn-content .dshn-fold-toggle:hover{color:var(--dshn-accent)}
.dshn-content .dshn-fold-hidden{display:none!important}
.dshn-content pre{background:var(--dsw-alias-bg-layer-1);padding:12px 14px;border-radius:8px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
.dshn-backdrop{position:fixed;inset:0;z-index:10;background:rgba(0,0,0,.16)}
.dshn-popover{position:absolute;top:calc(100% + 8px);left:0;z-index:20;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);animation:dshn-pop .12s ease}
@keyframes dshn-pop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.dshn-symbol-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;max-width:440px}
.dshn-symbol-cat{grid-column:1 / -1;font-size:10px;color:var(--dsw-alias-label-secondary);margin:6px 0 2px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.dshn-symbol{min-width:32px;height:32px;border:none;background:transparent;color:var(--dsw-alias-label-primary);border-radius:6px;cursor:pointer;font-size:16px;transition:background .1s ease}
.dshn-symbol:hover{background:var(--dsw-alias-bg-layer-2)}
.dshn-popover-symbols{max-width:470px;max-height:72vh;overflow-y:auto}
.dshn-sym-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--dsw-alias-border-l1);padding-bottom:8px;margin-bottom:8px}
.dshn-sym-tab{padding:4px 10px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;font-size:12px;transition:background .1s ease,color .1s ease}
.dshn-sym-tab:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dshn-sym-tab.is-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);font-weight:600}
.dshn-sym-section{margin-bottom:8px}
.dshn-swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;max-width:480px;max-height:340px;overflow-y:auto;padding:2px}
.dshn-swatch-item{display:flex;flex-direction:column;align-items:center;gap:4px}
.dshn-swatch{width:48px;height:48px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
.dshn-swatch:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.18)}
.dshn-swatch.is-active{outline:2px solid var(--dshn-accent);outline-offset:1px}
.dshn-swatch-label{font-size:10px;color:var(--dsw-alias-label-secondary);max-width:56px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshn-custom-color{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}
.dshn-custom-color input{width:28px;height:28px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:transparent;cursor:pointer;padding:0}
.dshn-sizemenu{display:flex;flex-direction:column;min-width:132px}
.dshn-size{padding:7px 14px;border:none;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;border-radius:7px;font-size:13px;font-family:inherit;transition:background .1s ease}
.dshn-size:hover{background:var(--dsw-alias-bg-layer-2)}
.dshn-linkform{display:flex;gap:8px;align-items:center;min-width:340px}
.dshn-linkform input{flex:1;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;font-family:inherit;outline:none;transition:border-color .12s ease}
.dshn-linkform input:focus{border-color:var(--dsw-alias-brand-primary)}
.dshn-colorgrid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}
.dshn-color{width:24px;height:24px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);cursor:pointer;transition:transform .1s ease,box-shadow .1s ease}
.dshn-color:hover{transform:scale(1.15);box-shadow:0 1px 6px rgba(0,0,0,.25)}
.dshn-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;padding:32px;color:var(--dsw-alias-label-secondary);text-align:center}
.dshn-empty svg{opacity:.4}
@media (max-width:720px){
  .dshn-body{flex-direction:column}
  .dshn-list{width:100%;max-height:40%;border-right:none;border-bottom:1px solid var(--dsw-alias-border-l1)}
}
`;

    // ---- glyphs -----------------------------------------------------------

    function noteGlyph(size) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
      h('rect', { x: 13, y: 9, width: 38, height: 46, rx: 6 }),
      h('path', { d: 'M20 19h24' }),
      h('path', { d: 'M20 30h24' }),
      h('path', { d: 'M20 40h16' }));
    }

    function imageGlyph(size) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('rect', { x: 1.5, y: 2.5, width: 13, height: 11, rx: 1.5 }),
        h('circle', { cx: 5.3, cy: 5.7, r: 1.3 }),
        h('path', { d: 'M2.5 12.5l4-4 2.5 2.5 2-2 2.5 2.5' }));
    }

    function linkGlyph(size) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M6.8 9.2l2.4-2.4' }),
        h('path', { d: 'M8.5 5.5l-.9-.9a2.4 2.4 0 0 0-3.4 3.4l.9.9' }),
        h('path', { d: 'M7.5 10.5l.9.9a2.4 2.4 0 0 0 3.4-3.4l-.9-.9' }));
    }

    function unlinkGlyph(size) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M8.5 5.5l-.9-.9a2.4 2.4 0 0 0-3.4 3.4l.9.9' }),
        h('path', { d: 'M7.5 10.5l.9.9a2.4 2.4 0 0 0 3.4-3.4l-.9-.9' }),
        h('path', { d: 'M2 2l12 12' }));
    }

    function colorGlyph() {
      return h('span', { style: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 } },
        h('span', { style: { fontWeight: 700 } }, 'A'),
        h('span', { style: { width: 14, height: 2, borderRadius: 1, background: 'linear-gradient(90deg,#e6194b,#f58231,#ffe119,#3cb44b,#4363d8,#911eb4)' } }));
    }

    function highlightGlyph() {
      return h('span', { style: { fontWeight: 700, background: '#ffe08a', borderRadius: 3, padding: '0 2px' } }, 'A');
    }

    function fontSizeGlyph() {
      return h('span', { style: { fontWeight: 700 } }, 'Aa');
    }

    function toolbarIcon(...children) {
      return h('svg', {
        width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      }, children);
    }

    function plusGlyph(size) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' },
        h('path', { d: 'M12 5v14' }), h('path', { d: 'M5 12h14' }));
    }

    const ICON_UNDO = toolbarIcon(h('path', { d: 'M3 7v6h6' }), h('path', { d: 'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13' }));
    const ICON_REDO = toolbarIcon(h('path', { d: 'M21 7v6h-6' }), h('path', { d: 'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13' }));
    const ICON_BOLD = toolbarIcon(h('path', { d: 'M6 4h8a4 4 0 0 1 0 8H6z' }), h('path', { d: 'M6 12h9a4 4 0 0 1 0 8H6z' }));
    const ICON_ITALIC = toolbarIcon(h('line', { x1: 19, y1: 4, x2: 10, y2: 4 }), h('line', { x1: 14, y1: 20, x2: 5, y2: 20 }), h('line', { x1: 15, y1: 4, x2: 9, y2: 20 }));
    const ICON_UNDERLINE = toolbarIcon(h('path', { d: 'M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3' }), h('line', { x1: 4, y1: 21, x2: 20, y2: 21 }));
    const ICON_STRIKE = toolbarIcon(h('path', { d: 'M16 4H9a3 3 0 0 0-2.83 4' }), h('path', { d: 'M14 12a4 4 0 0 1 0 8H6' }), h('line', { x1: 4, y1: 12, x2: 20, y2: 12 }));
    const ICON_H1 = toolbarIcon(h('path', { d: 'M4 12h8' }), h('path', { d: 'M4 18V6' }), h('path', { d: 'M12 18V6' }), h('path', { d: 'm17 12 3-2v8' }));
    const ICON_H2 = toolbarIcon(h('path', { d: 'M4 12h8' }), h('path', { d: 'M4 18V6' }), h('path', { d: 'M12 18V6' }), h('path', { d: 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1' }));
    const ICON_H3 = toolbarIcon(h('path', { d: 'M4 12h8' }), h('path', { d: 'M4 18V6' }), h('path', { d: 'M12 18V6' }), h('path', { d: 'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2' }), h('path', { d: 'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2' }));
    const ICON_PARAGRAPH = toolbarIcon(h('path', { d: 'M13 4v16' }), h('path', { d: 'M17 4v16' }), h('path', { d: 'M19 4H9.5a4.5 4.5 0 0 0 0 9H13' }));
    const ICON_QUOTE = toolbarIcon(h('path', { d: 'M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .01-1 1.03V20c0 1 0 1 1 1z' }), h('path', { d: 'M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z' }));
    const ICON_UL = toolbarIcon(h('line', { x1: 8, y1: 6, x2: 21, y2: 6 }), h('line', { x1: 8, y1: 12, x2: 21, y2: 12 }), h('line', { x1: 8, y1: 18, x2: 21, y2: 18 }), h('line', { x1: 3, y1: 6, x2: 3.01, y2: 6 }), h('line', { x1: 3, y1: 12, x2: 3.01, y2: 12 }), h('line', { x1: 3, y1: 18, x2: 3.01, y2: 18 }));
    const ICON_OL = toolbarIcon(h('line', { x1: 10, y1: 6, x2: 21, y2: 6 }), h('line', { x1: 10, y1: 12, x2: 21, y2: 12 }), h('line', { x1: 10, y1: 18, x2: 21, y2: 18 }), h('path', { d: 'M4 6h1v4' }), h('path', { d: 'M4 10h2' }), h('path', { d: 'M6 18H4c0-1 2-2 2-3s-1-1.5-2-1' }));
    const ICON_CLEAR = toolbarIcon(h('path', { d: 'M4 7V5h16v2' }), h('line', { x1: 5, y1: 21, x2: 19, y2: 21 }), h('line', { x1: 12, y1: 5, x2: 12, y2: 21 }));
    const ICON_EXPORT = toolbarIcon(h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), h('path', { d: 'M7 10l5 5 5-5' }), h('line', { x1: 12, y1: 15, x2: 12, y2: 3 }));

    function NotesIcon({ size = 18 }) {
      return noteGlyph(size);
    }

    // ---- small toolbar helpers -------------------------------------------

    function ToolButton(props) {
      const { title, active, onAction, children } = props;
      return h('button', {
        type: 'button',
        className: 'dshn-tool' + (active ? ' is-active' : ''),
        title,
        'aria-label': title,
        onMouseDown: (e) => e.preventDefault(),
        onClick: (e) => { e.preventDefault(); if (onAction) onAction(); },
      }, children);
    }

    function Sep() {
      return h('span', { className: 'dshn-sep', 'aria-hidden': true });
    }

    // ---- the panel --------------------------------------------------------

    function NotesApp({ t }) {
      const [data, setData] = useState(() => {
        const d = loadData();
        let notes = d.notes.map(normalizeNote);
        if (!notes.length) notes = [normalizeNote(makeWelcomeNote())];
        return { notes, categories: d.categories.map(normalizeCategory), background: normalizeBg(d.background) };
      });
      const [activeId, setActiveId] = useState(null);
      const [popover, setPopover] = useState(null); // null | 'symbol' | 'background' | 'link' | 'foreColor' | 'hiliteColor' | 'fontSize' | 'export'
      const [linkUrl, setLinkUrl] = useState('');
      const [recentSymbols, setRecentSymbols] = useState(() => readRecentSymbols());
      const [symbolTab, setSymbolTab] = useState(SYMBOL_TABS[0].key);
      const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'none' | categoryId
      const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(() => readCollapsedCats());
      const [saveState, setSaveState] = useState('saved');
      const [savedAt, setSavedAt] = useState('');

      const editorRef = useRef(null);
      const savedRange = useRef(null);
      const fileInputRef = useRef(null);
      const firstRenderRef = useRef(true);

      const notes = data.notes;
      const categories = data.categories;
      const background = data.background;
      const activeNote = notes.find((n) => n.id === activeId) || notes[0] || null;
      const bg = resolveBg(background);
      const visibleNotes = categoryFilter === 'all'
        ? notes
        : categoryFilter === 'none'
          ? notes.filter((n) => !n.categoryId)
          : notes.filter((n) => n.categoryId === categoryFilter);

      useEffect(() => {
        if (firstRenderRef.current) {
          firstRenderRef.current = false;
          saveData({ notes, categories, background });
          return;
        }
        setSaveState('dirty');
        const timer = setTimeout(() => {
          saveData({ notes, categories, background });
          setSaveState('saved');
          setSavedAt(new Date().toTimeString().slice(0, 5));
        }, 800);
        return () => clearTimeout(timer);
      }, [notes, categories, background]);

      useEffect(() => {
        const onBeforeUnload = () => { saveData({ notes, categories, background }); };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
      }, [notes, categories, background]);

      useEffect(() => {
        if (activeId === null && notes.length) setActiveId(notes[0].id);
      }, [activeId, notes]);

      useEffect(() => {
        if (editorRef.current && activeNote) {
          editorRef.current.innerHTML = activeNote.html || '';
          savedRange.current = null;
          syncFoldToggles();
        }
      }, [activeNote ? activeNote.id : null]);

      useEffect(() => {
        if (!popover) return;
        const onKey = (e) => { if (e.key === 'Escape') setPopover(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [popover]);

      function saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current) {
          const node = sel.anchorNode;
          if (node && editorRef.current.contains(node)) savedRange.current = sel.getRangeAt(0).cloneRange();
        }
      }

      function restoreSelection() {
        const sel = window.getSelection();
        if (sel && savedRange.current && editorRef.current) {
          sel.removeAllRanges();
          sel.addRange(savedRange.current);
        }
        if (editorRef.current) editorRef.current.focus();
      }

      function commitHtml() {
        if (!editorRef.current || !activeNote) return;
        const clone = editorRef.current.cloneNode(true);
        clone.querySelectorAll('.dshn-fold-toggle').forEach((el) => el.remove());
        clone.querySelectorAll('.dshn-folded, .dshn-fold-hidden').forEach((el) => el.classList.remove('dshn-folded', 'dshn-fold-hidden'));
        const html = clone.innerHTML;
        const preview = stripHtml(html);
        setData((d) => ({ ...d, notes: d.notes.map((n) => (n.id === activeNote.id ? { ...n, html, preview, updatedAt: Date.now() } : n)) }));
      }

      function toggleFold(heading) {
        const content = foldableContentOf(heading);
        if (content.length === 0) return;
        const willFold = !heading.classList.contains('dshn-folded');
        heading.classList.toggle('dshn-folded', willFold);
        content.forEach((el) => el.classList.toggle('dshn-fold-hidden', willFold));
      }

      function syncFoldToggles() {
        const root = editorRef.current;
        if (!root) return;
        root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
          const has = !!h.querySelector(':scope > .dshn-fold-toggle');
          const should = foldableContentOf(h).length > 0;
          if (should && !has) {
            const t = document.createElement('span');
            t.className = 'dshn-fold-toggle';
            t.contentEditable = 'false';
            t.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
            t.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleFold(h); });
            h.insertBefore(t, h.firstChild);
          } else if (!should && has) {
            const t = h.querySelector(':scope > .dshn-fold-toggle');
            if (t) t.remove();
          }
        });
      }

      function stripFoldToggles() {
        const root = editorRef.current;
        if (!root) return;
        root.querySelectorAll('.dshn-fold-toggle').forEach((el) => el.remove());
      }

      function runCommand(cmd, value) {
        // 先抓当前实时选区，覆盖可能过期的 savedRange——否则点工具栏时选区已变，formatBlock 会作用到错误位置或直接失败
        saveSelection();
        restoreSelection();
        stripFoldToggles();
        document.execCommand(cmd, false, value);
        saveSelection();
        commitHtml();
        syncFoldToggles();
      }

      /** 像素级字号：选区包裹 <span style="font-size">；空选区插入零宽占位 span 并定位光标（后续输入同字号） */
      function applyFontSize(px) {
        saveSelection();
        restoreSelection();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = px;
        if (range.collapsed) {
          span.textContent = '\u200B';
          range.insertNode(span);
          range.setStart(span.firstChild, 1);
          range.collapse(true);
        } else {
          let fragment;
          try {
            fragment = range.extractContents();
          } catch (_e) {
            return; // 复杂跨块选区无法提取：放弃本次设置，避免破坏内容
          }
          // 清掉选区里已有的字号样式，让新字号统一生效（否则内层 font-size span 会覆盖外层）
          fragment.querySelectorAll('*').forEach((el) => { el.style.fontSize = ''; });
          span.appendChild(fragment);
          range.insertNode(span);
          range.selectNodeContents(span);
        }
        sel.removeAllRanges();
        sel.addRange(range);
        editorRef.current.focus();
        saveSelection();
        commitHtml();
      }

      function createNote() {
        commitHtml();
        const note = makeEmptyNote();
        setData((d) => ({ ...d, notes: [note, ...d.notes] }));
        setActiveId(note.id);
        setPopover(null);
      }

      function deleteNote(e, id) {
        e.stopPropagation();
        commitHtml();
        const remaining = notes.filter((n) => n.id !== id);
        setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
        if (activeNote && activeNote.id === id) setActiveId(remaining.length ? remaining[0].id : null);
      }

      function selectNote(id) {
        if (activeNote && activeNote.id === id) return;
        commitHtml();
        saveSelection();
        setActiveId(id);
        setPopover(null);
      }

      function updateTitle(value) {
        if (!activeNote) return;
        setData((d) => ({ ...d, notes: d.notes.map((n) => (n.id === activeNote.id ? { ...n, title: value, updatedAt: Date.now() } : n)) }));
      }

      function onEditorInput() {
        saveSelection();
        commitHtml();
        syncFoldToggles();
      }

      function onEditorKeyDown(e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          if (editorRef.current) {
            // 用 4 个不换行空格，避免普通空格在 HTML 里折叠成一个
            document.execCommand('insertText', false, '\u00A0\u00A0\u00A0\u00A0');
            saveSelection();
            commitHtml();
          }
        }
      }

      function pickImage() {
        if (fileInputRef.current) fileInputRef.current.click();
      }

      function onImageFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        readImageAsDataUrl(file, (dataUrl) => { runCommand('insertImage', dataUrl); });
        e.target.value = '';
      }

      function onPaste(e) {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type && item.type.indexOf('image/') === 0) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) readImageAsDataUrl(file, (dataUrl) => { runCommand('insertImage', dataUrl); });
            break;
          }
        }
      }

      function insertSymbol(sym) {
        setPopover(null);
        runCommand('insertText', sym);
        setRecentSymbols((prev) => {
          const next = pushRecent(prev, sym, RECENT_SYMBOL_LIMIT);
          writeRecentSymbols(next);
          return next;
        });
      }

      function openLink() {
        saveSelection();
        setLinkUrl('');
        setPopover(popover === 'link' ? null : 'link');
      }

      function applyLink() {
        setPopover(null);
        const raw = (linkUrl || '').trim();
        if (!raw) return;
        const url = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : 'https://' + raw;
        runCommand('createLink', url);
        setLinkUrl('');
      }

      function selectBackground(id) {
        setData((d) => ({ ...d, background: id }));
        setPopover(null);
      }

      function createCategory(parentId) {
        const name = (window.prompt(t('categoryNamePlaceholder')) || '').trim();
        if (!name) return;
        const cat = { id: uid(), name, parentId: parentId || null };
        setData((d) => ({ ...d, categories: [...d.categories, cat] }));
      }

      function renameCategory(id) {
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;
        const name = (window.prompt(t('categoryNamePlaceholder'), cat.name) || '').trim();
        if (!name) return;
        setData((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, name } : c)) }));
      }

      function deleteCategory(id) {
        if (!window.confirm(t('categoryDeleteConfirm'))) return;
        setData((d) => ({
          ...d,
          categories: d.categories.filter((c) => c.id !== id && c.parentId !== id),
          notes: d.notes.map((n) => (n.categoryId === id ? { ...n, categoryId: null } : n)),
        }));
        setCollapsedCategoryIds((prev) => prev.filter((x) => x !== id));
        if (categoryFilter === id) setCategoryFilter('all');
      }

      function moveNote(id, categoryId) {
        setData((d) => ({ ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, categoryId, updatedAt: Date.now() } : n)) }));
      }

      function toggleCategoryCollapsed(id) {
        setCollapsedCategoryIds((prev) => {
          const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          writeCollapsedCats(next);
          return next;
        });
      }

      function symbolCell(sym, key) {
        return h('button', {
          key, type: 'button', className: 'dshn-symbol',
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => insertSymbol(sym),
        }, sym);
      }

      function symbolPopover() {
        const tab = SYMBOL_TABS.find((x) => x.key === symbolTab) || SYMBOL_TABS[0];
        return h('div', { className: 'dshn-popover dshn-popover-symbols' },
          recentSymbols.length > 0
            ? h('div', { className: 'dshn-sym-section' },
                h('div', { className: 'dshn-symbol-cat' }, '最近使用'),
                h('div', { className: 'dshn-symbol-grid', style: { gridTemplateColumns: 'repeat(10, 1fr)' } },
                  recentSymbols.map((sym) => symbolCell(sym, 'recent-' + sym))))
            : null,
          h('div', { className: 'dshn-sym-tabs' },
            SYMBOL_TABS.map((tb) => h('button', {
              key: tb.key, type: 'button',
              className: 'dshn-sym-tab' + (tb.key === tab.key ? ' is-active' : ''),
              onMouseDown: (e) => e.preventDefault(),
              onClick: () => setSymbolTab(tb.key),
            }, tb.label))),
          h('div', null,
            tab.sections.map((section) => h('div', { key: section.key, className: 'dshn-sym-section' },
              h('div', { className: 'dshn-symbol-cat' }, section.label),
              splitRows(section).map((rowSymbols, ri) => h('div', {
                key: section.key + '-' + ri,
                className: 'dshn-symbol-grid',
                style: { gridTemplateColumns: 'repeat(' + section.cols + ', 1fr)' },
              }, rowSymbols.map((sym) => symbolCell(sym, section.key + sym))))))));
      }

      function colorPopover(mode) {
        if (mode === 'hiliteColor') {
          return h('div', { className: 'dshn-popover' },
            h('div', { className: 'dshn-colorgrid' },
              HIGHLIGHT_COLORS.map((c) => h('button', {
                key: mode + c.bg, type: 'button', className: 'dshn-color',
                style: { background: c.bg },
                'aria-label': c.label, title: c.label,
                onMouseDown: (e) => e.preventDefault(),
                onClick: () => { setPopover(null); runCommand('hiliteColor', c.bg); runCommand('foreColor', c.fg); },
              }))));
        }
        return h('div', { className: 'dshn-popover' },
          h('div', { className: 'dshn-colorgrid' },
            FONT_COLORS.map((c) => h('button', {
              key: mode + c.hex, type: 'button', className: 'dshn-color',
              style: { background: c.hex },
              'aria-label': c.label, title: c.label,
              onMouseDown: (e) => e.preventDefault(),
              onClick: () => { setPopover(null); runCommand('foreColor', c.hex); },
            }))));
      }

      function fontSizePopover() {
        return h('div', { className: 'dshn-popover' },
          h('div', { className: 'dshn-sizemenu' },
            FONT_SIZES.map((size) => h('button', {
              key: size, type: 'button', className: 'dshn-size',
              onMouseDown: (e) => e.preventDefault(),
              onClick: () => { setPopover(null); applyFontSize(size + 'px'); },
            }, size))));
      }

      function backgroundPopover() {
        const custom = customHex(background);
        return h('div', { className: 'dshn-popover' },
          h('div', { className: 'dshn-swatches' },
            BACKGROUNDS.map((b) => h('div', { key: b.id, className: 'dshn-swatch-item' },
              h('button', {
                type: 'button', className: 'dshn-swatch' + (b.id === background ? ' is-active' : ''),
                'aria-label': t('bg.' + b.id), title: t('bg.' + b.id),
                style: { background: b.css },
                onMouseDown: (e) => e.preventDefault(),
                onClick: () => selectBackground(b.id),
              }),
              h('span', { className: 'dshn-swatch-label' }, t('bg.' + b.id))))),
          h('div', { className: 'dshn-custom-color' },
            h('input', {
              type: 'color', value: custom || '#fbf6e9',
              'aria-label': t('bg.custom'), title: t('bg.custom'),
              onChange: (e) => selectBackground('custom:' + e.target.value),
            }),
            h('span', null, t('bg.custom'))));
      }

      function linkPopover() {
        return h('div', { className: 'dshn-popover' },
          h('form', {
            className: 'dshn-linkform',
            onSubmit: (e) => { e.preventDefault(); applyLink(); },
          },
          h('input', {
            type: 'text', value: linkUrl, placeholder: t('linkPlaceholder'), autoFocus: true,
            'aria-label': t('linkUrl'),
            onChange: (e) => setLinkUrl(e.target.value),
          }),
          h('button', { type: 'submit', className: 'dshn-btn dshn-btn-primary' }, t('apply')),
          h('button', { type: 'button', className: 'dshn-btn', onClick: () => setPopover(null) }, t('cancel'))));
      }

      function exportNote(format) {
        if (!activeNote) return;
        setPopover(null);
        const title = activeNote.title || t('untitled');
        const safeName = (title || 'note').replace(/[\\/:*?"<>|]/g, '_');
        if (format === 'json') {
          download(safeName + '.json', JSON.stringify(activeNote, null, 2), 'application/json');
        } else if (format === 'html') {
          const doc = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>' + escapeHtml(title)
            + '</title><style>body{max-width:760px;margin:40px auto;font:16px/1.75 -apple-system,Segoe UI,Roboto,sans-serif;padding:0 20px;color:#1f2937}img{max-width:100%;border-radius:8px}blockquote{border-left:3px solid #ccc;margin:.6em 0;padding:4px 16px;color:#666}a{color:#4176e6}</style></head>'
            + '<body><h1>' + escapeHtml(title) + '</h1>' + (activeNote.html || '') + '</body></html>';
          download(safeName + '.html', doc, 'text/html');
        } else {
          download(safeName + '.md', '# ' + title + '\n\n' + htmlToMarkdown(activeNote.html || ''), 'text/markdown');
        }
      }

      function exportPopover() {
        const items = [
          { format: 'markdown', label: 'Markdown (.md)' },
          { format: 'html', label: 'HTML (.html)' },
          { format: 'json', label: 'JSON (.json)' }
        ];
        return h('div', { className: 'dshn-popover' },
          h('div', { className: 'dshn-sizemenu' },
            items.map((it) => h('button', {
              key: it.format, type: 'button', className: 'dshn-size',
              onMouseDown: (e) => e.preventDefault(),
              onClick: () => exportNote(it.format),
            }, it.label))));
      }

      function toolbar() {
        return h('div', { className: 'dshn-toolbar' },
          ToolButton({ title: t('undo'), onAction: () => runCommand('undo'), children: ICON_UNDO }),
          ToolButton({ title: t('redo'), onAction: () => runCommand('redo'), children: ICON_REDO }),
          Sep(),
          ToolButton({ title: t('bold'), onAction: () => runCommand('bold'), children: ICON_BOLD }),
          ToolButton({ title: t('italic'), onAction: () => runCommand('italic'), children: ICON_ITALIC }),
          ToolButton({ title: t('underline'), onAction: () => runCommand('underline'), children: ICON_UNDERLINE }),
          ToolButton({ title: t('strikethrough'), onAction: () => runCommand('strikeThrough'), children: ICON_STRIKE }),
          ToolButton({ title: t('fontColor'), onAction: () => { saveSelection(); setPopover(popover === 'foreColor' ? null : 'foreColor'); }, children: colorGlyph() }),
          ToolButton({ title: t('highlight'), onAction: () => { saveSelection(); setPopover(popover === 'hiliteColor' ? null : 'hiliteColor'); }, children: highlightGlyph() }),
          ToolButton({ title: t('fontSize'), onAction: () => { saveSelection(); setPopover(popover === 'fontSize' ? null : 'fontSize'); }, children: fontSizeGlyph() }),
          Sep(),
          ToolButton({ title: t('h1'), onAction: () => runCommand('formatBlock', 'h1'), children: ICON_H1 }),
          ToolButton({ title: t('h2'), onAction: () => runCommand('formatBlock', 'h2'), children: ICON_H2 }),
          ToolButton({ title: t('h3'), onAction: () => runCommand('formatBlock', 'h3'), children: ICON_H3 }),
          ToolButton({ title: t('paragraph'), onAction: () => runCommand('formatBlock', 'p'), children: ICON_PARAGRAPH }),
          ToolButton({ title: t('quote'), onAction: () => runCommand('formatBlock', 'blockquote'), children: ICON_QUOTE }),
          Sep(),
          ToolButton({ title: t('bulletList'), onAction: () => runCommand('insertUnorderedList'), children: ICON_UL }),
          ToolButton({ title: t('orderedList'), onAction: () => runCommand('insertOrderedList'), children: ICON_OL }),
          Sep(),
          ToolButton({ title: t('insertImage'), onAction: pickImage, children: imageGlyph(16) }),
          ToolButton({ title: t('insertLink'), onAction: openLink, children: linkGlyph(16) }),
          ToolButton({ title: t('removeLink'), onAction: () => runCommand('unlink'), children: unlinkGlyph(16) }),
          ToolButton({ title: t('insertSymbol'), onAction: () => { saveSelection(); setPopover(popover === 'symbol' ? null : 'symbol'); }, children: h('span', { style: { fontWeight: 600, fontSize: 15 } }, 'Ω') }),
          ToolButton({
            title: t('background'),
            onAction: () => setPopover(popover === 'background' ? null : 'background'),
            children: h('span', { style: { width: 15, height: 15, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', background: bg.css } }),
          }),
          ToolButton({ title: t('export'), onAction: () => setPopover(popover === 'export' ? null : 'export'), children: ICON_EXPORT }),
          Sep(),
          ToolButton({ title: t('clearFormat'), onAction: () => runCommand('removeFormat'), children: ICON_CLEAR }),
          popover === 'foreColor' ? colorPopover('foreColor') : null,
          popover === 'hiliteColor' ? colorPopover('hiliteColor') : null,
          popover === 'fontSize' ? fontSizePopover() : null,
          popover === 'symbol' ? symbolPopover() : null,
          popover === 'background' ? backgroundPopover() : null,
          popover === 'export' ? exportPopover() : null,
          popover === 'link' ? linkPopover() : null);
      }

      function header() {
        return h('div', { className: 'dshn-header' },
          h('div', { className: 'dshn-header-mark' }, noteGlyph(18)),
          h('div', null,
            h('div', { className: 'dshn-header-title' }, t('panel')),
            h('div', { className: 'dshn-header-sub' }, t('headerSub'))),
          h('div', { className: 'dshn-header-spacer' }),
          h('button', { type: 'button', className: 'dshn-btn dshn-btn-primary', onClick: createNote }, plusGlyph(14), t('newNote')));
      }

      function catRow(filterKey, label, depth, node, hasChildren, collapsed, onToggle) {
        const active = categoryFilter === filterKey;
        return h('div', {
          key: filterKey,
          className: 'dshn-cat-row' + (active ? ' is-active' : ''),
          style: { paddingLeft: (8 + depth * 14) + 'px' },
          onClick: () => setCategoryFilter(filterKey),
        },
        hasChildren
          ? h('button', { type: 'button', className: 'dshn-cat-toggle', title: collapsed ? t('expandCategory') : t('collapseCategory'), onClick: (e) => { e.stopPropagation(); onToggle(); } }, collapsed ? '▸' : '▾')
          : h('span', { className: 'dshn-cat-toggle', 'aria-hidden': true }),
        h('span', { className: 'dshn-cat-name' }, label),
        h('span', { className: 'dshn-cat-actions' },
          node
            ? h('button', { type: 'button', className: 'dshn-cat-btn', title: t('addSubcategory'), onClick: (e) => { e.stopPropagation(); createCategory(node.category.id); } }, '+')
            : null,
          node
            ? h('button', { type: 'button', className: 'dshn-cat-btn', title: t('rename'), onClick: (e) => { e.stopPropagation(); renameCategory(node.category.id); } }, '✎')
            : null,
          node
            ? h('button', { type: 'button', className: 'dshn-cat-btn', title: t('deleteCategory'), onClick: (e) => { e.stopPropagation(); deleteCategory(node.category.id); } }, '×')
            : null));
      }

      function renderCategoryNodes(nodes, depth) {
        return nodes.map((node) => {
          const hasChildren = node.children.length > 0;
          const collapsed = collapsedCategoryIds.includes(node.category.id);
          const rows = [catRow(node.category.id, node.category.name, depth, node, hasChildren, collapsed, () => toggleCategoryCollapsed(node.category.id))];
          if (!collapsed) rows.push(...renderCategoryNodes(node.children, depth + 1));
          return rows;
        });
      }

      function categoryPane() {
        return h('div', { className: 'dshn-cats' },
          h('div', { className: 'dshn-cats-header' },
            h('span', null, t('categories')),
            h('button', { type: 'button', className: 'dshn-cat-btn', title: t('addCategory'), onClick: () => createCategory(null) }, '+')),
          catRow('all', t('allNotes'), 0, null, false, false, null),
          catRow('none', t('uncategorized'), 0, null, false, false, null),
          renderCategoryNodes(buildCategoryTree(categories), 0));
      }

      function listPane() {
        return h('div', { className: 'dshn-list' },
          categoryPane(),
          h('div', { className: 'dshn-list-divider' }),
          visibleNotes.length === 0
            ? h('div', { className: 'dshn-list-empty' }, t('emptyState'))
            : visibleNotes.map((n) => {
              const isActive = activeNote && activeNote.id === n.id;
              return h('div', {
                key: n.id,
                className: 'dshn-note' + (isActive ? ' is-active' : ''),
                onClick: () => selectNote(n.id),
              },
              h('div', { className: 'dshn-note-title' }, n.title || t('untitled')),
              h('div', { className: 'dshn-note-preview' }, n.preview || ''),
              h('div', { className: 'dshn-note-meta' },
                h('span', null, formatRelativeTime(n.updatedAt)),
                h('button', { type: 'button', className: 'dshn-note-del', 'aria-label': t('deleteNote'), onClick: (e) => deleteNote(e, n.id) }, '×')));
            }));
      }

      function editorPane() {
        if (!activeNote) {
          return h('div', { className: 'dshn-editor' },
            h('div', { className: 'dshn-empty' },
              noteGlyph(48),
              h('div', null, t('emptyState'))));
        }
        return h('div', { className: 'dshn-editor' },
          h('div', { className: 'dshn-title-row' },
            h('input', {
              className: 'dshn-title', type: 'text', placeholder: t('titlePlaceholder'),
              value: activeNote.title, onChange: (e) => updateTitle(e.target.value),
            }),
            h('select', {
              className: 'dshn-cat-select',
              value: activeNote.categoryId || '',
              'aria-label': t('category'), title: t('category'),
              onChange: (e) => moveNote(activeNote.id, e.target.value || null),
            },
              h('option', { value: '' }, t('uncategorized')),
              flattenCategories(categories).map((c) => h('option', { key: c.id, value: c.id }, '\u3000'.repeat(c.depth) + c.name))),
            h('span', { className: 'dshn-save-state', 'data-save-state': saveState },
              saveState === 'dirty' ? t('unsaved') : savedAt ? t('saved') + ' ' + savedAt : t('saved'))),
          toolbar(),
          h('div', { className: 'dshn-editor-surface' },
            h('div', {
              className: 'dshn-content',
              ref: editorRef,
              contentEditable: true,
              suppressContentEditableWarning: true,
              style: { background: bg.css, color: bg.color },
              onInput: onEditorInput,
              onPaste: onPaste,
              onKeyDown: onEditorKeyDown,
              onKeyUp: saveSelection,
              onMouseUp: saveSelection,
            })),
          h('input', { type: 'file', ref: fileInputRef, accept: 'image/*', style: { display: 'none' }, onChange: onImageFile }));
      }

      return h('div', { className: 'dshn-root' },
        h('style', null, CSS),
        popover ? h('div', { className: 'dshn-backdrop', onMouseDown: () => setPopover(null) }) : null,
        header(),
        h('div', { className: 'dshn-body' }, listPane(), editorPane()));
    }

    // ---- plugin entry -----------------------------------------------------

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'dsh-notes: dictionaries');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, NotesApp));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PANEL_ID, order: 20, label: () => t('panel'), locale: NS,
        }, NotesIcon));
      },
    };
  },
});
