class Util {
  static upLocal() {
    const date = new Date().getDate();
    if (localStorage.getItem("CD") === date.toString()) return;
    localStorage.clear();
    localStorage.setItem("CD", date);
  }

  static upStore() {
    const date = new Date().getDate();
    if (GM_getValue("CD") === date) return;
    GM_listValues().forEach((key) => GM_deleteValue(key));
    GM_setValue("CD", date);
  }

  static codeParse(code) {
    const codes = code.split(/-|_/);
    const sep = "\\s?(0|-|_){0,2}\\s?";

    let pattern = codes.join(sep);
    if (/^fc2/i.test(code)) pattern = `${codes[0]}${sep}(ppv)?${sep}${codes.at(-1)}`;
    if (/^heyzo/i.test(code)) pattern = `${codes[0]}${sep}(\\w){0,2}${sep}${codes.at(-1)}`;

    return {
      codes,
      prefix: codes[0],
      regex: new RegExp(`(?<![a-z])${pattern}(?!\\d)`, "i"),
    };
  }

  static setTabBar({ text, icon }) {
    if (text) document.title = text;
    if (!icon) return;

    const href = GM_getResourceURL(icon);
    document.querySelectorAll("link[rel*='icon']").forEach((item) => item.setAttribute("href", href));
  }
}
