'use client';

import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, List, Tag, Modal, Form, App, Divider, Empty, Tooltip } from 'antd';
import {
    BookOutlined,
    PlusOutlined,
    DeleteOutlined,
    SearchOutlined,
    ClearOutlined,
    ThunderboltOutlined,
    BulbOutlined,
    SafetyCertificateOutlined
} from '@ant-design/icons';
import { addKnowledgeEntry, getKnowledgeEntries, deleteKnowledgeEntry, clearAllCaches } from '@/lib/actions-knowledge';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function KnowledgePage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const { message } = App.useApp();

    useEffect(() => {
        fetchEntries();
    }, []);

    async function fetchEntries() {
        setLoading(true);
        try {
            const data = await getKnowledgeEntries();
            setEntries(data || []);
        } catch (error) {
            message.error('Veriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(values: any) {
        setLoading(true);
        try {
            await addKnowledgeEntry(values.title, values.content);
            message.success('Bilgi eklendi ve AI eğitildi! 🧠');
            setIsModalOpen(false);
            form.resetFields();
            await fetchEntries();
        } catch (error: any) {
            message.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        setLoading(true);
        try {
            await deleteKnowledgeEntry(id);
            message.success('Bilgi silindi');
            await fetchEntries();
        } catch (error) {
            message.error('Silinemedi');
        } finally {
            setLoading(false);
        }
    }

    async function handleClearCache() {
        try {
            const res = await clearAllCaches();
            message.success(res.message);
        } catch (error) {
            message.error('Önbellek temizlenemedi');
        }
    }

    const filteredEntries = entries.filter(e =>
        e.title.toLowerCase().includes(searchText.toLowerCase()) ||
        e.content.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <Title level={2}><BookOutlined /> Bilgi Bankası (Eğitim)</Title>
                    <Text type="secondary">Botunuza şirketiniz, ürünleriniz ve hizmetleriniz hakkında derinlemesine bilgi verin. AI bu bilgileri kullanarak müşterilere yanıt verecektir.</Text>
                </div>
                <Space>
                    <Tooltip title="Tüm sistem önbelleklerini temizle ve verileri tazele">
                        <Button icon={<ClearOutlined />} onClick={handleClearCache}>Önbelleği Temizle</Button>
                    </Tooltip>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Yeni Bilgi Ekle</Button>
                </Space>
            </div>

            <div style={{ marginBottom: 24 }}>
                <Input
                    placeholder="Bilgi ara..."
                    prefix={<SearchOutlined />}
                    size="large"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="glass-card"
                    style={{ height: 50 }}
                />
            </div>

            {loading && entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 100 }}><ThunderboltOutlined spin style={{ fontSize: 40, color: 'var(--primary)' }} /></div>
            ) : filteredEntries.length === 0 ? (
                <Card className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
                    <Empty description="Herhangi bir eğitim verisi bulunamadı." />
                    <Button type="primary" style={{ marginTop: 16 }} onClick={() => setIsModalOpen(true)}>İlk Bilgiyi Ekle</Button>
                </Card>
            ) : (
                <List
                    grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                    dataSource={filteredEntries}
                    renderItem={item => (
                        <List.Item>
                            <Card
                                className="glass-card"
                                hoverable
                                title={item.title}
                                extra={
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDelete(item.id)}
                                    />
                                }
                            >
                                <Paragraph ellipsis={{ rows: 4, expandable: true, symbol: 'devamını oku' }}>
                                    {item.content}
                                </Paragraph>
                                <Divider style={{ margin: '12px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Tag color="blue">{item.type?.toUpperCase() || 'TEXT'}</Tag>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />
            )}

            {/* Guide Card */}
            <Card className="glass-card" style={{ marginTop: 40, border: '1px solid rgba(168, 199, 250, 0.2)' }}>
                <Title level={4}><BulbOutlined /> Nasıl Eğitmeli?</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> **Eksiksiz Bilgi**: Ürünlerinizin özelliklerini, fiyatlarını ve sevkiyat politikalarınızı detaylıca yazın.</Text>
                    <Text><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> **Soru-Cevap**: Sıkça sorulan soruları (SSS) soru ve cevap şeklinde eklemek botun başarısını artırır.</Text>
                    <Text><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> **Prompt Bağlantısı**: Buraya eklediğiniz her şey, otomasyonlardaki "AI Agent" düğümleri için de kaynak olur.</Text>
                </Space>
            </Card>

            <Modal
                title="Yeni Bilgi Ekle"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleAdd}>
                    <Form.Item name="title" label="Başlık" rules={[{ required: true, message: 'Bir başlık girin' }]}>
                        <Input placeholder="Örn: Kargo ve Teslimat Politikası" />
                    </Form.Item>
                    <Form.Item name="content" label="İçerik / Bilgi Metni" rules={[{ required: true, message: 'Eğitim içeriğini girin' }]}>
                        <TextArea rows={8} placeholder="Müşteriye verilecek bilgileri buraya detaylıca yazın..." />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 45 }}>
                            AI'yı Eğit ve Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
