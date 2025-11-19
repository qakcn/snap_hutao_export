// 精简的前端逻辑：
// - 初始化 sql.js（依赖 public/sql-wasm.js 注入的 window.initSqlJs）
// - 读取本地上传的 .db 文件并加载为 SQLite 数据库
// - 点击“导出”按钮执行指定 SQL 并把结果以 JSON 下载
let SQL, db = null;
const fileInput = document.getElementById('file');
const exportAchievementsBtn = document.getElementById('exportAchievements');
const selectFileBtn = document.getElementById('selectFile');
const fileInfoOutput = document.getElementById('fileInfo');

function appendLog(msg) { const el = document.getElementById('results'); if (el) el.innerHTML += `<div>${msg}</div>`; else console.log(msg); }
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

    if (exportAchievementsBtn) exportAchievementsBtn.disabled = true;
    if (exportAchievementsBtn) {
        exportAchievementsBtn.addEventListener('click', async () => {
            if (!db) return appendLog('请先上传数据库文件');
            appendLog('开始导出...');
            try {
                // 检查是否存在 achievements 表
                const tRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='achievements'");
                const hasAchievements = (tRes && tRes.length > 0 && tRes[0].values && tRes[0].values.length > 0);

                let list = [];
                if (hasAchievements) {
                    // 按照指定字段查询并映射列名
                    list = queryToObjects("SELECT Id AS id, unixepoch(Time) AS timestamp, Current AS current, Status AS status FROM achievements");
                }

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
                appendLog('导出完成：已生成 JSON 文件');
            } catch (e) { appendLog('导出失败：' + (e && e.message ? e.message : e)); }
        });
    }
}

function openDbFromArrayBuffer(ab) {
    try { const u8 = new Uint8Array(ab); db = new SQL.Database(u8); appendLog('已加载 DB（字节长度：' + u8.length + '）'); if (exportAchievementsBtn) exportAchievementsBtn.disabled = false; } catch (e) { appendLog('打开 DB 失败：' + (e && e.message ? e.message : e)); }
}

function queryToObjects(sql) { try { const res = db.exec(sql); if (!res || res.length === 0) return []; const first = res[0]; const cols = first.columns; const values = first.values; return values.map(r => { const obj = {}; for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i]; return obj; }); } catch (e) { return []; } }

initSqlJsAndUI();

