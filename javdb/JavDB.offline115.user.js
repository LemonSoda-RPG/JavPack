// ==UserScript==
// @name            JavDB.offline115
// @namespace       JavDB.offline115@blc
// @version         0.0.1
// @author          blc
// @description     115 网盘离线
// @match           https://javdb.com/v/*
// @match           https://captchaapi.115.com/*
// @icon            https://javdb.com/favicon.ico
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Util.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.UtilDB.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Req.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Req115.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Util115.lib.js
// @resource        success https://github.com/bolin-dev/JavPack/raw/main/assets/success.png
// @resource        error https://github.com/bolin-dev/JavPack/raw/main/assets/error.png
// @resource        warn https://github.com/bolin-dev/JavPack/raw/main/assets/warn.png
// @supportURL      https://t.me/+bAWrOoIqs3xmMjll
// @connect         jdbstatic.com
// @connect         javstore.net
// @connect         aliyuncs.com
// @connect         pixhost.to
// @connect         115.com
// @run-at          document-end
// @grant           GM_removeValueChangeListener
// @grant           GM_addValueChangeListener
// @grant           GM_getResourceURL
// @grant           GM_xmlhttpRequest
// @grant           GM_notification
// @grant           GM_addElement
// @grant           unsafeWindow
// @grant           GM_openInTab
// @grant           window.close
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_info
// @license         GPL-3.0-only
// @compatible      chrome last 2 versions
// @compatible      edge last 2 versions
// ==/UserScript==

