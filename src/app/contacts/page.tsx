'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, Avatar } from 'antd';
import { UserOutlined, WhatsAppOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { supabase, type Contact } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContacts();
    }, []);

    async function fetchContacts() {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setContacts(data || []);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    }

    const columns = [
        {
            title: 'Contact',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Contact) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.email || 'No email'}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone: string) => (
                <Space>
                    <PhoneOutlined />
                    <span>{phone}</span>
                </Space>
            ),
        },
        {
            title: 'Source',
            key: 'source',
            render: () => (
                <Tag icon={<WhatsAppOutlined />} color="success">
                    WhatsApp
                </Tag>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: Contact) => (
                <Space>
                    <Button type="link" size="small">View Details</Button>
                    <Button type="link" size="small">Send Message</Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Contacts</Title>
                <Button type="primary" icon={<UserOutlined />}>
                    Add Contact
                </Button>
            </div>

            <Card bordered={false}>
                <Table
                    dataSource={contacts}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
}
