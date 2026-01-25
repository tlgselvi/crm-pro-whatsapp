'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Button, Space } from 'antd';
import { RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface BotRule {
    keywords: string[];
    response: string;
    autoReply: boolean;
}

export default function SalesbotPage() {
    const [rules, setRules] = useState<BotRule[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // In a real app, fetch from API
        const defaultRules: BotRule[] = [
            {
                keywords: ['merhaba', 'selam', 'hey', 'hi'],
                response: 'Merhaba! 👋 Size nasıl yardımcı olabilirim?',
                autoReply: true,
            },
            {
                keywords: ['fiyat', 'ücret', 'ne kadar'],
                response: 'Fiyat listemiz için detaylı bilgi vereyim...',
                autoReply: true,
            },
            {
                keywords: ['katalog', 'ürünler'],
                response: 'Ürün kataloğumuzu inceleyebilirsiniz...',
                autoReply: true,
            },
            {
                keywords: ['demo', 'deneme'],
                response: '7 günlük ücretsiz deneme için e-posta adresinizi paylaşın.',
                autoReply: true,
            },
            {
                keywords: ['destek', 'yardım'],
                response: 'Destek ekibimiz size yardımcı olacak!',
                autoReply: true,
            },
        ];
        setRules(defaultRules);
    }, []);

    const columns = [
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, record: BotRule) => (
                <Tag icon={<CheckCircleOutlined />} color="success">
                    Active
                </Tag>
            ),
        },
        {
            title: 'Trigger Keywords',
            dataIndex: 'keywords',
            key: 'keywords',
            render: (keywords: string[]) => (
                <Space size={[0, 8]} wrap>
                    {keywords.map((keyword, idx) => (
                        <Tag key={idx} color="blue">
                            {keyword}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Bot Response',
            dataIndex: 'response',
            key: 'response',
            ellipsis: true,
            render: (text: string) => (
                <Text style={{ fontSize: 13 }}>{text.substring(0, 100)}...</Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: () => (
                <Space>
                    <Button type="link" size="small">Edit</Button>
                    <Button type="link" size="small" danger>Delete</Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        <RobotOutlined /> Salesbot Rules
                    </Title>
                    <Text type="secondary">Automated responses for common customer queries</Text>
                </div>
                <Button type="primary">+ Add New Rule</Button>
            </div>

            <Card bordered={false}>
                <Table
                    dataSource={rules}
                    columns={columns}
                    rowKey={(record) => record.keywords.join('-')}
                    loading={loading}
                    pagination={false}
                />
            </Card>

            <Card
                title="📊 Salesbot Analytics"
                bordered={false}
                style={{ marginTop: 24 }}
            >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Total Auto-Replies (Today)</Text>
                        <Tag color="green">42</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Most Triggered Keyword</Text>
                        <Tag color="blue">fiyat</Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Success Rate</Text>
                        <Tag color="purple">87%</Tag>
                    </div>
                </Space>
            </Card>

            <Card
                title="💡 How It Works"
                bordered={false}
                style={{ marginTop: 24 }}
            >
                <ol style={{ paddingLeft: 20 }}>
                    <li>Customer sends a WhatsApp message</li>
                    <li>Salesbot scans the message for matching keywords</li>
                    <li>If a match is found, bot auto-replies instantly</li>
                    <li>Message is saved to database and appears in Inbox</li>
                    <li>Agent can take over the conversation anytime</li>
                </ol>
            </Card>
        </div>
    );
}
