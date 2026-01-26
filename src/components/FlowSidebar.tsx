import React, { useEffect } from 'react';
import { Button, Form, Input, Select, Typography, Divider, Tag, Tooltip } from 'antd';
import { DeleteOutlined, ThunderboltOutlined, MessageOutlined, ClockCircleOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import { Node } from '@xyflow/react';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FlowSidebarProps {
    selectedNode: Node | null;
    onUpdateNode: (id: string, data: any) => void;
    onDeleteNode: (id: string) => void;
}

const AVAILABLE_VARIABLES = [
    { label: 'İsim', value: '{{contact.first_name}}' },
    { label: 'Tam Ad', value: '{{contact.full_name}}' },
    { label: 'Telefon', value: '{{contact.phone}}' },
    { label: 'Firma', value: '{{contact.company}}' },
];

export default function FlowSidebar({ selectedNode, onUpdateNode, onDeleteNode }: FlowSidebarProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (selectedNode) {
            let keywords = selectedNode.data.keywords;
            // Handle legacy string CSV format if present
            if (typeof keywords === 'string') {
                keywords = keywords.split(',').map((k: string) => k.trim());
            }

            form.setFieldsValue({
                label: selectedNode.data.label,
                content: selectedNode.data.content || '',
                triggerType: selectedNode.data.triggerType || 'keyword',
                keywords: keywords || [],
                duration: selectedNode.data.duration,
                ...selectedNode.data
            });
        }
    }, [selectedNode, form]);

    if (!selectedNode) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Text type="secondary">Düzenlemek için bir düğüme tıklayın.</Text>
            </div>
        );
    }

    const handleChange = (changedValues: any, allValues: any) => {
        onUpdateNode(selectedNode.id, allValues);
    };

    const handleInsertVariable = (variable: string) => {
        const currentContent = form.getFieldValue('content') || '';
        const newContent = currentContent + ' ' + variable;
        form.setFieldsValue({ content: newContent });
        handleChange({ content: newContent }, form.getFieldsValue());
    };

    const renderTriggerForm = () => (
        <>
            <Form.Item label="Etiket (Görünen Ad)" name="label">
                <Input placeholder="Örn: Başlangıç" />
            </Form.Item>
            <Form.Item label="Tetikleyici Tipi" name="triggerType">
                <Select>
                    <Select.Option value="keyword">Anahtar Kelime</Select.Option>
                    <Select.Option value="no_reply">Cevap Verilmediğinde</Select.Option>
                    <Select.Option value="conversation_start">Konuşma Başladığında</Select.Option>
                </Select>
            </Form.Item>

            <Form.Item
                noStyle
                shouldUpdate={(prev, current) => prev.triggerType !== current.triggerType}
            >
                {({ getFieldValue }) =>
                    getFieldValue('triggerType') === 'keyword' ? (
                        <Form.Item label="Anahtar Kelimeler" name="keywords" help="Enter'a basarak birden fazla ekleyebilirsiniz.">
                            <Select
                                mode="tags"
                                style={{ width: '100%' }}
                                placeholder="Örn: merhaba, fiyat, bilgi"
                                tokenSeparators={[',']}
                                open={false}
                            />
                        </Form.Item>
                    ) : null
                }
            </Form.Item>
        </>
    );

    const renderMessageForm = () => (
        <>
            <Form.Item label="Etiket" name="label">
                <Input placeholder="Örn: Karşılama Mesajı" />
            </Form.Item>

            <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Akıllı Değişkenler (Tıkla Ekle):
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {AVAILABLE_VARIABLES.map(v => (
                        <Tag
                            key={v.value}
                            style={{ cursor: 'pointer', margin: 0 }}
                            onClick={() => handleInsertVariable(v.value)}
                            color="blue"
                        >
                            <PlusOutlined style={{ marginRight: 4, fontSize: 10 }} />
                            {v.label}
                        </Tag>
                    ))}
                </div>
            </div>

            <Form.Item label="Mesaj İçeriği" name="content">
                <TextArea
                    rows={8}
                    placeholder="Merhaba! Size nasıl yardımcı olabilirim?"
                    style={{ resize: 'none', borderRadius: 8 }}
                />
            </Form.Item>
        </>
    );

    const renderQuestionForm = () => (
        <>
            <Form.Item label="Etiket (Panelde görünür)" name="label">
                <Input placeholder="Örn: İsim Sorusu" />
            </Form.Item>
            <Form.Item label="Soru Metni (Kullanıcıya gider)" name="content">
                <TextArea rows={4} placeholder="Adınız nedir?" />
            </Form.Item>
            <Form.Item label="Cevabın Kaydedileceği Değişken" name="variable">
                <Select mode="tags" placeholder="Değişken seç veya yaz">
                    <Select.Option value="contact_name">İsim (contact_name)</Select.Option>
                    <Select.Option value="email">E-posta (email)</Select.Option>
                    <Select.Option value="phone">Telefon (phone)</Select.Option>
                    <Select.Option value="order_id">Sipariş No (order_id)</Select.Option>
                </Select>
            </Form.Item>
        </>
    );

    const renderDelayForm = () => (
        <>
            <Form.Item label="Etiket" name="label">
                <Input placeholder="Örn: 5 Dakika Bekle" />
            </Form.Item>
            <Form.Item label="Bekleme Süresi (Dakika)" name="duration">
                <Input type="number" suffix="dk" style={{ width: '100%' }} />
            </Form.Item>
        </>
    );

    const renderHandoverForm = () => (
        <>
            <Form.Item label="Etiket" name="label">
                <Input placeholder="Örn: Temsilciye Aktar" />
            </Form.Item>
            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2' }}>
                <Text type="danger" style={{ fontSize: 13 }}>
                    ⚠️ Bu adım çalıştığında bot durdurulacak ve konuşma "Bekleyenler" kutusuna düşecektir.
                </Text>
            </div>
        </>
    );

    const renderAIForm = () => (
        <>
            <Form.Item label="Etiket" name="label">
                <Input placeholder="Örn: AI Asistan" />
            </Form.Item>
            <Form.Item label="Özel Sorgu (Opsiyonel)" name="custom_query" help="Boş bırakılırsa kullanıcının son mesajı sorgu olarak kullanılır.">
                <TextArea rows={4} placeholder="Örn: Müşterinin bütçesi hakkında bilgi al." />
            </Form.Item>
            <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 8, border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <Text style={{ fontSize: 13, color: '#0891b2' }}>
                    🤖 Bu düğüm, <b>Şirket Bilgi Bankası</b> ve <b>Gemini 2.5 Flash</b> kullanarak otonom cevap üretir.
                </Text>
            </div>
        </>
    );

    return (
        <div style={{ padding: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: selectedNode.type === 'trigger' ? 'rgba(37, 99, 235, 0.1)' :
                        selectedNode.type === 'question' ? 'rgba(124, 58, 237, 0.1)' :
                            selectedNode.type === 'ai_agent' ? 'rgba(6, 182, 212, 0.1)' :
                                selectedNode.type === 'handover' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedNode.type === 'trigger' ? 'var(--primary)' :
                        selectedNode.type === 'question' ? '#7c3aed' :
                            selectedNode.type === 'ai_agent' ? '#0891b2' :
                                selectedNode.type === 'handover' ? '#ef4444' : 'var(--text-main)'
                }}>
                    {selectedNode.type === 'trigger' ? <ThunderboltOutlined style={{ fontSize: 18 }} /> :
                        selectedNode.type === 'delay' ? <ClockCircleOutlined style={{ fontSize: 18 }} /> :
                            selectedNode.type === 'question' ? <span style={{ fontSize: 18, fontWeight: 'bold' }}>?</span> :
                                selectedNode.type === 'handover' ? <span style={{ fontSize: 18 }}>👮‍♂️</span> :
                                    selectedNode.type === 'ai_agent' ? <RobotOutlined style={{ fontSize: 18 }} /> :
                                        <MessageOutlined style={{ fontSize: 18 }} />}
                </div>
                <div>
                    <Title level={5} style={{ margin: 0, color: 'var(--text-main)' }}>
                        {selectedNode.type === 'trigger' ? 'Tetikleyici' :
                            selectedNode.type === 'delay' ? 'Gecikme' :
                                selectedNode.type === 'question' ? 'Soru' :
                                    selectedNode.type === 'ai_agent' ? 'AI Agent' :
                                        selectedNode.type === 'handover' ? 'Handover' : 'Mesaj'}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>ID: {selectedNode.id}</Text>
                </div>
            </div>

            <Form
                form={form}
                layout="vertical"
                onValuesChange={handleChange}
                initialValues={selectedNode.data}
                requiredMark={false}
            >
                {selectedNode.type === 'trigger' && renderTriggerForm()}
                {selectedNode.type === 'message' && renderMessageForm()}
                {selectedNode.type === 'delay' && renderDelayForm()}
                {selectedNode.type === 'question' && renderQuestionForm()}
                {selectedNode.type === 'handover' && renderHandoverForm()}
                {selectedNode.type === 'ai_agent' && renderAIForm()}
            </Form>

            <Divider style={{ borderColor: 'var(--border-color)' }} />

            <Button
                danger
                ghost
                block
                icon={<DeleteOutlined />}
                onClick={() => onDeleteNode(selectedNode.id)}
            >
                Bu Adımı Sil
            </Button>
        </div>
    );
}
