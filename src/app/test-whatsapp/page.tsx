'use client';

import React, { useState } from 'react';
import { Card, Input, Button, Space, Typography, Alert, Spin, Tag, List, Avatar } from 'antd';
import { SendOutlined, WhatsAppOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { checkSalesbotRules } from '@/lib/salesbot';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TestMessage {
    type: 'customer' | 'bot';
    content: string;
    timestamp: Date;
}

export default function WhatsAppTestPage() {
    const [phoneNumber, setPhoneNumber] = useState('+905551234567');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<TestMessage[]>([]);
    const [lastResponse, setLastResponse] = useState<any>(null);

    async function sendTestMessage() {
        if (!message.trim()) return;

        setLoading(true);
        const customerMessage = message;

        // Add customer message to UI
        setMessages((prev) => [
            ...prev,
            { type: 'customer', content: customerMessage, timestamp: new Date() },
        ]);

        try {
            // Simulate WhatsApp webhook payload
            const webhookPayload = {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            from: phoneNumber,
                                            id: `msg_${Date.now()}`,
                                            text: {
                                                body: customerMessage,
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            };

            // Send to webhook
            const response = await fetch('/api/whatsapp-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
            });

            const data = await response.json();
            setLastResponse(data);

            // If bot triggered, show bot response
            if (data.botTriggered) {
                // Wait a bit for dramatic effect
                setTimeout(() => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            type: 'bot',
                            content: 'Salesbot otomatik cevap verdi! (Inbox\'ta görüntüleyin)',
                            timestamp: new Date(),
                        },
                    ]);
                }, 500);
            }

            setMessage('');
        } catch (error) {
            console.error('Test error:', error);
            alert('Test başarısız! Console\'u kontrol edin.');
        } finally {
            setLoading(false);
        }
    }

    const quickTests = [
        'merhaba',
        'fiyat nedir?',
        'katalog göster',
        'demo almak istiyorum',
        'destek lazım',
    ];

    return (
        <div>
            <Title level={2}>
                <WhatsAppOutlined /> WhatsApp Webhook Test
            </Title>
            <Text type="secondary">
                Salesbot ve webhook'u test edin. Mesajlar Inbox'ta görünecek!
            </Text>

            <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
                {/* Left: Test Form */}
                <Card title="📱 Test Mesajı Gönder" style={{ flex: 1 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong>Telefon Numarası (Simüle)</Text>
                            <Input
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+905551234567"
                                prefix={<WhatsAppOutlined />}
                            />
                        </div>

                        <div>
                            <Text strong>Mesaj</Text>
                            <TextArea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Mesajınızı yazın (örn: 'fiyat')"
                                rows={4}
                                onPressEnter={(e) => {
                                    if (!e.shiftKey) {
                                        e.preventDefault();
                                        sendTestMessage();
                                    }
                                }}
                            />
                        </div>

                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={sendTestMessage}
                            loading={loading}
                            disabled={!message.trim()}
                            block
                            size="large"
                        >
                            WhatsApp Webhook'a Gönder
                        </Button>

                        <div>
                            <Text strong>Hızlı Test Mesajları:</Text>
                            <div style={{ marginTop: 8 }}>
                                <Space wrap>
                                    {quickTests.map((test, idx) => (
                                        <Tag
                                            key={idx}
                                            color="blue"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setMessage(test)}
                                        >
                                            {test}
                                        </Tag>
                                    ))}
                                </Space>
                            </div>
                        </div>

                        {lastResponse && (
                            <Alert
                                message="API Response"
                                description={
                                    <pre style={{ fontSize: 11, marginTop: 8 }}>
                                        {JSON.stringify(lastResponse, null, 2)}
                                    </pre>
                                }
                                type={lastResponse.status === 'success' ? 'success' : 'error'}
                                closable
                            />
                        )}
                    </Space>
                </Card>

                {/* Right: Conversation Log */}
                <Card
                    title={
                        <Space>
                            <RobotOutlined />
                            Konuşma Geçmişi (Bu Session)
                        </Space>
                    }
                    style={{ flex: 1 }}
                >
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                            Henüz mesaj yok. Test mesajı gönderin!
                        </div>
                    ) : (
                        <List
                            dataSource={messages}
                            renderItem={(msg) => (
                                <List.Item
                                    style={{
                                        justifyContent: msg.type === 'customer' ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <div
                                        style={{
                                            maxWidth: '70%',
                                            padding: 12,
                                            borderRadius: 8,
                                            background: msg.type === 'customer' ? '#dcf8c6' : '#f0f0f0',
                                        }}
                                    >
                                        <Space direction="vertical" size={4}>
                                            <Space>
                                                {msg.type === 'customer' ? (
                                                    <Avatar size="small" icon={<UserOutlined />} />
                                                ) : (
                                                    <Avatar size="small" icon={<RobotOutlined />} style={{ background: '#52c41a' }} />
                                                )}
                                                <Text strong style={{ fontSize: 12 }}>
                                                    {msg.type === 'customer' ? 'Müşteri' : 'Salesbot'}
                                                </Text>
                                            </Space>
                                            <Text>{msg.content}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {msg.timestamp.toLocaleTimeString('tr-TR')}
                                            </Text>
                                        </Space>
                                    </div>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>

            {/* Instructions */}
            <Card title="📖 Nasıl Kullanılır?" style={{ marginTop: 24 }}>
                <ol style={{ paddingLeft: 20 }}>
                    <li>Yukarıdaki formu kullanarak test mesajı gönderin</li>
                    <li>Mesaj <code>/api/whatsapp-webhook</code> endpoint'ine POST edilir</li>
                    <li>
                        <strong>Salesbot</strong> keyword'leri kontrol eder (merhaba, fiyat, katalog, vb.)
                    </li>
                    <li>Eşleşme varsa otomatik cevap verir</li>
                    <li>
                        <strong>Inbox sayfasına</strong> gidin - mesajlar ve bot cevapları orada görünür!
                    </li>
                    <li>Real-time: Başka bir sekmede Inbox açıksa, mesajlar anında belirir</li>
                </ol>

                <Alert
                    message="💡 İpucu"
                    description="'fiyat' veya 'merhaba' yazarak Salesbot'un otomatik cevap verdiğini görün!"
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                />
            </Card>
        </div>
    );
}
