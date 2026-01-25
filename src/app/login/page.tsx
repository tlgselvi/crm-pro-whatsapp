'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, App } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { message } = App.useApp();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });

            if (error) throw error;

            message.success('Giriş başarılı! Yönlendiriliyorsunuz...');
            router.push('/dashboard');
            router.refresh();
        } catch (error: any) {
            message.error(error.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0f2f5',
            backgroundImage: 'radial-gradient(circle at 20% 30%, #e6f7ff 0%, #f0f2f5 100%)'
        }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: 12 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        background: '#1890ff',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: 'white',
                        fontSize: 32
                    }}>
                        <LoginOutlined />
                    </div>
                    <Title level={2} style={{ margin: 0 }}>CRM Pro</Title>
                    <Text type="secondary">SaaS Paneline Giriş Yapın</Text>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Lütfen e-posta adresinizi girin!' }, { type: 'email', message: 'Geçerli bir e-posta girin!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="E-posta" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Lütfen şifrenizi girin!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 45, borderRadius: 8 }}>
                            Giriş Yap
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Henüz bir hesabınız yok mu? Lütfen yönetici ile iletişime geçin.
                    </Text>
                </div>
            </Card>
        </div>
    );
}
