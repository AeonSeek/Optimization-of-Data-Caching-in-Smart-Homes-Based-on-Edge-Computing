require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // 引入 sqlite3
const fetch = require('node-fetch'); // 引入 node-fetch
// const OpenAI = require('openai'); // Comment out or remove OpenAI
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Import Google SDK

// Initialize OpenAI client (Comment out or remove)
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY, // 使用环境变量中的 API Key
// });

// Initialize Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"}); // Specify the model

const app = express();
const port = 3000; // 您可以选择其他端口

// --- 全局设定 (天气 API) ---
// !!! 重要：请替换为您自己的 OpenWeatherMap API Key !!!
// 您可以在 https://openweathermap.org/appid 免费注册获取
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const WEATHER_CITY = 'Harbin'; // Updated City
const WEATHER_UNITS = 'metric'; // 使用摄氏度
const WEATHER_LANG = 'zh_cn'; // 使用简体中文

// 数据库设定
const dbPath = path.join(__dirname, '../database/smarthome.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接错误:', err.message);
    } else {
        console.log('成功连接到 SQLite 数据库.');
        db.serialize(() => {
            // 使用 serialize 确保顺序执行
            // 建立 users 表 (如果不存在)
            db.run(
                `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`,
                (err) => {
                    if (err) {
                        console.error('创建 users 表错误:', err.message);
                    } else {
                        // 插入一个测试用户 (如果不存在)
                        const testUserSql =
                            'INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)';
                        db.run(
                            testUserSql,
                            ['testuser', 'password123'],
                            (err) => {
                                if (err) {
                                    console.error(
                                        '插入测试用户错误:',
                                        err.message
                                    );
                                }
                            }
                        );
                    }
                }
            );

            // 建立 devices 表 (如果不存在)
            db.run(
                `CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,       -- 例如：空调、冰箱、灯
                scene TEXT NOT NULL,      -- 例如：livingroom, bedroom
                data TEXT,              -- 存储 JSON 格式的设备数据，例如 {"temperature": 25, "status": "on"}
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
                (err) => {
                    if (err) {
                        console.error('创建 devices 表错误:', err.message);
                    } else {
                        // 插入一些范例设备数据 (仅在表为空时插入)
                        const checkEmptySql =
                            'SELECT COUNT(*) as count FROM devices';
                        db.get(checkEmptySql, (err, row) => {
                            if (err) {
                                console.error(
                                    '检查 devices 表错误:',
                                    err.message
                                );
                                return;
                            }
                            if (row.count === 0) {
                                console.log('初始化示例设备数据...');
                                const insertSql = `INSERT INTO devices (name, type, scene, data) VALUES (?, ?, ?, ?)`;
                                const devicesData = [
                                    // 客厅
                                    [
                                        '客厅空调',
                                        '空调',
                                        'livingroom',
                                        JSON.stringify({
                                            温度: 24,
                                            模式: '制冷',
                                        }),
                                    ],
                                    [
                                        '客厅电视',
                                        '电视',
                                        'livingroom',
                                        JSON.stringify({
                                            状态: '开启',
                                            频道: 5,
                                        }),
                                    ],
                                    [
                                        '智能冰箱',
                                        '冰箱',
                                        'livingroom',
                                        JSON.stringify({
                                            冷藏温度: 4,
                                            冷冻温度: -18,
                                        }),
                                    ],
                                    [
                                        '客厅窗帘',
                                        '电动窗帘',
                                        'livingroom',
                                        JSON.stringify({ 状态: '关闭' }),
                                    ],
                                    [
                                        '智能门锁',
                                        '智能锁',
                                        'livingroom',
                                        JSON.stringify({ 状态: '已上锁' }),
                                    ],
                                    // 卧室
                                    [
                                        '卧室空调',
                                        '空调',
                                        'bedroom',
                                        JSON.stringify({
                                            温度: 26,
                                            模式: '睡眠',
                                        }),
                                    ],
                                    [
                                        '卧室投影仪',
                                        '投影仪',
                                        'bedroom',
                                        JSON.stringify({ 状态: '关闭' }),
                                    ],
                                    [
                                        '卧室窗帘',
                                        '电动窗帘',
                                        'bedroom',
                                        JSON.stringify({ 状态: '半开' }),
                                    ],
                                    // 厕所
                                    [
                                        '智能热水器',
                                        '热水器',
                                        'bathroom',
                                        JSON.stringify({
                                            温度: 45,
                                            状态: '加热中',
                                        }),
                                    ],
                                    [
                                        '智能马桶',
                                        '智能马桶',
                                        'bathroom',
                                        JSON.stringify({
                                            冲水模式: '自动',
                                            座圈温度: 30,
                                        }),
                                    ],
                                    // 阳台
                                    [
                                        '智能洗衣机',
                                        '洗衣机',
                                        'balcony',
                                        JSON.stringify({
                                            模式: '标准洗',
                                            剩余时间: '35分钟',
                                        }),
                                    ],
                                    [
                                        '智能晾衣杆',
                                        '智能晾衣杆',
                                        'balcony',
                                        JSON.stringify({
                                            状态: '下降',
                                            照明: '开启',
                                        }),
                                    ],
                                ];
                                const stmt = db.prepare(insertSql);
                                devicesData.forEach((device) => {
                                    stmt.run(device, (err) => {
                                        if (err)
                                            console.error(
                                                '插入示例设备错误:',
                                                err.message
                                            );
                                    });
                                });
                                stmt.finalize();
                            }
                        });
                    }
                }
            );
        });
    }
});

// 设定静态档案目录 (指向 public 目录)
// __dirname 是当前 server.js 所在的目录 (smart_home/server)
// path.join 会建立一个跨平台的正确路径 (smart_home/public)
app.use(express.static(path.join(__dirname, '../public')));

// 处理 JSON 请求体
app.use(express.json());

// --- 重定向根路径 ---
app.get('/', (req, res) => {
    res.redirect('/html/login.html'); // 更新为指向新的登录页面
});

// --- API 路由 ---

// 登录路由
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '请提供用户名和密码。' });
    }

    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error('登录查询错误:', err.message);
            return res.status(500).json({ message: '服务器内部错误。' });
        }
        if (row) {
            // 登录成功
            // 在实际应用中，这里应该创建一个 session 或 token
            res.status(200).json({ message: '登录成功。' });
        } else {
            // 登录失败
            res.status(401).json({ message: '用户名或密码错误。' });
        }
    });
});

// 注册路由
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '请提供用户名和密码。' });
    }

    // 注意：实际应用中，密码应该进行加密存储 (例如使用 bcrypt)
    // 这里为了简单起见，直接存储明文密码

    const checkUserSql = 'SELECT id FROM users WHERE username = ?';
    db.get(checkUserSql, [username], (err, row) => {
        if (err) {
            console.error('检查用户名是否存在错误:', err.message);
            return res.status(500).json({ message: '服务器内部错误。' });
        }
        if (row) {
            // 用户名已存在
            return res.status(409).json({ message: '用户名已被注册。' });
        }

        // 用户名可用，插入新用户
        const insertSql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.run(insertSql, [username, password], function(err) { // 使用 function 获取 this.lastID
            if (err) {
                console.error('注册用户错误:', err.message);
                return res.status(500).json({ message: '注册失败，请稍后再试。' });
            }
            console.log(`新用户已注册: ${username} (ID: ${this.lastID})`);
            res.status(201).json({ message: '注册成功！' });
        });
    });
});

// 忘记密码路由 (第一步: 请求重设)
app.post('/forgot-password', (req, res) => {
    const { identifier } = req.body; // 可以是用户名或邮箱

    if (!identifier) {
        return res.status(400).json({ message: '请输入用户名或邮箱地址。' });
    }

    // TODO: 在实际应用中，需要区分用户名和邮箱，并可能需要验证邮箱格式

    const checkUserSql = 'SELECT id, username FROM users WHERE username = ?'; // 假设只用用户名查找
    db.get(checkUserSql, [identifier], (err, user) => {
        if (err) {
            console.error('忘记密码 - 查询用户错误:', err.message);
            // 即使出错，也返回通用成功消息
            return res.status(200).json({ message: '如果该账户存在，密码重设指示已发送。' });
        }

        if (user) {
            // --- 用户存在 --- 
            console.log(`用户 ${user.username} 请求重设密码。`);
            // TODO: 在这里实现以下逻辑：
            // 1. 生成一个唯一的、有时效的密码重置令牌 (token)
            // 2. 将令牌与用户 ID 关联存储 (例如，数据库新表或 users 表新增字段)
            // 3. 构建密码重置链接 (例如: http://yourdomain.com/reset-password?token=YOUR_TOKEN)
            // 4. 通过邮件服务将链接发送给用户的注册邮箱 (如果 users 表有邮箱字段)
            // 5. 如果没有邮箱，需要考虑其他验证方式或提示用户联系客服
            
            // 目前仅模拟发送成功
        }
         else {
            // --- 用户不存在 --- 
             console.log(`尝试为不存在的用户 ${identifier} 重设密码。`);
             // 不做任何操作，防止信息泄露
         }

        // 统一返回成功消息，不暴露用户是否存在
        res.status(200).json({ message: '如果该账户存在，密码重设指示已发送。' });
    });
});

// --- API 路由：获取系统状态 ---
app.get('/api/system-status', (req, res) => {
    console.log('Request received for /api/system-status');
    // 在这里可以添加更复杂的检查逻辑
    let dbStatus = '错误';
    let dbStatusClass = 'status-error';
    try {
        // 简单的数据库连接检查 (注意: 这并不能完全代表数据库健康状况)
        if (db && db.open) { 
            dbStatus = '正常';
            dbStatusClass = 'status-ok';
        }
    } catch(e) {
         console.error("Error checking DB status:", e);
    }
    
    const statusData = [
        {
            id: 'network',
            icon: '✔️',
            label: '网络连接',
            value: '正常', // 暂时硬编码
            statusClass: 'status-ok',
        },
        {
            id: 'database',
            icon: dbStatus === '正常' ? '💾' : '⚠️',
            label: '数据库服务',
            value: dbStatus, // Reverted: Only show status, not error detail
            statusClass: dbStatusClass,
        },
        {
            id: 'security',
            icon: '🔒',
            label: '安全系统',
            value: '设防', // 暂时硬编码
            statusClass: 'status-ok',
        },
         {
            id: 'last_checked',
            icon: '⏱️',
            label: '最后检查时间',
            value: new Date().toLocaleTimeString('zh-CN'), 
            statusClass: 'status-info', // 添加一个信息样式类
        },
    ];
    console.log('Returning system status:', statusData); // Keep one log for basic info
    res.json(statusData);
});

// API for AI Assistant Chat - Now uses Google Gemini
app.post('/api/chat', async (req, res) => { 
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'No message provided' });
    }

    console.log(`Received message for AI: ${userMessage}`);

    try {
        // --- Call Google Gemini API --- 
        const chat = model.startChat({
            // Optional: Add history or generationConfig here
            // history: [{ role: "user", parts: [{ text: "Hello" }] }, { role: "model", parts: [{ text: "Hi there!" }] }],
            // generationConfig: { maxOutputTokens: 100 }
        });
        
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const aiReply = response.text();

        if (aiReply) {
            console.log(`AI Reply (Gemini): ${aiReply}`);
            res.json({ reply: aiReply.trim() });
        } else {
            throw new Error('No reply content from Gemini');
        }

    } catch (error) {
        console.error("Error calling Google Gemini API:", error);
        res.status(500).json({ error: "Failed to get response from AI assistant." });
    }
});

// --- Helper 函数：从设备数据中提取温湿度 ---
function extractSceneData(devices) {
    let temp = null;
    let humidity = null;
    let status = '正常'; // 默认状态

    for (const device of devices) {
        if (!device.data) continue;
        try {
            const data =
                typeof device.data === 'string'
                    ? JSON.parse(device.data)
                    : device.data;
            if (
                temp === null &&
                (data['温度'] !== undefined || data['溫度'] !== undefined)
            ) {
                temp = data['温度'] ?? data['溫度'];
            }
            if (
                humidity === null &&
                (data['湿度'] !== undefined || data['濕度'] !== undefined)
            ) {
                humidity = data['湿度'] ?? data['濕度'];
            }
            // 简单的状态检测：如果任何设备状态为 '关闭' 或 '错误'，则标记为异常 (可扩展)
            if (
                data['状态'] === '关闭' ||
                data['狀態'] === '關閉' ||
                data['状态'] === '错误' ||
                data['狀態'] === '錯誤'
            ) {
                // status = "异常"; // 可以根据需要启用
            }
        } catch (e) {
            console.error(`解析设备 ${device.id} 数据时出错: ${e}`);
        }
        // 如果找到温湿度就停止搜索 (简单逻辑)
        // if (temp !== null && humidity !== null) break;
    }
    return { temp, humidity, status };
}

// --- 天气缓存设定 ---
// 定义一个简单的内存缓存对象
let weatherCache = {
    data: null,         // 缓存的天气数据
    lastFetched: 0,     // 上次获取数据的时间戳 (毫秒)
    ttl: 15 * 60 * 1000 // 缓存有效期：15分钟 (单位：毫秒)
};

// 获取天气信息 (增加缓存逻辑)
app.get('/api/weather', async (req, res) => {
    // --- 检查 API Key ---
    if (WEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY' || !WEATHER_API_KEY) {
        // 如果没有配置 API Key，返回模拟数据 (不进行缓存)
        console.warn('天气 API Key 未配置，返回模拟数据。');
        return res.json({
            temp: 15,
            description: '多云',
            icon: '04d',
            location: '模拟地点',
        });
    }

    // --- 检查缓存 ---
    const now = Date.now();
    if (weatherCache.data && (now - weatherCache.lastFetched < weatherCache.ttl)) {
        console.log('返回缓存的天气数据。');
        return res.json(weatherCache.data); // 直接返回缓存数据
    }

    // --- 缓存无效或过期，从 API 获取 ---
    console.log('缓存无效或过期，正在从 OpenWeatherMap API 获取天气数据...');
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_CITY}&appid=${WEATHER_API_KEY}&units=${WEATHER_UNITS}&lang=${WEATHER_LANG}`;

    try {
        const weatherResponse = await fetch(url);
        if (!weatherResponse.ok) {
            // 如果 API 请求失败，不更新缓存，直接抛出错误
            throw new Error(`天气 API 错误: ${weatherResponse.statusText} (Status: ${weatherResponse.status})`);
        }
        const weatherData = await weatherResponse.json();

        // --- 处理并缓存数据 ---
        const processedData = {
            temp: Math.round(weatherData.main.temp),
            description: weatherData.weather[0]?.description || '未知',
            icon: weatherData.weather[0]?.icon || '01d',
            location: weatherData.name || WEATHER_CITY,
        };

        // 更新缓存
        weatherCache.data = processedData;
        weatherCache.lastFetched = now;
        console.log('天气数据已获取并更新缓存。');

        res.json(processedData); // 返回新获取的数据

    } catch (error) {
        console.error('获取天气数据时出错:', error.message);
        // 返回错误信息，但不应缓存错误状态
        res.status(500).json({ message: `无法获取天气数据: ${error.message}` });
    }
});

// 获取主界面各场景摘要信息
app.get('/api/dashboard-summary', (req, res) => {
    const scenes = ['livingroom', 'bedroom', 'bathroom', 'balcony'];
    const promises = scenes.map((sceneName) => {
        return new Promise((resolve, reject) => {
            const sql =
                'SELECT id, name, type, data FROM devices WHERE scene = ?';
            db.all(sql, [sceneName], (err, rows) => {
                if (err) {
                    console.error(
                        `查询场景 [${sceneName}] 数据错误:`,
                        err.message
                    );
                    // 即使单个场景出错，也继续处理其他场景，返回部分结果
                    resolve({
                        scene: sceneName,
                        temp: null,
                        humidity: null,
                        status: '错误',
                    });
                } else {
                    const { temp, humidity, status } = extractSceneData(rows);
                    resolve({ scene: sceneName, temp, humidity, status });
                }
            });
        });
    });

    Promise.all(promises)
        .then((results) => {
            res.json(results);
        })
        .catch((error) => {
            // 理论上 Promise.all 里的错误已被单独处理，这里以防万一
            console.error('获取仪表板摘要时出错:', error);
            res.status(500).json({ message: '无法获取场景摘要数据' });
        });
});

// 获取场景设备数据路由
app.get('/api/scene/:sceneName', (req, res) => {
    const sceneName = req.params.sceneName;
    const sql =
        'SELECT id, name, type, scene, data, last_updated FROM devices WHERE scene = ? ORDER BY id';

    db.all(sql, [sceneName], (err, rows) => {
        if (err) {
            console.error('查询场景数据错误:', err.message);
            return res
                .status(500)
                .json({ message: '服务器内部错误，无法获取设备数据。' });
        }
        // 解析 data 字段的 JSON 字符串
        const devices = rows.map((row) => {
            try {
                row.data = JSON.parse(row.data);
            } catch (parseError) {
                console.error(`解析设备 ${row.id} 的数据时出错:`, parseError);
                row.data = null; // 或设置为一个错误标志
            }
            return row;
        });
        res.status(200).json(devices);
    });
});

// --- 更新设备状态 API ---
app.patch('/api/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    const updates = req.body; // e.g., { "温度": 22 } or { "模式": "制热" }

    if (!deviceId || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: '无效的请求：缺少设备 ID 或更新内容。' });
    }

    console.log(`Received update for device ${deviceId}:`, updates);

    // 1. 从数据库获取当前设备数据
    const getSql = 'SELECT data FROM devices WHERE id = ?';
    db.get(getSql, [deviceId], (err, row) => {
        if (err) {
            console.error(`更新设备 ${deviceId} 时查询出错:`, err.message);
            return res.status(500).json({ message: '服务器内部错误。' });
        }
        if (!row) {
            return res.status(404).json({ message: '未找到指定设备。' });
        }

        // 2. 解析当前数据并合并更新
        let currentData = {};
        try {
            currentData = JSON.parse(row.data || '{}');
        } catch (parseError) {
            console.error(`解析设备 ${deviceId} 的现有数据时出错:`, parseError);
            // 即使解析失败，也尝试用新数据覆盖（或者返回错误，取决于策略）
            // return res.status(500).json({ message: '无法处理设备现有数据。' });
        }

        const newData = { ...currentData, ...updates };

        // 3. 将更新后的数据写回数据库
        const updateSql = `UPDATE devices SET data = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(updateSql, [JSON.stringify(newData), deviceId], function (updateErr) {
            if (updateErr) {
                console.error(`更新设备 ${deviceId} 到数据库时出错:`, updateErr.message);
                return res.status(500).json({ message: '更新设备数据失败。' });
            }

            if (this.changes === 0) {
                 // 理论上前面已经检查过设备存在，这里可能冗余，但以防万一
                return res.status(404).json({ message: '未找到指定设备进行更新。' });
            }

            console.log(`设备 ${deviceId} 更新成功。`);
            // 返回更新后的完整设备数据（或仅成功消息）
            res.status(200).json({ 
                message: '设备更新成功', 
                updatedData: newData // 返回更新后的数据供前端确认
            }); 
        });
    });
});

// --- 启动服务器 ---
app.listen(port, () => {
    console.log(`服务器正在 http://localhost:${port} 上运行`);
});

// 关闭数据库连接 (当应用程序退出时)
// 这是一个简化的处理方式，实际应用可能需要更复杂的关闭逻辑
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('关闭数据库错误:', err.message);
        }
        console.log('数据库连接已关闭.');
        process.exit(0);
    });
});







