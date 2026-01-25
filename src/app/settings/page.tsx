'use client';

import React from 'react';
import { Card, Form, Input, Button, Switch, Divider, Typography, Space, message } from 'antd';
import { SaveOutlined, BellOutlined, GlobalOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function SettingsPage() {
    const [form] = Form.useForm();

    const handleSave = () => {
        message.success('Settings saved successfully!');
    };

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Settings</Title>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card title="WhatsApp Configuration" variant="borderless">
                    <Form form={form} layout="vertical" onFinish={handleSave}>
                        <Form.Item
                            label="Phone Number ID"
                            name="phoneNumberId"
                            help="Get this from Meta Developer Console"
                        >
                            <Input placeholder="Enter your WhatsApp Phone Number ID" />
                        </Form.Item>

                        <Form.Item
                            label="Access Token"
                            name="accessToken"
                            help="Your WhatsApp Cloud API access token"
                        >
                            <Input.Password placeholder="Enter your access token" />
                        </Form.Item>

                        <Form.Item
                            label="Webhook Verify Token"
                            name="verifyToken"
                            initialValue="crm_webhook_2026"
                        >
                            <Input.Password placeholder="Webhook verification token" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                                Save WhatsApp Settings
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Card title="Notifications" variant="borderless">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong><BellOutlined /> New Message Notifications</Text>
                                <br />
                                <Text type="secondary">Receive notifications for new messages</Text>
                            </div>
                            <Switch defaultChecked />
                        </div>

                        <Divider />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong><GlobalOutlined /> Browser Notifications</Text>
                                <br />
                                <Text type="secondary">Show browser notifications for new messages</Text>
                            </div>
                            <Switch />
                        </div>
                    </Space>
                </Card>

                <Card title="Security" variant="borderless">
                    <Form layout="vertical">
                        <Form.Item label="Current Password">
                            <Input.Password placeholder="Enter current password" />
                        </Form.Item>

                        <Form.Item label="New Password">
                            <Input.Password placeholder="Enter new password" />
                        </Form.Item>

                        <Form.Item label="Confirm New Password">
                            <Input.Password placeholder="Confirm new password" />
                        </Form.Item>

                        <Form.Item>
                            <Button icon={<LockOutlined />}>
                                Change Password
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Card title="About" variant="borderless">
                    <Space direction="vertical">
                        <Text><strong>Version:</strong> 1.0.0</Text>
                        <Text><strong>Build:</strong> Production</Text>
                        <Text><strong>Database:</strong> Supabase (eu-central-1)</Text>
                        <Text><strong>Deployment:</strong> Vercel</Text>
                        <Divider />
                        <Text type="secondary">
                            CRM Pro WhatsApp - Free-tier CRM system
                        </Text>
                        <Text type="secondary">
                            <a href="https://github.com/tlgselvi/crm-pro-whatsapp" target="_blank" rel="noopener noreferrer">
                                View on GitHub
                            </a>
                        </Text>
                    </Space>
                </Card>
            </Space>
        </div>
    );
}
