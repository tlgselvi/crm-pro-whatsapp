'use client';

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, App, Result } from 'antd';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

const { Title } = Typography;

export default function PublicFormPage() {
    const params = useParams();
    const formId = params.id as string;
    const [formSettings, setFormSettings] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const { message } = App.useApp();

    useEffect(() => {
        if (formId) fetchForm();
    }, [formId]);

    async function fetchForm() {
        const { data, error } = await supabase.from('forms').select('*').eq('id', formId).single();
        if (data) setFormSettings(data);
    }

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await fetch('/api/submit-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, formId })
            });

            if (!response.ok) throw new Error('Yükleme hatası');
            setSubmitted(true);
        } catch (error: any) {
            message.error('Giriş başarısız. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <Result
                status="success"
                title={formSettings?.settings?.successMessage || "Mesajınız alındı!"}
                subTitle="Kısa süre içinde sizinle iletişime geçeceğiz."
            />
        );
    }

    if (!formSettings) return <div style={{ padding: 20 }}>Yükleniyor...</div>;

    return (
        <div style={{ padding: '20px', background: '#fff', minHeight: '100vh' }}>
            <Title level={3}>{formSettings.title}</Title>
            <Form layout="vertical" onFinish={onFinish} size="large">
                <Form.Item name="name" label="Ad Soyad" rules={[{ required: true }]}>
                    <Input placeholder="Adınız" />
                </Form.Item>
                <Form.Item name="email" label="E-posta">
                    <Input type="email" placeholder="E-posta adresiniz" />
                </Form.Item>
                <Form.Item name="phone" label="Telefon" rules={[{ required: true }]}>
                    <Input placeholder="5xx xxx xxxx" />
                </Form.Item>
                <Form.Item name="message" label="Mesajınız">
                    <Input.TextArea rows={4} placeholder="Size nasıl yardımcı olabiliriz?" />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        {formSettings.settings?.buttonText || 'Gönder'}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}
