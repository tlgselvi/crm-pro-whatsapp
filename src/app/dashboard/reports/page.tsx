'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Typography,
  Space,
  Spin,
  Empty,
  Divider,
} from 'antd';
import {
  FireOutlined,
  ThunderboltOutlined,
  SnowflakeOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyLead {
  date: string;
  label: string;
  count: number;
}

interface TempCount {
  HOT: number;
  WARM: number;
  COLD: number;
  UNKNOWN: number;
}

interface StageCount {
  stage: string;
  count: number;
}

interface HourlyMessage {
  hour: number;
  count: number;
}

interface ReportData {
  dailyLeads: DailyLead[];
  totalWeekLeads: number;
  tempCounts: TempCount;
  stageCounts: StageCount[];
  hourlyMessages: HourlyMessage[];
  totalMessages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  new: 'Yeni Lead',
  contacted: 'İletişim Kuruldu',
  qualified: 'Nitelikli',
  proposal: 'Teklif Verildi',
  negotiation: 'Pazarlık',
  won: '🏆 Kazanıldı',
  lost: '❌ Kaybedildi',
  new_lead: 'Yeni Lead',
};

const STAGE_COLORS: Record<string, string> = {
  new: '#1890ff',
  new_lead: '#1890ff',
  contacted: '#52c41a',
  qualified: '#13c2c2',
  proposal: '#faad14',
  negotiation: '#fa8c16',
  won: '#389e0d',
  lost: '#cf1322',
};

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      const now = dayjs();
      const sevenDaysAgo = now.subtract(6, 'day').startOf('day').toISOString();

      // ── 1. Son 7 günlük lead sayıları ──────────────────────────────────────
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('created_at, lead_temperature, pipeline_stage')
        .gte('created_at', sevenDaysAgo);

      if (contactsError) throw contactsError;

      // Günlük breakdown
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const day = now.subtract(i, 'day');
        dailyMap[day.format('YYYY-MM-DD')] = 0;
      }

      // Sıcaklık sayıları
      const tempCounts: TempCount = { HOT: 0, WARM: 0, COLD: 0, UNKNOWN: 0 };

      // Pipeline aşama sayıları
      const stageMap: Record<string, number> = {};

      (contacts || []).forEach((c) => {
        const day = dayjs(c.created_at).format('YYYY-MM-DD');
        if (day in dailyMap) dailyMap[day]++;

        const temp = c.lead_temperature as keyof TempCount;
        if (temp && temp in tempCounts) {
          tempCounts[temp]++;
        } else {
          tempCounts.UNKNOWN++;
        }

        const stage = c.pipeline_stage || 'new';
        stageMap[stage] = (stageMap[stage] || 0) + 1;
      });

      const dailyLeads: DailyLead[] = Object.entries(dailyMap).map(([date, count]) => ({
        date,
        label: TR_DAYS[dayjs(date).day()],
        count,
      }));

      const totalWeekLeads = Object.values(dailyMap).reduce((a, b) => a + b, 0);

      const stageCounts: StageCount[] = Object.entries(stageMap)
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count);

      // ── 2. En aktif saatler (messages tablosu) ─────────────────────────────
      const thirtyDaysAgo = now.subtract(30, 'day').toISOString();
      const { data: messages, error: msgsError } = await supabase
        .from('messages')
        .select('timestamp')
        .gte('timestamp', thirtyDaysAgo);

      if (msgsError) throw msgsError;

      const hourMap: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hourMap[h] = 0;

      (messages || []).forEach((m) => {
        const hour = dayjs(m.timestamp).hour();
        hourMap[hour]++;
      });

      const hourlyMessages: HourlyMessage[] = Object.entries(hourMap)
        .map(([h, count]) => ({ hour: Number(h), count }))
        .sort((a, b) => a.hour - b.hour);

      const totalMessages = (messages || []).length;

      setData({
        dailyLeads,
        totalWeekLeads,
        tempCounts,
        stageCounts,
        hourlyMessages,
        totalMessages,
      });
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Rapor verileri yükleniyor..." />
      </div>
    );
  }

  if (!data) {
    return <Empty description="Veri yüklenemedi. Supabase bağlantısını kontrol edin." />;
  }

  const { dailyLeads, totalWeekLeads, tempCounts, stageCounts, hourlyMessages, totalMessages } = data;

  const totalTemp = tempCounts.HOT + tempCounts.WARM + tempCounts.COLD + tempCounts.UNKNOWN;
  const maxDailyCount = Math.max(...dailyLeads.map((d) => d.count), 1);
  const maxHourCount = Math.max(...hourlyMessages.map((h) => h.count), 1);
  const totalStageCount = stageCounts.reduce((a, b) => a + b.count, 0) || 1;

  // ── Tablo kolonları (haftalık leadler) ──────────────────────────────────────
  const dailyColumns = [
    {
      title: 'Gün',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record: DailyLead) => (
        <Space>
          <Text strong>{label}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.date}</Text>
        </Space>
      ),
    },
    {
      title: 'Yeni Lead',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => (
        <Space>
          <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
          <div style={{ width: 120 }}>
            <div
              style={{
                height: 8,
                backgroundColor: count > 0 ? '#1890ff' : '#f0f0f0',
                width: `${(count / maxDailyCount) * 100}%`,
                borderRadius: 4,
                minWidth: count > 0 ? 8 : 0,
                transition: 'width 0.3s',
              }}
            />
          </div>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      <Title level={2}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        Haftalık Raporlar
      </Title>
      <Text type="secondary">Son 7 gün • Gerçek zamanlı Supabase verisi</Text>

      <Divider />

      {/* ── Özet Kartları ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Bu Hafta Yeni Lead"
              value={totalWeekLeads}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="🔥 HOT Lead"
              value={tempCounts.HOT}
              valueStyle={{ color: '#cf1322' }}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Son 30 Gün Mesaj"
              value={totalMessages}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pipeline Toplam"
              value={totalStageCount}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Satır 1: Haftalık Tablo + Sıcaklık Dağılımı ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Haftalık Lead Özeti */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Haftalık Lead Özeti (Son 7 Gün)</span>
              </Space>
            }
          >
            <Table
              dataSource={dailyLeads}
              columns={dailyColumns}
              rowKey="date"
              pagination={false}
              size="small"
              summary={(pageData) => {
                const total = pageData.reduce((sum, r) => sum + r.count, 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Toplam</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Tag color="blue" style={{ fontWeight: 700 }}>{total}</Tag>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        </Col>

        {/* Lead Sıcaklık Dağılımı */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <FireOutlined />
                <span>Lead Sıcaklık Dağılımı</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* HOT */}
              <div>
                <Space style={{ marginBottom: 6, justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    <Tag color="red" icon={<FireOutlined />}>HOT</Tag>
                    <Text>Sıcak Lead</Text>
                  </Space>
                  <Text strong>{tempCounts.HOT}</Text>
                </Space>
                <Progress
                  percent={totalTemp > 0 ? Math.round((tempCounts.HOT / totalTemp) * 100) : 0}
                  strokeColor="#cf1322"
                  showInfo
                />
              </div>

              {/* WARM */}
              <div>
                <Space style={{ marginBottom: 6, justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    <Tag color="orange" icon={<ThunderboltOutlined />}>WARM</Tag>
                    <Text>Ilık Lead</Text>
                  </Space>
                  <Text strong>{tempCounts.WARM}</Text>
                </Space>
                <Progress
                  percent={totalTemp > 0 ? Math.round((tempCounts.WARM / totalTemp) * 100) : 0}
                  strokeColor="#fa8c16"
                  showInfo
                />
              </div>

              {/* COLD */}
              <div>
                <Space style={{ marginBottom: 6, justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    <Tag color="blue" icon={<SnowflakeOutlined />}>COLD</Tag>
                    <Text>Soğuk Lead</Text>
                  </Space>
                  <Text strong>{tempCounts.COLD}</Text>
                </Space>
                <Progress
                  percent={totalTemp > 0 ? Math.round((tempCounts.COLD / totalTemp) * 100) : 0}
                  strokeColor="#1890ff"
                  showInfo
                />
              </div>

              {tempCounts.UNKNOWN > 0 && (
                <div>
                  <Space style={{ marginBottom: 6, justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                      <Tag color="default">—</Tag>
                      <Text type="secondary">Belirsiz</Text>
                    </Space>
                    <Text type="secondary">{tempCounts.UNKNOWN}</Text>
                  </Space>
                  <Progress
                    percent={totalTemp > 0 ? Math.round((tempCounts.UNKNOWN / totalTemp) * 100) : 0}
                    strokeColor="#d9d9d9"
                    showInfo
                  />
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── Satır 2: Pipeline Dağılımı + Aktif Saatler ── */}
      <Row gutter={[16, 16]}>
        {/* Pipeline Aşama Dağılımı */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                <span>Pipeline Aşama Dağılımı</span>
              </Space>
            }
          >
            {stageCounts.length === 0 ? (
              <Empty description="Henüz pipeline verisi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {stageCounts.map(({ stage, count }) => {
                  const pct = Math.round((count / totalStageCount) * 100);
                  const color = STAGE_COLORS[stage] || '#8c8c8c';
                  const label = STAGE_LABELS[stage] || stage;
                  return (
                    <div key={stage}>
                      <Space
                        style={{ marginBottom: 4, justifyContent: 'space-between', width: '100%' }}
                      >
                        <Text>{label}</Text>
                        <Space>
                          <Text strong>{count}</Text>
                          <Text type="secondary">({pct}%)</Text>
                        </Space>
                      </Space>
                      <div
                        style={{
                          height: 12,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: color,
                            borderRadius: 6,
                            transition: 'width 0.5s ease',
                            minWidth: pct > 0 ? 12 : 0,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </Space>
            )}
          </Card>
        </Col>

        {/* En Aktif Saatler */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>En Aktif Saatler (Son 30 Gün)</span>
              </Space>
            }
          >
            {totalMessages === 0 ? (
              <Empty description="Henüz mesaj verisi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {/* Basit bar chart: sadece mesaj olan saatleri göster, yoksa tüm saatleri göster */}
                {(() => {
                  const activeHours = hourlyMessages.filter((h) => h.count > 0);
                  const displayHours = activeHours.length > 0 ? activeHours : hourlyMessages.slice(8, 21);
                  return (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {displayHours.map(({ hour, count }) => {
                        const pct = Math.round((count / maxHourCount) * 100);
                        const timeLabel = `${String(hour).padStart(2, '0')}:00`;
                        const isBusinessHour = hour >= 9 && hour <= 18;
                        return (
                          <div key={hour} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text
                              style={{ width: 44, fontSize: 12, flexShrink: 0 }}
                              type={isBusinessHour ? undefined : 'secondary'}
                            >
                              {timeLabel}
                            </Text>
                            <div
                              style={{
                                flex: 1,
                                height: 16,
                                backgroundColor: '#f0f0f0',
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  backgroundColor: isBusinessHour ? '#52c41a' : '#1890ff',
                                  borderRadius: 3,
                                  transition: 'width 0.5s ease',
                                  minWidth: count > 0 ? 6 : 0,
                                }}
                              />
                            </div>
                            <Text style={{ width: 28, fontSize: 12, textAlign: 'right', flexShrink: 0 }}>
                              {count}
                            </Text>
                          </div>
                        );
                      })}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space>
                        <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#52c41a', display: 'inline-block' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Mesai saatleri (09-18)</Text>
                        <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#1890ff', display: 'inline-block', marginLeft: 8 }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Mesai dışı</Text>
                      </Space>
                    </Space>
                  );
                })()}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
