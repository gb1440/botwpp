const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const TARGET_CHAT_NAME = "MORCEGOS";
const UNLOCK_CONTACT = "558599782643@c.us"; // Formato correto do número no WhatsApp Web
let client = null;

// Função para inicializar o bot
const initializeClient = () => {
    if (client) {
        client.destroy();
        client = null;
    }

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

   client.on('qr', async qr => {
    console.log("📸 QR Code gerado");
    const qrImage = await qrcode.toDataURL(qr);
    sendToClients({ type: 'qr', data: qrImage });
});


    client.on('ready', async () => {
        sendToClients({ type: 'status', data: '✅ Bot conectado e pronto para uso!' });
        
        // Desbloquear o contato automaticamente
        try {
            const contact = await client.getContactById(UNLOCK_CONTACT);
            if (contact.isBlocked) {
                await contact.unblock();
                sendToClients({ type: 'log', data: `🔓 Contato ${UNLOCK_CONTACT} desbloqueado com sucesso!` });
            }
        } catch (err) {
            sendToClients({ type: 'log', data: `⚠ Erro ao tentar desbloquear o contato: ${err}` });
        }
    });

    client.on('disconnected', async reason => {
        sendToClients({ type: 'status', data: `🔴 Desconectado: ${reason}.` });
    });

    client.on('message_create', async msg => {
        if (msg.fromMe) return;
        
        const chat = await msg.getChat();
        sendToClients({ type: 'log', data: `📩 Mensagem recebida no chat: [${chat.name}]` });
    
        // Verifica se a mensagem veio do grupo "MORCEGOS" e se é uma imagem
        if (chat.name === TARGET_CHAT_NAME && msg.hasMedia && msg.type === "image") {
            const media = await msg.downloadMedia();
            sendToClients({ type: 'log', data: "✅ Imagem recebida! Enviando resposta..." });
            
            try {
                await chat.sendMessage("Ok");
                sendToClients({ type: 'log', data: '✅ Resposta enviada para o chat!' });
            } catch (err) {
                sendToClients({ type: 'log', data: `⚠ Erro ao enviar resposta: ${err}` });
            }
        } else {
            sendToClients({ type: 'log', data: "🚫 Mensagem ignorada (não é uma imagem ou não é do grupo)." });
        }
    });

    client.initialize().catch(err => {
        sendToClients({ type: 'status', data: `❌ Erro ao iniciar o WhatsApp Web: ${err}` });
    });
};

// Envia mensagens para os clientes WebSocket
const sendToClients = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// 🔹 Rota para iniciar o bot
app.post('/start-bot', (req, res) => {
    if (!client) {
        initializeClient();
        res.json({ message: "🚀 Bot iniciado com sucesso!" });
    } else {
        res.json({ message: "⚠ O bot já está rodando!" });
    }
});



// 🔹 Rota para parar o bot
app.post('/stop-bot', async (req, res) => {
    if (client) {
        try {
            if (client.pupBrowser) {
                await client.destroy();
                sendToClients({ type: 'status', data: "🔴 Bot foi parado." });
                res.json({ message: "🛑 Bot parado com sucesso!" });
            } else {
                res.json({ message: "⚠ O bot não estava conectado corretamente." });
            }
        } catch (error) {
            console.error("Erro ao destruir o cliente:", error);
            res.status(500).json({ message: "❌ Erro ao parar o bot", error: error.message });
        } finally {
            client = null;
        }
    } else {
        res.json({ message: "⚠ O bot já está parado!" });
    }
});





// 🔹 Rota para verificar status
app.get('/status', (req, res) => {
    const status = client ? "🤖 Bot rodando e conectado" : "🔴 Bot parado";
    res.json({ status });
});

// 🔹 Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌍 API rodando na porta ${PORT}`);
});


// 🔹 Rota para logout do WhatsApp (deslogar e mostrar QR de novo)
app.post('/logout', async (req, res) => {
    if (client) {
        try {
            await client.logout();
            sendToClients({ type: 'status', data: '🔒 Bot desconectado do WhatsApp. Escaneie o QR novamente.' });
            res.json({ message: '✅ Logout realizado com sucesso!' });
        } catch (err) {
            sendToClients({ type: 'status', data: '❌ Erro ao desconectar o WhatsApp.' });
            res.status(500).json({ message: '❌ Erro ao realizar logout.', error: err.toString() });
        }
    } else {
        res.status(400).json({ message: '⚠ Nenhuma sessão ativa para logout.' });
    }
});
