'use client';

import React, { useState, useEffect } from 'react';
import "@ant-design/v5-patch-for-react-19";
import {
    Card, Input, Button, Typography, Space, List, Tag, Modal,
    Form, App, Divider, Empty, Tooltip, Tabs, Badge, Select, Drawer
} from 'antd';
import {
    BookOutlined, PlusOutlined, DeleteOutlined, SearchOutlined,
    ClearOutlined, ThunderboltOutlined, BulbOutlined, CheckCircleOutlined,
    GlobalOutlined, ExperimentOutlined, RobotOutlined, SafetyOutlined,
    RocketOutlined, FireOutlined
} from '@ant-design/icons';
import {
    addKnowledgeEntry, getKnowledgeEntries, deleteKnowledgeEntry,
    clearAllCaches, scrapeWebsiteAction, refineTrainingPrompt,
    suggestRulesAction, type KnowledgeCategory
} from '@/lib/actions-knowledge';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function KnowledgePage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<KnowledgeCategory>('informational');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [scrapeForm] = Form.useForm();
    const [mounted, setMounted] = useState(false);
    const { message } = App.useApp();

    useEffect(() => {
        setMounted(true);
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
            const res = await addKnowledgeEntry(values.title, values.content, 'text', values.category || activeTab);
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
        const category = form.getFieldValue('category') || activeTab;
        if (!rawContent || rawContent.length < 5) {
            message.warning('Refine etmek için lütfen önce biraz içerik yazın.');
            return;
        }

        setIsRefining(true);
        try {
            const res = await refineTrainingPrompt(rawContent, category);
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
                    content: res.content,
                    category: 'informational'
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

    async function handleSuggestRules() {
        setLoading(true);
        try {
            const res = await suggestRulesAction();
            if (res.success) {
                setSuggestions(res.suggestions);
                setIsSuggestionsOpen(true);
            } else {
                message.error(res.error);
            }
        } catch (error) {
            message.error('Öneri alınamadı');
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
        (activeTab === 'informational' ? (e.category === 'informational' || !e.category) : e.category === activeTab) &&
        (e.title.toLowerCase().includes(searchText.toLowerCase()) ||
            e.content.toLowerCase().includes(searchText.toLowerCase()))
    );

    const getCategoryDetails = (cat: KnowledgeCategory) => {
        switch (cat) {
            case 'behavioral': return { icon: <RocketOutlined />, color: 'orange', label: 'Davranış Kuralları', desc: 'Botun nasıl konuşacağını ve satış stratejilerini belirleyin.' };
            case 'guardrail': return { icon: <SafetyOutlined />, color: 'red', label: 'Yasaklar & Sınırlar', desc: 'Botun asla yapmaması gerekenleri tanımlayın.' };
            default: return { icon: <BookOutlined />, color: 'blue', label: 'Genel Bilgi Bankası', desc: 'Ürün, hizmet ve genel şirket bilgilerini ekleyin.' };
        }
    };

    const tabItems = [
        { key: 'informational', label: <span><BookOutlined /> Bilgi (RAG)</span> },
        { key: 'behavioral', label: <span><Badge count={entries.filter(e => e.category === 'behavioral').length} offset={[10, 0]} color="orange"><RocketOutlined /> Davranış</Badge></span> },
        { key: 'guardrail', label: <span><Badge count={entries.filter(e => e.category === 'guardrail').length} offset={[10, 0]} color="red"><SafetyOutlined /> Yasaklar</Badge></span> },
    ];

    if (!mounted) return null;

    return (
        <div style={{ padding: '0 0 24px 0', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 32,
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div style={{ flex: '1 1 300px' }}>
                    <Title level={2} style={{ margin: 0 }}><BookOutlined /> Bilgi Bankası & Davranış Merkezi</Title>
                    <Text type="secondary">Botunuzu hem bilgilerle donatın hem de nasıl davranacağını kural altına alın.</Text>
                </div>
                <Space wrap size={[8, 16]} style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
                    <Tooltip title="AI ile işletmenize özel kurallar üretin">
                        <Button icon={<FireOutlined />} onClick={handleSuggestRules}>AI Kural Önerileri</Button>
                    </Tooltip>
                    <Button icon={<ClearOutlined />} onClick={handleClearCache}>Önizleme</Button>
                    <Button icon={<GlobalOutlined />} onClick={() => setIsScrapeModalOpen(true)}>Web'den Öğret</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        form.setFieldsValue({ category: activeTab });
                        setIsModalOpen(true);
                    }}>Yeni Ekle</Button>
                </Space>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as KnowledgeCategory)}
                items={tabItems}
                style={{ marginBottom: 24 }}
            />

            <div style={{ marginBottom: 24 }}>
                <Input
                    placeholder="Ara..."
                    prefix={<SearchOutlined />}
                    size="large"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="glass-card"
                    style={{ height: 50 }}
                />
            </div>

            <Card className="glass-card" style={{ marginBottom: 24, background: 'rgba(255, 255, 255, 0.05)' }}>
                <Space size="middle">
                    {getCategoryDetails(activeTab).icon}
                    <div>
                        <Title level={5} style={{ margin: 0 }}>{getCategoryDetails(activeTab).label}</Title>
                        <Text type="secondary">{getCategoryDetails(activeTab).desc}</Text>
                    </div>
                </Space>
            </Card>

            {loading && entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 100 }}><ThunderboltOutlined spin style={{ fontSize: 40, color: 'var(--primary)' }} /></div>
            ) : filteredEntries.length === 0 ? (
                <Card className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
                    <Empty description="Bu kategoride henüz bir veri bulunamadı." />
                    <Button type="primary" style={{ marginTop: 16 }} onClick={() => setIsModalOpen(true)}>İlk Bilgiyi/Kuralı Ekle</Button>
                </Card>
            ) : (
                <List
                    grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
                    dataSource={filteredEntries}
                    renderItem={item => (
                        <List.Item key={item.id}>
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
                                    <Tag color={getCategoryDetails(item.category || 'informational').color}>
                                        {(item.category || 'informational').toUpperCase()}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />
            )}

            {/* New Knowledge/Rule Modal */}
            <Modal
                title={<span><RobotOutlined /> Yeni Eğitim Kaydı</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleAdd}>
                    <Form.Item name="category" label="Eğitim Türü" rules={[{ required: true }]}>
                        <Select options={[
                            { label: 'Bilgi (RAG) - Web sitesi bilgileri, ürün detayları vb.', value: 'informational' },
                            { label: 'Davranış (Behavior) - Konuşma tarzı, satış kuralları vb.', value: 'behavioral' },
                            { label: 'Yasak (Guardrail) - Konuşulmaması gerekenler vb.', value: 'guardrail' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="title" label="Başlık" rules={[{ required: true, message: 'Bir başlık girin' }]}>
                        <Input placeholder="Örn: İade Politikası veya Selamlama Kuralı" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label={
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span>İçerik / Kural Metni</span>
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<ExperimentOutlined />}
                                    onClick={handleMagicRefine}
                                    loading={isRefining}
                                >
                                    AI ile Profesyonelleştir
                                </Button>
                            </div>
                        }
                        rules={[{ required: true, message: 'İçeriği girin' }]}
                    >
                        <TextArea rows={12} placeholder="AI'ya ne yapması/bilmesi gerektiğini buraya yazın..." />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 45 }}>
                            Sistemi Eğit ve Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* AI Rule Suggestions Drawer */}
            <Drawer
                title={<span><FireOutlined style={{ color: 'orange' }} /> AI Kural Önerileri</span>}
                placement="right"
                onClose={() => setIsSuggestionsOpen(false)}
                open={isSuggestionsOpen}
                width={500}
            >
                <Paragraph>AI, işletmenizi analiz etti ve aşağıdaki eksik davranış/yasak kurallarını önerdi:</Paragraph>
                <List
                    dataSource={suggestions}
                    renderItem={(sug: any, index: number) => (
                        <Card key={`${sug.title}-${index}`} size="small" style={{ marginBottom: 16 }} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <Title level={5} style={{ margin: 0 }}>{sug.title}</Title>
                                    <Tag color={sug.category === 'behavioral' ? 'orange' : 'red'}>{sug.category.toUpperCase()}</Tag>
                                    <Paragraph style={{ marginTop: 8, fontSize: 13 }}>{sug.content}</Paragraph>
                                    <Text type="secondary" italic style={{ fontSize: 12 }}>Neden: {sug.reason}</Text>
                                </div>
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setIsModalOpen(true);
                                        form.setFieldsValue({
                                            title: sug.title,
                                            content: sug.content,
                                            category: sug.category
                                        });
                                    }}
                                >Ekle</Button>
                            </div>
                        </Card>
                    )}
                />
            </Drawer>

            {/* Scrape Website Modal */}
            <Modal
                title={<span><GlobalOutlined /> Web Sitesinden Öğret</span>}
                open={isScrapeModalOpen}
                onCancel={() => setIsScrapeModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={scrapeForm} layout="vertical" onFinish={handleScrape}>
                    <Paragraph>Web sitenizin URL'sini girin. AI sayfayı ziyaret edecek ve kritik bilgileri ayıklayacaktır.</Paragraph>
                    <Form.Item name="url" label="Web Sitesi URL" rules={[{ required: true }, { type: 'url' }]}>
                        <Input placeholder="https://www.siteniz.com" prefix={<GlobalOutlined />} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 45 }}>
                            Siteyi Analiz Et
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
