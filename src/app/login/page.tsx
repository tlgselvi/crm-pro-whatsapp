'use client';

import React, { useState } from 'react';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { Form, Input, Button, Card, Typography, message, App, Divider } from 'antd';
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
            background: '#09090b',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Lighting Effects */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '60%',
                height: '60%',
                background: 'radial-gradient(circle, rgba(29, 78, 216, 0.15), transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: '60%',
                height: '60%',
                background: 'radial-gradient(circle, rgba(147, 51, 234, 0.15), transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />

            <Card style={{
                width: 420,
                backdropFilter: 'blur(24px)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                borderRadius: 24,
                zIndex: 1,
                padding: 12
            }} bordered={false}>
                <div style={{ textAlign: 'center', marginBottom: 40, paddingTop: 12 }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #7e22ce 100%)',
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        color: 'white',
                        fontSize: 32,
                        boxShadow: '0 10px 25px -5px rgba(126, 34, 206, 0.3)'
                    }}>
                        <LoginOutlined />
                    </div>
                    <Title level={2} style={{ margin: '0 0 8px 0', color: 'white', fontWeight: 600, letterSpacing: '-0.5px' }}>
                        Hoş Geldiniz
                    </Title>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 15 }}>
                        CRM Pro panelinize giriş yapın
                    </Text>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                    requiredMark={false}
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'E-posta adresi gerekli' }]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: 'rgba(255, 255, 255, 0.25)' }} />}
                            placeholder="E-posta"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                height: 50,
                                borderRadius: 12
                            }}
                            className="glass-input"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Şifre gerekli' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: 'rgba(255, 255, 255, 0.25)' }} />}
                            placeholder="Şifre"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                height: 50,
                                borderRadius: 12
                            }}
                            className="glass-input"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 20 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{
                                height: 50,
                                borderRadius: 12,
                                background: 'white',
                                color: 'black',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: 16
                            }}
                        >
                            Giriş Yap
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 13 }}>
                        Hesabınız yok mu? <span style={{ color: 'white', cursor: 'pointer', textDecoration: 'underline' }}>Yönetici ile görüşün</span>
                    </Text>
                </div>
            </Card>

            <style jsx global>{`
                .glass-input::placeholder {
                    color: rgba(255, 255, 255, 0.35) !important;
                }
                .glass-input input {
                    background: transparent !important;
                    color: white !important;
                }
                .ant-input-password-icon {
                    color: rgba(255, 255, 255, 0.35) !important;
                }
            `}</style>
        </div>
    );
}
