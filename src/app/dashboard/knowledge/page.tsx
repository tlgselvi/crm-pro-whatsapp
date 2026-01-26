'use client';
import "@ant-design/v5-patch-for-react-19";

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
    CheckCircleOutlined,
    GlobalOutlined,
    ExperimentOutlined,
    RobotOutlined
} from '@ant-design/icons';
import {
    addKnowledgeEntry,
    getKnowledgeEntries,
    deleteKnowledgeEntry,
    clearAllCaches,
    scrapeWebsiteAction,
    refineTrainingPrompt
} from '@/lib/actions-knowledge';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function KnowledgePage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [scrapeForm] = Form.useForm();
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
            const res = await addKnowledgeEntry(values.title, values.content);
            if (res.success) {
                message.success('Bilgi eklendi ve AI eğitildi! 🧠');
                setIsModalOpen(false);
                form.resetFields();
                await fetchEntries();
            } else {
                message.error(res.error || 'Kaydedilemedi');
            }
        } catch (error: any) {
            message.error('Sistem Hatası: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleMagicRefine() {
        const rawContent = form.getFieldValue('content');
        if (!rawContent || rawContent.length < 5) {
            message.warning('Refine etmek için lütfen önce biraz içerik yazın.');
            return;
        }

        setIsRefining(true);
        try {
            const res = await refineTrainingPrompt(rawContent);
            if (res.success) {
                form.setFieldsValue({ content: res.refinedContent });
                message.success('Metin AI ile mükemmelleştirildi! ✨');
            } else {
                message.error(res.error || 'Geliştirme başarısız');
            }
        } catch (error: any) {
            message.error('Sistem Hatası: ' + error.message);
        } finally {
            setIsRefining(false);
        }
    }

    async function handleScrape(values: any) {
        setLoading(true);
        try {
            const res = await scrapeWebsiteAction(values.url);
            if (res.success) {
                setIsScrapeModalOpen(false);
                setIsModalOpen(true);
                form.setFieldsValue({
                    title: res.title,
                    content: res.content
                });
                message.success('Web sitesi içeriği hazır! Lütfen kontrol edin ve kaydedin. 🕸️');
                scrapeForm.resetFields();
            } else {
                message.error(res.error || 'Web sitesi okunamadı');
            }
        } catch (error: any) {
            message.error('Sistem Hatası: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        setLoading(true);
        try {
            const res = await deleteKnowledgeEntry(id);
            if (res.success) {
                message.success('Bilgi silindi');
                await fetchEntries();
            } else {
                message.error(res.error || 'Silinemedi');
            }
        } catch (error: any) {
            message.error('Sistem Hatası: ' + error.message);
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
                    <Button icon={<GlobalOutlined />} onClick={() => setIsScrapeModalOpen(true)}>Web'den Öğret</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        form.resetFields();
                        setIsModalOpen(true);
                    }}>Yeni Bilgi Ekle</Button>
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
                    <Space direction="vertical">
                        <Button type="primary" style={{ marginTop: 16 }} onClick={() => setIsModalOpen(true)}>İlk Bilgiyi Ekle</Button>
                        <Button icon={<GlobalOutlined />} onClick={() => setIsScrapeModalOpen(true)}>Web Sitesinden Çek</Button>
                    </Space>
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
                    <Text><CheckCircleOutlined style={{ color: '#52c41a' }} /> **Web'den Öğret**: Şirket sitenizin linkini verin, AI işinize yarayacak bilgileri saniyeler içinde ayıklasın.</Text>
                    <Text><CheckCircleOutlined style={{ color: '#52c41a' }} /> **AI ile Geliştir**: Kısa notlar yazın ve "Magic Refine" butonuna basın. AI bunu botun en iyi anlayacağı formata sokar.</Text>
                    <Text><CheckCircleOutlined style={{ color: '#52c41a' }} /> **Prompt Bağlantısı**: Buraya eklediğiniz her şey, botun genel bilgisine ve otomasyonlardaki AI Agent kararlarına doğrudan etki eder.</Text>
                </Space>
            </Card>

            {/* New Knowledge Modal */}
            <Modal
                title={<span><RobotOutlined /> Yeni Bilgi Ekle</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleAdd}>
                    <Form.Item name="title" label="Başlık" rules={[{ required: true, message: 'Bir başlık girin' }]}>
                        <Input placeholder="Örn: Kargo ve Teslimat Politikası" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label={
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span>İçerik / Bilgi Metni</span>
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<ExperimentOutlined />}
                                    onClick={handleMagicRefine}
                                    loading={isRefining}
                                >
                                    AI ile Mükemmelleştir
                                </Button>
                            </div>
                        }
                        rules={[{ required: true, message: 'Eğitim içeriğini girin' }]}
                    >
                        <TextArea rows={12} placeholder="Müşteriye verilecek bilgileri buraya detaylıca yazın veya AI'ya geliştirmesi için kısa notlar bırakın..." />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 45 }}>
                            AI'yı Eğit ve Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Scrape Website Modal */}
            <Modal
                title={<span><GlobalOutlined /> Web Sitesinden Öğret</span>}
                open={isScrapeModalOpen}
                onCancel={() => setIsScrapeModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={scrapeForm} layout="vertical" onFinish={handleScrape}>
                    <Paragraph>
                        Web sitenizin URL'sini girin. AI sayfayı ziyaret edecek, gereksiz kısımları atacak ve işletmeniz için kritik olan bilgileri ayıklayacaktır.
                    </Paragraph>
                    <Form.Item name="url" label="Web Sitesi URL" rules={[{ required: true, message: 'Bir URL girin' }, { type: 'url', message: 'Geçerli bir URL girin' }]}>
                        <Input placeholder="https://www.siteniz.com/hakkimizda" prefix={<GlobalOutlined />} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 45 }}>
                            Siteyi Tara ve Analiz Et
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
