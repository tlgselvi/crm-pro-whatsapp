'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Table, Space, Typography, Badge, App, Tabs, List, Empty } from 'antd';
import { RobotOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, BookOutlined, SettingOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function AiSettingsPage() {
    const [settingsForm] = Form.useForm();
    const [kbForm] = Form.useForm();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [kbData, setKbData] = useState<any[]>([]);
    const [kbLoading, setKbLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchKnowledgeBase();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ai_settings')
                .select('*')
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) settingsForm.setFieldsValue(data);
        } catch (error: any) {
            message.error('Ayarlar yüklenemedi: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchKnowledgeBase() {
        setKbLoading(true);
        try {
            const { data, error } = await supabase
                .from('knowledge_base')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setKbData(data || []);
        } catch (error: any) {
            message.error('Bilgi bankası yüklenemedi');
        } finally {
            setKbLoading(false);
        }
    }

    const onSettingsFinish = async (values: any) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('ai_settings')
                .upsert({
                    id: (await supabase.from('ai_settings').select('id').single()).data?.id || undefined,
                    ...values
                });
            if (error) throw error;
            message.success('AI Ayarları başarıyla güncellendi');
        } catch (error: any) {
            message.error('Güncelleme hatası: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const onKbFinish = async (values: any) => {
        setKbLoading(true);
        try {
            const { error } = await supabase
                .from('knowledge_base')
                .insert(values);
            if (error) throw error;
            kbForm.resetFields();
            fetchKnowledgeBase();
            message.success('Bilgi eklendi');
        } catch (error: any) {
            message.error('Ekleme hatası');
        } finally {
            setKbLoading(false);
        }
    };

    const deleteKbItem = async (id: string) => {
        try {
            const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
            if (error) throw error;
            fetchKnowledgeBase();
            message.success('Bilgi silindi');
        } catch (error: any) {
            message.error('Silme hatası');
        }
    };

    const kbColumns = [
        { title: 'Konu', dataIndex: 'topic', key: 'topic', width: '30%' },
        { title: 'İçerik', dataIndex: 'content', key: 'content' },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (_: any, record: any) => (
                <Button danger icon={<DeleteOutlined />} onClick={() => deleteKbItem(record.id)} />
            )
        },
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}><RobotOutlined /> AI Eğitim Merkezi</Title>
                <Paragraph>Botun şirketini daha iyi tanıması için ayarları yap ve bilgi bankasını doldur.</Paragraph>
            </div>

            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1',
                    label: <span><SettingOutlined /> Genel Ayarlar</span>,
                    children: (
                        <Card loading={loading}>
                            <Form form={settingsForm} layout="vertical" onFinish={onSettingsFinish}>
                                <Form.Item name="company_name" label="Şirket Adı" rules={[{ required: true }]}>
                                    <Input placeholder="Örn: ABC Teknoloji" />
                                </Form.Item>
                                <Form.Item name="tone" label="Cevap Tonu" rules={[{ required: true }]}>
                                    <Select options={[
                                        { label: 'Profesyonel & Kurumsal', value: 'professional' },
                                        { label: 'Samimi & Dostça', value: 'friendly' },
                                        { label: 'Resmi & Ciddi', value: 'formal' },
                                    ]} />
                                </Form.Item>
                                <Form.Item name="system_instructions" label="Genel Bot Talimatları">
                                    <TextArea rows={4} placeholder="Örn: Müşterilere her zaman ismimizle hitap et, teknik detaylara girme." />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
                                        Ayarları Kaydet
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Card>
                    )
                },
                {
                    key: '2',
                    label: <span><BookOutlined /> Bilgi Bankası</span>,
                    children: (
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            <Card title="Yeni Bilgi Ekle" size="small">
                                <Form form={kbForm} layout="vertical" onFinish={onKbFinish}>
                                    <Form.Item name="topic" label="Soru veya Konu" rules={[{ required: true }]}>
                                        <Input placeholder="Örn: Çalışma saatleriniz nedir?" />
                                    </Form.Item>
                                    <Form.Item name="content" label="Cevap veya Bilgi" rules={[{ required: true }]}>
                                        <TextArea rows={3} placeholder="Örn: Pazartesi-Cuma 09:00 - 18:00 arası hizmet veriyoruz." />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={kbLoading}>
                                            Ekle
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>

                            <Card title="Kayıtlı Bilgiler">
                                <Table
                                    dataSource={kbData}
                                    columns={kbColumns}
                                    loading={kbLoading}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                />
                            </Card>
                        </Space>
                    )
                }
            ]} />
        </div>
    );
}