(function () {
  const { host, pathname } = location;
  if (host === "captchaapi.115.com") return Util115.verifyAccount();

  const config = [
    {
      name: "云下载",
      color: "is-primary",
    },
    {
      name: "番号",
      dir: "番号/${prefix}",
      color: "is-link",
    },
    {
      name: "片商",
      dir: "片商/${maker}",
    },
    {
      name: "系列",
      dir: "系列/${series}",
      color: "is-success",
    },
    {
      type: "genres",
      name: "${genre}",
      dir: "类别/${genre}",
      match: ["屁股", "連褲襪", "巨乳", "亂倫"],
      color: "is-warning",
    },
    {
      type: "actors",
      name: "${actor}",
      dir: "演员/${actor}",
      exclude: ["♂"],
      color: "is-danger",
    },
  ];
  if (!config.length) return;

  const zhTxt = UtilDB.zhTxt;
  const crackTxt = UtilDB.crackTxt;
  const transToByte = UtilDB.useTransByte();
  const defaultMagnetOptions = UtilDB.defaultMagnetOptions();
  const defaultVerifyOptions = Util115.defaultVerifyOptions;

  function getActions(config, details, magnets) {
    return config
      .map(({ magnetOptions = {}, type = "plain", match = [], exclude = [], ...item }, index) => {
        const { name, dir = "云下载", rename = "${zh}${crack} ${code} ${title}" } = item;
        if (!name) return null;

        if (defaultMagnetOptions) magnetOptions = { ...defaultMagnetOptions, ...magnetOptions };
        const _magnets = UtilDB.parseMagnets(magnets, magnetOptions);
        const { max: magnetMax } = magnetOptions;

        if (type === "plain") {
          return {
            ...item,
            name: UtilDB.parseVar(name, details),
            dir: UtilDB.parseDir(dir, details),
            magnets: _magnets,
            magnetMax,
            rename,
            idx: 0,
            index,
          };
        }

        let classes = details[type];
        if (!classes?.length) return null;

        // eslint-disable-next-line max-nested-callbacks
        if (match.length) classes = classes.filter((item) => match.some((key) => item.includes(key)));
        // eslint-disable-next-line max-nested-callbacks
        if (exclude.length) classes = classes.filter((item) => !exclude.some((key) => item.includes(key)));
        if (!classes.length) return null;

        const typeItemKey = type.slice(0, -1);
        const typeItemTxt = "${" + typeItemKey + "}";

        return classes.map((cls, idx) => {
          cls = cls.replace(/♀|♂/, "").trim();
          const _details = { ...details, [typeItemKey]: cls };

          return {
            ...item,
            rename: rename.replaceAll(typeItemTxt, cls),
            name: UtilDB.parseVar(name, _details),
            dir: UtilDB.parseDir(dir, _details),
            magnets: _magnets,
            magnetMax,
            index,
            idx,
          };
        });
      })
      .flat()
      .filter((item) => Boolean(item) && item.dir.every(Boolean))
      .map(
        ({
          desc,
          clean = true,
          setHash = true,
          setCover = true,
          color = "is-info",
          verifyOptions = {},
          upload = ["cover"],
          tags = ["genres", "actors"],
          ...item
        }) => {
          if (defaultVerifyOptions) verifyOptions = { ...defaultVerifyOptions, ...verifyOptions };
          return {
            ...item,
            desc: desc ?? item.dir.join(" / "),
            verifyOptions,
            setCover,
            setHash,
            upload,
            color,
            clean,
            tags,
          };
        },
      );
  }

  UtilDB.setTabIcon();
  const { infoNode, regex, ...details } = UtilDB.getDetails();
  const { code } = details;
  const magnets = UtilDB.getMagnets();
  const actions = getActions(config, details, magnets);

  infoNode.insertAdjacentHTML(
    "beforeend",
    `<div class="panel-block">
      <div class="columns">
        <div class="column">
          <div id="x-offline" class="buttons are-small">
          ${actions
            .map(({ magnets, color, index, idx, desc, name }) => {
              const hidden = magnets.length ? "" : "is-hidden";
              return `
              <button class="button ${color} ${hidden}" data-index="${index}" data-idx="${idx}" title="${desc}">
                ${name}
              </button>`;
            })
            .join("")}
          </div>
        </div>
      </div>
    </div>`,
  );

  const offlineNode = infoNode.querySelector("#x-offline");
  offlineNode.addEventListener("click", (e) => offlineStart(e.target));

  const offlineStart = async (target, currIdx = 0) => {
    if (!target.classList.contains("button")) return;

    target.classList.add("is-loading");
    offlineNode.querySelectorAll("button").forEach((item) => {
      item.disabled = true;
    });

    const { errcode, surplus } = await Util115.lixianGetQuotaPackageInfo();

    if (errcode === 99) {
      UtilDB.notify({ text: "网盘未登录", icon: "error" });
      return offlineEnd();
    }

    if (surplus < 1) {
      UtilDB.notify({ text: "离线配额不足", icon: "error" });
      return offlineEnd();
    }

    const { index, idx } = target.dataset;
    const _index = actions.findIndex((item) => item.index === Number(index) && item.idx === Number(idx));
    let { magnets, cid, dir, ...action } = actions[_index];

    magnets = await filterMagnets(magnets.slice(currIdx, surplus));
    if (!magnets.length) {
      UtilDB.notify({ text: "网盘空间不足", icon: "error" });
      return offlineEnd();
    }

    // eslint-disable-next-line eqeqeq, no-eq-null
    if (cid == null) {
      cid = await Util115.generateCid(dir);

      // eslint-disable-next-line eqeqeq, no-eq-null
      if (cid == null) {
        UtilDB.notify({ text: "生成下载目录 id 失败", icon: "error" });
        return offlineEnd();
      }

      actions[_index].cid = cid;
    }

    UtilDB.setTabBar(`${code} 离线任务中...`);
    const res = await handleSmartOffline({ magnets, cid, action });

    if (res.code === 0) {
      UtilDB.notify({ text: res.msg, icon: "success" });
      UtilDB.setTabBar({ text: `${code} 离线成功`, icon: "success" });
      UtilDB.getWindow("matchCode", "match115")?.();
      return offlineEnd();
    }

    if (res.code !== 911) {
      UtilDB.notify({ text: res.msg, icon: "warn" });
      UtilDB.setTabBar({ text: `${code} 离线失败`, icon: "warn" });
      return offlineEnd();
    }

    UtilDB.setTabBar({ text: `${code} 离线验证中...`, icon: "warn" });

    if (GM_getValue("VERIFY_STATUS") !== "pending") {
      GM_setValue("VERIFY_STATUS", "pending");
      UtilDB.notify({ text: "网盘待验证", icon: "warn" });
      UtilDB.openTab(`https://captchaapi.115.com/?ac=security_code&type=web&cb=Close911_${new Date().getTime()}`);
    }

    // eslint-disable-next-line max-params
    const listener = GM_addValueChangeListener("VERIFY_STATUS", (name, old_value, new_value, remote) => {
      if (!remote || !["verified", "failed"].includes(new_value)) return;
      GM_removeValueChangeListener(listener);
      if (new_value !== "verified") return offlineEnd();
      offlineStart(target, res.currIdx);
    });
  };

  function filterMagnets(magnets) {
    return Util115.offlineSpace().then(({ size }) => {
      const spaceSize = parseFloat(transToByte(size));
      return magnets.filter((item) => parseFloat(item.size) < spaceSize);
    });
  }

  async function handleSmartOffline({ magnets, cid, action }) {
    const { verifyOptions, magnetMax, setHash, rename, tags, clean, upload, setCover } = action;
    const res = { code: 0, msg: "" };

    let verifyFile = (file) => regex.test(file.n);
    if (verifyOptions.requireVdi) verifyFile = (file) => regex.test(file.n) && file.hasOwnProperty("vdi");

    const taskList = [];
    const taskLenMax = magnetMax - 1;

    for (let index = 0, { length } = magnets; index < length; index++) {
      if (taskList.length > taskLenMax) break;
      taskList.push(index);

      const { url, zh, crack } = magnets[index];
      const { state, errcode, error_msg, info_hash } = await Util115.lixianAddTaskUrl(url, cid);
      if (!state) {
        if (errcode === 10008 && index !== length - 1) {
          taskList.pop();
          continue;
        }
        res.code = errcode;
        res.msg = error_msg;
        res.currIdx = index;
        break;
      }

      const { file_id, videos } = await Util115.verifyTask(info_hash, verifyFile, verifyOptions.max);
      if (!videos.length) {
        if (verifyOptions.clean) {
          Util115.lixianTaskDel([info_hash]);
          if (file_id) Util115.rbDelete([file_id], cid);
        }
        res.code = 1;
        res.msg = "离线验证失败";
        continue;
      } else {
        res.code = 0;
        res.msg = "离线成功";
      }

      if (setHash) Util115.filesEditDesc(videos, info_hash);

      const srt = await handleFindSrt(file_id);
      const files = srt ? [srt, ...videos] : videos;

      if (rename) handleRename({ rename, zh, crack, file_id, files });

      if (tags?.length) handleTags({ tags, videos });

      await handleMove({ files, file_id });

      if (clean) await handleClean({ files, file_id });

      if (upload?.length) {
        res.msg += "，上传图片中...";
        handleUpload({ upload, file_id }).then(([coverRes]) => {
          UtilDB.notify({ text: "上传结束", icon: "success", tag: "upload" });
          if (setCover && upload.includes("cover")) handleCover(coverRes.value?.data);
        });
      }

      break;
    }

    return res;
  }

  async function handleFindSrt(file_id) {
    const { data } = await Util115.filesByOrder(file_id, { suffix: "srt" });
    return data.find(({ n }) => regex.test(n));
  }

  function handleRename({ rename, zh, crack, file_id, files }) {
    rename = UtilDB.parseVar(rename, { ...details, zh: zh ? zhTxt : "", crack: crack ? crackTxt : "" });
    if (!regex.test(rename)) rename = `${code} ${rename}`;

    const renameObj = { [file_id]: rename };

    const icoMap = files.reduce((acc, { ico, ...item }) => {
      acc[ico] ??= [];
      acc[ico].push(item);
      return acc;
    }, {});

    for (const [ico, items] of Object.entries(icoMap)) {
      if (items.length === 1) {
        renameObj[items[0].fid] = `${rename}.${ico}`;
        continue;
      }

      items
        .toSorted((a, b) => a.n.localeCompare(b.n))
        .forEach(({ fid }, idx) => {
          const no = `${idx + 1}`.padStart(2, "0");
          renameObj[fid] = `${rename}.${no}.${ico}`;
        });
    }

    Util115.filesBatchRename(renameObj);
  }

  function handleTags({ tags, videos }) {
    tags = tags
      .map((key) => details[key])
      .flat()
      .filter(Boolean);

    Util115.filesBatchLabelName(videos, tags);
  }

  function handleMove({ files, file_id }) {
    const mv_fids = files.filter((item) => item.cid !== file_id).map((item) => item.fid);
    if (mv_fids.length) return Util115.filesMove(mv_fids, file_id);
  }

  async function handleClean({ files, file_id }) {
    const { data } = await Util115.filesByOrder(file_id);

    const rm_fids = data
      .filter((item) => !files.some(({ fid }) => fid === item.fid))
      .map((item) => item.fid ?? item.cid);

    if (rm_fids.length) return Util115.rbDelete(rm_fids, file_id);
  }

  function handleUpload({ upload, file_id: cid }) {
    const reqList = [];

    if (upload.includes("cover")) {
      let url = document.querySelector(".video-cover")?.src;
      if (!url) url = document.querySelector(".column-video-cover video")?.poster;
      reqList.push(() => Util115.handleUpload({ cid, url, filename: `${code}.cover.jpg` }));
    }

    if (upload.includes("sprite")) {
      const url = localStorage.getItem(`sprite_${pathname.split("/").pop()}`);
      if (url) reqList.push(() => Util115.handleUpload({ cid, url, filename: `${code}.sprite.jpg` }));
    }

    return Promise.allSettled(reqList.map((fn) => fn()));
  }

  function handleCover({ cid: fid, file_id: fid_cover }) {
    return Util115.filesEdit({ fid, fid_cover });
  }

  const offlineEnd = () => {
    offlineNode.querySelectorAll("button").forEach((item) => {
      item.classList.remove("is-loading");
      item.disabled = false;
    });
  };

  const callback = () => {
    const _magnets = UtilDB.getMagnets();
    if (_magnets.length === magnets.length) return;

    const _actions = getActions(config, details, _magnets);
    if (!_actions.length) return;

    _actions.forEach(({ magnets, index, idx }) => {
      if (!magnets.length) return;

      actions[actions.findIndex((ac) => ac.index === index && ac.idx === idx)].magnets = magnets;
      offlineNode.querySelector(`button[data-index="${index}"][data-idx="${idx}"]`).classList.remove("is-hidden");
    });
  };
  const observer = new MutationObserver(callback);

  const target = document.querySelector("#magnets-content");
  const options = { childList: true, attributes: false, characterData: false };
  observer.observe(target, options);
})();
