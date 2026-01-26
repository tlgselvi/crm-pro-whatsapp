'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Typography, Space, Badge, Divider, List, Tag, Spin, App } from 'antd';
import { SendOutlined, RocketOutlined, AuditOutlined, HistoryOutlined, LineChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { simulateMessage, getOrCreateTestContact, resetTestContact } from '@/lib/actions-simulator';

const { Title, Text } = Typography;

interface Message {
    role: 'user' | 'bot';
    content: string;
    timestamp: Date;
}

export default function SimulatorPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [contact, setContact] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { message: antMsg } = App.useApp();

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function init() {
        try {
            const testContact = await getOrCreateTestContact();
            setContact(testContact);
            setLogs(['[Sistem] Simülatör hazır. Test kullanıcısı bağlandı.']);
        } catch (error) {
            antMsg.error('Simülatör başlatılamadı');
        }
    }

    async function handleSend() {
        if (!inputText.trim() || !contact) return;

        const userMsg = inputText.trim();
        setInputText('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
        setLoading(true);

        try {
            const res = await simulateMessage(userMsg, contact.id);

            if (res.success) {
                // Add bot responses
                const botMsgs = (res.responses || []).map(m => ({
                    role: 'bot' as const,
                    content: m,
                    timestamp: new Date()
                }));
                setMessages(prev => [...prev, ...botMsgs]);

                // Add logs
                const newLogs: string[] = [];
                if (res.triggerResult) newLogs.push(`[Tetikleyici] ${res.triggerResult}`);
                if (res.updatedContact) {
                    const scoreDiff = (res.updatedContact.lead_score || 0) - (contact?.lead_score || 0);
                    if (scoreDiff !== 0) {
                        newLogs.push(`[Puanlama] Lead Score: ${res.updatedContact.lead_score} (${scoreDiff > 0 ? '+' : ''}${scoreDiff})`);
                    }
                    setContact(res.updatedContact);
                }
                setLogs(prev => [...newLogs, ...prev]);
            } else {
                antMsg.error('Bot yanıt veremedi: ' + res.error);
            }
        } catch (error: any) {
            antMsg.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleReset() {
        if (!contact) return;
        setLoading(true);
        await resetTestContact(contact.id);
        setMessages([]);
        setLogs(['[Sistem] Konuşma ve puanlar sıfırlandı.']);
        await init();
        setLoading(false);
        antMsg.success('Sıfırlandı');
    }

    return (
        <div style={{ height: 'calc(100vh - 120px)', padding: 24, display: 'flex', gap: 24 }}>
            {/* 1. Sol Panel: Chat Arayüzü */}
            <Card
                className="glass-card"
                style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><RocketOutlined /> Bot Simülatörü</span>
                        <Button icon={<ReloadOutlined />} size="small" onClick={handleReset}>Sıfırla</Button>
                    </div>
                }
            >
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minHeight: '60vh', maxHeight: '60vh' }}>
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: 100 }}>
                            <HistoryOutlined style={{ fontSize: 48 }} />
                            <div style={{ marginTop: 16 }}>Test etmek için bir şeyler yazın...</div>
                        </div>
                    )}
                    {messages.map((m, idx) => (
                        <div key={idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 16,
                                background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: m.role === 'user' ? 'white' : 'var(--text-main)',
                                border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ marginBottom: 4, fontSize: 10, opacity: 0.7 }}>
                                    {m.role === 'user' ? 'Siz' : 'Satış Botu'}
                                </div>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            placeholder="Mesajınızı yazın..."
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onPressEnter={handleSend}
                            disabled={loading || !contact}
                            style={{ borderRadius: '12px 0 0 12px', height: 45 }}
                        />
                        <Button
                            type="primary"
                            icon={loading ? <Spin size="small" /> : <SendOutlined />}
                            onClick={handleSend}
                            disabled={loading || !contact}
                            style={{ borderRadius: '0 12px 12px 0', height: 45, width: 60 }}
                        />
                    </Space.Compact>
                </div>
            </Card>

            {/* 2. Sağ Panel: İzleme & Tanı */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Lead Stats Card */}
                <Card className="glass-card" title={<span><LineChartOutlined /> Lead Durumu</span>}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text type="secondary">Lead Score</Text>
                        <Badge count={contact?.lead_score || 0} showZero overflowCount={999} style={{ backgroundColor: (contact?.lead_score > 50) ? '#52c41a' : '#2f54eb' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary">Yaşam Döngüsü</Text>
                        <Tag color="cyan">{contact?.lifecycle_stage?.toUpperCase() || 'LEAD'}</Tag>
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                        * Puan 30'u geçerse <b>Qualified</b>, 80'i geçerse <b>Champion</b> olur.
                    </div>
                </Card>

                {/* Live Logs Card */}
                <Card className="glass-card" style={{ flex: 1 }} title={<span><AuditOutlined /> Sistem Logları</span>}>
                    <div style={{ height: '300px', overflowY: 'auto' }}>
                        <List
                            dataSource={logs}
                            size="small"
                            renderItem={item => (
                                <List.Item style={{ border: 'none', padding: '4px 0' }}>
                                    <Text style={{ fontSize: 12, fontFamily: 'monospace', color: item.includes('[Hata]') ? '#ff4d4f' : 'var(--text-secondary)' }}>
                                        {item}
                                    </Text>
                                </List.Item>
                            )}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}
