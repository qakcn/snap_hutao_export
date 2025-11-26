// 精简的前端逻辑：
// - 初始化 sql.js（依赖 public/sql-wasm.js 注入的 window.initSqlJs）
// - 读取本地上传的 .db 文件并加载为 SQLite 数据库
// - 点击“导出”按钮执行指定 SQL 并把结果以 JSON 下载
let SQL, db = null;
const dispLangSel = document.getElementById('display-lang-select');
const fileInput = document.getElementById('file');
const exportAchievementsBtn = document.getElementById('exportAchievements');
const selectFileBtn = document.getElementById('selectFile');
const fileInfoOutput = document.getElementById('fileInfo');
const achievementsSect = document.getElementById('achievements-sect');
const gachaSect = document.getElementById('gacha-sect');
const exportGachaBtn = document.getElementById('exportGacha');
const uidSelect = document.getElementById('uid-select');
const langSelect = document.getElementById('lang-select');
let gachaData = {};


/** 简单的页面日志输出（如果页面有 #results 则写入，否则写 console） */
function appendLog(message) {
  const el = document.getElementById('results');
  if (el) {
    el.innerHTML += `<div>${message}</div>`;
  } else {
    console.log(message);
  }
}

async function initGachaData() {
    fetch('assets/gachaData.json')
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(json => {
        gachaData = json;
        appendLog(i18n.t('log_gacha_data_loaded'));
    })
    .catch(err => {
        appendLog(i18n.t('log_failed_gacha_data_load') + (err && err.message ? err.message : err));
    });
}

async function initSqlJsAndUI() {
    try {
        if (typeof initSqlJs !== 'function') {
            appendLog(i18n.t('log_wasm_warning'));
            await new Promise(r => setTimeout(r, 200));
        }
        SQL = await window.initSqlJs({ locateFile: file => './scripts/sql-wasm.wasm' });
        appendLog(i18n.t('log_sql_js_loaded'));
    } catch (e) {
        appendLog(i18n.t('log_failed_init_sql_js') + (e && e.message ? e.message : e));
        return;
    }

    if (fileInput) {
        fileInput.addEventListener('change', ev => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            fileInfoOutput.innerText = i18n.t('choose_file_chosen') + f.name;
            const reader = new FileReader();
            reader.onload = () => openDbFromArrayBuffer(reader.result);
            reader.readAsArrayBuffer(f); 
        });
    }

    if(selectFileBtn) {
        selectFileBtn.addEventListener('click', async () => {
            fileInput.click();
        })
    }

    if (exportAchievementsBtn) {
        exportAchievementsBtn.addEventListener('click', async () => {
            appendLog(i18n.t('log_begin_achievements_export'));
            try {
                let list = [];
                
                // 按照指定字段查询并映射列名
                list = queryToObjects("SELECT Id AS id, unixepoch(Time) AS timestamp, Current AS current, Status AS status FROM achievements");

                const exportObj = {
                    info: {
                        export_app: 'hutao_export',
                        export_app_version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
                        export_timestamp: Math.floor(Date.now() / 1000),
                        uiaf_version: 'v1.1'
                    },
                    list: list
                };

                const json = JSON.stringify(exportObj, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'hutao_export.Achievements.UIAF1.1.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                appendLog(i18n.t('log_achievements_exported'));
            } catch (e) {
                appendLog(i18n.t('log_failed_achievements_export') + (e && e.message ? e.message : e));
            }
        });
    }

    if (exportGachaBtn) {
        exportGachaBtn.addEventListener('click', async () => {
            appendLog(i18n.t('log_begin_gacha_data_export'));
            try {
                let list = [];

                 const uidNodes = document.querySelectorAll('input[name="gachaUid"]:checked');

                const uidValues = Array.from(uidNodes, el => el.value);
                const uids = JSON.parse(exportGachaBtn.dataset.uids);
                const langValue = langSelect.value;
                const gachaList = [];

                uidValues.forEach(innerid => {
                    const uid = uids[innerid];
                    // 按照指定字段查询并映射列名
                    const timestr = queryToObjects("SELECT Time FROM gacha_items WHERE ArchiveId='"+innerid+"'")[0].Time;

                    const timezone = extractTimezoneHour(timestr);

                    list = queryToObjects("SELECT CAST(QueryType AS TEXT) AS uigf_gacha_type, CAST(GachaType AS TEXT) as gacha_type, CAST(ItemId AS TEXT) AS item_id, substr(Time,1,19) AS time, CAST(Id AS TEXT) AS id FROM gacha_items WHERE ArchiveId='"+innerid+"'");
                    
                    list = list.map(it => ({
                        ...it,
                        name: gachaData[it.item_id].name[langValue],
                        rank_type: gachaData[it.item_id].rank_type,
                        item_type: gachaData[it.item_id].item_type,
                        count: "1"
                    }));

                    const gachaObj = {
                        uid: uid,
                        timezone: timezone,
                        lang: langValue,
                        list: list
                    }

                    gachaList.push(gachaObj);
                });

                const exportObj = {
                    info: {
                        export_app: 'hutao_export',
                        export_app_version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
                        export_timestamp: Math.floor(Date.now() / 1000),
                        version: 'v4.1'
                    },
                    hk4e: gachaList
                };

                const json = JSON.stringify(exportObj, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'hutao_export.Gacha.UIGF4.1.json'; document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                appendLog(i18n.t('log_gacha_data_exported'));
            } catch (e) {
                appendLog(i18n.t('log_failed_gacha_data_export') + (e && e.message ? e.message : e));
            }
        });
    }
}

function openDbFromArrayBuffer(ab) {
    try {
        const u8 = new Uint8Array(ab);
        db = new SQL.Database(u8);
        appendLog(i18n.t('log_db_loaded_size', {length: u8.length}));
        initAchievementsExport();
        initGachaExport();
    } catch (e) {
        appendLog(i18n.t('log_failed_db_load') + (e && e.message ? e.message : e));
    }
}

function initAchievementsExport() {
    try {
    // 检查是否存在 achievements 表
        const tRes1 = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='achievements'");

        if (tRes1 && tRes1.length > 0 && tRes1[0].values && tRes1[0].values.length > 0) {
            const tRes2 = db.exec("SELECT count(*) FROM achievements");
            if (tRes2 && tRes2.length > 0 && tRes2[0].values && tRes2[0].values[0] > 0) {
                achievementsSect.classList.remove('hidden');
                achievementsSect.classList.add('highlight');
                if (exportAchievementsBtn) exportAchievementsBtn.disabled = false;
                scrollToElement(achievementsSect);
            }
        }
    } catch(e) {
        appendLog(i18n.t('log_failed_init_achievements_export') + (e && e.message ? e.message : e));
    }

}

function initGachaExport(){
    try {
        const tRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='gacha_archives'");

        if (tRes && tRes.length > 0 && tRes[0].values && tRes[0].values.length > 0) {
            const uids = queryToObjects('SELECT InnerId,uid FROM gacha_archives');
            if (uids.length > 0) {
                uids.forEach(item =>{
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = 'gachaUid';
                    checkbox.value = item.InnerId;
                    checkbox.id = 'uid-'+item.InnerId;

                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.textContent = item.Uid;

                    const tdiv = document.createElement('div');
                    tdiv.appendChild(checkbox);
                    tdiv.appendChild(label);
                    uidSelect.appendChild(tdiv);
                });
                gachaSect.classList.remove('hidden');
                langSelectAuto();
                gachaSect.classList.add('highlight');
                if (exportGachaBtn) {
                    exportGachaBtn.disabled = false;
                    const map = uids.reduce((acc, item) => {
                        acc[item.InnerId] = item.Uid;
                        return acc;
                    }, {});
                    exportGachaBtn.dataset.uids = JSON.stringify(map);
                }
                if (achievementsSect.classList.contains('hidden')) {
                    scrollToElement(gachaSect);
                }
                
            }
        }
    } catch(e) {
        appendLog(i18n.t('log_failed_init_gacha_data_export') + (e && e.message ? e.message : e));
    }
}

function queryToObjects(sql) {
    try {
        const res = db.exec(sql);
        if (!res || res.length === 0) return [];
        const first = res[0];
        const cols = first.columns;
        const values = first.values;
        return values.map(r => {
            const obj = {};
            for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i];
            return obj;
        });
    } catch (e) {
        return [];
    }
}

