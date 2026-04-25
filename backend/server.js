const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const routes = require('./routes');
const { dbRun } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set('socketio', io);
app.use('/api', routes);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_group', (groupId) => {
        socket.join(groupId);
        console.log(`User joined group: ${groupId}`);
    });

    socket.on('send_message', async (data) => {
        const { group_id, sender, message } = data;
        
        try {
            await dbRun('INSERT INTO chat_messages (group_id, sender, message) VALUES (?, ?, ?)', [group_id, sender, message]);
            io.to(group_id).emit('receive_message', { group_id, sender, message, created_at: new Date() });
        } catch (err) {
            console.error('Failed to save message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
