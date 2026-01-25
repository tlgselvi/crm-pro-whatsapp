'use client';

import React, { useEffect } from 'react';
import { Button, Result, Typography } from 'antd';
import { supabase } from '@/lib/supabase';

const { Paragraph, Text } = Typography;

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to Supabase
        const logError = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('error_logs').insert({
                message: error.message,
                stack: error.stack,
                digest: error.digest,
                url: typeof window !== 'undefined' ? window.location.href : '',
                user_id: user?.id
            });
        };
        logError();
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f2f5'
                }}>
                    <Result
                        status="error"
                        title="Hata Oluştu"
                        subTitle="Sistemsel bir sorun tespit edildi. Teknik ekibe otomatik rapor gönderildi."
                        extra={[
                            <Button type="primary" key="console" onClick={() => reset()}>
                                Tekrar Dene
                            </Button>,
                            <Button key="home" onClick={() => window.location.href = '/'}>
                                Ana Sayfaya Dön
                            </Button>,
                        ]}
                    >
                        <div className="desc">
                            <Paragraph>
                                <Text strong style={{ fontSize: 16 }}>
                                    Hata Detayı:
                                </Text>
                            </Paragraph>
                            <Paragraph>
                                <Text code>{error.message}</Text>
                            </Paragraph>
                            {error.digest && (
                                <Paragraph>
                                    <Text type="secondary">ID: {error.digest}</Text>
                                </Paragraph>
                            )}
                        </div>
                    </Result>
                </div>
            </body>
        </html>
    );
}
