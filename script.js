// 在文件顶部定义 API key
const DEEPSEEK_API_KEY = 'sk-18de04beed6d4095becf65f65af774f5';
let controller = null; // 用于控制请求的 AbortController

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageArea = document.getElementById('messageArea');
    const sendButton = document.querySelector('.chat-input button');
    const message = messageInput.value.trim();

    // 如果当前正在生成回复，点击按钮会中断生成
    if (controller) {
        controller.abort();
        controller = null;
        sendButton.innerHTML = '<i class="material-icons">send</i>';
        return;
    }

    if (message !== '') {
        // 显示用户消息
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
        messageArea.appendChild(messageDiv);
        
        // 清空输入框
        messageInput.value = '';
        
        // 滚动到最新消息
        scrollToBottom(messageArea);

        try {
            // 创建 AI 回复的消息框
            const replyDiv = document.createElement('div');
            replyDiv.className = 'message received';
            replyDiv.innerHTML = `<div class="message-content"><div class="message-text">思考中...</div></div>`;
            messageArea.appendChild(replyDiv);
            
            // 将发送按钮改为暂停按钮
            sendButton.innerHTML = '<i class="material-icons">pause</i>';
            
            // 创建 AbortController 用于可能的中断
            controller = new AbortController();
            
            // 调用 DeepSeek API
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [{
                        role: "user",
                        content: message
                    }],
                    stream: true // 启用流式输出
                }),
                signal: controller.signal
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let responseText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // 解码收到的数据
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data:') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(5));
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                responseText += data.choices[0].delta.content;
                                // 处理换行和格式化
                                const formattedText = formatResponseText(responseText);
                                replyDiv.querySelector('.message-text').innerHTML = formattedText;
                                scrollToBottom(messageArea);
                            }
                        } catch (e) {
                            console.error("解析错误:", e);
                        }
                    }
                }
            }

            // 恢复发送按钮
            sendButton.innerHTML = '<i class="material-icons">send</i>';
            controller = null;
            
            // 确保最终滚动到底部
            setTimeout(() => scrollToBottom(messageArea), 100);
            
        } catch (error) {
            // 显示错误消息
            if (error.name !== 'AbortError') {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'message received';
                errorDiv.innerHTML = `<div class="message-content">抱歉，发生错误：${error.message}</div>`;
                messageArea.appendChild(errorDiv);
            }
            
            // 恢复发送按钮
            sendButton.innerHTML = '<i class="material-icons">send</i>';
            controller = null;
            
            // 确保最终滚动到底部
            scrollToBottom(messageArea);
        }
    }
}

// 格式化回复文本，处理换行和特殊格式
function formatResponseText(text) {
    // 处理代码块
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // 处理普通换行
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');
    
    // 处理粗体
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return text;
}

// 滚动到底部的辅助函数
function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}

// 添加回车发送功能
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});