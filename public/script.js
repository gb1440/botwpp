const qrcodeElement = document.getElementById('qrcode');
const statusElement = document.getElementById('status');
const logsElement = document.getElementById('logs');

// Atualiza QR Code
function updateQRCode(qr) {
    qrcodeElement.innerHTML = `<img src="${qr}" alt="QR Code" />`;
}

// Atualiza status
function updateStatus(message) {
    statusElement.textContent = "Status: " + message;
}

// Adiciona logs
function addLog(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logsElement.appendChild(logEntry);
}

// Conecta ao backend para obter status inicial
async function connectToBackend() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        updateStatus(data.status);
    } catch (error) {
        updateStatus('❌ Erro ao conectar ao backend');
        console.error("Erro ao conectar ao backend:", error);
    }
}

// Inicia o bot
async function startBot() {
    try {
        const response = await fetch('/start-bot', { method: 'POST' });
        const data = await response.json();
        alert(data.message);
        connectToBackend();
    } catch (error) {
        alert('❌ Erro ao iniciar o bot');
        console.error("Erro ao iniciar o bot:", error);
    }
}

// Para o bot
async function stopBot() {
    try {
        const response = await fetch('/stop-bot', { method: 'POST' });
        const data = await response.json();
        alert(data.message);
        connectToBackend();
    } catch (error) {
        alert('❌ Erro ao parar o bot');
        console.error("Erro ao parar o bot:", error);
    }
}

// Desconecta o WhatsApp e exibe QR Code novamente
async function logoutWhatsApp() {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        const data = await response.json();
        alert(data.message);
        connectToBackend();
    } catch (error) {
        alert('❌ Erro ao desconectar do WhatsApp');
        console.error("Erro ao desconectar do WhatsApp:", error);
    }
}


// Função para desconectar o bot
async function disconnectBot() {
    try {
        const response = await fetch('/disconnect-bot');
        const data = await response.json();
        alert(data.status);
        connectToBackend(); // Atualiza o status e exibe o QR Code novamente
    } catch (error) {
        alert('Erro ao desconectar o bot');
        console.error(error);
    }
}


// Conecta ao WebSocket
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);


ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("📨 WS RECEBIDO:", data);
    console.log("Mensagem recebida via WS:", data);
    switch (data.type) {
        case 'qr':
            updateQRCode(data.data);
            break;
        case 'status':
            updateStatus(data.data);
            break;
        case 'log':
            addLog(data.data);
            break;
    }
};



ws.onopen = () => console.log("✅ WebSocket conectado");
ws.onerror = (e) => console.error("❌ Erro no WebSocket:", e);


// Inicializa conexão
connectToBackend();
