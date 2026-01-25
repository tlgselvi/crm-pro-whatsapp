'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Empty, Spin, Avatar, App, Image, Modal, Tabs, List, DatePicker, Checkbox, Space, Badge, Typography } from 'antd';
const { Text } = Typography;
import { SendOutlined, UserOutlined, BulbOutlined, FileTextOutlined, DownloadOutlined, CalendarOutlined, PlusOutlined, DeleteOutlined, LayoutOutlined } from '@ant-design/icons';

import { MainContainer, ChatContainer, MessageList, Message, MessageInput } from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { supabase, type Message as MessageType, type ConversationWithContact } from '@/lib/supabase';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface MessageThreadProps {
    conversation: ConversationWithContact | null;
}

export default function MessageThread({ conversation }: MessageThreadProps) {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [newTaskNote, setNewTaskNote] = useState('');
    const [dueDate, setDueDate] = useState<Dayjs | null>(null);

    useEffect(() => {
        if (conversation?.contact?.id) {
            fetchTasks(conversation.contact.id);
        }
    }, [conversation?.contact?.id]);

    async function fetchTasks(contactId: string) {
        setTasksLoading(true);
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('contact_id', contactId)
            .order('due_date', { ascending: true });
        if (data) setTasks(data);
        setTasksLoading(false);
    }

    const addTask = async () => {
        if (!newTaskNote || !dueDate || !conversation?.contact?.id) return;

        const { error } = await supabase.from('tasks').insert([{
            contact_id: conversation.contact.id,
            note: newTaskNote,
            due_date: dueDate.toISOString(),
            status: 'pending'
        }]);

        if (error) message.error('Görev eklenemedi');
        else {
            message.success('Görev eklendi');
            setNewTaskNote('');
            setDueDate(null);
            if (conversation?.contact?.id) {
                fetchTasks(conversation.contact.id);
            }
        }
    };

    const toggleTask = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
        const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
        if (error) message.error('Durum güncellenemedi');
        else if (conversation?.contact?.id) fetchTasks(conversation.contact.id);
    };

    const deleteTask = async (taskId: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) message.error('Silinemedi');
        else if (conversation?.contact?.id) fetchTasks(conversation.contact.id);
    };

    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateLoading, setTemplateLoading] = useState(false);

    const [templates, setTemplates] = useState<{ name: string, status: string, language: string }[]>([]);

    useEffect(() => {
        if (templateModalOpen) {
            fetchTemplates();
        }
    }, [templateModalOpen]);

    async function fetchTemplates() {
        setTemplateLoading(true);
        try {
            const res = await fetch('/api/whatsapp-templates');
            const data = await res.json();
            if (data.data) {
                setTemplates(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            message.error('Şablonlar yüklenemedi');
        } finally {
            setTemplateLoading(false);
        }
    }

    const sendTemplate = async (templateName: string, lang: string) => {
        if (!conversation?.contact?.phone) return;
        setTemplateLoading(true);
        try {
            const response = await fetch('/api/whatsapp-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: conversation.contact.phone,
                    templateName,
                    languageCode: lang
                })
            });
            if (!response.ok) throw new Error('Template failed');
            message.success('Şablon başarıyla gönderildi');
            setTemplateModalOpen(false);
        } catch (err) {
            message.error('Şablon gönderilemedi');
        } finally {
            setTemplateLoading(false);
        }
    };

    const { message } = App.useApp();


    useEffect(() => {
        if (!conversation) {
            setMessages([]);
            return;
        }

        fetchMessages();

        // Real-time subscription
        const channel = supabase
            .channel(`messages_${conversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversation.id}`,
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as MessageType]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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

            if (error) throw error;

            setMessages(data || []);

            // Mark messages as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversation.id)
                .eq('sender', 'customer')
                .eq('is_read', false);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSend() {
        if (!conversation || !inputValue.trim()) return;

        setSending(true);
        try {
            const { error } = await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender: 'agent',
                content: inputValue.trim(),
                is_read: true,
                platform: 'web',
            });

            if (error) throw error;

            setInputValue('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    }

    async function handleAiSuggest() {
        if (!conversation) return;

        const lastCustomerMessage = messages
            .filter((m) => m.sender === 'customer')
            .slice(-1)[0];

        if (!lastCustomerMessage) {
            message.warning('Henüz müşteri mesajı yok');
            return;
        }

        setAiLoading(true);
        try {
            const response = await fetch('/api/ai-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lastMessage: lastCustomerMessage.content,
                    customerName: conversation?.contact?.name,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'AI suggestion failed');
            }

            const data = await response.json();
            setInputValue(data.suggestion);
            message.success('AI önerisi hazır! İstersen düzenle ve gönder.');
        } catch (error: any) {
            console.error('AI suggestion error:', error);
            message.error(`AI önerisi alınamadı: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    }

    if (!conversation) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <Empty description={<Text style={{ color: 'var(--text-secondary)' }}>Mesajlaşmaya başlamak için bir konuşma seçin</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex' }}>
            {/* Main Chat Area */}
            <div style={{ flex: 1, background: 'var(--background)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Header */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'var(--container-bg)'
                    }}
                >
                    <Avatar icon={<UserOutlined />} size={40} style={{ background: '#28292a' }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-main)' }}>{conversation?.contact?.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{conversation?.contact?.phone}</div>
                    </div>
                </div>


                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                    <MainContainer>
                        <ChatContainer>
                            <MessageList>
                                {messages.map((msg) => (
                                    <Message
                                        key={msg.id}
                                        model={{
                                            message: msg.content,
                                            sentTime: dayjs(msg.timestamp).format('HH:mm'),
                                            sender: msg.sender === 'agent' ? 'Siz' : conversation?.contact?.name || 'Müşteri',
                                            direction: msg.sender === 'agent' ? 'outgoing' : 'incoming',
                                            position: 'single',
                                        }}
                                    >
                                        {msg.media_url && (
                                            <div style={{ marginTop: 8, maxWidth: '100%' }}>
                                                {msg.media_type === 'image' ? (
                                                    <Image
                                                        src={msg.media_url}
                                                        alt="WhatsApp Image"
                                                        width={200}
                                                        style={{ borderRadius: 8, cursor: 'pointer' }}
                                                    />
                                                ) : (
                                                    <Button
                                                        icon={<FileTextOutlined />}
                                                        href={msg.media_url}
                                                        target="_blank"
                                                        size="small"
                                                        style={{ display: 'flex', alignItems: 'center' }}
                                                    >
                                                        {msg.content || 'Dosyayı İndir'} <DownloadOutlined style={{ marginLeft: 4 }} />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </Message>
                                ))}
                            </MessageList>
                        </ChatContainer>
                    </MainContainer>
                </div>

                {/* Input */}
                <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', background: 'var(--container-bg)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <Button
                            icon={<BulbOutlined />}
                            onClick={handleAiSuggest}
                            loading={aiLoading}
                            size="small"
                        >
                            AI Öneri
                        </Button>
                        <Button
                            icon={<LayoutOutlined />}
                            onClick={() => setTemplateModalOpen(true)}
                            size="small"
                        >
                            Şablon
                        </Button>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input.TextArea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Mesaj yazın veya AI'dan öneri alın..."
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ flex: 1 }}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={sending}
                            disabled={!inputValue.trim()}
                        >
                            Gönder
                        </Button>
                    </div>
                </div>
            </div>

            {/* Sidebar with Profile & Tasks */}
            <div style={{ width: 300, borderLeft: '1px solid var(--border-color)', background: 'var(--container-bg)' }}>
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: 'Profil',
                        children: (
                            <div style={{ padding: 20, textAlign: 'center' }}>
                                <Avatar size={64} icon={<UserOutlined />} style={{ marginBottom: 16, background: '#28292a' }} />
                                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)' }}>{conversation?.contact?.name}</div>
                                <div style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{conversation?.contact?.phone}</div>
                                <Badge status="processing" text={<span style={{ color: 'var(--text-secondary)' }}>Aktif Müşteri</span>} />
                            </div>
                        )
                    },

                    {
                        key: '2',
                        label: 'Görevler',
                        children: (
                            <div style={{ padding: '0 12px' }}>
                                <div style={{ marginBottom: 16 }}>
                                    <Input
                                        placeholder="Görevi yaz..."
                                        value={newTaskNote}
                                        onChange={e => setNewTaskNote(e.target.value)}
                                        style={{ marginBottom: 8 }}
                                    />
                                    <Space.Compact style={{ width: '100%' }}>
                                        <DatePicker
                                            showTime
                                            placeholder="Zaman seç"
                                            value={dueDate}
                                            onChange={val => setDueDate(val)}
                                            style={{ flex: 1 }}
                                        />
                                        <Button type="primary" icon={<PlusOutlined />} onClick={addTask} />
                                    </Space.Compact>
                                </div>
                                <List
                                    loading={tasksLoading}
                                    dataSource={tasks}
                                    size="small"
                                    renderItem={(task: any) => (
                                        <List.Item
                                            style={{ padding: '8px 4px' }}
                                            actions={[
                                                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteTask(task.id)} />
                                            ]}
                                        >
                                            <Space align="start">
                                                <Checkbox
                                                    checked={task.status === 'completed'}
                                                    onChange={() => toggleTask(task.id, task.status)}
                                                />
                                                <div style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                                                    <div style={{ fontSize: 13, color: 'var(--text-main)' }}>{task.note}</div>
                                                    <div style={{ fontSize: 11, color: dayjs(task.due_date).isBefore(dayjs()) ? '#ff4d4f' : 'var(--text-secondary)' }}>
                                                        {dayjs(task.due_date).format('DD MMM HH:mm')}
                                                    </div>
                                                </div>
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        )
                    }
                ]} />
            </div>


            <Modal
                title="WhatsApp Şablonu Gönder"
                open={templateModalOpen}
                onCancel={() => setTemplateModalOpen(false)}
                footer={null}
            >
                <List
                    dataSource={templates}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Button
                                    key="send"
                                    type="primary"
                                    onClick={() => sendTemplate(item.name, item.language)}
                                    loading={templateLoading}
                                >
                                    Gönder
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                title={<Text strong>{item.name}</Text>}
                                description={`Durum: ${item.status} - Dil: ${item.language}`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>
        </div>
    );
}
