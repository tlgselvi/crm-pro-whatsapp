'use client';

import React, { useState } from 'react';
import { UserOutlined, LockOutlined, LoginOutlined, GoogleOutlined } from '@ant-design/icons';
import { Form, Input, Button, Card, Typography, message, App, Divider } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { message } = App.useApp();

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            message.error(error.message || 'Google ile giriş başarısız.');
        }
    };

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const { email, password } = values;

            // E2E Test Bypass for Elite 2026 Verification
            // IMPORTANT: Strictly restricted to 'test' environment only
            if (process.env.NEXT_PUBLIC_APP_ENV === 'test') {
                if (email === 'testuser2026@elite.com' && password === 'ElitePassword2026!') {
                    message.success('Test Oturumu Açıldı');
                    // Set a bypass cookie for the middleware
                    document.cookie = "elite_bypass_auth=true; path=/; max-age=3600; SameSite=Lax";
                    router.push('/dashboard');
                    setLoading(false);
                    return;
                }
            }



            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            message.success('Giriş başarılı! Yönlendiriliyorsunuz...');

            // Wait a bit for cookies to sync
            setTimeout(() => {
                router.refresh();
                router.push('/dashboard');
            }, 500);

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

                <div style={{ margin: '16px 0' }}>
                    <Divider plain>veya</Divider>
                    <Button
                        block
                        icon={<GoogleOutlined />}
                        onClick={handleGoogleLogin}
                        style={{
                            height: 45,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        Google ile Giriş Yap
                    </Button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Henüz bir hesabınız yok mu? Lütfen yönetici ile iletişime geçin.
                    </Text>
                </div>
            </Card>
        </div>
    );
}
