// 精简的前端逻辑：
// - 初始化 sql.js（依赖 public/sql-wasm.js 注入的 window.initSqlJs）
// - 读取本地上传的 .db 文件并加载为 SQLite 数据库
// - 点击“导出”按钮执行指定 SQL 并把结果以 JSON 下载
let SQL, db = null;
const fileInput = document.getElementById('file');
const exportAchievementsBtn = document.getElementById('exportAchievements');
const selectFileBtn = document.getElementById('selectFile');
const fileInfoOutput = document.getElementById('fileInfo');
const achievementsSect = document.getElementById('achievements-sect');
const gachaSect = document.getElementById('gacha-sect');
const exportGachaBtn = document.getElementById('exportGacha');
const uidSelect = document.getElementById('uid-select');

/** 简单的页面日志输出（如果页面有 #results 则写入，否则写 console） */
function appendLog(message) {
  const el = document.getElementById('results');
  if (el) {
    el.innerHTML += `<div>${message}</div>`;
  } else {
    console.log(message);
  }
}
async function initSqlJsAndUI() {
    try {
        if (typeof initSqlJs !== 'function') {
            appendLog('警告：`sql-wasm.js` 尚未加载，确保页面中先加载 `sql-wasm.js`。');
            await new Promise(r => setTimeout(r, 200));
        }
        SQL = await window.initSqlJs({ locateFile: file => './sql-wasm.wasm' });
        appendLog('sql.js 已加载（WASM，本地）');
    } catch (e) {
        appendLog('初始化 sql.js 失败：' + (e && e.message ? e.message : e));
        return;
    }

    if (fileInput) {
        fileInput.addEventListener('change', ev => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            fileInfoOutput.innerText = '已选择文件：'+f.name;
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
            appendLog('开始导出成就...');
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
                appendLog('导出成就完成：已生成 JSON 文件');
            } catch (e) {
                appendLog('导出成就失败：' + (e && e.message ? e.message : e));
            }
        });
    }

    if (exportGachaBtn) {
        exportGachaBtn.addEventListener('click', async () => {
            appendLog('开始导出抽卡数据...');
            try {
                let list = [];

                 const nodes = document.querySelectorAll('input[name="gachaUid"]:checked');

                const values = Array.from(nodes, el => el.value);
                const uids = JSON.parse(exportGachaBtn.dataset.uids);
                const gachaList = [];

                values.forEach(innerid => {
                    const uid = uids[innerid];
                    // 按照指定字段查询并映射列名
                    const timestr = queryToObjects("SELECT Time FROM gacha_items WHERE ArchiveId='"+innerid+"'")[0].Time;

                    const timezone = extractTimezoneHour(timestr);

                    list = queryToObjects("SELECT CAST(QueryType AS TEXT) AS uigf_gacha_type, CAST(GachaType AS TEXT) as gacha_type, CAST(ItemId AS TEXT) AS item_id, substr(Time,1,19) AS time, CAST(Id AS TEXT) AS id FROM gacha_items WHERE ArchiveId='"+innerid+"'");
                    
                    list = list.map(it => ({
                        ...it,
                        ...gachaData[it.item_id],
                        count: "1",
                    }));

                    const gachaObj = {
                        uid: uid,
                        timezone: timezone,
                        lang: "zh-cn",
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
                appendLog('导出抽卡数据完成：已生成 JSON 文件');
            } catch (e) {
                appendLog('导出抽卡数据失败：' + (e && e.message ? e.message : e));
            }
        });
    }
}

function openDbFromArrayBuffer(ab) {
    try {
        const u8 = new Uint8Array(ab);
        db = new SQL.Database(u8);
        appendLog('已加载 DB（字节长度：' + u8.length + '）');
        initAchievementsExport();
        initGachaExport();
    } catch (e) {
        appendLog('打开 DB 失败：' + (e && e.message ? e.message : e));
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
        appendLog('初始化成就导出失败：' + (e && e.message ? e.message : e));
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
        appendLog('初始化抽卡数据导出失败：' + (e && e.message ? e.message : e));
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

initSqlJsAndUI();

