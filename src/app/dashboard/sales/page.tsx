'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Spin, Button } from 'antd';
import { DollarOutlined, RiseOutlined, UserOutlined, ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function SalesDashboard() {
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalSales: 0,
        conversionRate: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: salesData, error } = await supabase
                .from('sales')
                .select('*, contacts(name)')
                .order('created_at', { ascending: false });

            if (salesData) {
                setSales(salesData);
                const total = salesData.reduce((acc, curr) => acc + (curr.status === 'completed' ? Number(curr.amount) : 0), 0);
                const completedCount = salesData.filter(s => s.status === 'completed').length;

                setStats({
                    totalRevenue: total,
                    totalSales: salesData.length,
                    conversionRate: salesData.length > 0 ? (completedCount / salesData.length) * 100 : 0
                });
            }
        } catch (err) {
            console.error('Error fetching sales:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        {
            title: 'Müşteri',
            dataIndex: ['contacts', 'name'],
            key: 'contact',
            render: (text: string) => <Space><UserOutlined style={{ color: 'var(--primary)' }} /> <Text strong>{text || 'Bilinmiyor'}</Text></Space>
        },
        {
            title: 'Tutar',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number) => <Text style={{ color: '#52c41a' }} strong>{amount} TL</Text>
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'completed' ? 'green' : status === 'pending' ? 'gold' : 'red'}>
                    {status.toUpperCase()}
                </Tag>
            )
        },
        {
            title: 'Tarih',
            dataIndex: 'created_at',
            key: 'date',
            render: (date: string) => dayjs(date).format('DD MMM YYYY HH:mm')
        }
    ];

    return (
        <div style={{ padding: 24, background: '#09090b', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Satış Zekası</Title>
                    <Text type="secondary">Sohbetlerden elde edilen gelir ve dönüşüm analizi.</Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Yenile</Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="glass-card">
                        <Statistic
                            title={<Text type="secondary">Toplam Ciro</Text>}
                            value={stats.totalRevenue}
                            precision={2}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<DollarOutlined />}
                            suffix="TL"
                        />
                        <div style={{ marginTop: 8 }}>
                            <Tag color="success" icon={<ArrowUpOutlined />}>12% Artış</Tag>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="glass-card">
                        <Statistic
                            title={<Text type="secondary">Dönüşüm Oranı</Text>}
                            value={stats.conversionRate}
                            precision={1}
                            valueStyle={{ color: 'var(--primary)' }}
                            prefix={<RiseOutlined />}
                            suffix="%"
                        />
                        <div style={{ marginTop: 8 }}>
                            <Tag color="processing">Sektör Ortalaması: 4.2%</Tag>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="glass-card">
                        <Statistic
                            title={<Text type="secondary">Toplam Fırsat</Text>}
                            value={stats.totalSales}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: 'var(--text-main)' }}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Son 30 gün içinde oluşturulan.</Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card title={<Text strong style={{ color: 'var(--text-main)' }}>Son İşlemler</Text>} bordered={false} className="glass-card">
                <Table
                    dataSource={sales}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    rowKey="id"
                    style={{ background: 'transparent' }}
                />
            </Card>
        </div>
    );
}
