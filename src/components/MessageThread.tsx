'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Empty, Spin, Avatar, App, Image, Modal, Tabs, List, DatePicker, Checkbox, Space, Badge, Typography, Divider, Tag, InputNumber } from 'antd';
const { Text } = Typography;
import { SendOutlined, UserOutlined, BulbOutlined, FileTextOutlined, DownloadOutlined, CalendarOutlined, PlusOutlined, DeleteOutlined, LayoutOutlined, DollarOutlined } from '@ant-design/icons';

import { MainContainer, ChatContainer, MessageList, Message, MessageInput } from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { supabase, type Message as MessageType, type ConversationWithContact } from '@/lib/supabase';
import { createPaymentLink } from '@/lib/services/payment';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';


interface MessageThreadProps {
    conversation: ConversationWithContact | null;
}

export default function MessageThread({ conversation }: MessageThreadProps) {
    const { message } = App.useApp();

    // Core State
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const [noteMode, setNoteMode] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string, type: string }[]>([]);

    // AI & Task State
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [newTaskNote, setNewTaskNote] = useState('');
    const [dueDate, setDueDate] = useState<Dayjs | null>(null);

    // Template State
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templates, setTemplates] = useState<{ name: string, status: string, language: string }[]>([]);

    // Payment State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentDesc, setPaymentDesc] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Initial Fetch & Real-time
    useEffect(() => {
        if (!conversation) {
            setMessages([]);
            return;
        }

        fetchMessages();
        fetchTasks(conversation.contact_id);

        const channel = supabase
            .channel(`messages_${conversation.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversation.id}`,
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new as MessageType]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversation?.id]);

    async function fetchMessages() {
        if (!conversation) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversation.id)
                .order('timestamp', { ascending: true });
            if (data) setMessages(data);

            await supabase.from('messages').update({ is_read: true })
                .eq('conversation_id', conversation.id).eq('sender', 'customer').eq('is_read', false);
        } catch (error) { console.error('Error fetching messages:', error); }
        finally { setLoading(false); }
    }

    async function fetchTasks(contactId: string) {
        setTasksLoading(true);
        const { data } = await supabase.from('tasks').select('*').eq('contact_id', contactId).order('due_date', { ascending: true });
        if (data) setTasks(data);
        setTasksLoading(false);
    }

    async function handleSend() {
        if (!conversation || (!inputValue.trim() && attachments.length === 0)) return;
        setSending(true);
        try {
            const { error } = await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'agent',
                content: inputValue.trim(),
                is_read: true,
                platform: 'web',
                private: noteMode,
                media_url: attachments.length > 0 ? attachments[0].url : null,
                media_type: attachments.length > 0 ? (attachments[0].type.startsWith('image/') ? 'image' : 'file') : null
            });
            if (error) throw error;
            setInputValue(''); setAttachments([]); setNoteMode(false);
        } catch (error) { message.error('Mesaj gönderilemedi'); }
        finally { setSending(false); }
    }

    async function handleAiSuggest() {
        if (!conversation) return;
        const lastMsg = messages.filter(m => m.sender === 'customer').slice(-1)[0];
        if (!lastMsg) return message.warning('Mesaj yok');

        try {
            setIsAiThinking(true); setInputValue('');
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: `Konu: ${lastMsg.content}` }],
                    attachments
                })
            });
            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                setInputValue(prev => prev + decoder.decode(value));
            }
        } catch (err) { message.error('AI hatası'); }
        finally { setIsAiThinking(false); }
    }

    async function handlePaymentSend() {
        if (!conversation?.contact?.id || paymentAmount <= 0) return;
        setPaymentLoading(true);
        const { url, error } = await createPaymentLink(conversation.contact_id, paymentAmount, paymentDesc);
        if (error) message.error('Link oluşturulamadı');
        else {
            const { error: sendError } = await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'agent',
                content: `💳 Ödeme Bağlantısı: ${paymentDesc || 'Ürün Ödemesi'}\nTutar: ${paymentAmount} TL\n${url}`,
                is_read: true, platform: 'web'
            });
            if (!sendError) {
                message.success('Linki gönderildi');
                setPaymentModalOpen(false); setPaymentAmount(0); setPaymentDesc('');
            }
        }
        setPaymentLoading(false);
    }

    // Modal Helpers
    async function fetchTemplates() {
        setTemplateLoading(true);
        try {
            const res = await fetch('/api/whatsapp-templates');
            const data = await res.json();
            if (data.data) setTemplates(data.data);
        } finally { setTemplateLoading(false); }
    }

    if (!conversation) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty /></div>;
    if (loading) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;

    return (
        <div style={{ height: '100%', display: 'flex' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--container-bg)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{conversation.contact?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{conversation.contact?.phone}</div>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                    <MainContainer><ChatContainer><MessageList>
                        {messages.map(msg => (
                            <Message key={msg.id} model={{
                                message: msg.content,
                                direction: msg.sender === 'agent' ? 'outgoing' : 'incoming',
                                position: 'single'
                            }} style={{
                                background: msg.private ? 'rgba(250, 219, 20, 0.05)' : undefined,
                                border: msg.private ? '1px dashed rgba(250, 219, 20, 0.2)' : undefined,
                                borderRadius: 8, padding: 4
                            }}>
                                {msg.private && <Message.Header sender="İç Not" />}
                                {msg.media_url && (
                                    <div style={{ marginTop: 8 }}>
                                        {msg.media_type === 'image' ? <Image src={msg.media_url} width={200} /> : <Button icon={<DownloadOutlined />} href={msg.media_url} target="_blank">İndir</Button>}
                                    </div>
                                )}
                            </Message>
                        ))}
                    </MessageList></ChatContainer></MainContainer>
                </div>

                <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', background: 'var(--container-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Space>
                            <Button size="small" icon={<BulbOutlined />} onClick={handleAiSuggest} loading={isAiThinking}>AI Öneri</Button>
                            <Button size="small" icon={<LayoutOutlined />} onClick={() => { setTemplateModalOpen(true); fetchTemplates(); }}>Şablon</Button>
                            <Button size="small" icon={<DollarOutlined />} onClick={() => setPaymentModalOpen(true)} type="primary" ghost>Ödeme</Button>
                            <Divider type="vertical" />
                            <Button size="small" icon={<PlusOutlined />} onClick={() => document.getElementById('file-up')?.click()} />
                            <input id="file-up" type="file" style={{ display: 'none' }} onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) setAttachments([{ url: URL.createObjectURL(f), type: f.type }]);
                            }} />
                            {attachments.length > 0 && <Tag closable onClose={() => setAttachments([])}>Medya Hazır</Tag>}
                        </Space>
                        <Space><Text style={{ fontSize: 12 }}>İç Not</Text><Checkbox checked={noteMode} onChange={e => setNoteMode(e.target.checked)} /></Space>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input.TextArea value={inputValue} onChange={e => setInputValue(e.target.value)} autoSize={{ minRows: 1, maxRows: 4 }} style={{ flex: 1, background: noteMode ? 'rgba(250,219,20,0.03)' : undefined }} />
                        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={sending}>{noteMode ? 'Not Et' : 'Gönder'}</Button>
                    </div>
                </div>
            </div>

            {/* Sidebar Tools Placeholder */}
            <div style={{ width: 300, borderLeft: '1px solid var(--border-color)', background: 'var(--container-bg)' }}>
                <Tabs defaultActiveKey="1" items={[{ key: '1', label: 'Profil', children: <div style={{ padding: 20 }}><Avatar size={64} icon={<UserOutlined />} /></div> }]} />
            </div>

            {/* Modals */}
            <Modal title="Ödeme Linki Oluştur" open={paymentModalOpen} onCancel={() => setPaymentModalOpen(false)} onOk={handlePaymentSend} confirmLoading={paymentLoading}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Tutar (TL)</Text>
                    <InputNumber min={1} style={{ width: '100%' }} value={paymentAmount} onChange={v => setPaymentAmount(v || 0)} />
                    <Text>Açıklama</Text>
                    <Input placeholder="Örn: Pro Paket Üyeliği" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} />
                </Space>
            </Modal>

            <Modal title="Şablonlar" open={templateModalOpen} onCancel={() => setTemplateModalOpen(false)} footer={null}>
                <List loading={templateLoading} dataSource={templates} renderItem={item => <List.Item actions={[<Button type="link">Gönder</Button>]}>{item.name}</List.Item>} />
            </Modal>
        </div>
    );
}
