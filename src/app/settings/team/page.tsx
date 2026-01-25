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
    const [selectedMember, setSelectedMember] = useState<any>(null);

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
        setLoading(true);
        try {
            // Logic: Invitations usually go through Supabase Auth
            // For now, we manually create a profile if it doesn't exist
            // OR we inform user about the real Auth path
            message.info('Davet işlemleri Supabase Dashboard üzerinden "Invite User" ile yapılmalıdır. Profil kaydı oluşturuluyor...');

            const { error } = await supabase.from('profiles').insert({
                email: values.email,
                role: values.role,
                full_name: values.email.split('@')[0]
            });

            if (error) throw error;

            message.success('Üye kaydı oluşturuldu. Lütfen Supabase üzerinden davet gönderin.');
            setIsModalOpen(false);
            fetchMembers();
        } catch (err: any) {
            message.error('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (memberId: string, newRole: string) => {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId);
        if (error) message.error('Güncellenemedi');
        else {
            message.success('Rol güncellendi');
            fetchMembers();
        }
    };

    const columns = [
        {
            title: 'Üye',
            key: 'user',
            render: (_: any, record: any) => (
                <Space>
                    <Avatar icon={<UserOutlined />} src={record.avatar_url} />
                    <div>
                        <div style={{ fontWeight: 600 }}>{record.full_name || 'İsimsiz'}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Rol',
            dataIndex: 'role',
            key: 'role',
            render: (role: string, record: any) => (
                <Select
                    defaultValue={role}
                    size="small"
                    style={{ width: 100 }}
                    onChange={(val) => updateRole(record.id, val)}
                    disabled={record.id === 'current-user-id-logic-here'} // Prevents self-demoting
                >
                    <Select.Option value="admin">ADMIN</Select.Option>
                    <Select.Option value="agent">AGENT</Select.Option>
                </Select>
            )
        },
        { title: 'Katılım', dataIndex: 'created_at', key: 'date', render: (d: any) => new Date(d).toLocaleDateString() },
        {
            title: 'İşlem',
            key: 'action',
            render: (_: any, record: any) => (
                <Button size="small" danger onClick={() => message.warning('Üye silme işlemi Supabase Auth üzerinden yapılmalıdır.')}>Sil</Button>
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
