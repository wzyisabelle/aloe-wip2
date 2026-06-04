const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 让后端能解析手机发来的JSON数据
app.use(express.json());

// 把public文件夹里的文件直接对外提供
app.use(express.static(path.join(__dirname, 'public')));

// 内存里存所有叶片的位置 { leaf_01: {x: 0.5, y: 0.3}, ... }
const leaves = {};

// 路由：观众扫NFC打开的页面
app.get('/plant', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'plant.html'));
});

// 路由：观众提交位置
app.post('/api/place', (req, res) => {
  const { id, x, y } = req.body;
  if (!id || x == null || y == null) {
    return res.status(400).json({ error: 'missing fields' });
  }
  leaves[id] = { x, y, updatedAt: Date.now() };
  
  // 广播给所有展示屏
  const message = JSON.stringify({ type: 'update', id, x, y });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  res.json({ success: true });
});

// 路由:获取当前所有叶片位置（展示屏初始加载时用）
app.get('/api/leaves', (req, res) => {
  res.json(leaves);
});

// WebSocket连接
wss.on('connection', (ws) => {
  console.log('a display connected');
  ws.on('close', () => console.log('display disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});