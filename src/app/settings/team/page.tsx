'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Typography, Modal, Form, Input, Select, App, Avatar } from 'antd';
import { UserOutlined, UserAddOutlined, TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function TeamPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { message } = App.useApp();
    const [form] = Form.useForm();

    useEffect(() => {
        fetchMembers();
    }, []);

    async function fetchMembers() {
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*');
        if (!error) setMembers(data || []);
        setLoading(false);
    }

    const inviteMember = async (values: any) => {
        message.info('Davet etme özelliği Supabase Auth panelinden veya Edge Function ile yapılmalıdır. Simüle ediliyor...');
        setIsModalOpen(false);
    };

    const columns = [
        {
            title: 'Üye',
            key: 'user',
            render: (_: any, record: any) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <Text strong>{record.full_name || 'İsimsiz Kullanıcı'}</Text>
                </Space>
            )
        },
        {
            title: 'Rol',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color={role === 'admin' ? 'pro-blue' : 'green'} icon={<SafetyCertificateOutlined />}>
                    {role.toUpperCase()}
                </Tag>
            )
        },
        { title: 'Katılım', dataIndex: 'created_at', key: 'date', render: (d: any) => new Date(d).toLocaleDateString() },
        {
            title: 'İşlem',
            key: 'action',
            render: (_: any, record: any) => (
                <Button size="small" disabled={record.role === 'admin'}>Düzenle</Button>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2}><TeamOutlined /> Takım Yönetimi</Title>
                    <Text type="secondary">Ekiplerinizi yönetin ve erişim yetkilerini ayarlayın.</Text>
                </div>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsModalOpen(true)}>Yeni Üye Davet Et</Button>
            </div>

            <Card>
                <Table dataSource={members} columns={columns} rowKey="id" loading={loading} />
            </Card>

            <Modal
                title="Yeni Takım Üyesi Davet Et"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={inviteMember}>
                    <Form.Item name="email" label="E-posta Adresi" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="ornek@sirket.com" />
                    </Form.Item>
                    <Form.Item name="role" label="Yetki Rolü" initialValue="agent">
                        <Select options={[
                            { label: 'Admin (Tam Yetki)', value: 'admin' },
                            { label: 'Agent (Sınırlı Yetki)', value: 'agent' },
                        ]} />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Davetiye Gönder
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
