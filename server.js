const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 数据结构改变：每片叶子是一个数组，记录所有历史位置
// { leaf_01: [{x, y, t}, {x, y, t}, ...], ... }
const leaves = {};

// 观众页路由
app.get('/plant', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'plant.html'));
});

// 提交新位置：追加到该叶子的历史里
app.post('/api/place', (req, res) => {
  const { id, x, y } = req.body;
  if (!id || x == null || y == null) {
    return res.status(400).json({ error: 'missing fields' });
  }
  
  if (!leaves[id]) leaves[id] = [];
  const point = { x, y, t: Date.now() };
  leaves[id].push(point);
  
  // 广播：发送整片叶子的最新历史
  const message = JSON.stringify({ 
    type: 'update', 
    id, 
    history: leaves[id] 
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  res.json({ success: true });
});

// 获取所有叶子的完整历史(展示页加载时用)
app.get('/api/leaves', (req, res) => {
  res.json(leaves);
});

// 获取某一片叶子的历史(观众页加载时用)
app.get('/api/leaves/:id', (req, res) => {
  const id = req.params.id;
  res.json(leaves[id] || []);
});

// 清除所有数据
app.post('/api/clear', (req, res) => {
  for (const id in leaves) delete leaves[id];
  // 广播清除指令给所有展示屏
  const message = JSON.stringify({ type: 'clear' });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  res.json({ success: true });
});

wss.on('connection', (ws) => {
  console.log('a display connected');
  ws.on('close', () => console.log('display disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});