function extractTimezoneHour(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  // 匹配尾部的时区：+HH, +HH:MM, -HH, -HH:MM 或 Z
  if (/\bZ\s*$/.test(s)) return 0;
  const m = s.match(/([+-])(\d{2})(?::?(\d{2}))?\s*$/);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const hours = parseInt(m[2], 10);
  return sign * hours; // 忽略分钟，只返回小时整数部分
}

function scrollToElement(el) {
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  return true;
}

const i18n = {
  locale: null,
  messages: {},
  async load(locale) {
    this.locale = locale;
    try {
      // 使用绝对路径 /locales/，避免相对路径歧义
      const resp = await fetch(`assets/locales/${locale}.json`);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      this.messages = await resp.json();
    } catch (e) {
      console.warn('i18n load failed', e);
      this.messages = {};
    }
  },
  // 简单文本取回 + 占位符替换 {name}
  t(key, vars = {}) {
    let s = this.messages[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
  }
};

// 把 data-i18n 应用到页面
function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr'); // optional
    const rawVars = el.getAttribute('data-i18n-vars'); // e.g. '{"name":"Alice"}'
    let vars = {};
    if (rawVars) {
      try { vars = JSON.parse(rawVars); } catch(e){/* ignore */ }
    }
    const text = i18n.t(key, vars);
    if (attr) el.setAttribute(attr, text); else el.textContent = text;
  });
}

async function initLocale() {
  const saved = localStorage.getItem('locale');
  const nav = (navigator.language || 'zh-cn').toLowerCase();
  const defaultLocale = saved || (nav.startsWith('en') ? 'en' : 'zh-cn');

  await i18n.load(defaultLocale);
  applyTranslations();

  // set html lang and direction
  document.documentElement.lang = defaultLocale;
  document.documentElement.dir = (defaultLocale === 'ar' || defaultLocale === 'he') ? 'rtl' : 'ltr';
}

async function switchLocale(locale) {
  await i18n.load(locale);
  applyTranslations();
  localStorage.setItem('locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = (locale === 'ar' || locale === 'he') ? 'rtl' : 'ltr';
  langSelectAuto();
}

function langSelectAuto(){
    const locale=i18n.locale;
    switch(locale) {
        case 'en':
            langSelect.value="en-us";
            break;
        case 'ja':
            langSelect.value="ja-jp";
            break;
        case 'ko':
            langSelect.value="ko-kr";
            break;
        case 'ru':
            langSelect.value="ru-ru";
            break;
        case "zh-hk":
            langSelect.value="zh-hk";
            break;
        case "zh-cn":
            langSelect.value="zh-cn";
            break;
  }
}

// 绑定选择器（假设有 #lang-select）
if (dispLangSel) {
  dispLangSel.value = localStorage.getItem('locale') || '';
  dispLangSel.addEventListener('change', e => switchLocale(e.target.value));
}

// 在应用启动时调用
initLocale();
initSqlJsAndUI();
initGachaData();

